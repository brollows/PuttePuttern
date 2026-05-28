import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UnitsLeagueComponent } from './units-league.component';

describe('UnitsLeagueComponent', () => {
  let component: UnitsLeagueComponent;
  let fixture: ComponentFixture<UnitsLeagueComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UnitsLeagueComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UnitsLeagueComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
