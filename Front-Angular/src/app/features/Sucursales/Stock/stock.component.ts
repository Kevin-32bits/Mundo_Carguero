import { CommonModule } from '@angular/common';
import { Component, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ProductosApiService } from '../../../core/productos-api.service';
import {
  CrearTransferenciaApi,
  TransferenciasApiService,
} from '../../../core/transferencias-api.service';
import { PaginationComponent } from '../../../shared/pagination/pagination.component';
import { paginateArray } from '../../../shared/utils/pagination.util';

interface StockSucursalVm {
  productoId: number;
  id: string;
  nombre: string;
  categoria: string;
  unidadesPorCaja: number;
  costoCaja: number;
  stockCajas: number;
}

interface PedidoVm {
  productoId: number;
  id: string;
  nombre: string;
  unidadesPorCaja: number;
  costoCaja: number;
  stockCajas: number;
  cantidadPedir: number;
}

@Component({
  selector: 'app-stock',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  templateUrl: './stock.component.html',
  styleUrl: './stock.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StockComponent implements OnInit {
  // ── ESTADO GLOBAL (Signals Puros) ──
  inventario = signal<StockSucursalVm[]>([]);
  solicitudPedido = signal<PedidoVm[]>([]);
  cargando = signal(false);
  enviando = signal(false);
  busquedaGeneral = signal('');
  categoriaSeleccionada = signal('Todas las categorias');
  paginaActual = signal(1);
  readonly pageSize = 15;

  // ── PROPIEDADES COMPUTADAS ──
  categorias = computed(() => {
    const base = this.inventario()
      .map((p) => p.categoria)
      .filter((cat, index, arr) => !!cat && arr.indexOf(cat) === index)
      .sort((a, b) => a.localeCompare(b));
    return ['Todas las categorias', ...base];
  });

  inventarioFiltrado = computed(() => {
    const termino = this.busquedaGeneral().trim().toLowerCase();
    const categoria = this.categoriaSeleccionada();
    
    return this.inventario().filter((prod) => {
      const pasaCategoria = categoria === 'Todas las categorias' || prod.categoria === categoria;
      if (!pasaCategoria) return false;
      if (!termino) return true;
      return prod.nombre.toLowerCase().includes(termino) || prod.id.toLowerCase().includes(termino);
    });
  });

  paginacionData = computed(() => paginateArray(this.inventarioFiltrado(), this.paginaActual(), this.pageSize));
  totalPaginas = computed(() => this.paginacionData().totalPages);
  inventarioPaginado = computed(() => this.paginacionData().pageItems);

  constructor(
    private readonly transferenciasApi: TransferenciasApiService,
    private readonly productosApi: ProductosApiService
  ) 
  {

  }

  ngOnInit(): void {
    this.cargarStock();
  }

  getEstadoStock(prod: StockSucursalVm) {
    if (prod.stockCajas === 0) return 'Agotado';
    if (prod.stockCajas <= 15) return 'Bajo';
    return 'Normal';
  }

  agregarAlPedido(producto: StockSucursalVm) {
    this.solicitudPedido.update((pedido) => {
      const existe = pedido.find((item) => item.productoId === producto.productoId);
      if (existe) {
        return pedido.map((item) =>
          item.productoId === producto.productoId
            ? { ...item, cantidadPedir: item.cantidadPedir + 1 }
            : item
        );
      } else {
        return [
          ...pedido,
          {
            productoId: producto.productoId,
            id: producto.id,
            nombre: producto.nombre,
            unidadesPorCaja: producto.unidadesPorCaja,
            costoCaja: producto.costoCaja,
            stockCajas: producto.stockCajas,
            cantidadPedir: 1,
          },
        ];
      }
    });
  }

  quitarDelPedido(index: number) {
    this.solicitudPedido.update((pedido) => pedido.filter((_, i) => i !== index));
  }

  enviarSolicitud() {
    if (this.solicitudPedido().length === 0) return;

    const detalles = this.solicitudPedido()
      .filter((i) => Number(i.cantidadPedir) > 0)
      .map((i) => ({
        productoId: i.productoId,
        cajas: Number(i.cantidadPedir),
        costoCaja: Number(i.costoCaja ?? 0),
        unidadesPorCaja: Number(i.unidadesPorCaja ?? 1),
      }));

    if (detalles.length === 0) return;

    // Paquete limpio sin el ID
    const payload: CrearTransferenciaApi = {
      sucursalDestinoId: 0,
      detalles,
    };

    this.enviando.set(true);
    this.transferenciasApi.crearSolicitudSucursal(payload).subscribe({
      next: (transferencia) => {
        this.enviando.set(false);
        alert(`Solicitud enviada con exito. Codigo: ${transferencia.id}`);
        this.solicitudPedido.set([]);
        this.cargarStock();
      },
      error: (error) => {
        this.enviando.set(false);
        const mensaje =
          error?.error?.mensaje ||
          error?.error?.Mensaje ||
          error?.message ||
          'No se pudo enviar la solicitud al almacen.';
        alert(mensaje);
      },
    });
  }

private cargarStock() {
    this.cargando.set(true);
    forkJoin({
      // Ya estabas usando obtenerStockActual() aquí, ¡perfecto!
      stock: this.transferenciasApi.obtenerStockActual(), 
      catalogo: this.productosApi.obtenerProductos(),
    }).subscribe({
      next: ({ stock, catalogo }) => {
        const stockPorProductoId = new Map(stock.map((s) => [s.productoId, s]));
        const catalogoPorId = new Map(catalogo.map((p) => [p.id, p]));

        const baseCatalogo: StockSucursalVm[] = catalogo.map((producto) => {
          const itemStock = stockPorProductoId.get(producto.id);
          // IMPORTANTE: Como los traslados de almacén a tienda SIEMPRE son por cajas cerradas, 
          // aquí no aplicamos la lógica de unidades sueltas. Le mostramos cajas a ambas sucursales.
          const stockCajas = Number(itemStock?.stockCajas ?? 0); 

          return {
            productoId: producto.id,
            id: itemStock?.id ?? producto.sku,
            nombre: itemStock?.nombre ?? producto.nombre,
            categoria: itemStock?.categoria ?? producto.categoria,
            unidadesPorCaja: Number(producto.unidadesPorCaja ?? itemStock?.unidadesPorCaja ?? 1),
            costoCaja: Number(producto.costoCaja ?? 0),
            stockCajas: Number.isFinite(stockCajas) ? stockCajas : 0,
          };
        });

        const extrasSoloEnStock: StockSucursalVm[] = stock
          .filter((item) => !catalogoPorId.has(item.productoId))
          .map((item) => ({
            productoId: item.productoId,
            id: item.id,
            nombre: item.nombre,
            categoria: item.categoria,
            unidadesPorCaja: Number(item.unidadesPorCaja ?? 1),
            costoCaja: 0,
            stockCajas: Number(item.stockCajas ?? 0),
          }));

        this.inventario.set(
          [...baseCatalogo, ...extrasSoloEnStock].sort((a, b) => a.nombre.localeCompare(b.nombre))
        );
        this.paginaActual.set(1);
        this.cargando.set(false);
      },
      error: () => {
        this.inventario.set([]);
        this.cargando.set(false);
      },
    });
  }
}