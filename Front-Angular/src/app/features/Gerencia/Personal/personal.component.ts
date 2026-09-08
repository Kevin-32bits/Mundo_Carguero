import { Component, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError, finalize, forkJoin, map, of } from 'rxjs';
import {
  CatalogoApi,
  EmpleadoGerenciaApi,
  GerenciaApiService,
} from '../../../core/gerencia-api.service';
import { RegistrarEComponent } from './registrar-e/registrar-e.component';
import { EditarEmplComponente } from './editar-empl/editar-empl.componente';

@Component({
  selector: 'app-personal',
  standalone: true,
  imports: [CommonModule, FormsModule, RegistrarEComponent, EditarEmplComponente],
  templateUrl: './personal.component.html',
  styleUrls: ['./personal.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PersonalComponent implements OnInit {
  readonly showModal = signal(false);
  readonly cargando = signal(false);
  readonly mensaje = signal('');
  readonly tipoMensaje = signal<'ok' | 'error' | ''>('');
  readonly actualizandoEmpleadoIds = signal<Record<number, boolean>>({});
  readonly apiGerenciaDisponible = signal(true);

  readonly busqueda = signal('');
  readonly ubicacionFiltro = signal<number>(0);
  readonly estadoFiltro = signal<'todos' | 'activos' | 'inactivos'>('todos');

  readonly empleados = signal<EmpleadoGerenciaApi[]>([]);
  readonly roles = signal<CatalogoApi[]>([]);
  readonly ubicaciones = signal<CatalogoApi[]>([]);

  // Nuevas variables para controlar el modal de edición
  readonly showModalEdit = signal(false);
  readonly empleadoAEditar = signal<EmpleadoGerenciaApi | null>(null);

  // Método para abrir el modal con los datos del usuario seleccionado
  abrirModalEditar(empleado: EmpleadoGerenciaApi) {
    this.empleadoAEditar.set(empleado);
    this.showModalEdit.set(true);
  }

  // Método que recibe los datos actualizados desde el modal y llama a la API
  onEmpleadoActualizado(empleadoEditado: any) {
    const id = empleadoEditado.id;
    
    this.gerenciaApi.actualizarEmpleado(id, empleadoEditado).subscribe({
      next: (res) => {
        // Actualizamos la fila en la tabla visualmente
        this.empleados.update((actual) =>
          actual.map((item) => (item.id === id ? res : item))
        );
        this.mensaje.set('Usuario actualizado correctamente.');
        this.tipoMensaje.set('ok');
        this.showModalEdit.set(false); // Cerramos el modal
      },
      error: (error) => {
        const status = Number(error?.status ?? 0);
        const detalle = this.obtenerDetalleError(error);
        this.mensaje.set(detalle ? `Error al actualizar: ${detalle}` : `No se pudo actualizar (HTTP ${status}).`);
        this.tipoMensaje.set('error');
      }
    });
  }

  readonly empleadosFiltrados = computed(() => {
    const termino = this.busqueda().trim().toLowerCase();
    const ubicacion = this.ubicacionFiltro();
    const estado = this.estadoFiltro();

    return this.empleados().filter((emp) => {
      const coincideBusqueda =
        !termino ||
        emp.nombreCompleto.toLowerCase().includes(termino) ||
        emp.dni.toLowerCase().includes(termino) ||
        (emp.usuario ?? '').toLowerCase().includes(termino) ||
        (emp.rol ?? '').toLowerCase().includes(termino);

      const coincideUbicacion = !ubicacion || emp.ubicacionId === ubicacion;
      const coincideEstado =
        estado === 'todos' ||
        (estado === 'activos' && emp.estadoLaboral) ||
        (estado === 'inactivos' && !emp.estadoLaboral);

      return coincideBusqueda && coincideUbicacion && coincideEstado;
    });
  });

  readonly kpis = computed(() => {
    const lista = this.empleados();
    const total = lista.length;
    const contarPorUbicacion = (valor: string) =>
      lista.filter((e) => e.ubicacion.toLowerCase().replace(/\s/g, '').includes(valor)).length;

    return [
      { titulo: 'Total Usuarios', valor: total, icono: '\u{1F465}' },
      { titulo: 'En Gerencia', valor: contarPorUbicacion('gerencia'), icono: '\u{1F3E2}' },
      { titulo: 'En Almacen', valor: contarPorUbicacion('almacen'), icono: '\u{1F4E6}' },
      { titulo: 'En Sucursal 1', valor: contarPorUbicacion('sucursal1'), icono: '\u{1F3EA}' },
      { titulo: 'En Sucursal 2', valor: contarPorUbicacion('sucursal2'), icono: '\u{1F3EA}' },
    ];
  });

  constructor(private readonly gerenciaApi: GerenciaApiService) {}

  ngOnInit(): void {
    this.cargarDatosIniciales();
  }

  onEmpleadoGuardado(empleado: EmpleadoGerenciaApi) {
    this.empleados.update((actual) => [empleado, ...actual]);
    this.mensaje.set('Usuario registrado correctamente.');
    this.tipoMensaje.set('ok');
  }

    // Agrega esta variable en tu clase
  dropdownSedesAbierto = false;

  // Opcional: Una función rápida para obtener el nombre seleccionado
  getNombreSedeSeleccionada(): string {
    if (this.ubicacionFiltro() === 0) return 'Todas las sedes';
    const sede = this.ubicaciones().find(u => u.id === this.ubicacionFiltro());
    return sede ? sede.nombre : 'Todas las sedes';
  }

    // Variable para abrir/cerrar el menú de estado
  dropdownEstadoAbierto = false;

  // Función para mostrar el texto actual
  getNombreEstadoSeleccionado(): string {
    const estado = this.estadoFiltro();
    if (estado === 'activos') return 'Activos';
    if (estado === 'inactivos') return 'Inactivos';
    return 'Todos';
  }

  getIconoSede(nombreSede: string): string {
    const sede = nombreSede.toLowerCase();
    
    if (sede.includes('almacen')) return '📦'; 
    if (sede.includes('gerencia')) return '🏢'; 
    if (sede.includes('sucursal')) return '🏪'; 
    
    return '📍'; // Ícono por defecto
  }

  getEstadoClass(estadoLaboral: boolean): string {
    return estadoLaboral ? 'badge-success' : 'badge-inactive';
  }

  estaActualizandoEmpleado(empleadoId: number): boolean {
    return !!this.actualizandoEmpleadoIds()[empleadoId];
  }

  alternarEstadoEmpleado(empleado: EmpleadoGerenciaApi) {
    if (this.estaActualizandoEmpleado(empleado.id)) return;

    const nuevoEstado = !empleado.estadoLaboral;
    this.marcarActualizandoEmpleado(empleado.id, true);

    this.gerenciaApi.actualizarEstadoEmpleado(empleado.id, nuevoEstado, empleado).subscribe({
      next: (actualizado) => {
        const estadoFinal = (actualizado?.estadoLaboral ?? nuevoEstado) as boolean;
        this.empleados.update((actual) =>
          actual.map((item) => (item.id === empleado.id ? { ...item, estadoLaboral: estadoFinal } : item))
        );
        this.mensaje.set(estadoFinal ? 'Usuario habilitado correctamente.' : 'Usuario inhabilitado correctamente.');
        this.tipoMensaje.set('ok');
        this.marcarActualizandoEmpleado(empleado.id, false);
      },
      error: (error) => {
        const status = Number(error?.status ?? 0);
        const detalle = this.obtenerDetalleError(error);
        this.mensaje.set(detalle ? `No se pudo actualizar el estado (HTTP ${status || 'desconocido'}): ${detalle}` : `No se pudo actualizar el estado del usuario (HTTP ${status || 'desconocido'}).`);
        this.tipoMensaje.set('error');
        this.marcarActualizandoEmpleado(empleado.id, false);
      },
    });
  }

  private cargarDatosIniciales() {
    this.cargando.set(true);
    this.mensaje.set('');
    this.tipoMensaje.set('');

    forkJoin({
      empleados: this.gerenciaApi.obtenerEmpleados().pipe(map((data) => ({ data, status: 200 })), catchError((error) => of({ data: [] as EmpleadoGerenciaApi[], status: Number(error?.status ?? 0) }))),
      roles: this.gerenciaApi.obtenerRoles().pipe(map((data) => ({ data, status: 200 })), catchError((error) => of({ data: [] as CatalogoApi[], status: Number(error?.status ?? 0) }))),
      ubicaciones: this.gerenciaApi.obtenerUbicaciones().pipe(map((data) => ({ data, status: 200 })), catchError((error) => of({ data: [] as CatalogoApi[], status: Number(error?.status ?? 0) }))),
    })
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: ({ empleados, roles, ubicaciones }) => {
          this.empleados.set(empleados.data ?? []);
          this.roles.set((roles.data ?? []).length ? roles.data : [{ id: 1, nombre: 'Gerencia' }, { id: 2, nombre: 'Sucursal1' }, { id: 3, nombre: 'Sucursal2' }, { id: 4, nombre: 'Almacen' }]);
          this.ubicaciones.set((ubicaciones.data ?? []).length ? ubicaciones.data : [{ id: 1, nombre: 'Almacen' }, { id: 2, nombre: 'Sucursal1' }, { id: 3, nombre: 'Sucursal2' }, { id: 4, nombre: 'Gerencia' }]);

          const catalogosNoDisponibles = roles.status === 404 && ubicaciones.status === 404;
          this.apiGerenciaDisponible.set(!catalogosNoDisponibles);

          if (catalogosNoDisponibles) {
            this.mensaje.set('La API activa en https://localhost:7094 no tiene endpoints /api/Gerencia/*. Reinicia el backend actualizado para registrar usuarios.');
            this.tipoMensaje.set('error');
            return;
          }

          if (!ubicaciones.data?.length || !roles.data?.length) {
            this.mensaje.set('Se cargaron datos con fallback local en catalogos (roles/ubicaciones).');
            this.tipoMensaje.set('ok');
          }
        },
        error: (error) => {
          this.mensaje.set(error?.error?.mensaje ?? 'No se pudo cargar la informacion de usuarios.');
          this.tipoMensaje.set('error');
        },
      });
  }

  private obtenerDetalleError(error: unknown): string {
    const errorObj = error as { error?: { mensaje?: string; errors?: Record<string, string[] | string> } | string };
    if (typeof errorObj?.error === 'string') return errorObj.error;
    if (errorObj?.error && typeof errorObj.error === 'object') {
      if (errorObj.error.mensaje) return String(errorObj.error.mensaje);
      if (errorObj.error.errors) {
        const errores = Object.values(errorObj.error.errors).flatMap((valor) => (Array.isArray(valor) ? valor : [valor])).join(' ').trim();
        if (errores) return errores;
      }
    }
    return '';
  }

  private marcarActualizandoEmpleado(empleadoId: number, valor: boolean) {
    this.actualizandoEmpleadoIds.update((estado) => {
      if (!valor) {
        const { [empleadoId]: _, ...resto } = estado;
        return resto;
      }
      return { ...estado, [empleadoId]: true };
    });
  }
}
