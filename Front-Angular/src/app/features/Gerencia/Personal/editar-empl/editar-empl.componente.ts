import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-editar-empl',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './editar-empl.componente.html',
  styleUrls: ['./editar-empl.componente.css'],
})
export class EditarEmplComponente implements OnInit {
  // Recibimos los datos desde personal.component.ts
  @Input() empleadoOriginal: any; // Idealmente usa tu interface EmpleadoGerenciaApi
  @Input() roles: any[] = [];
  @Input() ubicaciones: any[] = [];

  // Emitimos eventos hacia el padre
  @Output() onClose = new EventEmitter<void>();
  @Output() onSaved = new EventEmitter<any>();

  // Objeto temporal para enlazar al formulario
  empleadoEdit: any = {};
  cargando = false;

  ngOnInit(): void {
    // Clonamos el objeto para no modificar la fila de la tabla directamente
    this.empleadoEdit = { ...this.empleadoOriginal };
  }

  cerrarModal(): void {
    this.onClose.emit();
  }

  guardarCambios(): void {
    this.cargando = true;
    // Aquí puedes realizar validaciones antes de emitir
    this.onSaved.emit(this.empleadoEdit);
  }
}