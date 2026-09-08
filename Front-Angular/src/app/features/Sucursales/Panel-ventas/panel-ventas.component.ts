import { CommonModule } from '@angular/common';
import { Component, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ProductosApiService } from '../../../core/productos-api.service';
import { TransferenciasApiService } from '../../../core/transferencias-api.service';
import { PaginationComponent } from '../../../shared/pagination/pagination.component';
import { paginateArray } from '../../../shared/utils/pagination.util';
import { FacturarVComponent, CarritoItemVm } from './facturar-v/facturar-v.component';

export interface ProductoVentaVm {
  productoId: number;
  id: string;
  nombre: string;
  categoria: string;
  undsPorCaja: number;
  stockProductos: number;
  precioProductos: number;
}

@Component({
  selector: 'app-panel-ventas',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, FacturarVComponent],
  templateUrl: './panel-ventas.component.html',
  styleUrl: './panel-ventas.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush // <-- Máximo rendimiento activado
})
export class PanelVentasComponent implements OnInit {
  // ── ESTADO GLOBAL (Signals Puros) ──
  productos = signal<ProductoVentaVm[]>([]);
  carrito = signal<CarritoItemVm[]>([]);
  cargando = signal(false);
  busquedaGeneral = signal('');
  categoriaSeleccionada = signal('Todas las categorias');
  paginaActual = signal(1);
  mostrarModalCliente = signal(false);

  esVentaPorUnidad = signal(false);

  readonly pageSize = 15;

  // ── PROPIEDADES COMPUTADAS ──
  categorias = computed(() => {
    const base = this.productos()
      .map((p) => p.categoria)
      .filter((cat, index, arr) => !!cat && arr.indexOf(cat) === index)
      .sort((a, b) => a.localeCompare(b));
    return ['Todas las categorias', ...base];
  });

  productosFiltrados = computed(() => {
    const termino = this.busquedaGeneral().trim().toLowerCase();
    const categoria = this.categoriaSeleccionada();

    return this.productos().filter((prod) => {
      const pasaCategoria = categoria === 'Todas las categorias' || prod.categoria === categoria;
      if (!pasaCategoria) return false;
      if (!termino) return true;
      return (
        prod.nombre.toLowerCase().includes(termino) ||
        prod.categoria.toLowerCase().includes(termino) ||
        prod.id.toLowerCase().includes(termino)
      );
    });
  });

  paginacionData = computed(() => paginateArray(this.productosFiltrados(), this.paginaActual(), this.pageSize));
  totalPaginas = computed(() => this.paginacionData().totalPages);
  productosPaginados = computed(() => this.paginacionData().pageItems);

  totalVenta = computed(() => {
    return this.carrito().reduce((acumulado, item) => acumulado + item.precioProductos * item.cantidadProductos, 0);
  });

  constructor(
    private readonly transferenciasApi: TransferenciasApiService,
    private readonly productosApi: ProductosApiService
  ) {}

  ngOnInit(): void {
    const rol = sessionStorage.getItem('rolUsuario');
    this.esVentaPorUnidad.set(rol === 'Sucursal2'); // Si es Sucursal2, se vuelve TRUE

    this.cargarProductos();
  }

  // ── LÓGICA DEL CARRITO ──
  agregarAlCarrito(producto: ProductoVentaVm) {
    if (producto.stockProductos <= 0) return;

    // Actualizar el carrito
    this.carrito.update((estadoActual) => {
      const existente = estadoActual.find((item) => item.productoId === producto.productoId);
      if (existente) {
        return estadoActual.map((item) =>
          item.productoId === producto.productoId
            ? { ...item, cantidadProductos: item.cantidadProductos + 1 }
            : item
        );
      } else {
        return [
          ...estadoActual,
          {
            productoId: producto.productoId,
            id: producto.id,
            nombre: producto.nombre,
            undsPorCaja: producto.undsPorCaja,
            precioProductos: producto.precioProductos,
            cantidadProductos: 1,
          },
        ];
      }
    });

    // Descontar del stock en pantalla
    this.productos.update((estadoActual) =>
      estadoActual.map((p) =>
        p.productoId === producto.productoId ? { ...p, stockProductos: p.stockProductos - 1 } : p
      )
    );
  }

  quitarDelCarrito(itemCarrito: CarritoItemVm, index: number) {
    // Regresar el stock a la pantalla
    this.productos.update((estadoActual) =>
      estadoActual.map((p) =>
        p.productoId === itemCarrito.productoId
          ? { ...p, stockProductos: p.stockProductos + itemCarrito.cantidadProductos }
          : p
      )
    );

    // Eliminar del array del carrito
    this.carrito.update((estadoActual) => estadoActual.filter((_, i) => i !== index));
  }

