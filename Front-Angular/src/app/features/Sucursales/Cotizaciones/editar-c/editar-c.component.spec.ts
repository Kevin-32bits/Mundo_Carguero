import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditarCComponent } from './editar-c.component';

describe('EditarCComponent', () => {
  let component: EditarCComponent;
  let fixture: ComponentFixture<EditarCComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditarCComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EditarCComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
