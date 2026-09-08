import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditarEmplComponente } from './editar-empl.componente';

describe('EditarEmplComponente', () => {
  let component: EditarEmplComponente;
  let fixture: ComponentFixture<EditarEmplComponente>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditarEmplComponente],
    }).compileComponents();

    fixture = TestBed.createComponent(EditarEmplComponente);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
