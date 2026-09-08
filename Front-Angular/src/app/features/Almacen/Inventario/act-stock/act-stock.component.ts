import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ProductoApi, ProductosApiService } from '../../../../core/productos-api.service';

@Component({
  selector: 'app-act-stock',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './act-stock.component.html',
  styleUrl: './act-stock.component.css',
})
export class ActStockComponent {
  @Input() producto: ProductoApi | null = null;
  @Output() cerrar = new EventEmitter<void>();
  @Output() stockActualizado = new EventEmitter<void>(); // Por si necesitas recargar la tabla principal

  // Variables para el formulario
  cantidadIngreso = 1;
  documentoReferencia = '';
  
  // Señales de estado (basado en la lógica que me pasaste)
  guardando = signal(false);
  mensaje = signal('');
  tipoMensaje = signal<'ok' | 'error' | ''>('');

  constructor(private productosApi: ProductosApiService) {}

  cerrarModal(): void {
    this.cerrar.emit();
  }

  sumarCantidad(): void {
    this.cantidadIngreso++;
  }

  restarCantidad(): void {
    if (this.cantidadIngreso > 1) {
      this.cantidadIngreso--;
    }
  }

  confirmarIngreso(): void {
    if (!this.producto || this.cantidadIngreso < 1) return;

    this.guardando.set(true);
    this.mensaje.set('');
    this.tipoMensaje.set('');

    const nuevoStock = Number(this.producto.stockCajas || 0) + this.cantidadIngreso;

    // Usamos tu misma lógica de actualización
    this.productosApi.actualizarProducto(this.producto.id, {
      ...this.producto,
      stockCajas: nuevoStock
    })
    .pipe(finalize(() => this.guardando.set(false)))
    .subscribe({
      next: () => {
        this.tipoMensaje.set('ok');
        this.mensaje.set(`¡Éxito! Se sumaron ${this.cantidadIngreso} cajas al inventario.`);
        this.stockActualizado.emit();
        
        // Cierra el modal automáticamente después de 1.5 segundos
        setTimeout(() => this.cerrarModal(), 1500);
      },
      error: (error: any) => {
        this.tipoMensaje.set('error');
        this.mensaje.set('Hubo un error al actualizar el stock. Revisa tu conexión.');
        console.error('Error actualizando stock:', error);
      }
    });
  }
}