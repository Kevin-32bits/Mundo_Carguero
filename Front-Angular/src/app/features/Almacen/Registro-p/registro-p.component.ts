import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { combineLatest, finalize, startWith } from 'rxjs';
import { ProductoApiPayload, ProductosApiService } from '../../../core/productos-api.service';
import { RegistCategoriaComponent } from '../Registro-p/regist-categoria/regist-categoria.component';

@Component({
  selector: 'app-registro-p',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RegistCategoriaComponent],
  templateUrl: './registro-p.component.html',
  styleUrl: './registro-p.component.css',
})
export class RegistroPComponent implements OnInit {
  productoForm!: FormGroup;
  guardando = false;
  mensaje = '';
  tipoMensaje: 'ok' | 'error' | '' = '';

  mostrarModalCategoria: boolean = false;

  // Inicia vacío, se llenará automáticamente al cargar el componente
  categoriasRepuestos: string[] = []; 

  constructor(
    private fb: FormBuilder,
    private productosApi: ProductosApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.iniciarFormulario();
    this.configurarCalculoCostoUnitario();
    this.cargarCategorias(); // Llamamos a la extracción dinámica
  }

  iniciarFormulario(): void {
    this.productoForm = this.fb.group({
      sku: ['', Validators.required],
      nombre: ['', Validators.required],
      unidadesPorCaja: [12, [Validators.required, Validators.min(1)]],
      precioVentaCaja: ['', [Validators.required, Validators.min(0)]],
      categoria: ['', Validators.required],
      descripcion: [''],
      proveedor: [''],
      telefono: [''],
      costoCaja: ['', [Validators.required, Validators.min(0)]],
      costoUnitario: [{ value: '0.00', disabled: true }],
      stockCajas: [0, [Validators.required, Validators.min(0)]], // Stock inicial
    });
  }

  cargarCategorias(): void {
    this.productosApi.obtenerProductos().subscribe({
      next: (productos: any[]) => {
        // 👁️ CHISMOSO 1: Veamos qué nos está mandando tu API
        console.log('Datos puros de la API:', productos);

        const categoriasUnicas = Array.from(
          new Set(
            productos
              // Buscamos con minúscula y con mayúscula por si acaso
              .map(p => p.categoria || p.Categoria)
              .filter(categoria => categoria && categoria.trim() !== '')
          )
        );

        this.categoriasRepuestos = categoriasUnicas;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al conectar con la API para las categorías:', err);
      }
    });
  }

  configurarCalculoCostoUnitario(): void {
    const unidadesCtrl = this.productoForm.get('unidadesPorCaja');
    const costoCajaCtrl = this.productoForm.get('costoCaja');
    const costoUnitarioCtrl = this.productoForm.get('costoUnitario');

    if (!unidadesCtrl || !costoCajaCtrl || !costoUnitarioCtrl) {
      return;
    }

    combineLatest([
      unidadesCtrl.valueChanges.pipe(startWith(unidadesCtrl.value)),
      costoCajaCtrl.valueChanges.pipe(startWith(costoCajaCtrl.value)),
    ]).subscribe(([unidadesPorCaja, costoCaja]) => {
      const unidades = Number(unidadesPorCaja);
      const costo = Number(costoCaja);

      const costoUnitario = unidades > 0 && costo >= 0 ? costo / unidades : 0;
      costoUnitarioCtrl.setValue(costoUnitario.toFixed(2), { emitEvent: false });
    });
  }

  guardarRegistro(): void {
    if (this.productoForm.invalid) {
      this.productoForm.markAllAsTouched();
      this.tipoMensaje = 'error';
      this.mensaje = 'Por favor, completa correctamente todos los campos obligatorios.';
      return;
    }

    const raw = this.productoForm.getRawValue();
    const skuNormalizado = this.recortarTexto(raw.sku, 50).toUpperCase();

    this.guardando = true;
    this.mensaje = '';
    this.tipoMensaje = '';

    // Validar explícitamente si el SKU ya existe antes de crear
    this.productosApi.obtenerPorSku(skuNormalizado).subscribe({
      next: (productoExistente) => {
        this.guardando = false;
        this.tipoMensaje = 'error';
        this.mensaje = `Error: El SKU '${skuNormalizado}' ya está registrado bajo el nombre "${productoExistente.nombre}".`;
      },
      error: () => {
        // Si la API arroja error al buscar el SKU (404 Not Found), el SKU está libre.
        this.crearProducto(raw, skuNormalizado);
      }
    });
  }

