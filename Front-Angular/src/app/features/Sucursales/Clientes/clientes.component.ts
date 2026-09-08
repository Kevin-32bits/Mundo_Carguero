import { CommonModule } from '@angular/common';
import { Component, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CrearClienteApi, ClienteListadoApi, Sucursal1VentasApiService } from '../../../core/sucursal1-ventas-api.service';

interface ClienteFormVm {
  tipoDocumento: string;
  numeroDocumento: string;
  nombre: string;
  telefono: string;
  correo: string;
  direccion: string;
}

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './clientes.component.html',
  styleUrl: './clientes.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush // <-- Máximo rendimiento activado
})
export class ClientesComponent implements OnInit {
  // ── ESTADO GLOBAL (Signals puros) ──
  clientes = signal<ClienteListadoApi[]>([]);
  cargando = signal(false);
  busqueda = signal('');
  mostrarModal = signal(false);
  guardando = signal(false);
  clienteEditandoId = signal<number | null>(null);
  mensaje = signal('');
  tipoMensaje = signal<'' | 'ok' | 'error'>('');

  // ── FORMULARIO (Objeto clásico para binding fácil) ──
  form: ClienteFormVm = {
    tipoDocumento: 'DNI',
    numeroDocumento: '',
    nombre: '',
    telefono: '',
    correo: '',
    direccion: '',
  };

  // ── PROPIEDADES COMPUTADAS ──
  clientesFiltrados = computed(() => {
    const termino = this.busqueda().trim().toLowerCase();
    if (!termino) return this.clientes();
    return this.clientes().filter((cliente) => cliente.numeroDocumento.toLowerCase().includes(termino));
  });

  constructor(private readonly ventasApi: Sucursal1VentasApiService) {}

  ngOnInit(): void {
    this.cargarClientes();
  }

  // ── MANEJO DEL MODAL ──
  abrirModalNuevoCliente() {
    this.clienteEditandoId.set(null);
    this.form = {
      tipoDocumento: 'DNI',
      numeroDocumento: '',
      nombre: '',
      telefono: '',
      correo: '',
      direccion: '',
    };
    this.mensaje.set('');
    this.tipoMensaje.set('');
    this.mostrarModal.set(true);
  }

  abrirModalEditarCliente(cliente: ClienteListadoApi) {
    this.clienteEditandoId.set(cliente.clienteId);
    this.form = {
      tipoDocumento: (cliente.tipoDocumento || 'DNI').toUpperCase(),
      numeroDocumento: cliente.numeroDocumento || '',
      nombre: cliente.nombre || '',
      telefono: cliente.telefono || '',
      correo: cliente.correo || '',
      direccion: cliente.direccion || '',
    };
    this.mensaje.set('');
    this.tipoMensaje.set('');
    this.mostrarModal.set(true);
  }

  cerrarModal() {
    if (this.guardando()) return;
    this.mostrarModal.set(false);
  }

  // ── VALIDACIÓN EN TIEMPO REAL ──
  alCambiarTipoDoc() {
    this.form.numeroDocumento = '';
  }

  limpiarNumeroDocumento(event: any) {
    let valor = event.target.value.replace(/[^0-9]/g, '');
    const maxLen = this.form.tipoDocumento === 'DNI' ? 8 : 11;
    if (valor.length > maxLen) {
      valor = valor.substring(0, maxLen);
    }
    this.form.numeroDocumento = valor;
    event.target.value = valor;
  }

  // ── PETICIONES API ──
  guardarCliente() {
    const payload: CrearClienteApi = {
      tipoDocumento: this.form.tipoDocumento.trim().toUpperCase(),
      numeroDocumento: this.form.numeroDocumento.trim(),
      nombre: this.form.nombre.trim(),
      telefono: this.form.telefono.trim() || null,
      correo: this.form.correo.trim() || null,
      direccion: this.form.direccion.trim() || null,
    };

    if (!payload.tipoDocumento || !payload.numeroDocumento || !payload.nombre) {
      this.tipoMensaje.set('error');
      this.mensaje.set('Tipo documento, numero de documento y nombre son obligatorios.');
      return;
    }

    const numDoc = payload.numeroDocumento;
    if (payload.tipoDocumento === 'DNI' && numDoc.length !== 8) {
      this.tipoMensaje.set('error');
      this.mensaje.set('El DNI debe tener exactamente 8 digitos.');
      return;
    }

    if (payload.tipoDocumento === 'RUC' && numDoc.length !== 11) {
      this.tipoMensaje.set('error');
      this.mensaje.set('El RUC debe tener exactamente 11 digitos.');
      return;
    }

    this.guardando.set(true);
    this.tipoMensaje.set('');
    this.mensaje.set('');

    const editId = this.clienteEditandoId();
    const request$ = editId
      ? this.ventasApi.actualizarCliente(editId, payload)
      : this.ventasApi.crearCliente(payload);

    request$.subscribe({
      next: () => {
        this.guardando.set(false);
        this.mostrarModal.set(false);
        this.clienteEditandoId.set(null);
        this.cargarClientes();
      },
      error: (error) => {
        this.guardando.set(false);
        this.tipoMensaje.set('error');
        this.mensaje.set(error?.error?.mensaje ?? 'No se pudo guardar el cliente.');
      },
    });
  }

  eliminarCliente(cliente: ClienteListadoApi) {
    const confirmar = confirm(`Se eliminara el cliente "${cliente.nombre}".`);
    if (!confirmar) return;

    this.ventasApi.eliminarCliente(cliente.clienteId).subscribe({
      next: () => this.cargarClientes(),
      error: () => alert('No se pudo eliminar el cliente.'),
    });
  }

  getDocumentoCliente(cliente: ClienteListadoApi): string {
    return `${cliente.tipoDocumento}: ${cliente.numeroDocumento}`;
  }

  private cargarClientes() {
    this.cargando.set(true);
    this.ventasApi.obtenerClientes().subscribe({
      next: (clientes) => {
        this.clientes.set([...clientes]);
        this.cargando.set(false);
      },
      error: () => {
        this.clientes.set([]);
        this.cargando.set(false);
      },
    });
  }
}