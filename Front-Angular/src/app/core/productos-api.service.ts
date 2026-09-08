import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { apiUrl } from './api-url';

export interface ProductoApi {
  id: number;
  sku: string;
  nombre: string;
  categoria: string;
  descripcion?: string | null;
  proveedor?: string | null;
  telefono?: string | null;
  unidadesPorCaja: number;
  precioVentaCaja: number;
  costoCaja: number;
  costoUnitario: number;
  stockCajas: number;
  fechaRegistro?: string;
}

export type ProductoApiPayload = Omit<ProductoApi, 'id' | 'fechaRegistro' | 'stockCajas'> & {
  stockCajas?: number;
  stockCajasIngreso?: number;
};

@Injectable({ providedIn: 'root' })
export class ProductosApiService {
  
  private readonly baseUrl = apiUrl('Productos');

  constructor(private readonly http: HttpClient) {}

  obtenerPorSku(sku: string): Observable<ProductoApi> {
    return this.http.get<ProductoApi>(`${this.baseUrl}/sku/${encodeURIComponent(sku)}`);
  }

  obtenerProductos(): Observable<ProductoApi[]> {
    return this.http.get<ProductoApi[]>(this.baseUrl);
  }

  crearProducto(payload: ProductoApiPayload): Observable<ProductoApi> {
    return this.http.post<ProductoApi>(this.baseUrl, payload);
  }

  actualizarProducto(id: number, payload: ProductoApiPayload): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}`, payload);
  }

  eliminarProducto(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
