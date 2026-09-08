import {Component, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef} from '@angular/core';

@Component({
  selector: 'app-inicio',
  standalone: true,
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.css'
})
export class InicioComponent implements AfterViewInit {

  @ViewChild('heroVideo')
  heroVideo!: ElementRef<HTMLVideoElement>;

  constructor(private cdr: ChangeDetectorRef) {}

  progreso: number = 0;

  ngAfterViewInit(): void {
    const video = this.heroVideo.nativeElement;

    video.muted = true;

    video.play().catch(error => {
      console.error(error);
    });
  }

  // Función que se ejecutará mientras el video avanza
  actualizarProgreso(): void {
    const video = this.heroVideo.nativeElement;
    // Evitamos errores si el video aún no ha cargado su duración
    if (video.duration) {
      this.progreso = (video.currentTime / video.duration) * 100;
      this.cdr.detectChanges();
    }
  }
}