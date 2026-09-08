import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs'; 
import { apiUrl } from './api-url';

@Injectable({
  providedIn: 'root'
})
export class SessionService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private ultimaActividad: number = Date.now();
  private relojMaestro: any;
  private temporizadorCierreAutomatico: any;
  private renovandoToken: boolean = false;

  //private readonly TIEMPO_PARA_AVISO = 4 * 60 * 60 * 1000;
  private readonly TIEMPO_PARA_AVISO = 10 * 1000;
  private readonly TIEMPO_ESPERA_RESPUESTA = 30 * 60 * 1000;
  private readonly UMBRAL_RENOVACION = 60 * 60 * 1000;

  // 1. Usamos BehaviorSubject. Tienen "memoria" y un valor inicial por defecto.
  public mostrarAviso$ = new BehaviorSubject<boolean>(false);
  public sesionExpirada$ = new BehaviorSubject<boolean>(false);
  public tiempoRestante$ = new BehaviorSubject<number>(0);

  constructor() {
    const guardada = sessionStorage.getItem('ultimaActividad');
    this.ultimaActividad = guardada ? parseInt(guardada, 10) : Date.now();
  }

  iniciarVigilancia(): void {
    if (this.relojMaestro) clearInterval(this.relojMaestro);

    if (!sessionStorage.getItem('ultimaActividad')) {
      this.ultimaActividad = Date.now();
      sessionStorage.setItem('ultimaActividad', this.ultimaActividad.toString());
    } else {
      this.ultimaActividad = parseInt(sessionStorage.getItem('ultimaActividad')!, 10);
    }

    // 2. MAGIA ANTI-F5: Ejecutamos la verificación INMEDIATAMENTE
    // antes de arrancar cualquier temporizador.
    this.verificarInactividadFisica();

    // 3. Si después de verificar resulta que TODO ESTÁ BIEN, encendemos el radar normal.
    // Si mostrarAviso$ es true, significa que ya se encendió la sentencia de muerte.
    if (!this.mostrarAviso$.getValue()) {
      this.relojMaestro = setInterval(() => {
        this.verificarInactividadFisica();
        this.verificarYRenovarToken();
      }, 1000);
    }
  }

  actualizarActividad(): void {
    const ahora = Date.now();
    if (ahora - this.ultimaActividad > 1000) {
      this.ultimaActividad = ahora;
      sessionStorage.setItem('ultimaActividad', this.ultimaActividad.toString());
    }
  }

  private verificarInactividadFisica(): void {
    const tiempoInactivo = Date.now() - this.ultimaActividad;

    if (tiempoInactivo >= this.TIEMPO_PARA_AVISO) {
      if (this.relojMaestro) clearInterval(this.relojMaestro); 

      this.mostrarAviso$.next(true); 

      let tiempoMuerte = sessionStorage.getItem('tiempoMuerte');
      if (!tiempoMuerte) {
        tiempoMuerte = (Date.now() + this.TIEMPO_ESPERA_RESPUESTA).toString();
        sessionStorage.setItem('tiempoMuerte', tiempoMuerte);
      }

      // Creamos una función interna para evaluar los segundos restantes
      const evaluarMuerte = () => {
        const faltanMilisegundos = parseInt(tiempoMuerte!) - Date.now();
        let segundosRestantes = Math.ceil(faltanMilisegundos / 1000);

        if (segundosRestantes <= 0) {
          segundosRestantes = 0;
          if (this.temporizadorCierreAutomatico) clearInterval(this.temporizadorCierreAutomatico);
          this.tiempoRestante$.next(0);
          this.sesionExpirada$.next(true); 
        } else {
          this.sesionExpirada$.next(false);
          this.tiempoRestante$.next(segundosRestantes);
        }
      };

      // 4. Evaluamos la sentencia INMEDIATAMENTE (elimina el "parpadeo" al recargar)
      evaluarMuerte();

      // Si después de evaluar aún queda tiempo, iniciamos la cuenta regresiva visual
      if (this.tiempoRestante$.getValue() > 0) {
        if (this.temporizadorCierreAutomatico) clearInterval(this.temporizadorCierreAutomatico);
        this.temporizadorCierreAutomatico = setInterval(evaluarMuerte, 1000);
      }
    }
  }

  private verificarYRenovarToken(): void {
    if (this.renovandoToken) return;

    const token = sessionStorage.getItem('token');
    if (!token) return;

    let expDate = 0;
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      expDate = payload.exp * 1000;
    } catch (e) {
      return;
    }

    const tiempoRestante = expDate - Date.now();

    if (tiempoRestante <= this.UMBRAL_RENOVACION && tiempoRestante > 0) {
      this.renovandoToken = true;
      
      this.http.post<any>(apiUrl('gerencia/renovar-token'), {}).subscribe({
        next: (res) => {
          sessionStorage.setItem('token', res.token);
          this.renovandoToken = false;
        },
        error: () => {
          this.renovandoToken = false;
        }
      });
    }
  }

  seguirTrabajando(): void {
    if (this.temporizadorCierreAutomatico) clearInterval(this.temporizadorCierreAutomatico);
    
    this.http.post<any>(apiUrl('gerencia/renovar-token'), {}).subscribe({
      next: (res) => {
        sessionStorage.setItem('token', res.token);
        sessionStorage.removeItem('tiempoMuerte'); 
        this.actualizarActividad();
        this.mostrarAviso$.next(false); 
        this.sesionExpirada$.next(false);
        this.iniciarVigilancia(); 
      },
      error: () => {
        this.cerrarSesion();
      }
    });
  }

  cerrarSesion(): void {
    if (this.relojMaestro) clearInterval(this.relojMaestro);
    if (this.temporizadorCierreAutomatico) clearInterval(this.temporizadorCierreAutomatico);
    
    sessionStorage.clear();

    // EL CAMBIO CLAVE: Reseteamos los flujos de datos a su estado inicial limpio
    this.mostrarAviso$.next(false);
    this.sesionExpirada$.next(false);
    this.tiempoRestante$.next(0);
    this.ultimaActividad = Date.now();
    this.renovandoToken = false;

    this.router.navigate(['/login']);
  }
}