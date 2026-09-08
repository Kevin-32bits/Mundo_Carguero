import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { apiUrl } from './api-url';

export interface TransferenciaListadoApi {
  transferenciaId: number;
  id: string;
  fecha: string;
  origen: string;
  destino: string;
  items: number;
  responsable: string;
  solicitadoPor?: string;
  autorizadoPor?: string;
  estado: string;
}

export interface TransferenciaProductoCatalogoApi {
  productoId: number;
  sku: string;
  nombre: string;
  unidadesPorCaja: number;
  precioVentaCaja?: number | string;
  costoCaja?: number | string;
  precioCaja?: number | string;
}

export interface TransferenciaEmpleadoCatalogoApi {
  empleadoId: number;
  nombre: string;
}

export interface CrearTransferenciaDetalleApi {
  productoId: number;
  cajas: number;
  costoCaja?: number;
  unidadesPorCaja?: number;
}

export interface CrearTransferenciaApi {
  sucursalDestinoId: number;
  observacion?: string | null;
  detalles: CrearTransferenciaDetalleApi[];
}

export interface StockSucursalApi {
  productoId: number;
  id: string;
  nombre: string;
  categoria: string;
  unidadesPorCaja: number;
  precioCaja: number;
  stockCajas: number;
}

export interface TransferenciaDetalleItemApi {
  productoId: number;
  sku: string;
  descripcion: string;
  cajas: number;
  costoCaja?: number | string;
  precioCaja?: number | string;
}

export interface TransferenciaEnvioApi {
  transferenciaId: number;
  id: string;
  fecha: string;
  origen: string;
  destino: string;
  items: number;
  responsable: string;
  solicitadoPor?: string;
  autorizadoPor?: string;
  estado: string;
}

export interface AprobarTransferenciaApi {
  empleadoApruebaId: number;
}

@Injectable({ providedIn: 'root' })
export class TransferenciasApiService {
  private readonly baseUrl = apiUrl('Transferencias');

  constructor(private readonly http: HttpClient) {}

  // 👇 1. RUTAS DE LISTADO Y STOCK GENÉRICAS
  obtenerTransferencias(estado?: string): Observable<TransferenciaListadoApi[]> {
    let params = new HttpParams();
    if (estado) {
      params = params.set('estado', estado);
    }
    // Llama a la ruta base limpia (GET /api/Transferencias)
    return this.http.get<TransferenciaListadoApi[]>(this.baseUrl, { params });
  }

  obtenerStockActual(): Observable<StockSucursalApi[]> {
    // Llama a la ruta genérica de stock
    return this.http.get<StockSucursalApi[]>(`${this.baseUrl}/stock`);
  }

  // 👇 2. RUTAS DE CATÁLOGO
  obtenerProductosCatalogo(busqueda?: string): Observable<TransferenciaProductoCatalogoApi[]> {
    let params = new HttpParams();
    if (busqueda?.trim()) {
      params = params.set('busqueda', busqueda.trim());
    }
    return this.http.get<TransferenciaProductoCatalogoApi[]>(`${this.baseUrl}/catalogo/productos`, { params });
  }

  obtenerEmpleadosAlmacen(): Observable<TransferenciaEmpleadoCatalogoApi[]> {
    return this.http.get<TransferenciaEmpleadoCatalogoApi[]>(`${this.baseUrl}/catalogo/empleados-almacen`);
  }

  obtenerEmpleadosMiSucursal(): Observable<TransferenciaEmpleadoCatalogoApi[]> {
    // Apunta al nuevo endpoint genérico para cargar a la gente de su propia sucursal
    return this.http.get<TransferenciaEmpleadoCatalogoApi[]>(`${this.baseUrl}/catalogo/empleados-sucursal`);
  }

  // 👇 3. RUTAS DE CREACIÓN DE TRANSFERENCIAS
  crearReposicionAlmacen(payload: CrearTransferenciaApi): Observable<TransferenciaListadoApi> {
    const principal = this.construirPayloadTransferencia(payload, {
      tipoTransferencia: 'Reposicion_Directa',
    });
    // Como el backend ya es inteligente, solo necesitamos enviarlo a una ruta
    return this.http.post<TransferenciaListadoApi>(`${this.baseUrl}/reposicion`, principal);
  }

  crearSolicitudSucursal(payload: CrearTransferenciaApi): Observable<TransferenciaListadoApi> {
    const principal = this.construirPayloadTransferencia(payload, {
      tipoTransferencia: 'Solicitud_Sucursal',
    });
    // Envía la solicitud de cualquier sucursal a la ruta base
    return this.http.post<TransferenciaListadoApi>(`${this.baseUrl}/solicitud`, principal);
  }

  // 👇 4. RUTAS DE DETALLE, ENVÍO Y ELIMINACIÓN (Se quedan igual)
  obtenerDetalleTransferencia(transferenciaId: number): Observable<TransferenciaDetalleItemApi[]> {
    return this.http.get<TransferenciaDetalleItemApi[]>(`${this.baseUrl}/${transferenciaId}/detalle`);
  }

  confirmarEnvioTransferencia(
    transferenciaId: number,
    payload: AprobarTransferenciaApi
  ): Observable<TransferenciaEnvioApi> {
    return this.http.post<TransferenciaEnvioApi>(`${this.baseUrl}/${transferenciaId}/enviar`, payload);
  }

