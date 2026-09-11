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

  // --- DICCIONARIO DE IDIOMAS ---
  idiomaSeleccionado: string = 'es';
  
  textosLogin: any = {
    es: {
      bienvenido: 'Bienvenido',
      iniciarSesion: 'Iniciar Sesión',
      usuario: 'Usuario',
      contrasena: 'Contraseña',
      ingresar: 'INGRESAR',
      espera: 'Espera',
      derechos: '© 2026 Sistema de Gestión Empresarial. Todos los derechos reservados.',
      accesoBloqueado: 'Acceso Bloqueado',
      intentos1: 'Has fallado',
      intentos2: 'intentos consecutivos.',
      porSeguridad: 'Por seguridad, debes esperar antes de intentarlo de nuevo.',
      errVacio: 'Por favor, ingresa tu usuario y contraseña.',
      errRol: 'Error: Tu rol asignado no es válido para entrar al sistema.',
      errCredenciales: 'Usuario o contraseña incorrectos.'
    },
    en: {
      bienvenido: 'Welcome',
      iniciarSesion: 'Sign In',
      usuario: 'Username',
      contrasena: 'Password',
      ingresar: 'LOGIN',
      espera: 'Wait',
      derechos: '© 2026 Enterprise Management System. All rights reserved.',
      accesoBloqueado: 'Access Blocked',
      intentos1: 'You have failed',
      intentos2: 'consecutive attempts.',
      porSeguridad: 'For security reasons, you must wait before trying again.',
      errVacio: 'Please enter your username and password.',
      errRol: 'Error: Your assigned role is invalid.',
      errCredenciales: 'Incorrect username or password.'
    },
    zh: {
      bienvenido: '欢迎',
      iniciarSesion: '登录',
      usuario: '用户名',
      contrasena: '密码',
      ingresar: '登录',
      espera: '等待',
      derechos: '© 2026 企业管理系统。保留所有权利。',
      accesoBloqueado: '访问被锁定',
      intentos1: '您已连续失败',
      intentos2: '次尝试。',
      porSeguridad: '出于安全原因，请稍后再试。',
      errVacio: '请输入您的用户名和密码。',
      errRol: '错误：分配给您的角色无效。',
      errCredenciales: '用户名或密码错误。'
    },
    pt: {
      bienvenido: 'Bem-vindo',
      iniciarSesion: 'Entrar',
      usuario: 'Usuário',
      contrasena: 'Senha',
      ingresar: 'ENTRAR',
      espera: 'Aguarde',
      derechos: '© 2026 Sistema de Gestão Empresarial. Todos os direitos reservados.',
      accesoBloqueado: 'Acesso Bloqueado',
      intentos1: 'Você falhou',
      intentos2: 'tentativas consecutivas.',
      porSeguridad: 'Por segurança, você deve aguardar antes de tentar novamente.',
      errVacio: 'Por favor, insira seu usuário e senha.',
      errRol: 'Erro: Sua função atribuída é inválida.',
      errCredenciales: 'Usuário ou senha incorretos.'
    },
    fr: {
      bienvenido: 'Bienvenue',
      iniciarSesion: 'Se connecter',
      usuario: 'Utilisateur',
      contrasena: 'Mot de passe',
      ingresar: 'ENTRER',
      espera: 'Attendez',
      derechos: '© 2026 Système de Gestion d\'Entreprise. Tous droits réservés.',
      accesoBloqueado: 'Accès Bloqué',
      intentos1: 'Vous avez échoué',
      intentos2: 'tentatives consécutives.',
      porSeguridad: 'Par sécurité, vous devez patienter avant de réessayer.',
      errVacio: 'Veuillez entrer votre utilisateur et mot de passe.',
      errRol: 'Erreur : Votre rôle attribué est invalide.',
      errCredenciales: 'Utilisateur ou mot de passe incorrect.'
    },
    de: {
      bienvenido: 'Willkommen',
      iniciarSesion: 'Anmelden',
      usuario: 'Benutzer',
      contrasena: 'Passwort',
      ingresar: 'ANMELDEN',
      espera: 'Warten',
      derechos: '© 2026 Unternehmensverwaltungssystem. Alle Rechte vorbehalten.',
      accesoBloqueado: 'Zugriff Blockiert',
      intentos1: 'Sie haben',
      intentos2: 'Fehlversuche hintereinander.',
      porSeguridad: 'Aus Sicherheitsgründen müssen Sie warten, bevor Sie es erneut versuchen.',
      errVacio: 'Bitte geben Sie Benutzername und Passwort ein.',
      errRol: 'Fehler: Ihre zugewiesene Rolle ist ungültig.',
      errCredenciales: 'Falscher Benutzername oder Passwort.'
    },
    ar: {
      bienvenido: 'مرحباً',
      iniciarSesion: 'تسجيل الدخول',
      usuario: 'المستخدم',
      contrasena: 'كلمة المرور',
      ingresar: 'دخول',
      espera: 'انتظر',
      derechos: '© 2026 نظام إدارة المؤسسات. جميع الحقوق محفوظة.',
      accesoBloqueado: 'تم حظر الوصول',
      intentos1: 'لقد فشلت',
      intentos2: 'محاولات متتالية.',
      porSeguridad: 'لأسباب أمنية، يجب عليك الانتظار قبل المحاولة مرة أخرى.',
      errVacio: 'يرجى إدخال اسم المستخدم وكلمة المرور.',
      errRol: 'خطأ: الدور المخصص لك غير صالح.',
      errCredenciales: 'اسم المستخدم أو كلمة المرور غير صحيحة.'
    },
    ja: {
      bienvenido: 'ようこそ',
      iniciarSesion: 'ログイン',
      usuario: 'ユーザー',
      contrasena: 'パスワード',
      ingresar: 'ログイン',
      espera: 'お待ちください',
      derechos: '© 2026 企業管理システム。無断複写・転載を禁じます。',
      accesoBloqueado: 'アクセスブロック',
      intentos1: '連続して',
      intentos2: '回の試行に失敗しました。',
      porSeguridad: 'セキュリティのため、再試行する前に待機する必要があります。',
      errVacio: 'ユーザー名とパスワードを入力してください。',
      errRol: 'エラー：割り当てられたロールが無効です。',
      errCredenciales: 'ユーザー名またはパスワードが間違っています。'
    }
  };

  cambiarIdioma(event: any): void {
    this.idiomaSeleccionado = event.target.value;
    // Si hay un error activo, lo limpiamos al cambiar de idioma para evitar inconsistencias
    if (this.mensajeError !== '') {
      this.mensajeError = '';
    }
  }
  // ------------------------------

  Contra_Visible: boolean = false;
  mostrarErrorLogin: boolean = false;
  mensajeError: string = '';
  intentosFallidos: number = 0;
  bloqueado: boolean = false;
  tiempoRestante: number = 0;
  cargando: boolean = false;
  private intervalo: any = null;

  ngOnInit(): void {
    this.sincronizarEstadoBloqueo();
  }

  @HostListener('window:storage', ['$event'])
  onStorageChange(event: StorageEvent): void {
    if (event.key === 'lockoutEndTime' || event.key === 'intentos') {
      this.ngZone.run(() => {
        this.sincronizarEstadoBloqueo();
        this.cdr.detectChanges();
      });
    }
  }

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
      if (Date.now() > endTime) {
        this.terminarBloqueo();
      } else {
        const remaining = Math.floor((endTime - Date.now()) / 1000);
        this.iniciarBloqueo(remaining);
      }
    } else if (this.bloqueado) {
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
      // Uso del diccionario para el error
      this.mensajeError = this.textosLogin[this.idiomaSeleccionado].errVacio;
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
            // Uso del diccionario para el error
            this.mensajeError = this.textosLogin[this.idiomaSeleccionado].errRol;
            this.cdr.detectChanges();
            sessionStorage.clear();
          }
        },
        error: (error: any) => {
          // Uso del diccionario para el error
          const mensajeServidor = error?.error?.mensaje ?? this.textosLogin[this.idiomaSeleccionado].errCredenciales;

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
            this.iniciarBloqueo(5);
          } else {
            this.mensajeError = mensajeServidor;
            this.cdr.detectChanges();
          }
        }
      });
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