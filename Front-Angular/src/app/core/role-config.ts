export type UsuarioRol =
  | 'Gerencia'
  | 'Sucursal1'
  | 'Sucursal2'
  | 'Almacen';

export interface MenuOpcion {
  titulo: string;
  ruta: string;
  icono: string;
}

export interface RoleConfig {
  areaTitle: string;
  homeRoute: string;
  menuOpciones: MenuOpcion[];
}

const HOME_ROUTE = '/sistema/inicio';

export const ROLE_CONFIG: Record<UsuarioRol, RoleConfig> = {
  Gerencia: {
    areaTitle: 'Gerencia',
    homeRoute: HOME_ROUTE,
    menuOpciones: [
      { titulo: 'Inicio', ruta: HOME_ROUTE, icono: 'bi-house-door-fill' },
      { titulo: 'Clientes', ruta: '/sistema/gerencia/clientes', icono: 'bi-people-fill' },
      { titulo: 'Personal', ruta: '/sistema/gerencia/personal', icono: 'bi-people-fill' },
      { titulo: 'Inventario', ruta: '/sistema/gerencia/inventario', icono: 'bi-boxes' },
      { titulo: 'Dashboard', ruta: '/sistema/gerencia/dashboard', icono: 'bi-graph-up-arrow' },
    ],
  },
  Sucursal1: {
    areaTitle: 'SUCURSAL 1',
    homeRoute: HOME_ROUTE,
    menuOpciones: [
      { titulo: 'Inicio', ruta: HOME_ROUTE, icono: 'bi-house-door-fill' },
      { titulo: 'Panel Ventas', ruta: '/sistema/sucursales/panel-ventas', icono: 'bi-cart-fill' },
      { titulo: 'Clientes', ruta: '/sistema/sucursales/clientes', icono: 'bi-people-fill' },
      { titulo: 'Cotizaciones', ruta: '/sistema/sucursales/cotizaciones', icono: 'bi-file-earmark-text-fill' },
      { titulo: 'Facturas', ruta: '/sistema/sucursales/facturas', icono: 'bi-receipt' },
      { titulo: 'Stock', ruta: '/sistema/sucursales/stock', icono: 'bi-boxes' },
    ],
  },
  Sucursal2: {
    areaTitle: 'SUCURSAL 2',
    homeRoute: HOME_ROUTE,
    menuOpciones: [
      { titulo: 'Inicio', ruta: HOME_ROUTE, icono: 'bi-house-door-fill' },
      { titulo: 'Panel Ventas', ruta: '/sistema/sucursales/panel-ventas', icono: 'bi-cart-fill' },
      { titulo: 'Clientes', ruta: '/sistema/sucursales/clientes', icono: 'bi-people-fill' },
      { titulo: 'Cotizaciones', ruta: '/sistema/sucursales/cotizaciones', icono: 'bi-file-earmark-text-fill' },
      { titulo: 'Facturas', ruta: '/sistema/sucursales/facturas', icono: 'bi-receipt' },
      { titulo: 'Stock', ruta: '/sistema/sucursales/stock', icono: 'bi-boxes' },
    ],
  },
  Almacen: {
    areaTitle: 'ALMACEN',
    homeRoute: HOME_ROUTE,
    menuOpciones: [
      { titulo: 'Inicio', ruta: HOME_ROUTE, icono: 'bi-house-door-fill' },
      { titulo: 'Registrar Producto', ruta: '/sistema/almacen/registro-p', icono: 'bi-box-seam-fill' },
      { titulo: 'Inventario', ruta: '/sistema/almacen/inventario', icono: 'bi-boxes' },
      { titulo: 'Transferencias', ruta: '/sistema/almacen/transferencias', icono: 'bi-arrow-left-right' },
    ],
  },
};

export function isUsuarioRol(value: string | null): value is UsuarioRol {
  return !!value && value in ROLE_CONFIG;
}
