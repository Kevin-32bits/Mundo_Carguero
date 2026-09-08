import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegistroPComponent } from './registro-p.component';

describe('RegistroPComponent', () => {
  let component: RegistroPComponent;
  let fixture: ComponentFixture<RegistroPComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegistroPComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RegistroPComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
