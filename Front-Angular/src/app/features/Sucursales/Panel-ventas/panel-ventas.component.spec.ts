import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PanelVentasComponent } from './panel-ventas.component';

describe('PanelVentasComponent', () => {
  let component: PanelVentasComponent;
  let fixture: ComponentFixture<PanelVentasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PanelVentasComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PanelVentasComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
