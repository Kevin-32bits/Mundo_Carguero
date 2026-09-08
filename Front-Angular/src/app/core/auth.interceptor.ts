import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const token = sessionStorage.getItem('token');

  let peticion = req;

  // Si hay token, lo agregamos a la cabecera
  if (token) {
    peticion = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  // 👇 CAPTURAMOS LAS RESPUESTAS DEL SERVIDOR 👇
  return next(peticion).pipe(
    catchError((error: HttpErrorResponse) => {
      // Si el backend responde 401 significa que el token expiró o es inválido
      if (error.status === 401) {
        console.warn('El token ha expirado o no es válido. Redirigiendo al login...');
        
        // Limpiamos el token viejo para que el guardián tampoco lo deje pasar
        sessionStorage.clear();
        
        // Lo pateamos al login para que vuelva a poner su usuario y contraseña
        router.navigate(['/login'], { queryParams: { sesionExpirada: true } });
      }
      
      return throwError(() => error);
    })
  );
};