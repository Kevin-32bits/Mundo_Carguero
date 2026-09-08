import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ProductoApi, ProductosApiService } from '../../../../core/productos-api.service';

@Component({
  selector: 'app-editar-product',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './editar-product.component.html',
  styleUrl: './editar-product.component.css',
})
export class EditarProductComponent implements OnInit {
  // Recibe el producto original de la tabla
  @Input() producto: ProductoApi | null = null;
  
  @Output() cerrar = new EventEmitter<void>();
  @Output() productoActualizado = new EventEmitter<void>(); // Para refrescar la tabla al guardar

  // Copia de trabajo para el formulario (para no afectar la tabla en vivo mientras se edita)
  productoEditado: Partial<ProductoApi> = {};

  // Señales de estado
  guardando = signal(false);
  mensaje = signal('');
  tipoMensaje = signal<'ok' | 'error' | ''>('');

  constructor(private productosApi: ProductosApiService) {}

  ngOnInit(): void {
    // Al abrir el modal, copiamos los datos del producto al formulario
    if (this.producto) {
      this.productoEditado = { ...this.producto };
    }
  }

  cerrarModal(): void {
    this.cerrar.emit();
  }

  // --- LÓGICA DE GUARDADO ---
  guardarCambios(): void {
    if (!this.producto || !this.productoEditado.nombre || !this.productoEditado.categoria) {
      this.tipoMensaje.set('error');
      this.mensaje.set('Por favor, completa los campos obligatorios (Nombre y Categoría).');
      return;
    }

    this.guardando.set(true);
    this.mensaje.set('');
    this.tipoMensaje.set('');

    // Preparamos el objeto final con los valores actualizados
    const payloadActualizacion: ProductoApi = {
      ...this.producto, // Mantenemos ID, SKU y Stock intactos
      nombre: this.productoEditado.nombre || '',
      categoria: this.productoEditado.categoria || '',
      precioVentaCaja: Number(this.productoEditado.precioVentaCaja) || 0,
      costoCaja: Number(this.productoEditado.costoCaja) || 0,
      unidadesPorCaja: Number(this.productoEditado.unidadesPorCaja) || 1,
      proveedor: this.productoEditado.proveedor || '',
      telefono: this.productoEditado.telefono || '',
      descripcion: this.productoEditado.descripcion || ''
    };

    // Llamamos a tu servicio API
    this.productosApi.actualizarProducto(this.producto.id, payloadActualizacion)
    .pipe(finalize(() => this.guardando.set(false)))
    .subscribe({
      next: () => {
        this.tipoMensaje.set('ok');
        this.mensaje.set('Producto actualizado correctamente en la base de datos.');
        this.productoActualizado.emit(); // Avisa a la tabla para que se recargue
        
        // Cierra el modal tras 1.5 segundos
        setTimeout(() => this.cerrarModal(), 1500);
      },
      error: (error: any) => {
        this.tipoMensaje.set('error');
        this.mensaje.set('Hubo un error al guardar los cambios. Intenta nuevamente.');
        console.error('Error al editar producto:', error);
      }
    });
  }
}