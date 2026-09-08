import { Component } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { NavbarComponent } from '../shared/navbar/navbar.component';
import { SidebarComponent } from '../shared/sidebar/sidebar.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, SidebarComponent],
  templateUrl: 'main-layout.component.html',
  styleUrl: 'main-layout.component.css',
})
export class MainLayoutComponent {
  esDashboardGerencia = false;

  constructor(private readonly router: Router) {
    this.actualizarModoLayout(this.router.url);
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.actualizarModoLayout(event.urlAfterRedirects));
  }

  private actualizarModoLayout(url: string): void {
    const limpia = String(url ?? '').toLowerCase().split('?')[0];
    this.esDashboardGerencia = limpia.endsWith('/gerencia/dashboard');
  }
}