  cambiarCantidadCarrito(index: number, nuevaCantidad: number) {
    // Evitar valores menores a 1 o nulos
    if (!nuevaCantidad || nuevaCantidad < 1) nuevaCantidad = 1;

    const itemCarrito = this.carrito()[index];
    if (!itemCarrito) return;

    const producto = this.productos().find(p => p.productoId === itemCarrito.productoId);
    if (!producto) return;

    // Calculamos el stock máximo real que el usuario puede llevarse
    const maximoPermitido = itemCarrito.cantidadProductos + producto.stockProductos;

    // Si intenta tipear más del stock disponible, lo limitamos al máximo
    if (nuevaCantidad > maximoPermitido) {
      nuevaCantidad = maximoPermitido;
    }

    // Calculamos la diferencia para ajustar la tabla principal
    const diferencia = nuevaCantidad - itemCarrito.cantidadProductos;

    // 1. Actualizamos el valor en el carrito
    this.carrito.update((items) => {
      const nuevos = [...items];
      nuevos[index] = { ...nuevos[index], cantidadProductos: nuevaCantidad };
      return nuevos;
    });

    // 2. Descontamos o devolvemos el stock a la lista de la izquierda
    this.productos.update((items) =>
      items.map((p) =>
        p.productoId === itemCarrito.productoId
          ? { ...p, stockProductos: p.stockProductos - diferencia }
          : p
      )
    );
  }

  abrirModalFacturar() {
    if (this.carrito().length === 0) return;
    this.mostrarModalCliente.set(true);
  }

  onFacturacionExitosa() {
    this.mostrarModalCliente.set(false);
    this.carrito.set([]);
    this.cargarProductos();
  }

  // ── CARGA DE DATOS ──
  private cargarProductos() {
    this.cargando.set(true);
    const esUnidad = this.esVentaPorUnidad();

    forkJoin({
      stock: this.transferenciasApi.obtenerStockActual(),
      catalogo: this.productosApi.obtenerProductos(),
    }).subscribe({
      next: ({ stock, catalogo }) => {
        const catalogoPorId = new Map(catalogo.map((p) => [p.id, p]));
        const stockPorProductoId = new Map(stock.map((s) => [s.productoId, s]));

        const baseCatalogo: ProductoVentaVm[] = catalogo.map((producto) => {
          const itemStock = stockPorProductoId.get(producto.id);
          const undsPorCaja = Number(itemStock?.unidadesPorCaja ?? producto.unidadesPorCaja ?? 1);

          const stockVisual = Number(itemStock?.stockCajas ?? 0);

          const precioVisual = esUnidad 
                ? Number((producto as any).costoUnitario ?? (producto.precioVentaCaja / undsPorCaja)) 
                : Number(itemStock?.precioCaja ?? producto.precioVentaCaja ?? 0);

          return {
            productoId: producto.id,
            id: itemStock?.id ?? producto.sku,
            nombre: itemStock?.nombre ?? producto.nombre,
            categoria: itemStock?.categoria ?? producto.categoria,
            undsPorCaja: undsPorCaja > 0 ? undsPorCaja : 1,
            stockProductos: stockVisual,
            precioProductos: precioVisual > 0 ? precioVisual : 0,
          };
        });

        const extrasSoloEnStock: ProductoVentaVm[] = stock
          .filter((item) => !catalogoPorId.has(item.productoId))
          .map((item) => {
            const undsPorCaja = Number(item.unidadesPorCaja ?? 1);

            const stockVisual = Number(item.stockCajas ?? 0);
            
            const precioVisual = esUnidad 
                ? Number((item.precioCaja ?? 0) / undsPorCaja) // Si es extra, deducimos la unidad dividiendo la caja
                : Number(item.precioCaja ?? 0);

            return {
              productoId: item.productoId,
              id: item.id,
              nombre: item.nombre,
              categoria: item.categoria,
              undsPorCaja: undsPorCaja > 0 ? undsPorCaja : 1,
              stockProductos: stockVisual,
              precioProductos: precioVisual > 0 ? precioVisual : 0,
            };
          });

        this.productos.set(baseCatalogo.sort((a, b) => a.nombre.localeCompare(b.nombre)));
        this.paginaActual.set(1);
        this.cargando.set(false);
      },
      error: () => {
        this.productos.set([]);
        this.cargando.set(false);
      },
    });
  }
}