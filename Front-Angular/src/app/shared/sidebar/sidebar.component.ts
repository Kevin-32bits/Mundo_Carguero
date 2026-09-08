import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, HostListener, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MenuOpcion, ROLE_CONFIG, isUsuarioRol } from '../../core/role-config';
import { SessionService } from '../../core/session.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent implements OnInit, OnDestroy {
  usuarioLogueado: string | null = '';
  menuOpciones: MenuOpcion[] = [];
  rolLogueado: string | null = '';
  rolParaMostrar: string = '';
  
  private cdr = inject(ChangeDetectorRef);
  private sessionService = inject(SessionService); 

  mostrarAvisoInactividad: boolean = false;
  sesionExpirada: boolean = false;
  tiempoRestante: number = 0;
  private avisoSub!: Subscription;
  private expiradaSub!: Subscription;
  private tiempoSub!: Subscription;
  // Variable para controlar la repetición del sonido
  private alertaSonoraInterval: any;

  // 👇 ── ESTADO DEL LECTOR DE VOZ (NUEVO) ── 👇
  lectorActivo = signal(false);

  get tiempoFormateado(): string {
    const horas = Math.floor(this.tiempoRestante / 3600);
    const minutos = Math.floor((this.tiempoRestante % 3600) / 60);
    const segundos = this.tiempoRestante % 60;

    const horasStr = horas.toString().padStart(2, '0');
    const minStr = minutos.toString().padStart(2, '0');
    const segStr = segundos.toString().padStart(2, '0');

    if (horas > 0) {
      return `${horasStr}:${minStr}:${segStr} horas`;
    } else {
      return `${minStr}:${segStr} minutos`;
    }
  }

  // Detectamos la actividad en la pantalla
  @HostListener('window:mousemove')
  @HostListener('window:keydown')
  @HostListener('window:click')
  @HostListener('window:scroll')
  @HostListener('window:touchstart')
  onUsuarioActivo() {
    if (this.mostrarAvisoInactividad) return;
    this.sessionService.actualizarActividad();
  }

  ngOnInit() {
    this.usuarioLogueado = sessionStorage.getItem('usuario');
    const rolRaw = sessionStorage.getItem('rolUsuario');
    this.rolLogueado = rolRaw;

    const NOMBRES_ROLES: Record<string, string> = {
      Gerencia: 'Gerente',
      Sucursal1: 'Vendedor',
      Sucursal2: 'Vendedor',
      Almacen: 'Almacenero'
    };

    this.rolParaMostrar = NOMBRES_ROLES[this.rolLogueado || ''] || 'USUARIO N';

    if (isUsuarioRol(this.rolLogueado)) {
      this.menuOpciones = ROLE_CONFIG[this.rolLogueado].menuOpciones;
    }

    this.sessionService.iniciarVigilancia();

    this.avisoSub = this.sessionService.mostrarAviso$.subscribe(estado => {
      this.mostrarAvisoInactividad = estado;
      
      if (estado) {
          // 👇 1. Encendemos el sonido repetitivo
          this.iniciarAlertaSonora();

          if (this.lectorActivo()) {
            this.leerTextoEnVozAlta("Advertencia: Tu sesión se cerrará pronto por inactividad.");
          }
        } else {
          // 👇 2. Si el modal se oculta, apagamos la alarma
          this.detenerAlertaSonora();
      }
      this.cdr.detectChanges(); 
    });

    this.expiradaSub = this.sessionService.sesionExpirada$.subscribe(estado => {
      this.sesionExpirada = estado;
      this.cdr.detectChanges();
    });

    this.tiempoSub = this.sessionService.tiempoRestante$.subscribe(tiempo => {
      this.tiempoRestante = tiempo;
      this.cdr.detectChanges(); 
    });
  }

  // 👇 ── FUNCIONES DEL LECTOR DE VOZ (NUEVO) ── 👇
  toggleLector() {
    this.lectorActivo.update(v => !v);
    if (this.lectorActivo()) {
      this.leerTextoEnVozAlta("Asistencia de voz activada.");
    } else {
      window.speechSynthesis.cancel(); 
    }
  }

  leerTextoEnVozAlta(texto: string) {
    if (!this.lectorActivo()) return;

    window.speechSynthesis.cancel();
    
    // Cambiamos ligeramente el tono para que suene más a "Sistema"
    const mensaje = new SpeechSynthesisUtterance(texto);
    mensaje.lang = 'es-PE'; 
    mensaje.rate = 1.1;     
    mensaje.pitch = 0.9;    

    window.speechSynthesis.speak(mensaje);
  }
  // 👆 ───────────────────────────────────────── 👆


// ── ESTADO DEL FILTRO AZUL ──
  filtroAzulActivo = signal(false);

  toggleFiltroAzul() {
    this.filtroAzulActivo.update(v => !v);
    
    // Inyectamos o removemos la clase en el <body>
    if (this.filtroAzulActivo()) {
      document.body.classList.add('filtro-azul');
      this.leerTextoEnVozAlta("Filtro azul de descanso visual activado");
    } else {
      document.body.classList.remove('filtro-azul');
      this.leerTextoEnVozAlta("Filtro azul desactivado");
    }
  }

  // ── FUNCIÓN DE SONIDO SINTETIZADO (SIN ARCHIVOS EXTERNOS) ──
  reproducirSonidoAlerta() {
    try {
      // 1. Iniciamos el motor de audio del navegador
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContext();
      
      // 2. Creamos un oscilador (el que genera el tono) y un control de volumen
      const oscilador = audioCtx.createOscillator();
      const volumen = audioCtx.createGain();

      // 3. Configuramos el sonido tipo "sistema"
      oscilador.type = 'triangle'; // 'triangle' o 'square' suenan como alerta de máquina
      oscilador.frequency.setValueAtTime(500, audioCtx.currentTime); // Frecuencia (tono medio-alto)
      
      // 4. Bajamos el volumen para que no asuste (0.1 = 10%)
      volumen.gain.setValueAtTime(0.1, audioCtx.currentTime);

      // 5. Conectamos los cables virtuales a los parlantes
      oscilador.connect(volumen);
      volumen.connect(audioCtx.destination);

      // 6. ¡Hacemos sonar el beep durante 0.3 segundos!
      oscilador.start();
      oscilador.stop(audioCtx.currentTime + 0.3);
      
    } catch (error) {
      console.warn('El navegador no soporta la generación de audio sintético:', error);
    }
  }

  // Inicia el bucle de sonido
  iniciarAlertaSonora() {
    this.reproducirSonidoAlerta(); // Suena la primera vez inmediatamente
    
    // Repite el sonido cada 2000 milisegundos (2 segundos)
    this.alertaSonoraInterval = setInterval(() => {
      this.reproducirSonidoAlerta();
    }, 2000); 
  }

  // Detiene el bucle de sonido
  detenerAlertaSonora() {
    if (this.alertaSonoraInterval) {
      clearInterval(this.alertaSonoraInterval);
      this.alertaSonoraInterval = null;
    }
  }

  seguirTrabajando(): void {
    this.sessionService.seguirTrabajando();
  }

  cerrarSesion(): void {
    this.sessionService.cerrarSesion();
  }

  ngOnDestroy(): void {
    window.speechSynthesis.cancel(); // Apagamos la voz si destruyen el sidebar
    this.detenerAlertaSonora();
    if (this.avisoSub) this.avisoSub.unsubscribe();
    if (this.expiradaSub) this.expiradaSub.unsubscribe();
    if (this.tiempoSub) this.tiempoSub.unsubscribe();
  }
}