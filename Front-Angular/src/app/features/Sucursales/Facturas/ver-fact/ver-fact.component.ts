import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { FacturaDetalleApi } from '../../../../core/sucursal1-ventas-api.service';

@Component({
  selector: 'app-ver-fact',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ver-fact.component.html',
  styleUrl: './ver-fact.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VerFactComponent {
  @Input() factura: FacturaDetalleApi | null = null;
  @Input() cargando: boolean = false;
  @Input() esUnidad: boolean = false;
  
  @Output() cerrar = new EventEmitter<void>();

  cerrarModal() {
    this.cerrar.emit();
  }

  obtenerSerieComprobante(comprobanteId: string): string {
    const [serie] = String(comprobanteId ?? '').split('-');
    return serie?.trim() || '-';
  }

  obtenerNumeroComprobante(comprobanteId: string): string {
    const partes = String(comprobanteId ?? '').split('-');
    const numero = partes.length > 1 ? partes.slice(1).join('-').trim() : '';
    return numero || '-';
  }
}