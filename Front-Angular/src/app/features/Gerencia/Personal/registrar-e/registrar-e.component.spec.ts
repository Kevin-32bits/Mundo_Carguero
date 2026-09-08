import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegistrarEComponent } from './registrar-e.component';

describe('RegistrarEComponent', () => {
  let component: RegistrarEComponent;
  let fixture: ComponentFixture<RegistrarEComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegistrarEComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RegistrarEComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
