import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ROLE_CONFIG, isUsuarioRol } from '../../core/role-config';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: 'navbar.component.html',
  styleUrl: 'navbar.component.css'
})
export class NavbarComponent implements OnInit {
  Titulo_Area: string = 'Sistema Carguero';
  Logo_Empresa = 'assets/img/Logo_E.png';
  // Variable Avatar eliminada

  ngOnInit() {
    // 1. Obtenemos el ROL real (ej: "Vendedor01", "Gerencia", etc.)
    const rolActual = sessionStorage.getItem('rolUsuario');

    // 2. Verificamos si ese string coincide con alguna de tus llaves en ROLE_CONFIG
    if (isUsuarioRol(rolActual)) {
      // 3. Accedemos al objeto usando esa llave y asignamos el areaTitle configurado
      this.Titulo_Area = ROLE_CONFIG[rolActual].areaTitle;
    }
  }
}