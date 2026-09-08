import { Routes } from '@angular/router';

export const ALMACEN_ROUTES: Routes = [
  {
    path: 'registro-p',
    loadComponent: () =>
      import('./Registro-p/registro-p.component').then((m) => m.RegistroPComponent),
  },
  {
    path: 'inventario',
    loadComponent: () =>
      import('./Inventario/inventario.component').then((m) => m.InventarioComponent),
  },
  {
    path: 'transferencias',
    loadComponent: () =>
      import('./Transferencias/transferencias.component').then((m) => m.TransferenciasComponent),
  },
  { path: '', redirectTo: 'inventario', pathMatch: 'full' },
];
