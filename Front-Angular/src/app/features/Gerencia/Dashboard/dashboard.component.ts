import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { finalize } from 'rxjs';
import {
  DashboardAlertaStockApi,
  DashboardSerieApi,
  DashboardTiendaApi,
  GerenciaApiService,
} from '../../../core/gerencia-api.service';

Chart.register(...registerables);

interface Periodo {
  key: 'hoy' | 'semana' | 'mes' | 'anio';
  label: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DecimalPipe],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  private lineChart: Chart | null = null;
  private viewReady = false;

  periodos: Periodo[] = [
    { key: 'hoy', label: 'Hoy' },
    { key: 'semana', label: 'Semana' },
    { key: 'mes', label: 'Mes' },
    { key: 'anio', label: 'Año' },
  ];
  periodoActivo: Periodo['key'] = 'semana';
  chartTabVentas: 'semana' | 'mes' = 'semana';
  kpiSeleccionado = '';

  cargando = false;
  mensaje = '';

  kpis = { ventas: 0, alertas: 0, clientes: 0 };
  tendencia = { ventas: 0, clientes: 0 };

  tiendas: Array<{ nombre: string; monto: number; porcentaje: number; activa: boolean }> = [];
  alertasStock: DashboardAlertaStockApi[] = [];

  private datosLine: Record<'semana' | 'mes', { labels: string[]; values: number[] }> = {
    semana: { labels: ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'], values: [0, 0, 0, 0, 0, 0, 0] },
    mes: { labels: ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'], values: [0, 0, 0, 0] },
  };

  constructor(private readonly gerenciaApi: GerenciaApiService) {}

  ngOnInit(): void {
    this.cargarDashboard();
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.buildOrUpdateLineChart();
  }

  ngOnDestroy(): void {
    this.lineChart?.destroy();
  }

  setPeriodo(key: string): void {
    const periodo = this.periodos.find((p) => p.key === key)?.key;
    if (!periodo || periodo === this.periodoActivo) {
      return;
    }
    this.periodoActivo = periodo;
    this.cargarDashboard();
  }

  setKpi(kpi: string): void {
    this.kpiSeleccionado = this.kpiSeleccionado === kpi ? '' : kpi;
  }

  setTabVentas(tab: 'semana' | 'mes'): void {
    this.chartTabVentas = tab;
    this.buildOrUpdateLineChart();
  }

  toggleTienda(tienda: { activa: boolean }): void {
    tienda.activa = !tienda.activa;
  }

  private cargarDashboard(): void {
    this.cargando = true;
    this.mensaje = '';

    this.gerenciaApi
      .obtenerDashboard(this.periodoActivo)
      .pipe(finalize(() => (this.cargando = false)))
      .subscribe({
        next: (data) => {
          this.kpis = {
            ventas: Number(data.kpis?.ventas ?? 0),
            alertas: Number(data.kpis?.alertas ?? 0),
            clientes: Number(data.kpis?.clientes ?? 0),
          };
          this.tendencia = {
            ventas: Number(data.tendencia?.ventas ?? 0),
            clientes: Number(data.tendencia?.clientes ?? 0),
          };

          this.alertasStock = Array.isArray(data.alertasStock) ? data.alertasStock : [];
          this.tiendas = (Array.isArray(data.ventasPorTienda) ? data.ventasPorTienda : []).map((t: DashboardTiendaApi) => ({
            nombre: t.nombre,
            monto: Number(t.monto ?? 0),
            porcentaje: Number(t.porcentaje ?? 0),
            activa: false,
          }));

          this.datosLine = {
            semana: this.mapearSerie(data.ventasSerieSemana, ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']),
            mes: this.mapearSerie(data.ventasSerieMes, ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4']),
          };

          this.buildOrUpdateLineChart();
        },
        error: (error) => {
          this.mensaje = error?.error?.mensaje ?? 'No se pudo cargar el dashboard de gerencia.';
        },
      });
  }

  private mapearSerie(serie: DashboardSerieApi[] | undefined, fallbackLabels: string[]) {
    if (!Array.isArray(serie) || serie.length === 0) {
      return { labels: fallbackLabels, values: fallbackLabels.map(() => 0) };
    }
    return {
      labels: serie.map((s) => s.label),
      values: serie.map((s) => Number(s.total ?? 0)),
    };
  }

  private buildOrUpdateLineChart(): void {
    if (!this.viewReady) {
      return;
    }

    const canvas = document.getElementById('lineChart') as HTMLCanvasElement | null;
    if (!canvas) {
      return;
    }

    const d = this.datosLine[this.chartTabVentas];

    if (this.lineChart) {
      this.lineChart.data.labels = d.labels;
      (this.lineChart.data.datasets[0] as any).data = d.values;
      this.lineChart.update('active');
      return;
    }

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels: d.labels,
        datasets: [
          {
            data: d.values,
            borderColor: '#cc2222',
            backgroundColor: 'rgba(180,10,10,0.1)',
            pointBackgroundColor: '#cc2222',
            pointBorderColor: '#ff6666',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 8,
            pointHoverBackgroundColor: '#ff3333',
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400 },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15,3,3,0.95)',
            titleColor: '#f0d0d0',
            bodyColor: '#f0d0d0',
            borderColor: 'rgba(180,30,30,0.5)',
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: (ctx) => {
                const v = ctx.parsed.y;
                if (v == null) {
                  return '';
                }
                return v >= 1000000 ? ` S/ ${(v / 1000000).toFixed(2)}M` : ` S/ ${(v / 1000).toFixed(0)}k`;
              },
            },
          },
        },
        scales: {
          x: {
            ticks: { color: 'rgba(240,190,190,0.55)', font: { size: 11 } },
            grid: { color: 'transparent' },
            border: { color: 'transparent' },
          },
          y: {
            ticks: {
              color: 'rgba(240,190,190,0.45)',
              font: { size: 10 },
              callback: (v) =>
                Number(v) >= 1000000 ? `S/ ${(Number(v) / 1000000).toFixed(1)}M` : `S/ ${Number(v) / 1000}k`,
            },
            grid: { color: 'rgba(180,30,30,0.08)' },
            border: { color: 'transparent', dash: [3, 3] },
          },
        },
      },
    };

    this.lineChart = new Chart(canvas, config);
  }
}
