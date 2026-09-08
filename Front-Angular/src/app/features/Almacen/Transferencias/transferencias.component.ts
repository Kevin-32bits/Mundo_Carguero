import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ProductosApiService } from '../../../core/productos-api.service';
import {
  TransferenciaDetalleItemApi,
  TransferenciaListadoApi,
  TransferenciaProductoCatalogoApi,
  TransferenciasApiService
} from '../../../core/transferencias-api.service';

type EstadoVista = 'Pendiente' | 'Recibido';

interface ProductoSeleccionado {
  productoId: number;
  sku: string;
  descripcion: string;
  cajas: number;
  unidadesPorCaja: number;
  costoCaja: number;
}

@Component({
  selector: 'app-transferencias',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './transferencias.component.html',
  styleUrls: ['./transferencias.component.css']
})
export class TransferenciasComponent {
  readonly estadoVista = signal<EstadoVista>('Pendiente');
  readonly filtro = signal('');

  readonly pendientes = signal<TransferenciaListadoApi[]>([]);
  readonly recibidos = signal<TransferenciaListadoApi[]>([]);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);

  readonly modalAbierto = signal(false);
  readonly catalogoBusqueda = signal('');
  readonly catalogo = signal<TransferenciaProductoCatalogoApi[]>([]);
  readonly productosSeleccionados = signal<ProductoSeleccionado[]>([]);

  // 👇 NUEVA SIGNAL: Para saber a qué sucursal le envía el almacén
  readonly sucursalDestinoId = signal<number>(1); 

  readonly nombreResponsable = signal<string>('');
  readonly enviando = signal(false);

  readonly modalDetalleAbierto = signal(false);
  readonly detalleId = signal<string>('');
  readonly detalleItems = signal<TransferenciaDetalleItemApi[]>([]);
  readonly detalleCargando = signal(false);
  readonly detalleTransferenciaId = signal<number | null>(null);
  readonly detalleEstado = signal<string>('');
  readonly detalleOrigen = signal('');
  readonly detalleDestino = signal('');
  readonly detalleResponsable = signal('');
  readonly detalleSolicitadoPor = signal('');
  readonly detalleAutorizadoPor = signal('');
  readonly confirmandoDetalle = signal(false);
  readonly eliminandoDetalleProductoIds = signal<Record<number, boolean>>({});
  readonly buscandoCatalogo = signal(false);
  readonly costoCajaPorProductoId = signal<Record<number, number>>({});
  readonly costoCajaPorSku = signal<Record<string, number>>({});
  readonly stockCajasPorProductoId = signal<Record<number, number>>({});
  readonly stockCajasPorSku = signal<Record<string, number>>({});
  readonly anulandoDetalle = signal(false);

  readonly transferenciasFiltradas = computed(() => {
    const lista = this.estadoVista() === 'Pendiente' ? this.pendientes() : this.recibidos();
    const q = this.filtro().trim().toLowerCase();
    if (!q) return lista;

    return lista.filter((t) =>
      t.id.toLowerCase().includes(q) ||
      t.origen.toLowerCase().includes(q) ||
      t.destino.toLowerCase().includes(q) ||
      t.responsable.toLowerCase().includes(q)
    );
  });

  readonly resultadosCatalogo = computed(() => this.catalogo().slice(0, 10));

  constructor(
    private readonly transferenciasApi: TransferenciasApiService,
    private readonly productosApi: ProductosApiService
  ) {
    
    // En el constructor o método de inicialización
    this.nombreResponsable.set(sessionStorage.getItem('nombre') || 'Usuario Actual');

    this.cargarTodo();
    this.cargarCatalogosModal();
    this.cargarCostosBase();
  }

  cambiarVista(estado: EstadoVista): void {
    this.estadoVista.set(estado);
  }

  abrirModalCrear(): void {
    this.modalAbierto.set(true);
    this.catalogoBusqueda.set('');
    this.productosSeleccionados.set([]);
    this.catalogo.set([]);
    this.error.set(null);
    this.sucursalDestinoId.set(1); // Reiniciamos el select a la Sucursal 1 por defecto
  }

  cerrarModalCrear(): void {
    this.modalAbierto.set(false);
    this.enviando.set(false);
  }

  abrirDetalle(t: TransferenciaListadoApi): void {
    this.modalDetalleAbierto.set(true);
    this.detalleTransferenciaId.set(t.transferenciaId);
    this.detalleEstado.set(t.estado);
    this.detalleOrigen.set(t.origen);
    this.detalleDestino.set(t.destino);
    this.detalleResponsable.set(t.responsable);
    this.detalleSolicitadoPor.set(this.resolverSolicitadoPor(t));
    this.detalleAutorizadoPor.set(this.resolverAutorizadoPor(t));
    this.detalleId.set(t.id);
    this.detalleItems.set([]);
    this.detalleCargando.set(true);
    this.error.set(null);

    this.transferenciasApi.obtenerDetalleTransferencia(t.transferenciaId).subscribe({
      next: (items) => {
        this.detalleItems.set(items);
        this.detalleCargando.set(false);
      },
      error: () => {
        this.detalleCargando.set(false);
        this.error.set('No se pudo cargar el detalle de la transferencia.');
      }
    });
  }

  cerrarDetalle(): void {
    this.modalDetalleAbierto.set(false);
    this.detalleTransferenciaId.set(null);
    this.detalleEstado.set('');
    this.detalleOrigen.set('');
    this.detalleDestino.set('');
    this.detalleResponsable.set('');
    this.detalleSolicitadoPor.set('');
    this.detalleAutorizadoPor.set('');
    this.confirmandoDetalle.set(false);
    this.anulandoDetalle.set(false);
    this.eliminandoDetalleProductoIds.set({});
  }

  confirmarDesdeDetalle(): void {
    const transferenciaId = this.detalleTransferenciaId();
    if (!transferenciaId || this.detalleEstado() !== 'Pendiente') return;
    const detalles = this.detalleItems();
    
    if (detalles.length === 0) {
      this.error.set('Debes agregar al menos un producto.');
      return;
    }
    
    const sinStock = detalles.filter((item) => this.estadoStockItem(item) === 'insuficiente');
    if (sinStock.length > 0) {
      this.error.set('Hay productos sin stock suficiente. Corrige o anula la reposicion.');
      return;
    }

    this.confirmandoDetalle.set(true);
    this.error.set(null);
    this.confirmarEnvioDetalle(transferenciaId);
  }

  eliminarItemDesdeDetalle(item: TransferenciaDetalleItemApi, index: number): void {
    const transferenciaId = this.detalleTransferenciaId();
    if (!transferenciaId || this.detalleEstado() !== 'Pendiente') return;
    const productoId = this.obtenerProductoId(item);
    const detalleId = this.obtenerDetalleItemId(item);
    const sku = this.obtenerSku(item);
    if (!productoId && !detalleId && !sku) {
      this.error.set('No se pudo identificar el producto a eliminar.');
      return;
    }
    const claveEliminacion = productoId || detalleId;

    if (claveEliminacion > 0) {
      this.marcarEliminandoDetalle(claveEliminacion, true);
    }
    this.error.set(null);

    this.transferenciasApi
      .eliminarItemTransferencia(transferenciaId, { productoId, detalleId, sku })
      .subscribe({
      next: () => {
        this.detalleItems.update((items) =>
          items.filter((x, i) => {
            if (i === index) return false;
            const xProductoId = this.obtenerProductoId(x);
            const xDetalleId = this.obtenerDetalleItemId(x);

            if (productoId > 0 && xProductoId > 0) {
              return xProductoId !== productoId;
            }
            if (detalleId > 0 && xDetalleId > 0) {
              return xDetalleId !== detalleId;
            }
            if (sku) {
              return this.obtenerSku(x) !== sku;
            }
            return true;
          })
        );
        this.pendientes.update((lista) =>
          lista.map((t) =>
            t.transferenciaId === transferenciaId
              ? { ...t, items: Math.max(0, t.items - 1) }
              : t
          )
        );
        if (claveEliminacion > 0) {
          this.marcarEliminandoDetalle(claveEliminacion, false);
        }
      },
      error: (err: any) => {
        if (claveEliminacion > 0) {
          this.marcarEliminandoDetalle(claveEliminacion, false);
        }
        const detalleError =
          err?.error?.mensaje ||
          err?.error?.Mensaje ||
          (err?.status ? `HTTP ${err.status}` : 'sin detalle');
        this.error.set(`No se pudo eliminar el item de la solicitud pendiente (${detalleError}).`);
      }
      });
  }

  estaEliminandoDetalle(productoId: number): boolean {
    return !!this.eliminandoDetalleProductoIds()[productoId];
  }

  estaEliminandoDetalleItem(item: any): boolean {
    const clave = this.obtenerProductoId(item) || this.obtenerDetalleItemId(item);
    return clave > 0 ? this.estaEliminandoDetalle(clave) : false;
  }

  buscarCatalogo(): void {
    this.buscandoCatalogo.set(true);
    this.transferenciasApi.obtenerProductosCatalogo(this.catalogoBusqueda()).subscribe({
      next: (data) => {
        this.catalogo.set(data);
        this.buscandoCatalogo.set(false);
      },
      error: () => {
        this.catalogo.set([]);
        this.buscandoCatalogo.set(false);
      }
    });
  }

  agregarProducto(producto: TransferenciaProductoCatalogoApi): void {
    const id = this.obtenerProductoId(producto);
    if (!id) return;

    const yaExiste = this.productosSeleccionados().some((p) => p.productoId === id);
    if (yaExiste) return;

    this.productosSeleccionados.update((items) => [
      ...items,
      {
        productoId: producto.productoId,
        sku: producto.sku,
        descripcion: producto.nombre,
        cajas: 1,
        unidadesPorCaja: Math.max(1, Number(producto.unidadesPorCaja ?? 1)),
        costoCaja: this.extraerCostoProducto(producto)
      }
    ]);
  }

  quitarProducto(productoId: number): void {
    this.productosSeleccionados.update((items) => items.filter((x) => x.productoId !== productoId));
  }

  actualizarCajas(productoId: number, cajas: number): void {
    const valor = Number.isFinite(cajas) && cajas > 0 ? Math.floor(cajas) : 1;
    this.productosSeleccionados.update((items) =>
      items.map((x) => (x.productoId === productoId ? { ...x, cajas: valor } : x))
    );
  }

  confirmarTransferencia(): void {
    const detalles = this.productosSeleccionados();

    if (detalles.length === 0) {
      this.error.set('Debes seleccionar al menos un producto.');
      return;
    }
    const sinStock = detalles.filter((item) => this.estadoStockItem(item) === 'insuficiente');
    if (sinStock.length > 0) {
      this.error.set('Hay productos sin stock suficiente para completar la transferencia.');
      return;
    }

    console.log('Valor de sucursalDestinoId antes de enviar:', this.sucursalDestinoId());

    this.enviando.set(true);
    this.error.set(null);

    // 👇 Usamos el método genérico y pasamos el destino dinámico
    this.transferenciasApi
      .crearReposicionAlmacen({
        sucursalDestinoId: this.sucursalDestinoId(), 
        observacion: null,
        detalles: detalles.map((d) => ({
          productoId: d.productoId,
          cajas: d.cajas,
          costoCaja: d.costoCaja,
          unidadesPorCaja: d.unidadesPorCaja,
        }))
      })
      .subscribe({
        next: (creada) => {
          this.transferenciasApi.confirmarEnvioTransferencia(creada.transferenciaId, {
            empleadoApruebaId: 0 
          }).subscribe({
            next: () => {
              this.cargarTodo(() => {
                this.estadoVista.set('Recibido');
                this.cerrarModalCrear();
              });
            },
            error: () => {
              this.enviando.set(false);
              this.error.set('Se creó la transferencia, pero no se pudo confirmar el envío.');
            }
          });
        },
        error: (error) => {
          this.enviando.set(false);
          const detalle = error?.error?.mensaje || error?.error?.Mensaje || error?.message || '';
          this.error.set(
            detalle
              ? `No se pudo crear la transferencia: ${detalle}`
              : 'No se pudo crear la transferencia. Verifica el destino y productos con cantidad valida.'
          );
        }
      });
  }

  anularReposicionDesdeDetalle(): void {
    const transferenciaId = this.detalleTransferenciaId();
    if (!transferenciaId || this.detalleEstado() !== 'Pendiente') return;

    const confirmado = window.confirm('Se anulara la reposicion por falta de stock. Deseas continuar?');
    if (!confirmado) return;

    this.anulandoDetalle.set(true);
    this.error.set(null);

    this.transferenciasApi.anularTransferenciaPorFaltaStock(transferenciaId).subscribe({
      next: () => {
        this.cargarTodo(() => {
          this.anulandoDetalle.set(false);
          this.cerrarDetalle();
        });
      },
      error: () => {
        this.anulandoDetalle.set(false);
        this.error.set('No se pudo anular la reposicion.');
      }
    });
  }

  private cargarTodo(done?: () => void): void {
    this.cargando.set(true);
    this.error.set(null);

    // 👇 Usamos los métodos genéricos
    forkJoin({
      pendientes: this.transferenciasApi.obtenerTransferencias('Pendiente'),
      recibidos: this.transferenciasApi.obtenerTransferencias('Recibido')
    }).subscribe({
      next: ({ pendientes, recibidos }) => {
        this.pendientes.set(pendientes);
        this.recibidos.set(recibidos);
        this.cargando.set(false);
        this.enviando.set(false);
        done?.();
      },
      error: () => {
        this.cargando.set(false);
        this.enviando.set(false);
        this.error.set('No se pudo cargar transferencias.');
      }
    });
  }

  private cargarCatalogosModal(): void {
    this.buscarCatalogo();
  }

  private confirmarEnvioDetalle(transferenciaId: number): void {
    this.transferenciasApi.confirmarEnvioTransferencia(transferenciaId, { empleadoApruebaId: 0 }).subscribe({
      next: () => {
        this.cargarTodo(() => {
          this.confirmandoDetalle.set(false);
          this.cerrarDetalle();
          this.estadoVista.set('Recibido');
        });
      },
      error: (error) => {
        this.confirmandoDetalle.set(false);
        this.error.set(this.obtenerMensajeError(error, 'No se pudo confirmar el envio desde el detalle.'));
      }
    });
  }

  obtenerSubTotal(item: ProductoSeleccionado): number {
    return item.cajas * item.costoCaja;
  }

  obtenerSubTotalDetalle(item: TransferenciaDetalleItemApi): number {
    return item.cajas * this.extraerCostoProducto(item);
  }

  formatearMoneda(valor: number): string {
    return `S/ ${valor.toFixed(2)}`;
  }

  extraerCostoProducto(producto: any): number {
    const posibles = [
      producto?.precioVentaCaja,
      producto?.PrecioVentaCaja,
      producto?.precioCaja,
      producto?.PrecioCaja,
      producto?.costoCaja,
      producto?.CostoCaja,
      producto?.costo,
      producto?.Costo,
      producto?.precio,
      producto?.Precio
    ];

    for (const v of posibles) {
      const n = Number(v);
      if (Number.isFinite(n) && n >= 0) return n;
    }

    const id = Number(producto?.productoId ?? producto?.id ?? 0);
    if (id > 0) {
      const porId = this.costoCajaPorProductoId()[id];
      if (Number.isFinite(porId) && porId >= 0) return porId;
    }

    const sku = String(producto?.sku ?? '').trim().toUpperCase();
    if (sku) {
      const porSku = this.costoCajaPorSku()[sku];
      if (Number.isFinite(porSku) && porSku >= 0) return porSku;
    }

    return 0;
  }

  stockDisponible(item: any): number | null {
    const id = this.obtenerProductoId(item);
    if (id > 0) {
      const stockId = this.stockCajasPorProductoId()[id];
      if (Number.isFinite(stockId)) return stockId;
    }

    const sku = this.obtenerSku(item);
    if (sku) {
      const stockSku = this.stockCajasPorSku()[sku];
      if (Number.isFinite(stockSku)) return stockSku;
    }

    return null;
  }

  estadoStockItem(item: any): 'suficiente' | 'insuficiente' | 'sin-dato' {
    const stock = this.stockDisponible(item);
    if (stock === null) return 'sin-dato';

    const cajasSolicitadas = Math.max(1, Number(item?.cajas) || 0);
    return stock >= cajasSolicitadas ? 'suficiente' : 'insuficiente';
  }

  textoStockItem(item: any): string {
    const stock = this.stockDisponible(item);
    if (stock === null) return 'Stock: sin dato';
    if (stock <= 0) return 'Sin stock';

    const cajasSolicitadas = Math.max(1, Number(item?.cajas) || 0);
    if (stock < cajasSolicitadas) {
      return `Insuficiente (${stock} disponibles)`;
    }
    return `Disponible (${stock})`;
  }

  private cargarCostosBase(): void {
    this.productosApi.obtenerProductos().subscribe({
      next: (productos) => {
        const porId: Record<number, number> = {};
        const porSku: Record<string, number> = {};
        const stockPorId: Record<number, number> = {};
        const stockPorSku: Record<string, number> = {};

        for (const p of productos) {
          const sku = String(p.sku ?? '').trim().toUpperCase();

          const precioCaja = Number(p.precioVentaCaja);
          if (Number.isFinite(precioCaja) && precioCaja >= 0) {
            porId[p.id] = precioCaja;
            porSku[sku] = precioCaja;
          }

          const stock = Number(p.stockCajas);
          if (Number.isFinite(stock) && stock >= 0) {
            stockPorId[p.id] = stock;
            stockPorSku[sku] = stock;
          }
        }

        this.costoCajaPorProductoId.set(porId);
        this.costoCajaPorSku.set(porSku);
        this.stockCajasPorProductoId.set(stockPorId);
        this.stockCajasPorSku.set(stockPorSku);
        this.sincronizarCostosEnListas();
      },
      error: () => {
        this.costoCajaPorProductoId.set({});
        this.costoCajaPorSku.set({});
        this.stockCajasPorProductoId.set({});
        this.stockCajasPorSku.set({});
      }
    });
  }

  private sincronizarCostosEnListas(): void {
    this.productosSeleccionados.update((items) =>
      items.map((x) => ({
        ...x,
        costoCaja: x.costoCaja > 0 ? x.costoCaja : this.extraerCostoProducto(x)
      }))
    );
  }

  private marcarEliminandoDetalle(productoId: number, valor: boolean): void {
    this.eliminandoDetalleProductoIds.update((estado) => {
      if (!valor) {
        const { [productoId]: _, ...resto } = estado;
        return resto;
      }
      return { ...estado, [productoId]: true };
    });
  }

  private obtenerProductoId(item: any): number {
    const candidatos = [item?.productoId, item?.idProducto, item?.productoID, item?.id];
    for (const candidato of candidatos) {
      const id = Number(candidato);
      if (Number.isInteger(id) && id > 0) return id;
    }
    return 0;
  }

  private obtenerSku(item: any): string {
    return String(item?.sku ?? item?.SKU ?? '').trim().toUpperCase();
  }

  private obtenerDetalleItemId(item: any): number {
    const candidatos = [item?.detalleId, item?.transferenciaDetalleId, item?.idDetalle, item?.detalleID];
    for (const candidato of candidatos) {
      const id = Number(candidato);
      if (Number.isInteger(id) && id > 0) return id;
    }
    return 0;
  }

  private obtenerMensajeError(error: any, mensajeBase: string): string {
    const detalle =
      error?.error?.mensaje ||
      error?.error?.Mensaje ||
      (typeof error?.error === 'string' ? error.error : '') ||
      error?.message ||
      '';

    return detalle ? `${mensajeBase}: ${detalle}` : mensajeBase;
  }

  private resolverSolicitadoPor(t: TransferenciaListadoApi): string {
    const solicitado = String(t?.solicitadoPor ?? '').trim();
    if (solicitado) return solicitado;

    const responsable = String(t?.responsable ?? '').trim();
    return responsable || 'No registrado';
  }

  private resolverAutorizadoPor(t: TransferenciaListadoApi): string {
    const autorizado = String(t?.autorizadoPor ?? '').trim();
    if (autorizado) return autorizado;

    return String(t?.estado ?? '').trim().toLowerCase() === 'pendiente'
      ? 'Pendiente de autorizacion'
      : 'No registrado';
  }
}