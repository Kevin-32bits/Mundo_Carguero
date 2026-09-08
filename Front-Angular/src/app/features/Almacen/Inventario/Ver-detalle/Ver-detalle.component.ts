import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ProductoApi } from '../../../../core/productos-api.service';

@Component({
  selector: 'app-ver-detalle',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './Ver-detalle.component.html',
  styleUrl: './Ver-detalle.component.css',
})
export class VerDetalleComponent {
  @Input() producto: ProductoApi | null = null;
  @Output() cerrar = new EventEmitter<void>();

  cerrarModal(): void {
    this.cerrar.emit();
  }
}
