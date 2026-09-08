import { CommonModule } from '@angular/common';
import { Component, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  CotizacionListadoApi,
  FacturarCotizacionApi,
  Sucursal1VentasApiService,
} from '../../../core/sucursal1-ventas-api.service';
import { TransferenciasApiService } from '../../../core/transferencias-api.service';
import { PaginationComponent } from '../../../shared/pagination/pagination.component';
import {
  HistoryDayGroup,
  HistoryMonthGroup,
  groupHistoryByMonthDay,
} from '../../../shared/utils/historial-mes-dia.util';
import { paginateArray } from '../../../shared/utils/pagination.util';
import { EditarCComponent } from './editar-c/editar-c.component'; // Ajustar ruta si es necesario

interface GrupoCotizacionMesVm {
  key: string;
  mes: string;
  anio: number;
  mesIndex: number;
  totalMes: number;
  dias: Array<{
    key: string;
    fecha: string;
    totalDia: number;
    cotizaciones: CotizacionListadoApi[];
  }>;
}

@Component({
  selector: 'app-cotizaciones',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, EditarCComponent],
  templateUrl: './cotizaciones.component.html',
  styleUrl: './cotizaciones.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush // <-- Máximo rendimiento activado
})
export class CotizacionesComponent implements OnInit {
  // ── ESTADO GLOBAL (Signals Puros) ──
  cotizacionesGuardadas = signal<CotizacionListadoApi[]>([]);
  cargando = signal(false);
  mensaje = signal('');
  busqueda = signal('');
  filtroMesAnio = signal('');
  paginaMesActual = signal(1);

  // Estados extraídos para el Modal Editar
  mostrarModalEditar = signal(false);
  cotizacionEditandoId = signal<number | null>(null);
  precioCajaPorProducto = signal<Record<number, number>>({});

  // Estados para Modal Facturar
  mostrarModalFacturar = signal(false);
  facturando = signal(false);
  cotizacionFacturar = signal<CotizacionListadoApi | null>(null);
  tipoComprobante = signal('Boleta');
  metodoPago = signal('Efectivo');
  
  readonly mesesPorPagina = 1;
  readonly mostrarDropdownMes = signal(false);
  readonly anioSeleccionado = signal(new Date().getFullYear());
  readonly mesesOpciones = [
    { id: '01', nombre: 'Ene' }, { id: '02', nombre: 'Feb' }, { id: '03', nombre: 'Mar' },
    { id: '04', nombre: 'Abr' }, { id: '05', nombre: 'May' }, { id: '06', nombre: 'Jun' },
    { id: '07', nombre: 'Jul' }, { id: '08', nombre: 'Ago' }, { id: '09', nombre: 'Sep' },
    { id: '10', nombre: 'Oct' }, { id: '11', nombre: 'Nov' }, { id: '12', nombre: 'Dic' }
  ];

  // ── PROPIEDADES COMPUTADAS ──
  cotizacionesFiltradasPorTexto = computed(() => {
    const termino = this.busqueda().trim().toLowerCase();
    if (!termino) return this.cotizacionesGuardadas();

    return this.cotizacionesGuardadas().filter((c) => 
      (c.id || '').toLowerCase().includes(termino) ||
      (c.cliente || '').toLowerCase().includes(termino) ||
      (c.documento || '').toLowerCase().includes(termino) ||
      (c.estado || '').toLowerCase().includes(termino)
    );
  });

  historialCotizaciones = computed(() => {
    const groups: HistoryMonthGroup<CotizacionListadoApi>[] = groupHistoryByMonthDay(this.cotizacionesFiltradasPorTexto(), {
      getDate: (c) => c.fecha,
      getTotal: (c) => Number(c.total) || 0,
    });

    return groups.map((g) => ({
      key: g.key, mes: g.label, anio: g.year, mesIndex: g.month, totalMes: g.total,
      dias: g.days.map((d: HistoryDayGroup<CotizacionListadoApi>) => ({
        key: d.key, fecha: d.label, totalDia: d.total, cotizaciones: d.items,
      })),
    }));
  });

  historialCotizacionesFiltradoMes = computed(() => {
    if (!this.filtroMesAnio()) return this.historialCotizaciones();
    return this.historialCotizaciones().filter((m) => m.key === this.filtroMesAnio());
  });

  paginacionData = computed(() => paginateArray(this.historialCotizacionesFiltradoMes(), this.paginaMesActual(), this.mesesPorPagina));
  totalPaginasMes = computed(() => this.paginacionData().totalPages);
  mesesPaginados = computed(() => this.paginacionData().pageItems);

  constructor(
    private readonly ventasApi: Sucursal1VentasApiService,
    private readonly transferenciasApi: TransferenciasApiService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.cargarPreciosSucursal1();
    this.cargarCotizaciones();

    const codigoNueva = this.route.snapshot.queryParamMap.get('nueva');
    if (codigoNueva) {
      this.mensaje.set(`Cotizacion ${codigoNueva} guardada correctamente.`);
    }
  }

