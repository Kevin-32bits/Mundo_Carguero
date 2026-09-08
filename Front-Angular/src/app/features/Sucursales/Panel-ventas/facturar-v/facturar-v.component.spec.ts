import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacturarVComponent } from './facturar-v.component';

describe('FacturarVComponent', () => {
  let component: FacturarVComponent;
  let fixture: ComponentFixture<FacturarVComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FacturarVComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FacturarVComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
