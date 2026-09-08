import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProductoApi, ProductosApiService } from '../../../core/productos-api.service';
import { PaginationComponent } from '../../../shared/pagination/pagination.component';
import { paginateArray } from '../../../shared/utils/pagination.util';
import { VerDetalleComponent } from './Ver-detalle/Ver-detalle.component';
import { EditarProductComponent } from './editar-product/editar-product.component';
import { ActStockComponent } from './act-stock/act-stock.component'; // <-- 1. Importamos el componente

type EstadoStock = 'alto' | 'medio' | 'bajo' | 'critico';

type PInventario = ProductoApi & {
  stockActualCajas: number;
  estadoStock: EstadoStock;
};

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    PaginationComponent, 
    EditarProductComponent,
    VerDetalleComponent,
    ActStockComponent // <-- 2. Lo agregamos a los imports
  ],
  templateUrl: 'inventario.component.html',
  styleUrls: ['./inventario.component.css'],
})
export class InventarioComponent implements OnInit {
  terminoBusqueda = '';
  filtroSeleccionado = 'Todos';
  readonly pageSize = 20;
  
  cargando = signal(false);
  errorCarga = signal('');

  filtrosCategoria = signal<string[]>(['Todos']);
  
  todosLosProductos = signal<PInventario[]>([]);
  productosFiltrados = signal<PInventario[]>([]);
  
  paginaActual = signal(1);
  
  // --- SEÑALES PARA CONTROLAR LOS 3 MODALES ---
  productoEnVista = signal<PInventario | null>(null);
  productoAEditar = signal<PInventario | null>(null); 
  productoAStock = signal<PInventario | null>(null); // <-- 3. Nueva señal para el stock

  constructor(private readonly productosApi: ProductosApiService) {}

  ngOnInit(): void {
    this.cargarProductos();
  }

  seleccionarFiltro(categoria: string): void {
    this.filtroSeleccionado = categoria;
    this.actualizarFiltro();
  }

  onBuscar(): void {
    this.actualizarFiltro();
  }

  obtenerTextoStock(estado: EstadoStock): string {
    return {
      alto: 'Alto',
      medio: 'Medio',
      bajo: 'Bajo',
      critico: 'Critico',
    }[estado];
  }

  /* --- CONTROL DE MODALES --- */
  
  // 1. Ver Detalles
  abrirDetalleProducto(producto: PInventario): void {
    this.productoEnVista.set(producto);
  }
  cerrarDetalleProducto(): void {
    this.productoEnVista.set(null);
  }

  // 2. Editar
  abrirEditarProducto(producto: PInventario): void {
    this.productoAEditar.set(producto);
  }
  cerrarEditarProducto(): void {
    this.productoAEditar.set(null);
  }

  // 3. Actualizar Stock <-- 4. Nuevos métodos
  abrirActStock(producto: PInventario): void {
    this.productoAStock.set(producto);
  }
  
  cerrarActStock(): void {
    this.productoAStock.set(null);
  }

  // AGREGAR ESTA NUEVA FUNCIÓN
  onStockActualizado(): void {
    // Vuelve a llamar a tu API de fondo de manera silenciosa
    this.cargarProductos(); 
  }

  /* --- PAGINACIÓN Y LÓGICA DE DATOS --- */

  obtenerTotalPaginas(): number {
    return paginateArray(this.productosFiltrados(), this.paginaActual(), this.pageSize).totalPages;
  }

  obtenerProductosPaginados(): PInventario[] {
    return paginateArray(this.productosFiltrados(), this.paginaActual(), this.pageSize).pageItems;
  }

  cambiarPagina(pagina: number): void {
    const totalPaginas = this.obtenerTotalPaginas();
    const paginaSegura = Math.min(Math.max(1, pagina || 1), totalPaginas);
    this.paginaActual.set(paginaSegura);
  }

  private cargarProductos(): void {
    this.cargando.set(true);
    this.errorCarga.set('');

    this.productosApi.obtenerProductos().subscribe({
      next: (productos) => {
        const productosInventario = productos.map((p) => this.mapearProducto(p));
        this.todosLosProductos.set(productosInventario);
        
        const categoriasUnicas = Array.from(new Set(productosInventario.map(p => p.categoria || 'Sin categoria')));
        const filtros = ['Todos', ...categoriasUnicas];
        this.filtrosCategoria.set(filtros);

        if (!filtros.includes(this.filtroSeleccionado)) {
          this.filtroSeleccionado = 'Todos';
        }

        this.actualizarFiltro();
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error en API:', err);
        this.todosLosProductos.set([]);
        this.productosFiltrados.set([]);
        this.filtrosCategoria.set(['Todos']);
        this.errorCarga.set('Error al conectar con el servidor del inventario.');
        this.cargando.set(false);
      },
    });
  }

  private actualizarFiltro(): void {
    const termino = this.terminoBusqueda.trim().toLowerCase();
    let filtrados = this.todosLosProductos();

    if (this.filtroSeleccionado !== 'Todos') {
      filtrados = filtrados.filter(p => (p.categoria || 'Sin categoria') === this.filtroSeleccionado);
    }

    if (termino) {
      filtrados = filtrados.filter(
        (p) => p.nombre.toLowerCase().includes(termino) || p.sku.toLowerCase().includes(termino)
      );
    }

    this.productosFiltrados.set(filtrados);
    this.paginaActual.set(1);
  }

  private mapearProducto(producto: ProductoApi): PInventario {
    const stock = Number(producto.stockCajas) || 0;
    return {
      ...producto,
      stockActualCajas: stock,
      estadoStock: this.calcularEstadoStock(stock),
    };
  }

  private calcularEstadoStock(stockCajas: number): EstadoStock {
    if (stockCajas >= 60) return 'alto';
    if (stockCajas >= 30) return 'medio';
    if (stockCajas >= 10) return 'bajo';
    return 'critico';
  }
}