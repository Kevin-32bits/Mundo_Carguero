import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CrearCotizacionApi, Sucursal1VentasApiService } from '../../../../core/sucursal1-ventas-api.service';

export interface CarritoItemVm {
  productoId: number;
  id: string;
  nombre: string;
  undsPorCaja: number;
  precioProductos: number;
  cantidadProductos: number;
}

export interface ClienteFormVm {
  tipoDocumento: string;
  numeroDocumento: string;
  nombre: string;
  telefono: string;
  correo: string;
  direccion: string;
}

@Component({
  selector: 'app-facturar-v',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './facturar-v.component.html',
  styleUrl: './facturar-v.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush // <-- Máximo rendimiento activado
})
export class FacturarVComponent implements OnInit {
  @Input() carrito: CarritoItemVm[] = [];
  @Input() totalVenta: number = 0;

  @Output() cerrar = new EventEmitter<void>();
  @Output() facturacionExitosa = new EventEmitter<void>();

  // ── ESTADO GLOBAL (Signals puros) ──
  facturando = signal(false);
  clienteIdSeleccionado = signal<number | null>(null);
  buscandoCliente = signal(false);
  mensajeModal = signal('');
  tipoMensajeModal = signal<'' | 'ok' | 'error'>('');

  // ── FORMULARIO CLÁSICO ──
  clienteForm: ClienteFormVm = {
    tipoDocumento: 'DNI',
    numeroDocumento: '',
    nombre: '',
    telefono: '',
    correo: '',
    direccion: '',
  };

  constructor(
    private readonly ventasApi: Sucursal1VentasApiService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.limpiarEstadoModal();
    this.clienteIdSeleccionado.set(null);
    this.clienteForm = {
      tipoDocumento: 'DNI',
      numeroDocumento: '',
      nombre: '',
      telefono: '',
      correo: '',
      direccion: '',
    };
  }

  cerrarModalFacturar() {
    if (this.facturando() || this.buscandoCliente()) return;
    this.cerrar.emit();
  }

  // ── MÉTODOS DE API ──
  buscarClientePorDocumento() {
    const numeroDocumento = this.clienteForm.numeroDocumento.trim();

    if (!numeroDocumento) {
      this.tipoMensajeModal.set('error');
      this.mensajeModal.set('Ingresa un numero de documento para buscar al cliente.');
      return;
    }

    this.buscandoCliente.set(true);
    this.limpiarEstadoModal();

    this.ventasApi.buscarCliente('', numeroDocumento).subscribe({
      next: (cliente) => {
        this.buscandoCliente.set(false);
        if (!cliente) {
          this.clienteIdSeleccionado.set(null);
          this.tipoMensajeModal.set('ok');
          this.mensajeModal.set('Cliente no registrado. Completa los datos y confirma.');
          return;
        }

        this.clienteIdSeleccionado.set(cliente.clienteId);
        this.clienteForm = {
          tipoDocumento: cliente.tipoDocumento || 'DNI',
          numeroDocumento: cliente.numeroDocumento || '',
          nombre: cliente.nombre || '',
          telefono: cliente.telefono || '',
          correo: cliente.correo || '',
          direccion: cliente.direccion || '',
        };
        this.tipoMensajeModal.set('ok');
        this.mensajeModal.set('Cliente encontrado y autocompletado.');
      },
      error: (error) => {
        this.buscandoCliente.set(false);
        this.clienteIdSeleccionado.set(null);
        this.tipoMensajeModal.set('error');
        this.mensajeModal.set(error?.error?.mensaje ?? 'No se pudo buscar el cliente.');
      },
    });
  }

  confirmarFacturacion() {
    const nombre = this.clienteForm.nombre.trim();
    const tipoDocumento = this.clienteForm.tipoDocumento.trim().toUpperCase();
    const numeroDocumento = this.clienteForm.numeroDocumento.trim();

    if (!nombre || !tipoDocumento || !numeroDocumento) {
      this.tipoMensajeModal.set('error');
      this.mensajeModal.set('Nombre, tipo y numero de documento son obligatorios.');
      return;
    }

    const items = this.carrito.map((item) => ({
      productoId: item.productoId,
      cantidadCajas: Number(item.cantidadProductos),
      precioCaja: Number(item.precioProductos),
    }));

    if (items.length === 0) {
      this.tipoMensajeModal.set('error');
      this.mensajeModal.set('Tu carrito esta vacio.');
      return;
    }

    const payload: CrearCotizacionApi = {
      clienteId: this.clienteIdSeleccionado(),
      clienteNombre: nombre,
      tipoDocumento,
      numeroDocumento,
      telefono: this.clienteForm.telefono.trim() || null,
      correo: this.clienteForm.correo.trim() || null,
      direccion: this.clienteForm.direccion.trim() || null,
      items,
    };

    this.facturando.set(true);
    this.limpiarEstadoModal();

    this.ventasApi.crearCotizacion(payload).subscribe({
      next: (cotizacion) => {
        this.facturando.set(false);
        this.facturacionExitosa.emit();
        this.router.navigate(['/sistema/sucursales/cotizaciones']);
      },
      error: (error) => {
        this.facturando.set(false);
        this.tipoMensajeModal.set('error');
        this.mensajeModal.set(error?.error?.mensaje ?? 'No se pudo guardar la cotizacion.');
      },
    });
  }

  private limpiarEstadoModal() {
    this.tipoMensajeModal.set('');
    this.mensajeModal.set('');
  }
}