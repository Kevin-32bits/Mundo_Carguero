import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  
  const token = sessionStorage.getItem('token');
  const rolUsuario = sessionStorage.getItem('rolUsuario'); 

  const rolesPermitidos = route.data['roles'] as string[];
  
  if (!token) {
    router.navigate(['/login']);
    return false;
  }

  if (!rolesPermitidos || rolesPermitidos.length === 0) {
    return true;
  }

  if (rolUsuario && rolesPermitidos.includes(rolUsuario)) {
    console.log('4. ¡Permiso Concedido! ✅'); // 👈 Agrega esto
    return true; 
  }

  console.log('4. ¡Acceso Denegado! ❌ Te regreso al inicio.'); // 👈 Agrega esto
  router.navigate(['/sistema/inicio']);
  return false;
};