import { CommonModule } from '@angular/common';
import { Component, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {FacturaDetalleApi, FacturaListadoApi, Sucursal1VentasApiService } from '../../../core/sucursal1-ventas-api.service';
import { PaginationComponent } from '../../../shared/pagination/pagination.component';
import { groupHistoryByMonthDay } from '../../../shared/utils/historial-mes-dia.util';
import { paginateArray } from '../../../shared/utils/pagination.util';
import { VerFactComponent } from './ver-fact/ver-fact.component'; 

@Component({
  selector: 'app-facturas',
  standalone: true,
  // 👇 Añadimos VerFactComponent a los imports 👇
  imports: [CommonModule, FormsModule, PaginationComponent, VerFactComponent],
  templateUrl: './facturas.component.html',
  styleUrl: './facturas.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FacturasComponent implements OnInit {
  // ── ESTADO GLOBAL ──
  facturas = signal<FacturaListadoApi[]>([]);
  cargando = signal(false);
  busqueda = signal('');
  filtroMesAnio = signal('');
  paginaMesActual = signal(1);
  mensaje = signal('');
  generandoPdf = signal(false);
  cargandoDetalleFacturaId = signal<number | null>(null);
  enviandoCorreoFacturaId = signal<number | null>(null);
  mostrarModalDetalle = signal(false);
  cargandoDetalle = signal(false);
  facturaDetalle = signal<FacturaDetalleApi | null>(null);
  
  // SEÑAL PARA MODO CAMALEÓN
  esVentaPorUnidad = signal(false);

  private readonly detalleCache = new Map<number, FacturaDetalleApi>();
  private readonly detalleRequestEnCurso = new Map<number, Promise<FacturaDetalleApi>>();
  private readonly envioCorreoEnCurso = new Set<number>();
  readonly mesesPorPagina = 1;

  // ── SELECTOR DE MES CUSTOM ──
  mostrarDropdownMes = signal(false);
  anioSeleccionado = signal(new Date().getFullYear());
  readonly mesesOpciones = [
    { id: '01', nombre: 'Ene' }, { id: '02', nombre: 'Feb' }, { id: '03', nombre: 'Mar' },
    { id: '04', nombre: 'Abr' }, { id: '05', nombre: 'May' }, { id: '06', nombre: 'Jun' },
    { id: '07', nombre: 'Jul' }, { id: '08', nombre: 'Ago' }, { id: '09', nombre: 'Sep' },
    { id: '10', nombre: 'Oct' }, { id: '11', nombre: 'Nov' }, { id: '12', nombre: 'Dic' }
  ];

  // ── PROPIEDADES COMPUTADAS ──
  facturasFiltradas = computed(() => {
    const termino = this.busqueda().trim().toLowerCase();
    if (!termino) return this.facturas();
    return this.facturas().filter((f) =>
      f.id.toLowerCase().includes(termino) ||
      f.cliente.toLowerCase().includes(termino) ||
      f.tipoComprobante.toLowerCase().includes(termino)
    );
  });

  historialVentas = computed(() => {
    const groups = groupHistoryByMonthDay(this.facturasFiltradas(), {
      getDate: (f) => f.fecha,
      getTotal: (f) => Number(f.total) || 0,
    });
    return groups.map((g) => ({
      key: g.key, mes: g.label, totalMes: g.total,
      dias: g.days.map((d) => ({ key: d.key, fecha: d.label, totalDia: d.total, ventas: d.items })),
    }));
  });

  historialVentasFiltradoMes = computed(() => {
    if (!this.filtroMesAnio()) return this.historialVentas();
    return this.historialVentas().filter((m) => m.key === this.filtroMesAnio());
  });

  paginacionData = computed(() => paginateArray(this.historialVentasFiltradoMes(), this.paginaMesActual(), this.mesesPorPagina));
  totalPaginasMes = computed(() => this.paginacionData().totalPages);
  mesesPaginados = computed(() => this.paginacionData().pageItems);

  constructor(
    private readonly ventasApi: Sucursal1VentasApiService,
    private readonly route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    const rol = (sessionStorage.getItem('rolUsuario') || '').replace(/\s+/g, '').toLowerCase();
    const sucursalId = sessionStorage.getItem('sucursalId'); 
    this.esVentaPorUnidad.set(rol === 'sucursal2' || sucursalId === '2' || sucursalId === '3'); 

    this.cargarFacturas();
    const nueva = this.route.snapshot.queryParamMap.get('nueva');
    if (nueva) this.mensaje.set('Factura registrada correctamente.');
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

  obtenerSerieComprobante(comprobanteId: string): string {
    const [serie] = String(comprobanteId ?? '').split('-');
    return serie?.trim() || '-';
  }

  obtenerNumeroComprobante(comprobanteId: string): string {
    const partes = String(comprobanteId ?? '').split('-');
    const numero = partes.length > 1 ? partes.slice(1).join('-').trim() : '';
    return numero || '-';
  }

  // ── API Y MODAL ──
  private cargarFacturas() {
    this.cargando.set(true);
    this.ventasApi.obtenerFacturas().subscribe({
      next: (lista) => {
        this.facturas.set([...lista]);
        this.detalleCache.clear();
        this.detalleRequestEnCurso.clear();
        this.paginaMesActual.set(1);
        this.cargando.set(false);
      },
      error: () => {
        this.facturas.set([]);
        this.cargando.set(false);
      },
    });
  }

  async abrirDetalleFactura(venta: FacturaListadoApi): Promise<void> {
    if (this.generandoPdf() || this.cargandoDetalle()) return;
    this.cargandoDetalle.set(true);
    this.cargandoDetalleFacturaId.set(venta.facturaId);

    try {
      const detalle = await this.obtenerFacturaDetalleConCache(venta.facturaId);
      this.facturaDetalle.set(detalle);
      this.mostrarModalDetalle.set(true);
    } catch {
      this.facturaDetalle.set(null);
    } finally {
      this.cargandoDetalle.set(false);
      this.cargandoDetalleFacturaId.set(null);
    }
  }

  cerrarDetalleFactura(): void {
    this.mostrarModalDetalle.set(false);
    this.facturaDetalle.set(null);
  }

  async descargarComprobanteDesdeAccion(venta: FacturaListadoApi): Promise<void> {
    if (this.generandoPdf()) return;
    this.generandoPdf.set(true);
    this.cargandoDetalleFacturaId.set(venta.facturaId);
    
    try {
      const pdf = await firstValueFrom(this.ventasApi.descargarFacturaPdf(venta.facturaId));
      this.descargarBlob(pdf, `${venta.tipoComprobante || 'comprobante'}-${venta.id}.pdf`);
    } finally {
      this.generandoPdf.set(false);
      this.cargandoDetalleFacturaId.set(null);
    }
  }

  async enviarFacturaPorCorreoDesdeAccion(venta: FacturaListadoApi): Promise<void> {
    if (this.envioCorreoEnCurso.has(venta.facturaId)) return;
    const confirmado = window.confirm('Se enviara la factura por correo automaticamente. Deseas continuar?');
    if (!confirmado) return;

    this.envioCorreoEnCurso.add(venta.facturaId);
    this.enviandoCorreoFacturaId.set(venta.facturaId);

    try {
      const response = await firstValueFrom(this.ventasApi.enviarFacturaPorCorreo(venta.facturaId));
      this.mensaje.set(response?.mensaje || 'Factura enviada por correo correctamente.');
      window.alert(this.mensaje());
    } catch (error: any) {
      const mensajeError = error?.error?.mensaje || error?.error?.Mensaje || 'Error al enviar.';
      this.mensaje.set(mensajeError);
      window.alert(mensajeError);
    } finally {
      this.envioCorreoEnCurso.delete(venta.facturaId);
      this.enviandoCorreoFacturaId.set(null);
    }
  }

  private obtenerFacturaDetalleConCache(facturaId: number): Promise<FacturaDetalleApi> {
    const cache = this.detalleCache.get(facturaId);
    if (cache) return Promise.resolve(cache);

    const requestEnCurso = this.detalleRequestEnCurso.get(facturaId);
    if (requestEnCurso) return requestEnCurso;

    const request = firstValueFrom(this.ventasApi.obtenerFacturaDetalle(facturaId))
      .then((detalle) => {
        this.detalleCache.set(facturaId, detalle);
        return detalle;
      })
      .finally(() => this.detalleRequestEnCurso.delete(facturaId));

    this.detalleRequestEnCurso.set(facturaId, request);
    return request;
  }

  private descargarBlob(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName.replace(/[\\/:*?"<>|]/g, '-');
    link.click();
    window.URL.revokeObjectURL(url);
  }
}