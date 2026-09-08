import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { apiUrl } from './api-url';

export interface DashboardKpisApi {
  ventas: number;
  alertas: number;
  clientes: number;
}

export interface DashboardTendenciaApi {
  ventas: number;
  clientes: number;
}

export interface DashboardSerieApi {
  label: string;
  total: number;
}

export interface DashboardTiendaApi {
  nombre: string;
  monto: number;
  porcentaje: number;
}

export interface DashboardAlertaStockApi {
  producto: string;
  stock: number;
  nivel: 'bajo' | 'critico';
}

export interface DashboardGerenciaApi {
  kpis: DashboardKpisApi;
  tendencia: DashboardTendenciaApi;
  ventasSerieSemana: DashboardSerieApi[];
  ventasSerieMes: DashboardSerieApi[];
  ventasPorTienda: DashboardTiendaApi[];
  alertasStock: DashboardAlertaStockApi[];
}

export interface CatalogoApi {
  id: number;
  nombre: string;
}

export interface EmpleadoGerenciaApi {
  id: number;
  nombreCompleto: string;
  dni: string;
  telefono?: string | null;
  ubicacionId: number;
  ubicacion: string;
  estadoLaboral: boolean;
  rolId?: number | null;
  rol?: string | null;
  usuario?: string | null;
}

export interface CrearEmpleadoGerenciaApi {
  nombreCompleto: string;
  dni: string;
  telefono?: string | null;
  rolId: number;
  ubicacionId: number;
  estadoLaboral: boolean;
  usuario?: string;
  password?: string;
  confirmarPassword?: string;
}

export interface ActualizarEmpleadoGerenciaApi {
  nombreCompleto: string;
  dni: string;
  telefono?: string | null;
  rolId: number;
  ubicacionId: number;
  usuario: string;
  password?: string | null; // Opcional, solo si desea cambiarla
}

export interface ActualizarEstadoEmpleadoApi {
  estadoLaboral: boolean | number;
}

@Injectable({ providedIn: 'root' })
export class GerenciaApiService {
  private readonly baseUrl = apiUrl('Gerencia');

  constructor(private readonly http: HttpClient) {}

  obtenerDashboard(periodo: string): Observable<DashboardGerenciaApi> {
    const params = new HttpParams().set('periodo', periodo);
    return this.http.get<DashboardGerenciaApi>(`${this.baseUrl}/dashboard`, { params });
  }

  obtenerEmpleados(filtro?: {
    busqueda?: string;
    ubicacionId?: number | null;
    estado?: string;
  }): Observable<EmpleadoGerenciaApi[]> {
    let params = new HttpParams();
    if (filtro?.busqueda) params = params.set('busqueda', filtro.busqueda);
    if (filtro?.ubicacionId) params = params.set('ubicacionId', String(filtro.ubicacionId));
    if (filtro?.estado) params = params.set('estado', filtro.estado);
    return this.http.get<EmpleadoGerenciaApi[]>(`${this.baseUrl}/empleados`, { params });
  }

  iniciarSesion(credenciales: { usuario: string; password: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/login`, credenciales);
  }

  crearEmpleado(payload: CrearEmpleadoGerenciaApi): Observable<EmpleadoGerenciaApi> {
    return this.http.post<EmpleadoGerenciaApi>(`${this.baseUrl}/empleados`, payload);
  }

  actualizarEmpleado(empleadoId: number, payload: ActualizarEmpleadoGerenciaApi): Observable<EmpleadoGerenciaApi> {
    return this.http.put<EmpleadoGerenciaApi>(`${this.baseUrl}/empleados/${empleadoId}`, payload);
  }

  obtenerUbicaciones(): Observable<CatalogoApi[]> {
    return this.http.get<CatalogoApi[]>(`${this.baseUrl}/catalogo/ubicaciones`);
  }

  obtenerRoles(): Observable<CatalogoApi[]> {
    return this.http.get<CatalogoApi[]>(`${this.baseUrl}/catalogo/roles`);
  }

  actualizarEstadoEmpleado(
    empleadoId: number,
    estadoLaboral: boolean,
    _empleadoBase?: Partial<EmpleadoGerenciaApi>
  ): Observable<EmpleadoGerenciaApi> {
    const estadoBit = estadoLaboral ? 1 : 0;
    const body: ActualizarEstadoEmpleadoApi = { estadoLaboral: estadoBit };
    return this.http.put<EmpleadoGerenciaApi>(`${this.baseUrl}/empleados/${empleadoId}/estado`, body);
  }
}
