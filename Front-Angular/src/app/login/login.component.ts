import { Component, inject, ChangeDetectorRef, OnInit, NgZone, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ROLE_CONFIG, isUsuarioRol } from '../core/role-config';
import { GerenciaApiService } from '../core/gerencia-api.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit {
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private gerenciaApi = inject(GerenciaApiService);
  private ngZone = inject(NgZone);

  Contra_Visible: boolean = false;
  mostrarErrorLogin: boolean = false;
  mensajeError: string = '';
  intentosFallidos: number = 0;
  bloqueado: boolean = false;
  tiempoRestante: number = 0;
  cargando: boolean = false;
  mostrarToast: boolean = false;
  mensajeToast: string = '';
  private intervalo: any = null;

  mostrarPrivacidad: boolean = false;

  // Agrega estos métodos al final de tu clase
  abrirPrivacidad(): void {
    this.mostrarPrivacidad = true;
  }

  cerrarPrivacidad(): void {
    this.mostrarPrivacidad = false;
  }

  ngOnInit(): void {
    // 1. Verificamos el estado al cargar la página por primera vez
    this.sincronizarEstadoBloqueo();
  }

  @HostListener('window:storage', ['$event'])
  onStorageChange(event: StorageEvent): void {
    // Si otra pestaña modifica los intentos o el tiempo de bloqueo, nos actualizamos
    if (event.key === 'lockoutEndTime' || event.key === 'intentos') {
      this.ngZone.run(() => {
        this.sincronizarEstadoBloqueo();
        this.cdr.detectChanges();
      });
    }
  }

  // Centralizamos la validación para no repetir código
  private sincronizarEstadoBloqueo(): void {
    const intentosGuardados = localStorage.getItem('intentos');
    if (intentosGuardados) {
        this.intentosFallidos = parseInt(intentosGuardados, 10);
    } else {
        this.intentosFallidos = 0;
    }

    const lockoutEndTime = localStorage.getItem('lockoutEndTime');
    if (lockoutEndTime) {
          const endTime = parseInt(lockoutEndTime, 10);
          // Validamos si el tiempo guardado es lógico
          if (Date.now() > endTime) {
              this.terminarBloqueo();
          } else {
              // Aún estamos bloqueados
              const remaining = Math.floor((endTime - Date.now()) / 1000);
              this.iniciarBloqueo(remaining);
          }
     } else if (this.bloqueado) {
         // Si se limpió el bloqueo en otra pestaña, liberamos esta también
         this.terminarBloqueo();
     }
  }

  OJOPassword(): void {
    this.Contra_Visible = !this.Contra_Visible;
  }

  cerrarModal(): void {
    if (this.bloqueado) return;
    this.mostrarErrorLogin = false;
  }

  private terminarBloqueo(): void {
    if (this.intervalo) {
      clearInterval(this.intervalo);
      this.intervalo = null;
    }
    this.bloqueado = false;
    this.intentosFallidos = 0;
    this.mostrarErrorLogin = false;
    
    localStorage.removeItem('lockoutEndTime');
    try { this.cdr.detectChanges(); } catch (e) {}
  }

  ingresarAlSistema(usuarioInput: string, contrasena: string): void {
    if (this.bloqueado || this.cargando) return;

    if (!usuarioInput || !contrasena) {
      this.mensajeError = 'Por favor, ingresa tu usuario y contraseña.';
      this.cdr.detectChanges();
      return;
    }

    this.cargando = true;
    this.mensajeError = '';

    this.gerenciaApi.iniciarSesion({ usuario: usuarioInput, password: contrasena })
      .pipe(finalize(() => this.cargando = false))
      .subscribe({
        next: (respuesta: { token: string; id: number; nombre: string; usuario: string; rol: string }) => {
          this.intentosFallidos = 0;
          this.mensajeError = '';

          localStorage.removeItem('intentos');
          localStorage.removeItem('lockoutEndTime');
          
          sessionStorage.setItem('token', respuesta.token);
          sessionStorage.setItem('usuario', respuesta.usuario);
          sessionStorage.setItem('nombre', respuesta.nombre);
                    
          const rolDb = respuesta.rol || '';
          
          if (isUsuarioRol(rolDb)) {
            sessionStorage.setItem('rolUsuario', rolDb);
            const ruta = ROLE_CONFIG[rolDb].homeRoute;
            this.router.navigate([ruta], { replaceUrl: true });
          } else {
            // Si el backend envía algo desconocido
            this.mensajeError = 'Error: Tu rol asignado no es válido para entrar al sistema.';
            this.cdr.detectChanges();
            sessionStorage.clear();
          }
        },
        error: (error: any) => {
          const mensajeServidor = error?.error?.mensaje ?? 'Usuario o contraseña incorrectos.';

          if (mensajeServidor.toLowerCase().includes('inhabilitado')) {
            this.mensajeError = mensajeServidor;
            this.cdr.detectChanges();
            return;
          }
          
          this.intentosFallidos++;
          localStorage.setItem('intentos', this.intentosFallidos.toString());

          if (this.intentosFallidos >= 3) {
            this.mensajeError = '';
            this.mostrarErrorLogin = true;
            this.iniciarBloqueo(5); //tiempo de bloqueo
          } else {
            this.mensajeError = mensajeServidor;
            const intentosRestantes = 3 - this.intentosFallidos;
           const textoIntento = intentosRestantes === 1 ? 'intento restante' : 'intentos restantes';
            this.mostrarMensajeFlotante(`Atención: Te queda ${intentosRestantes} ${textoIntento}.`);
            this.cdr.detectChanges();
          }
        }
      });
  }

  private mostrarMensajeFlotante(mensaje: string): void {
  this.mensajeToast = mensaje;
  this.mostrarToast = true;
  
  // Ocultar automáticamente después de 3 segundos
  setTimeout(() => {
    this.mostrarToast = false;
    this.cdr.detectChanges();
    }, 3000);
  }

  verificarCampos(usuario: string, contrasena: string): void {
    if (this.mensajeError !== '') {     
       this.mensajeError = '';
      this.cdr.detectChanges();
    }
  }

  private iniciarBloqueo(segundos: number): void {
    if (this.intervalo) clearInterval(this.intervalo);

    this.bloqueado = true;
    this.tiempoRestante = segundos;
    this.mostrarErrorLogin = true;

    if (!localStorage.getItem('lockoutEndTime')) {
      const futureTime = Date.now() + (segundos * 1000);
      localStorage.setItem('lockoutEndTime', futureTime.toString());
    }

    this.intervalo = setInterval(() => {
      this.ngZone.run(() => {
        this.tiempoRestante--;
      try { 
          this.cdr.detectChanges(); 
        } catch (e) {}

        if (this.tiempoRestante <= 0) {
          this.terminarBloqueo();
        }
      });
    }, 1000);
  }

  get tiempoFormateado(): string {
    const m = Math.floor(this.tiempoRestante / 60);
    const s = this.tiempoRestante % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}

