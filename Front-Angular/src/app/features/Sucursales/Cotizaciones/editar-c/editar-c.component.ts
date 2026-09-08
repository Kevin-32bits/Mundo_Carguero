import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ActualizarCotizacionApi,
  CotizacionDetalleItemApi,
  Sucursal1VentasApiService,
} from '../../../../core/sucursal1-ventas-api.service';
import { TransferenciasApiService } from '../../../../core/transferencias-api.service';

export interface CotizacionClienteFormVm {
  tipoDocumento: string;
  numeroDocumento: string;
  clienteNombre: string;
  telefono: string;
  correo: string;
  direccion: string;
}

export interface CotizacionProductoEditVm {
  productoId: number;
  sku: string;
  nombre: string;
  cantidad: number; 
  precio: number;   
}

@Component({
  selector: 'app-editar-c',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './editar-c.component.html',
  styleUrl: './editar-c.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditarCComponent implements OnInit {
  @Input() cotizacionId!: number;
  // Recibimos los precios completos (caja y unidad)
  @Input() precioCajaPorProducto: Record<number, number> = {}; 
  @Input() precioUnidadPorProducto: Record<number, number> = {}; 

  @Output() cerrar = new EventEmitter<void>();
  @Output() edicionGuardada = new EventEmitter<void>();

  // ── ESTADO GLOBAL ──
  guardandoEdicion = signal(false);
  busquedaProducto = signal('');
  itemsEditar = signal<CotizacionProductoEditVm[]>([]);
  esVentaPorUnidad = signal(false); 

  formEditar: CotizacionClienteFormVm = {
    tipoDocumento: 'DNI',
    numeroDocumento: '',
    clienteNombre: '',
    telefono: '',
    correo: '',
    direccion: '',
  };

  // ── PROPIEDAD COMPUTADA ──
  totalEditado = computed(() => {
    return this.itemsEditar().reduce((acc, it) => acc + Number(it.precio) * Number(it.cantidad), 0);
  });

  constructor(
    private readonly ventasApi: Sucursal1VentasApiService,
    private readonly transferenciasApi: TransferenciasApiService
  ) {}

  ngOnInit(): void {

    const rol = (sessionStorage.getItem('rolUsuario') || '').replace(/\s+/g, '').toLowerCase();
    const sucursalId = sessionStorage.getItem('sucursalId'); 
    this.esVentaPorUnidad.set(rol === 'sucursal2' || sucursalId === '2' || sucursalId === '3'); 

    this.cargarDetalleCotizacion();
  }

  private cargarDetalleCotizacion() {
    this.ventasApi.obtenerCotizacionDetalle(this.cotizacionId).subscribe({
      next: (detalle) => {
        this.formEditar = {
          tipoDocumento: (detalle.tipoDocumento || 'DNI').toUpperCase(),
          numeroDocumento: detalle.numeroDocumento || '',
          clienteNombre: detalle.clienteNombre || '',
          telefono: detalle.telefono || '',
          correo: detalle.correo || '',
          direccion: detalle.direccion || '',
        };

        const itemsRecibidos = (detalle.items || []).map((it: CotizacionDetalleItemApi) => ({
          productoId: it.productoId,
          sku: it.sku,
          nombre: it.nombre,

          cantidad: Number(it.cantidadCajas) || 1, 
          precio: Number(it.precioCaja) || 0,
        }));
        
        this.itemsEditar.set(itemsRecibidos);
      },
      error: () => {
        alert('No se pudo cargar la cotizacion para editar.');
        this.cerrarModal();
      },
    });
  }

  cerrarModal() {
    if (this.guardandoEdicion()) return;
    this.cerrar.emit();
  }

  agregarProductoPorBusqueda() {
    const termino = this.busquedaProducto().trim();
    if (!termino) return;

    this.transferenciasApi.obtenerProductosCatalogo(termino).subscribe({
      next: (productos) => {
        const encontrado = productos[0];
        if (!encontrado) {
          alert('No se encontro producto para agregar.');
          return;
        }

        this.itemsEditar.update((items) => {
          const existe = items.find((i) => i.productoId === encontrado.productoId);
          
          // Determinamos el precio correcto según el modo (Caja o Unidad)
          const precioBase = this.esVentaPorUnidad() 
            ? (this.precioUnidadPorProducto[encontrado.productoId] ?? Number(encontrado.costoCaja) ?? 0)
            : (this.precioCajaPorProducto[encontrado.productoId] ?? Number(encontrado.precioCaja) ?? 0);

          if (existe) {
            return items.map((i) =>
              i.productoId === encontrado.productoId ? { ...i, cantidad: i.cantidad + 1 } : i
            );
          } else {
            return [
              ...items,
              {
                productoId: encontrado.productoId,
                sku: encontrado.sku,
                nombre: encontrado.nombre,
                cantidad: 1,
                precio: precioBase,
              },
            ];
          }
        });

        this.busquedaProducto.set('');
      },
      error: () => alert('No se pudo buscar productos.'),
    });
  }

  actualizarCantidadCajas(index: number, nuevaCantidad: number) {
    this.itemsEditar.update((items) => {
      const nuevos = [...items];
      nuevos[index] = { ...nuevos[index], cantidad: nuevaCantidad };
      return nuevos;
    });
  }

  quitarProducto(index: number) {
    this.itemsEditar.update((items) => items.filter((_, i) => i !== index));
  }

  guardarEdicionCotizacion() {
    const payload: ActualizarCotizacionApi = {
      clienteNombre: this.formEditar.clienteNombre.trim(),
      tipoDocumento: this.formEditar.tipoDocumento.trim().toUpperCase(),
      numeroDocumento: this.formEditar.numeroDocumento.trim(),
      telefono: this.formEditar.telefono.trim() || null,
      correo: this.formEditar.correo.trim() || null,
      direccion: this.formEditar.direccion.trim() || null,
      items: this.itemsEditar()
        .filter((it) => Number(it.cantidad) > 0)
        .map((it) => ({
          productoId: it.productoId,

          cantidadCajas: Number(it.cantidad), 
          precioCaja: Number(it.precio),
        })),
    };

    if (!payload.clienteNombre || !payload.numeroDocumento || !payload.tipoDocumento) {
      alert('Completa cliente, tipo documento y numero de documento.');
      return;
    }

    if (payload.items.length === 0) {
      alert('Agrega al menos un producto a la cotizacion.');
      return;
    }

    this.guardandoEdicion.set(true);
    this.ventasApi.actualizarCotizacion(this.cotizacionId, payload).subscribe({
      next: () => {
        this.guardandoEdicion.set(false);
        this.edicionGuardada.emit();
      },
      error: (error) => {
        this.guardandoEdicion.set(false);
        alert(error?.error?.mensaje ?? 'No se pudo actualizar la cotizacion.');
      },
    });
  }
}