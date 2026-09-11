import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { buildAutoPaymentRows, validateAutoPaymentTranches } from './pages/projects/projects.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have the 'Project Cost' title`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('Project Cost');
  });
});

describe('buildAutoPaymentRows', () => {
  it('calculates the 1% source withholding and the tranche date from delivery date', () => {
    const rows = buildAutoPaymentRows({
      nom: 'PAY-001',
      fournisseur: 'additive',
      montantTotal: 1000,
      dateLivraison: '2026-09-01',
      tranches: [
        { tranche: 1, pourcentage: 50, jours: 5 },
        { tranche: 2, pourcentage: 50, jours: 10 }
      ]
    });

    expect(rows).toHaveSize(2);
    expect(rows[0].montant).toBe(495);
    expect(rows[0].retenuSource).toBe(5);
    expect(rows[0].date).toBe('2026-09-06');
    expect(rows[1].date).toBe('2026-09-11');
  });
});