  eliminarItemTransferencia(
    transferenciaId: number,
    item: { productoId?: number | null; detalleId?: number | null; sku?: string | null }
  ): Observable<void> {
    const productoId = Number(item?.productoId ?? 0);
    const detalleId = Number(item?.detalleId ?? 0);
    const sku = String(item?.sku ?? '').trim();

    const porRutaProductoId$ = productoId > 0
      ? this.http.delete<void>(`${this.baseUrl}/${transferenciaId}/detalle/${productoId}`)
      : this.http.delete<void>(`${this.baseUrl}/${transferenciaId}/detalle/0`);

    const porRutaDetalleId$ = detalleId > 0
      ? this.http.delete<void>(`${this.baseUrl}/${transferenciaId}/detalle/${detalleId}`)
      : this.http.delete<void>(`${this.baseUrl}/${transferenciaId}/detalle/0`);

    const porRutaItemProductoId$ = productoId > 0
      ? this.http.delete<void>(`${this.baseUrl}/${transferenciaId}/detalle/item/${productoId}`)
      : this.http.delete<void>(`${this.baseUrl}/${transferenciaId}/detalle/item/0`);

    const porRutaItemDetalleId$ = detalleId > 0
      ? this.http.delete<void>(`${this.baseUrl}/${transferenciaId}/detalle/item/${detalleId}`)
      : this.http.delete<void>(`${this.baseUrl}/${transferenciaId}/detalle/item/0`);

    return porRutaProductoId$.pipe(
      // Compatibilidad con distintos contratos del backend.
      catchError((): Observable<void> => porRutaDetalleId$),
      catchError((): Observable<void> => porRutaItemProductoId$),
      catchError((): Observable<void> => porRutaItemDetalleId$),
      catchError((): Observable<void> =>
        this.http.delete<void>(`${this.baseUrl}/${transferenciaId}/detalle`, {
          params: new HttpParams().set('productoId', String(productoId))
        })
      ),
      catchError((): Observable<void> =>
        this.http.delete<void>(`${this.baseUrl}/${transferenciaId}/detalle`, {
          params: new HttpParams().set('idProducto', String(productoId))
        })
      ),
      catchError((): Observable<void> =>
        this.http.delete<void>(`${this.baseUrl}/${transferenciaId}/detalle`, {
          params: new HttpParams().set('detalleId', String(detalleId))
        })
      ),
      catchError((): Observable<void> =>
        this.http.delete<void>(`${this.baseUrl}/${transferenciaId}/detalle`, {
          params: new HttpParams().set('transferenciaDetalleId', String(detalleId))
        })
      ),
      catchError((): Observable<void> =>
        this.http.delete<void>(`${this.baseUrl}/${transferenciaId}/detalle`, {
          params: new HttpParams().set('sku', sku)
        })
      ),
      catchError((): Observable<void> =>
        this.http.request<void>('delete', `${this.baseUrl}/${transferenciaId}/detalle`, {
          body: { productoId }
        })
      ),
      catchError((): Observable<void> =>
        this.http.request<void>('delete', `${this.baseUrl}/${transferenciaId}/detalle`, {
          body: { idProducto: productoId }
        })
      ),
      catchError((): Observable<void> =>
        this.http.request<void>('delete', `${this.baseUrl}/${transferenciaId}/detalle`, {
          body: { detalleId }
        })
      ),
      catchError((): Observable<void> =>
        this.http.request<void>('delete', `${this.baseUrl}/${transferenciaId}/detalle`, {
          body: { transferenciaDetalleId: detalleId }
        })
      ),
      catchError((): Observable<void> =>
        this.http.request<void>('delete', `${this.baseUrl}/${transferenciaId}/detalle`, {
          body: { sku }
        })
      ),
      catchError((): Observable<void> =>
        this.http.post<void>(`${this.baseUrl}/${transferenciaId}/detalle/eliminar`, {
          productoId,
          detalleId,
          sku
        })
      )
    ) as Observable<void>;
  }

  anularTransferenciaPorFaltaStock(transferenciaId: number, motivo = 'Falta de stock'): Observable<void> {
    const payload = { motivo };

    return this.http.post<void>(`${this.baseUrl}/${transferenciaId}/anular`, payload).pipe(
      catchError(() => this.http.post<void>(`${this.baseUrl}/${transferenciaId}/cancelar`, payload)),
      catchError(() => this.http.post<void>(`${this.baseUrl}/${transferenciaId}/anular-reposicion`, payload)),
      catchError(() => this.http.put<void>(`${this.baseUrl}/${transferenciaId}/estado`, { estado: 'Anulado', motivo }))
    );
  }

  private construirPayloadTransferencia(
    payload: CrearTransferenciaApi,
    config: { tipoTransferencia: string }
  ) {
    // Ya no necesitamos hardcodear origenId ni destinoId, C# lo deduce del Token
    const sucursalDestinoId = Number(payload?.sucursalDestinoId ?? 0);

    const detalles = (payload?.detalles ?? []).map((d) => {
      const cajas = Math.max(1, Number(d?.cajas ?? 0));
      const unidadesPorCaja = Math.max(1, Number(d?.unidadesPorCaja ?? 1));
      const cantidadUnidades = cajas * unidadesPorCaja;
      const costoCaja = Number(d?.costoCaja ?? 0);
      const subtotal = Number((cajas * costoCaja).toFixed(2));

      return {
        productoId: Number(d?.productoId ?? 0),
        cajas,
        cantidad: cajas,
        cantidadCajas: cajas,
        cantidadUnidades,
        unidadesPorCaja,
        costoCaja,
        subTotal: subtotal,
        subtotal,
        total: subtotal,
      };
    });

    return {
      sucursalDestinoId,
      tipoTransferencia: config.tipoTransferencia,
      estado: 'Pendiente',
      observacion: payload?.observacion ?? null,
      detalle: detalles,
      detalles,
    };
  }

  private esErrorRecuperable(error: unknown): boolean {
    const status = Number((error as { status?: number })?.status ?? 0);
    return status === 404 || status === 405 || status === 500;
  }
}