  private crearProducto(raw: any, skuNormalizado: string): void {
    const payload: ProductoApiPayload = {
      sku: skuNormalizado,
      nombre: this.recortarTexto(raw.nombre, 100),
      categoria: this.recortarTexto(raw.categoria, 70),
      descripcion: this.recortarTexto(raw.descripcion, 500),
      proveedor: this.recortarTexto(raw.proveedor, 80),
      telefono: this.recortarTexto(raw.telefono, 30),
      unidadesPorCaja: Number(raw.unidadesPorCaja),
      precioVentaCaja: Number(raw.precioVentaCaja),
      costoCaja: Number(raw.costoCaja),
      costoUnitario: Number(raw.costoUnitario),
      stockCajasIngreso: Number(raw.stockCajas), 
    };

    this.productosApi.crearProducto(payload)
      .pipe(finalize(() => (this.guardando = false)))
      .subscribe({
        next: () => {
          this.tipoMensaje = 'ok';
          this.mensaje = 'Producto registrado correctamente como nuevo en el almacén.';
          
          // Opcional: Si el usuario registró una categoría nueva que no estaba en la lista,
          // la agregamos al select automáticamente sin recargar la página
          if (!this.categoriasRepuestos.includes(payload.categoria)) {
            this.categoriasRepuestos.push(payload.categoria);
          }

          this.productoForm.reset({
            sku: '',
            nombre: '',
            unidadesPorCaja: 12,
            precioVentaCaja: '',
            categoria: '',
            descripcion: '',
            proveedor: '',
            telefono: '',
            costoCaja: '',
            costoUnitario: '0.00',
            stockCajas: 0,
          });
        },
        error: (error: any) => {
          this.tipoMensaje = 'error';
          this.mensaje = this.obtenerMensajeError(error);
        },
      });
  }

  cancelar(): void {
    this.productoForm.reset({
      sku: '',
      nombre: '',
      unidadesPorCaja: 12,
      precioVentaCaja: '',
      categoria: '',
      descripcion: '',
      proveedor: '',
      telefono: '',
      costoCaja: '',
      costoUnitario: '0.00',
      stockCajas: 0,
    });
    this.tipoMensaje = '';
    this.mensaje = '';
  }

  private recortarTexto(valor: unknown, max: number): string {
    const texto = String(valor ?? '').trim();
    return texto.length > max ? texto.slice(0, max) : texto;
  }
  
  // MÉTODOS PARA CONTROLAR EL COMPONENTE DE CATEGORÍA
  registrarNuevaCategoria(): void {
    this.mostrarModalCategoria = true;
  }

  cerrarModalCategoria(): void {
    this.mostrarModalCategoria = false;
  }

  agregarNuevaCategoria(nuevaCategoria: string): void {
    if (!this.categoriasRepuestos.includes(nuevaCategoria)) {
      this.categoriasRepuestos.push(nuevaCategoria);
    }
    
    this.productoForm.get('categoria')?.setValue(nuevaCategoria);
  }

  private obtenerMensajeError(error: any): string {
    if (error?.name === 'TimeoutError') {
      return 'La API tardó demasiado en responder. Verifica que Api_M_Carguero esté en ejecución.';
    }
    if (error?.status === 0) {
      return 'No se pudo conectar con la API. Revisa que Api_M_Carguero esté levantado y en el puerto correcto.';
    }
    if (error?.error?.mensaje) {
      return error.error.mensaje;
    }
    if (error?.error?.errors) {
      const errores = Object.values(error.error.errors).flat().join(' ');
      if (errores) {
        return String(errores);
      }
    }
    return 'No se pudo registrar el producto debido a un error en el servidor.';
  }
}