  // ── MÉTODOS UI Y DROPDOWN ──
  toggleDropdownMes(event?: Event) {
    if (event) event.stopPropagation();
    this.mostrarDropdownMes.update(v => !v);

    if (this.mostrarDropdownMes() && this.filtroMesAnio()) {
      const [yyyy] = this.filtroMesAnio().split('-');
      this.anioSeleccionado.set(parseInt(yyyy, 10));
    }
  }

  cambiarAnio(delta: number, event: Event) {
    event.stopPropagation();
    this.anioSeleccionado.update(a => a + delta);
  }

  seleccionarMesCustom(mesId: string, event: Event) {
    event.stopPropagation();
    this.filtroMesAnio.set(`${this.anioSeleccionado()}-${mesId}`);
    this.paginaMesActual.set(1);
    this.mostrarDropdownMes.set(false);
  }

  limpiarFiltroMes(event: Event) {
    event.stopPropagation();
    this.filtroMesAnio.set('');
    this.paginaMesActual.set(1);
    this.mostrarDropdownMes.set(false);
  }

  formatearMesAnioVista(valor: string): string {
    if (!valor) return 'Filtrar por mes...';
    const [yyyy, mm] = valor.split('-');
    const mes = this.mesesOpciones.find(m => m.id === mm)?.nombre || mm;
    return `${mes} ${yyyy}`;
  }

  irANuevaCotizacion() {
    this.router.navigate(['/sistema/sucursales/panel-ventas']);
  }

  // ── LÓGICA DE EDICIÓN ──
  abrirModalEditar(cotizacion: CotizacionListadoApi) {
    if (cotizacion.estado === 'Completado') return;
    this.cotizacionEditandoId.set(cotizacion.cotizacionId);
    this.mostrarModalEditar.set(true);
  }

  cerrarModalEditar() {
    this.mostrarModalEditar.set(false);
    this.cotizacionEditandoId.set(null);
  }

  onEdicionGuardada() {
    this.cerrarModalEditar();
    this.cargarCotizaciones();
  }

  // ── LÓGICA DE FACTURACIÓN ──
  abrirModalFacturar(cotizacion: CotizacionListadoApi) {
    if (cotizacion.estado === 'Completado') return;
    this.cotizacionFacturar.set(cotizacion);
    this.tipoComprobante.set('Boleta');
    this.metodoPago.set('Efectivo');
    this.mostrarModalFacturar.set(true);
  }

  cerrarModalFacturar() {
    if (this.facturando()) return;
    this.mostrarModalFacturar.set(false);
    this.cotizacionFacturar.set(null);
  }

  confirmarFacturar() {
    const cotizacion = this.cotizacionFacturar();
    if (!cotizacion) return;

    const payload: FacturarCotizacionApi = {
      tipoComprobante: this.tipoComprobante(),
      metodoPago: this.metodoPago(),
    };

    this.facturando.set(true);
    this.ventasApi.facturarCotizacion(cotizacion.cotizacionId, payload).subscribe({
      next: () => {
        this.facturando.set(false);
        this.cerrarModalFacturar();
        this.cargarCotizaciones();
        this.router.navigate(['/sistema/sucursales/facturas']);
      },
      error: (error) => {
        this.facturando.set(false);
        alert(error?.error?.mensaje ?? 'No se pudo facturar la cotizacion.');
      },
    });
  }

  eliminarCotizacion(cotizacion: CotizacionListadoApi) {
    const confirmar = confirm(`Se eliminara la cotizacion ${cotizacion.id}.`);
    if (!confirmar) return;

    this.ventasApi.eliminarCotizacion(cotizacion.cotizacionId).subscribe({
      next: () => this.cargarCotizaciones(),
      error: (error) => alert(error?.error?.mensaje ?? 'No se pudo eliminar la cotizacion.'),
    });
  }

  private cargarCotizaciones() {
    this.cargando.set(true);
    this.ventasApi.obtenerCotizaciones().subscribe({
      next: (lista) => {
        this.cotizacionesGuardadas.set([...lista]);
        this.paginaMesActual.set(1);
        this.cargando.set(false);
      },
      error: () => {
        this.cotizacionesGuardadas.set([]);
        this.cargando.set(false);
      },
    });
  }

  private cargarPreciosSucursal1() {
    this.transferenciasApi.obtenerStockActual().subscribe({
      next: (stock) => {
        const precios: Record<number, number> = {};
        for (const item of stock) {
          precios[item.productoId] = Number(item.precioCaja) || 0;
        }
        this.precioCajaPorProducto.set(precios);
      },
      error: () => this.precioCajaPorProducto.set({}),
    });
  }
}