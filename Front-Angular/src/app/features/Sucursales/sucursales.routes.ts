import { Routes } from '@angular/router';

export const SUCURSALES_ROUTES: Routes = [
  {
    path: 'panel-ventas',
    loadComponent: () =>
      import('./Panel-ventas/panel-ventas.component').then((m) => m.PanelVentasComponent),
  },
  {
    path: 'clientes',
    loadComponent: () =>
      import('./Clientes/clientes.component').then((m) => m.ClientesComponent),
  },
  {
    path: 'cotizaciones',
    loadComponent: () =>
      import('./Cotizaciones/cotizaciones.component').then((m) => m.CotizacionesComponent),
  },
  {
    path: 'facturas',
    loadComponent: () =>
      import('./Facturas/facturas.component').then((m) => m.FacturasComponent),
  },
  {
    path: 'stock',
    loadComponent: () => import('./Stock/stock.component').then((m) => m.StockComponent),
  },
  { path: '', redirectTo: 'panel-ventas', pathMatch: 'full' },
];
