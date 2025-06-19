import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TurnamentComponent } from './turnament.component';

describe('TurnamentComponent', () => {
  let component: TurnamentComponent;
  let fixture: ComponentFixture<TurnamentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TurnamentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TurnamentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
