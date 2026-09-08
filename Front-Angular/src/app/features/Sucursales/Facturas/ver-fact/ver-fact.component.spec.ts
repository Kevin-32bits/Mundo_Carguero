import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VerFactComponent } from './ver-fact.component';

describe('VerFactComponent', () => {
  let component: VerFactComponent;
  let fixture: ComponentFixture<VerFactComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerFactComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(VerFactComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
