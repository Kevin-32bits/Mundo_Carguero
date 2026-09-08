import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layouts/main-layout.component';
import { LoginComponent } from './login/login.component';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  {
    path: 'sistema',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'inicio',
        loadComponent: () =>
          import('./features/inicio/inicio.component').then((m) => m.InicioComponent),
      },
      {
        path: 'gerencia',
        canActivate: [authGuard], 
        data: { roles: ['Gerencia'] },
        loadChildren: () =>
          import('./features/Gerencia/gerencia.routes').then((m) => m.GERENCIA_ROUTES),
      },
      {
        path: 'sucursales',
        canActivate: [authGuard], 
        data: { roles: ['Sucursal1', 'Sucursal2'] },
        loadChildren: () =>
          import('./features/Sucursales/sucursales.routes').then((m) => m.SUCURSALES_ROUTES),
      },
      {
        path: 'almacen',
        canActivate: [authGuard], 
        data: { roles: ['Almacen'] },
        loadChildren: () =>
          import('./features/Almacen/almacen.routes').then((m) => m.ALMACEN_ROUTES),
      },
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
