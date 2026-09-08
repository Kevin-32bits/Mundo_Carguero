import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { apiUrl } from './api-url';

export interface ClienteBusquedaApi {
  clienteId: number;
  tipoDocumento: string;
  numeroDocumento: string;
  nombre: string;
  telefono?: string | null;
  correo?: string | null;
  direccion?: string | null;
}

export interface ClienteListadoApi {
  clienteId: number;
  tipoDocumento: string;
  numeroDocumento: string;
  nombre: string;
  telefono?: string | null;
  correo?: string | null;
  direccion?: string | null;
}

export interface CrearClienteApi {
  tipoDocumento: string;
  numeroDocumento: string;
  nombre: string;
  telefono?: string | null;
  correo?: string | null;
  direccion?: string | null;
}

export interface CotizacionDetalleClienteApi {
  cotizacionId: number;
  id: string;
  fecha: string;
  estado: string;
  total: number;
  clienteId?: number | null;
  tipoDocumento: string;
  numeroDocumento: string;
  clienteNombre: string;
  telefono?: string | null;
  correo?: string | null;
  direccion?: string | null;
  items: CotizacionDetalleItemApi[];
}

export interface CotizacionDetalleItemApi {
  cotizacionDetalleId: number;
  productoId: number;
  sku: string;
  nombre: string;
  cantidadCajas: number;
  precioCaja: number;
  subTotal: number;
}

export interface CotizacionListadoApi {
  cotizacionId: number;
  id: string;
  fecha: string;
  cliente: string;
  documento: string;
  estado: string;
  total: number;
}

export interface CrearCotizacionItemApi {
  productoId: number;
  cantidadCajas: number;
  precioCaja: number;
}

export interface CrearCotizacionApi {
  clienteId?: number | null;
  clienteNombre: string;
  tipoDocumento: string;
  numeroDocumento: string;
  telefono?: string | null;
  correo?: string | null;
  direccion?: string | null;
  items: CrearCotizacionItemApi[];
}

export interface ActualizarCotizacionApi {
  clienteNombre: string;
  tipoDocumento: string;
  numeroDocumento: string;
  telefono?: string | null;
  correo?: string | null;
  direccion?: string | null;
  items: ActualizarCotizacionItemApi[];
}

export interface ActualizarCotizacionItemApi {
  productoId: number;
  cantidadCajas: number;
  precioCaja: number;
}

export interface FacturarCotizacionApi {
  tipoComprobante: string;
  metodoPago: string;
}

export interface FacturaListadoApi {
  facturaId: number;
  id: string;
  fecha: string;
  tipoComprobante: string;
  cliente: string;
  metodoPago: string;
  total: number;
  estado: string;
}

export interface FacturaDetalleItemApi {
  productoId: number;
  sku: string;
  nombre: string;
  cantidadCajas: number;
  precioCaja: number;
  subTotal: number;
}

export interface FacturaDetalleApi {
  facturaId: number;
  id: string;
  fecha: string;
  tipoComprobante: string;
  serie: string;
  numero: number;
  cliente: string;
  documento: string;
  telefono?: string | null;
  direccion?: string | null;
  metodoPago: string;
  estado: string;
  total: number;
  items: FacturaDetalleItemApi[];
  vendedor: string | null;
}

export interface EnviarFacturaCorreoResponseApi {
  exito: boolean;
  mensaje: string;
  comprobante: string;
  destinatario: string;
}

@Injectable({ providedIn: 'root' })
export class Sucursal1VentasApiService {
  private readonly baseUrl = apiUrl('SucursalesVentas');

  constructor(private readonly http: HttpClient) {}

  buscarCliente(nombre: string, numeroDocumento?: string): Observable<ClienteBusquedaApi | null> {
    let params = new HttpParams();
    if (nombre.trim()) {
      params = params.set('nombre', nombre.trim());
    }
    if (numeroDocumento?.trim()) {
      params = params.set('numeroDocumento', numeroDocumento.trim());
    }

    return this.http.get<ClienteBusquedaApi | null>(`${this.baseUrl}/clientes/buscar`, { params });
  }

  obtenerClientes(busqueda?: string): Observable<ClienteListadoApi[]> {
    let params = new HttpParams();
    if (busqueda?.trim()) {
      params = params.set('busqueda', busqueda.trim());
    }

    return this.http.get<ClienteListadoApi[]>(`${this.baseUrl}/clientes`, { params });
  }

  crearCliente(payload: CrearClienteApi): Observable<ClienteListadoApi> {
    return this.http.post<ClienteListadoApi>(`${this.baseUrl}/clientes`, payload);
  }

  actualizarCliente(clienteId: number, payload: CrearClienteApi): Observable<ClienteListadoApi> {
    return this.http.put<ClienteListadoApi>(`${this.baseUrl}/clientes/${clienteId}`, payload);
  }

  eliminarCliente(clienteId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/clientes/${clienteId}`);
  }

  obtenerCotizaciones(): Observable<CotizacionListadoApi[]> {
    return this.http.get<CotizacionListadoApi[]>(`${this.baseUrl}/cotizaciones`);
  }

  obtenerCotizacionDetalle(cotizacionId: number): Observable<CotizacionDetalleClienteApi> {
    return this.http.get<CotizacionDetalleClienteApi>(`${this.baseUrl}/cotizaciones/${cotizacionId}`);
  }

  crearCotizacion(payload: CrearCotizacionApi): Observable<CotizacionListadoApi> {
    return this.http.post<CotizacionListadoApi>(`${this.baseUrl}/cotizaciones`, payload);
  }

  actualizarCotizacion(cotizacionId: number, payload: ActualizarCotizacionApi): Observable<CotizacionListadoApi> {
    return this.http.put<CotizacionListadoApi>(`${this.baseUrl}/cotizaciones/${cotizacionId}`, payload);
  }

  facturarCotizacion(cotizacionId: number, payload: FacturarCotizacionApi): Observable<CotizacionListadoApi> {
    return this.http.post<CotizacionListadoApi>(`${this.baseUrl}/cotizaciones/${cotizacionId}/facturar`, payload);
  }

  eliminarCotizacion(cotizacionId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/cotizaciones/${cotizacionId}`);
  }

  obtenerFacturas(): Observable<FacturaListadoApi[]> {
    return this.http.get<FacturaListadoApi[]>(`${this.baseUrl}/facturas`);
  }

  obtenerFacturaDetalle(facturaId: number): Observable<FacturaDetalleApi> {
    return this.http.get<FacturaDetalleApi>(`${this.baseUrl}/facturas/${facturaId}`);
  }

  descargarFacturaPdf(facturaId: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/facturas/${facturaId}/pdf`, {
      responseType: 'blob',
    });
  }

  enviarFacturaPorCorreo(facturaId: number): Observable<EnviarFacturaCorreoResponseApi> {
    return this.http.post<EnviarFacturaCorreoResponseApi>(`${this.baseUrl}/facturas/${facturaId}/enviar-correo`, {});
  }
}
