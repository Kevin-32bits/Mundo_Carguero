import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import {
  CatalogoApi,
  CrearEmpleadoGerenciaApi,
  EmpleadoGerenciaApi,
  GerenciaApiService,
} from '../../../../core/gerencia-api.service';

@Component({
  selector: 'app-registrar-e',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './registrar-e.component.html',
  styleUrl: './registrar-e.component.css',
})
export class RegistrarEComponent {
  @Input() roles: CatalogoApi[] = [];
  @Input() ubicaciones: CatalogoApi[] = [];

  @Output() onClose = new EventEmitter<void>();
  @Output() onSaved = new EventEmitter<EmpleadoGerenciaApi>();

  guardando = false;
  mensaje = '';
  tipoMensaje: 'ok' | 'error' | '' = '';

  form: CrearEmpleadoGerenciaApi = {
    nombreCompleto: '',
    dni: '',
    telefono: '',
    rolId: 0,
    ubicacionId: 0,
    estadoLaboral: true,
    usuario: '',
    password: '',
    confirmarPassword: ''
  };

  // Variable para controlar la visibilidad de la contraseña
  mostrarPassword = false;

  // Método para limpiar caracteres no numéricos
  permitirSoloNumeros(event: Event, campo: 'dni' | 'telefono') {
    const input = event.target as HTMLInputElement;
    // Expresión regular que reemplaza todo lo que NO sea un dígito (0-9) por vacío
    const valorLimpio = input.value.replace(/[^0-9]/g, ''); 
    input.value = valorLimpio; // Actualiza lo que se ve en pantalla
    this.form[campo] = valorLimpio; // Actualiza tu modelo de datos
  }

  constructor(private readonly gerenciaApi: GerenciaApiService) {}

  close() {
    this.onClose.emit();
  }

  save() {
    if (this.guardando) {
      return;
    }

    const nombreCompleto = String(this.form.nombreCompleto ?? '').trim();
    const dni = String(this.form.dni ?? '').trim();
    const telefono = String(this.form.telefono ?? '').trim();
    const usuario = String(this.form.usuario ?? '').trim();
    const password = this.form.password ?? '';
    const confirmarPassword = this.form.confirmarPassword ?? '';

    if (!nombreCompleto || !dni || !this.form.rolId || !this.form.ubicacionId || !usuario || !password) {
      this.tipoMensaje = 'error';
      this.mensaje = 'Por favor, completa todos los campos obligatorios (incluyendo usuario y contraseña).';
      return;
    }

    if (password !== confirmarPassword) {
      this.tipoMensaje = 'error';
      this.mensaje = 'Las contraseñas no coinciden. Por favor, verifícalas.';
      return;
    }

    this.guardando = true;
    this.tipoMensaje = '';
    this.mensaje = '';

    this.gerenciaApi.crearEmpleado({
        nombreCompleto,
        dni,
        telefono: telefono || null,
        rolId: this.form.rolId,
        ubicacionId: this.form.ubicacionId,
        estadoLaboral: this.form.estadoLaboral,
        usuario,
        password,
        confirmarPassword
      })
      .pipe(finalize(() => (this.guardando = false)))
      .subscribe({
        next: (empleado) => {
          this.tipoMensaje = 'ok';
          this.mensaje = 'Usuario registrado correctamente.';
          this.onSaved.emit(empleado);
          this.close();
        },
        error: (error) => {
          this.tipoMensaje = 'error';
          this.mensaje = error?.error?.mensaje ?? 'No se pudo registrar el usuario.';
        },
      });
  }
}
