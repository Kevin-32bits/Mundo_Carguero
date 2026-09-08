import { Routes } from '@angular/router';

export const GERENCIA_ROUTES: Routes = [
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./Dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
      path: 'clientes',
    loadComponent: () =>
      import('../Sucursales/Clientes/clientes.component').then((m) => m.ClientesComponent),
  },
  {
    path: 'inventario',
    loadComponent: () =>
      import('../Almacen/Inventario/inventario.component').then((m) => m.InventarioComponent),
  },
  {
    path: 'personal',
    loadComponent: () =>
      import('./Personal/personal.component').then((m) => m.PersonalComponent),
  },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
];
