import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-regist-categoria',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './regist-categoria.component.html',
  styleUrls: ['./regist-categoria.component.css']
})
export class RegistCategoriaComponent {
  // Controla la visibilidad del modal desde el componente padre
  @Input() mostrar: boolean = false;
  
  // Emite eventos al padre (cerrar modal o pasar la nueva categoría)
  @Output() onCerrar = new EventEmitter<void>();
  @Output() onGuardar = new EventEmitter<string>();

  nuevaCategoria = {
    nombre: '',
    descripcion: ''
  };

  guardando: boolean = false;
  mensaje: string = '';
  tipoMensaje: 'ok' | 'error' | '' = '';

  cerrarModal(): void {
    this.resetearFormulario();
    this.mostrar = false;
    this.onCerrar.emit();
  }

  guardarCategoria(): void {
    if (!this.nuevaCategoria.nombre.trim()) {
      this.mostrarMensaje('El nombre de la categoría es obligatorio', 'error');
      return;
    }

    this.guardando = true;
    
    // Aquí llamarías a tu servicio (ej. this.api.crearCategoria(...).subscribe)
    // Simulamos una carga por ahora:
    setTimeout(() => {
      this.guardando = false;
      this.mostrarMensaje('Categoría registrada con éxito', 'ok');
      
      // Emitimos el nombre de la categoría hacia el padre (el formulario principal)
      this.onGuardar.emit(this.nuevaCategoria.nombre.trim());
      
      // Cerramos el modal tras 1 segundo
      setTimeout(() => this.cerrarModal(), 1000);
    }, 800);
  }

  private mostrarMensaje(texto: string, tipo: 'ok' | 'error'): void {
    this.mensaje = texto;
    this.tipoMensaje = tipo;
  }

  private resetearFormulario(): void {
    this.nuevaCategoria = { nombre: '', descripcion: '' };
    this.mensaje = '';
    this.tipoMensaje = '';
  }
}