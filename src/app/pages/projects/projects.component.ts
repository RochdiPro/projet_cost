import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import * as XLSX from 'xlsx';
import { Chart, registerables } from 'chart.js';
import {
  ProjectWorkbook,
  PROJECT_WORKBOOK_SHEETS,
  Projet,
  Facture,
  AutreFacture,
  Restauration,
  Deplacement,
  ChargeSociete,
  Paiement,
  PhaseProjet,
  ProjetRapport
} from '../../core/models/project-cost.models';
import { AuthService } from '../../core/services/auth.service';

type SheetKey = keyof ProjectWorkbook;
type Row = Record<string, string | number | boolean | null>;

interface ProjectFile {
  name: string;
  data: ProjectWorkbook;
}

const createDemoWorkbook = (): ProjectWorkbook => ({
  infoProjet: [
    {
      id: 'PRJ-001',
      client: 'additive',
      description: 'Projet additive_delice',
      dateDebutPrevue: '2026-09-01',
      dateDebutReelle: '2026-09-01',
      dateFinPrevue: '2026-09-30',
      dateFinReelle: '',
      joursPasses: 0,
      joursRestants: 29,
      joursRetard: 0,
      etat: 'EN_COURS'
    }
  ] as Projet[],
  factures: [
    {
      id: 'FAC-001',
      fournisseur: 'additive',
      numeroFacture: 'F-001',
      numeroBC: 'BC-001',
      montantTotal: 12000,
      montantPaye: 6000,
      montantRestant: 6000,
      dateEcheance: '2026-09-20'
    }
  ] as Facture[],
  autresFactures: [
    {
      id: 'AUT-001',
      fournisseur: 'logistique',
      description: 'Livraison',
      montant: 2450,
      date: '2026-09-05'
    }
  ] as AutreFacture[],
  restauration: [
    {
      id: 'RES-001',
      date: '2026-09-02',
      montant: 320,
      description: 'Repas équipe'
    }
  ] as Restauration[],
  logistique: [
    {
      id: 'LOG-001',
      type: 'Transport',
      date: '2026-09-04',
      montant: 480,
      description: 'Déplacement chantier'
    }
  ] as Deplacement[],
  charges: [
    {
      id: 'CHG-001',
      employe: 'Alice',
      nombreJoursTravail: 4,
      montantJour: 350,
      montantTotal: 1400,
      description: 'Intervention technique'
    }
  ] as ChargeSociete[],
  paiements: [
    { id: 'PAY-001', montant: 6000, fournisseur: 'additive', date: '2026-09-03', etat: 'PAYE' }
  ] as Paiement[],
  planification: [
    { phase: 'Préparation', dateDebut: '2026-09-01', dateFin: '2026-09-05', nombreJours: 5, avanceRetard: 0, etat: 'TERMINE' },
    { phase: 'Réalisation', dateDebut: '2026-09-06', dateFin: '2026-09-25', nombreJours: 20, avanceRetard: 0, etat: 'EN_COURS' },
    { phase: 'Clôture', dateDebut: '2026-09-26', dateFin: '2026-09-30', nombreJours: 5, avanceRetard: 0, etat: 'A_VENIR' }
  ] as PhaseProjet[],
  rapport: [
    { categorie: 'Factures avec BC', montant: 12000 },
    { categorie: 'Autres factures', montant: 2450 },
    { categorie: 'Restauration', montant: 320 },
    { categorie: 'Logistique', montant: 480 },
    { categorie: 'Charges société', montant: 1400 }
  ] as ProjetRapport[]
});

Chart.register(...registerables);

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <main class="page">
      <header class="topbar">
        <a routerLink="/dashboard" class="logo"><b>PC</b> PROJECT COST</a>
        <nav>
          <a routerLink="/dashboard">Tableau de bord</a>
          <button type="button" (click)="logout()">Quitter</button>
        </nav>
      </header>

      <section class="hero">
        <div>
          <small>Bibliothèque de projets</small>
          <h1>Vos fichiers<span>.</span></h1>
          <p>Ouvrez un fichier Excel pour consulter et modifier ses feuilles.</p>
        </div>

        <label class="import">
          ＋ Importer un fichier
          <input type="file" accept=".xlsx,.xls" (change)="importFile($event)" />
        </label>
      </section>

      <section class="content">
        @if (message) {
          <p class="message">{{ message }}</p>
        }

        <div class="cards">
          @for (file of files; track file.name) {
            <button
              type="button"
              class="card"
              [class.selected]="selectedFile?.name === file.name"
              (click)="selectFile(file)"
            >
              <span class="icon">▦</span>
              <small>XLSX · PROJET</small>
              <strong>{{ title(file) }}</strong>
              <em>{{ file.name }}</em>
              <label>Ouvrir <b>→</b></label>
            </button>
          } @empty {
            <div class="empty">
              <span>□</span>
              <h2>Aucun fichier Excel</h2>
              <p>Ajoutez un fichier dans <b>src/assets</b> ou importez-le.</p>
            </div>
          }
        </div>

        @if (selectedFile) {
          <section class="viewer">
            <div class="viewer-head">
              <div>
                <small>Fichier sélectionné</small>
                <h2>{{ selectedFile.name }}</h2>
              </div>

              <div class="file-actions">
                <button type="button" class="action add" title="Ajouter une ligne" [disabled]="activeSheet === 'infoProjet'" (click)="addRow()">＋</button>
                <button type="button" class="action save" title="Enregistrer le fichier" (click)="saveFile()">✓</button>
                <button type="button" class="action report" title="Imprimer le rapport" (click)="printReport()">▤</button>
                <button type="button" class="action delete" title="Supprimer le fichier" (click)="askDeleteFile()">🗑</button>
              </div>
            </div>

            <div class="tabs">
              @for (sheet of sheets; track sheet.key) {
                <button type="button" [class.active]="activeSheet === sheet.key" (click)="selectSheet(sheet.key)">
                  {{ sheet.icon }} {{ sheet.label }}
                </button>
              }
            </div>

            <div class="table-box">
              @if (rows.length) {
                <table>
                  <thead>
                    <tr>
                      @for (header of headers; track header) {
                        <th>{{ header }}</th>
                      }
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of rows; track $index) {
                      <tr>
                        @for (header of headers; track header) {
                          <td>{{ cellValue(header, row[header]) }}</td>
                        }
                        <td>
                          <button type="button" class="row-action edit" title="Modifier" (click)="editRow(row)">✎</button>
                          <button type="button" class="row-action remove" title="Supprimer" (click)="askDeleteRow(row)">🗑</button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              } @else {
                <div class="empty-sheet">Cette feuille est vide. Cliquez sur ＋ pour ajouter une ligne.</div>
              }
            </div>

            @if (activeSheet === 'planification') {
              <section class="planning-insights">
                <div class="insights-head">
                  <div><small>Analyse du planning</small><h2>Avancement des phases</h2></div>
                  <span class="insights-note">Durée et écart en jours</span>
                </div>
                <div class="planning-stats">
                  <div><span>Phases</span><strong>{{ planningStats.total }}</strong></div>
                  <div><span>Terminées</span><strong>{{ planningStats.completed }}</strong></div>
                  <div><span>Avancement</span><strong>{{ planningStats.progress }}%</strong></div>
                  <div><span>Écart moyen</span><strong>{{ planningStats.variance }} j</strong></div>
                </div>
                <div class="chart-frame"><canvas #planningChart></canvas></div>
              </section>
            }
          </section>
        }

        @if (modalMode) {
          <div class="modal-backdrop" (click)="closeModal()">
            <section class="modal" (click)="$event.stopPropagation()">
              @if (modalMode === 'file') {
                <h2>Supprimer le fichier ?</h2>
                <p>Cette action supprimera {{ selectedFile?.name }} de votre liste.</p>
                <div class="modal-actions">
                  <button type="button" class="cancel" (click)="closeModal()">Annuler</button>
                  <button type="button" class="danger" (click)="deleteFile()">Confirmer</button>
                </div>
              } @else if (modalMode === 'delete-row') {
                <h2>Supprimer cette ligne ?</h2>
                <p>Cette action est définitive.</p>
                <div class="modal-actions">
                  <button type="button" class="cancel" (click)="closeModal()">Annuler</button>
                  <button type="button" class="danger" (click)="deleteRow()">Confirmer</button>
                </div>
              } @else {
                <h2>{{ modalTitle }}</h2>
                <p>Complétez les champs de cette feuille.</p>
                <div class="fields-grid">
                  @for (header of modalHeaders; track header) {
                    <label class="field">
                      {{ fieldLabel(header) }}
                      @if (isStatus(header)) {
                        <select [(ngModel)]="draftRow[header]">
                          @for (status of statusOptions; track status.value) {
                            <option [value]="status.value">{{ status.label }}</option>
                          }
                        </select>
                      } @else {
                        <input
                          [(ngModel)]="draftRow[header]"
                          [type]="fieldType(header)"
                          [attr.inputmode]="fieldInputMode(header)"
                          [attr.step]="fieldStep(header)"
                          [readonly]="isIdentifier(header)"
                          [placeholder]="fieldPlaceholder(header)"
                        />
                      }
                      @if (isIdentifier(header)) {
                        <small class="field-help">Identifiant unique de la ligne.</small>
                      }
                    </label>
                  }
                </div>
                <div class="modal-actions">
                  <button type="button" class="cancel" (click)="closeModal()">Annuler</button>
                  <button type="button" class="save-text" (click)="saveRow()">Enregistrer</button>
                </div>
              }
            </section>
          </div>
        }
      </section>
    </main>
  `,
  styles: [
    `
      :host { display: block; min-height: 100vh; }
      * { box-sizing: border-box; }
      .page { min-height: 100vh; background: #f7f9fc; color: #1e293b; }
      .topbar {
        height: 68px; display: flex; justify-content: space-between; align-items: center;
        padding: 0 8%; background: #fff; border-bottom: 1px solid #e2e8f0;
      }
      .logo { color: #1e293b; font: 700 12px monospace; text-decoration: none; }
      .logo b { display: inline-grid; place-items: center; width: 28px; height: 28px; margin-right: 8px; background: #2563eb; color: #fff; font-size: 10px; }
      nav { display: flex; gap: 24px; align-items: center; }
      nav a, nav button { border: 0; background: none; color: #64748b; font: 12px monospace; text-decoration: none; cursor: pointer; }
      .hero { display: flex; justify-content: space-between; align-items: end; gap: 20px; padding: 64px 10% 52px; background: #1e3a5f; color: #fff; }
      .hero small, .viewer-head small { color: #bfdbfe; font: 11px monospace; text-transform: uppercase; letter-spacing: 1px; }
      h1 { margin: 15px 0 0; font: 700 clamp(44px,6vw,76px)/.95 Georgia,serif; }
      h1 span { color: #93c5fd; }
      .hero p { color: #dbeafe; }
      .import { position: relative; padding: 14px 16px; border: 1px solid #93c5fd; color: #fff; font: 12px monospace; cursor: pointer; white-space: nowrap; }
      .import input { display: none; }
      .content { padding: 38px 10% 80px; }
      .message { padding: 13px; border-left: 3px solid #2563eb; background: #dbeafe; color: #1e40af; font-size: 13px; }
      .cards { display: grid; grid-template-columns: repeat(auto-fill,minmax(220px,1fr)); gap: 16px; }
      .card { display: flex; flex-direction: column; min-height: 205px; padding: 20px; border: 1px solid #e2e8f0; background: #fff; color: #1e293b; text-align: left; cursor: pointer; }
      .card:hover, .card.selected { border-color: #2563eb; box-shadow: 0 4px 16px rgba(30,58,95,.1); }
      .icon { display: grid; place-items: center; width: 40px; height: 40px; margin-bottom: 22px; background: #eff6ff; color: #2563eb; font-size: 20px; }
      .card small { color: #94a3b8; font: 10px monospace; }
      .card strong { margin-top: 9px; font: 700 20px Georgia,serif; }
      .card em { overflow: hidden; margin-top: 6px; color: #64748b; font-style: normal; }
      .card label { margin-top: auto; color: #2563eb; font: 700 12px monospace; }
      .empty { padding: 26px; border: 1px dashed #cbd5e1; background: #fff; color: #475569; text-align: center; }
      .viewer { margin-top: 28px; border: 1px solid #dfe7f4; background: #fff; }
      .viewer-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 20px 22px; border-bottom: 1px solid #e2e8f0; }
      .viewer-head h2 { margin: 8px 0 0; font: 700 24px Georgia,serif; }
      .file-actions { display: flex; gap: 8px; }
      .action { width: 36px; height: 36px; border: 1px solid #dbeafe; background: #eff6ff; cursor: pointer; }
      .action:disabled { opacity: .4; cursor: not-allowed; }
      .action.save { background: #e0f2fe; }
      .action.report { background: #fef3c7; color: #92400e; }
      .action.delete { background: #fee2e2; }
      .tabs { display: flex; flex-wrap: wrap; gap: 8px; padding: 14px 16px; border-bottom: 1px solid #e2e8f0; background: #f8fafc; }
      .tabs button { padding: 8px 12px; border: 1px solid #dbeafe; background: #fff; color: #334155; font: 11px monospace; cursor: pointer; }
      .tabs .active { background: #dbeafe; border-color: #93c5fd; }
      .table-box { overflow-x: auto; }
      table { width: 100%; border-collapse: collapse; }
      th, td { padding: 12px 10px; border-bottom: 1px solid #e2e8f0; text-align: left; vertical-align: top; }
      th { background: #f8fafc; color: #475569; font: 700 11px monospace; text-transform: uppercase; }
      td { color: #334155; }
      .row-action { border: 1px solid #e2e8f0; background: #fff; width: 30px; height: 30px; cursor: pointer; }
      .row-action.remove { color: #b91c1c; }
      .empty-sheet { padding: 30px 18px; color: #64748b; text-align: center; }
      .planning-insights { padding: 24px; border-top: 1px solid #e2e8f0; background: #fbfdff; }
      .insights-head { display: flex; justify-content: space-between; align-items: end; gap: 16px; }
      .insights-head small { color: #2563eb; font: 11px monospace; text-transform: uppercase; letter-spacing: 1px; }
      .insights-head h2 { margin: 8px 0 0; font: 700 25px Georgia, serif; }
      .insights-note { color: #64748b; font: 11px monospace; }
      .planning-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 20px 0; }
      .planning-stats div { padding: 14px; border: 1px solid #dbeafe; background: #fff; }
      .planning-stats span { display: block; color: #64748b; font: 10px monospace; text-transform: uppercase; }
      .planning-stats strong { display: block; margin-top: 7px; color: #1e3a5f; font: 700 24px Georgia, serif; }
      .chart-frame { position: relative; height: 280px; padding: 14px 8px 4px; border: 1px solid #e2e8f0; background: #fff; }
      .modal-backdrop { position: fixed; inset: 0; display: grid; place-items: center; background: rgba(15,23,42,.35); padding: 24px; }
      .modal { width: min(520px,90vw); background: #fff; border: 1px solid #e2e8f0; padding: 22px; box-shadow: 0 18px 36px rgba(15,23,42,.18); }
      .modal h2 { margin: 0 0 12px; font: 700 30px Georgia,serif; }
      .modal p { color: #475569; margin: 0 0 18px; }
      .fields-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 14px; }
      .field { display: grid; gap: 6px; color: #475569; font: 700 12px monospace; margin-bottom: 12px; }
      .field input, .field select { width: 100%; min-width: 0; border: 1px solid #cbd5e1; background: #fff; padding: 10px 12px; color: #0f172a; font: 14px/1.4 sans-serif; }
      .field input[readonly] { background: #f1f5f9; color: #64748b; }
      .field-help { color: #94a3b8; font: 10px/1.3 sans-serif; }
      .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px; }
      .cancel, .danger, .save-text { padding: 10px 14px; border: 1px solid #cbd5e1; background: #fff; color: #0f172a; cursor: pointer; font: 700 12px monospace; }
      .danger { border-color: #fecaca; background: #fee2e2; color: #991b1b; }
      .save-text { border-color: #bbf7d0; background: #dcfce7; color: #166534; }
      @media (max-width: 820px) { .hero { flex-direction: column; align-items: flex-start; } .topbar { padding: 0 20px; } nav { gap: 12px; } }
      @media (max-width: 560px) { .fields-grid, .planning-stats { grid-template-columns: 1fr; } .insights-head { align-items: flex-start; flex-direction: column; } }
    `
  ]
})
export class ProjectsComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly xlsx = XLSX;
  private readonly auth = inject(AuthService);
  @ViewChild('planningChart') private planningCanvas?: ElementRef<HTMLCanvasElement>;
  private planningChart?: Chart;

  files: ProjectFile[] = [];
  selectedFile?: ProjectFile;
  activeSheet: SheetKey = 'infoProjet';
  message = '';
  modalMode: '' | 'row' | 'delete-row' | 'file' = '';
  editingRow?: Row;
  draftRow: Row = {};

  readonly sheets: Array<{ key: SheetKey; label: string; icon: string }> = [
    { key: 'infoProjet', label: 'INFO_PROJET', icon: '⌂' },
    { key: 'factures', label: 'FACTURES', icon: '' },
    { key: 'autresFactures', label: 'AUTRES_FACTURES', icon: '¤' },
    { key: 'restauration', label: 'RESTAURATION', icon: '◇' },
    { key: 'logistique', label: 'LOGISTIQUE', icon: '↗' },
    { key: 'charges', label: 'CHARGES', icon: '♙' },
    { key: 'paiements', label: 'PAIEMENTS', icon: '€' },
    { key: 'planification', label: 'PLANIFICATION', icon: '◷' },
    { key: 'rapport', label: 'RAPPORT', icon: '▤' }
  ];

  get rows(): Row[] {
    const rows = this.selectedFile?.data[this.activeSheet] ?? [];
    return rows as unknown as Row[];
  }

  get headers(): string[] {
    return this.rows.length ? Object.keys(this.rows[0]) : [];
  }

  get modalHeaders(): string[] {
    return this.headers.length ? this.headers : this.defaultHeaders[this.activeSheet];
  }

  get modalTitle(): string {
    const action = this.editingRow ? 'Modifier' : 'Ajouter';
    const sheetNames: Record<SheetKey, string> = {
      infoProjet: 'le projet',
      factures: 'une facture',
      autresFactures: 'une autre facture',
      restauration: 'une dépense de restauration',
      logistique: 'une dépense logistique',
      charges: 'une charge',
      paiements: 'un paiement',
      planification: 'une phase projet',
      rapport: 'une ligne de rapport'
    };

    return `${action} ${sheetNames[this.activeSheet]}`;
  }

  get statusOptions(): Array<{ value: string; label: string }> {
    return this.activeSheet === 'paiements'
      ? [
          { value: 'PAYE', label: 'Payé' },
          { value: 'PLANIFIE', label: 'Planifié' }
        ]
      : [
          { value: 'A_VENIR', label: 'Planifié' },
          { value: 'EN_COURS', label: 'En cours' },
          { value: 'EN_RETARD', label: 'En retard' },
          { value: 'TERMINE', label: 'Clôturé' }
        ];
  }

  fieldLabel(header: string): string {
    const labels: Record<string, string> = {
      id: 'Identifiant',
      client: 'Client',
      montant: 'Montant',
      montantTotal: 'Montant total',
      montantPaye: 'Montant payé',
      montantRestant: 'Montant restant',
      montantJour: 'Montant par jour',
      fournisseur: 'Fournisseur',
      etat: 'État',
      phase: 'Phase',
      nombreJours: 'Nombre de jours',
      avanceRetard: 'Avance / retard (jours)',
      dateDebut: 'Date de début',
      dateFin: 'Date de fin',
      dateDebutPrevue: 'Date de début prévue',
      dateDebutReelle: 'Date de début réelle',
      dateFinPrevue: 'Date de fin prévue',
      dateFinReelle: 'Date de fin réelle',
      dateEcheance: "Date d'échéance",
      nombreJoursTravail: 'Nombre de jours travaillés',
      categorie: 'Catégorie'
    };

    return labels[header] ?? header;
  }

  fieldType(header: string): 'date' | 'number' | 'text' {
    if (header.toLowerCase().includes('date')) return 'date';
    if (header.toLowerCase().includes('jours') || header.toLowerCase().includes('avance') || header.toLowerCase().includes('retard')) return 'number';
    return 'text';
  }

  cellValue(header: string, value: Row[string]): string | number | boolean | null {
    if (this.isStatus(header)) {
      const status = this.statusOptions.find((option) => option.value === value);
      return status?.label ?? value;
    }

    if (header === 'avanceRetard' && typeof value === 'number') {
      return value > 0 ? `${value} j d'avance` : value < 0 ? `${Math.abs(value)} j de retard` : 'Dans les délais';
    }

    return value;
  }

  fieldInputMode(header: string): string {
    return this.isAmount(header) ? 'decimal' : this.fieldType(header) === 'number' ? 'numeric' : 'text';
  }

  fieldStep(header: string): string | null {
    return this.isAmount(header) ? '0.01' : this.fieldType(header) === 'number' ? '1' : null;
  }

  fieldPlaceholder(header: string): string {
    return this.isAmount(header) ? '0,00' : this.fieldType(header) === 'date' ? 'jj/mm/aaaa' : '';
  }

  isIdentifier(header: string): boolean {
    return header.toLowerCase() === 'id' || header.toLowerCase().includes('id projet');
  }

  isStatus(header: string): boolean {
    return header.toLowerCase() === 'etat' || header.toLowerCase().includes('état');
  }

  private isAmount(header: string): boolean {
    return header.toLowerCase().includes('montant');
  }

  private normalizeRow(row: Row): Row {
    const normalized: Row = { ...row };

    for (const header of Object.keys(normalized)) {
      const value = normalized[header];
      if (this.isAmount(header) && typeof value === 'string') {
        normalized[header] = Number(value.replace(',', '.')) || 0;
      }
    }

    return normalized;
  }

  private readonly defaultHeaders: Record<SheetKey, string[]> = {
    infoProjet: ['id', 'client', 'description', 'dateDebutPrevue', 'dateDebutReelle', 'dateFinPrevue', 'dateFinReelle', 'joursPasses', 'joursRestants', 'joursRetard', 'etat'],
    factures: ['id', 'fournisseur', 'numeroFacture', 'numeroBC', 'montantTotal', 'montantPaye', 'montantRestant', 'dateEcheance'],
    autresFactures: ['id', 'fournisseur', 'description', 'montant', 'date'],
    restauration: ['id', 'date', 'montant', 'description'],
    logistique: ['id', 'type', 'date', 'montant', 'description'],
    charges: ['id', 'employe', 'nombreJoursTravail', 'montantJour', 'montantTotal', 'description'],
    paiements: ['id', 'montant', 'fournisseur', 'date', 'etat'],
    planification: ['phase', 'dateDebut', 'dateFin', 'nombreJours', 'avanceRetard', 'etat'],
    rapport: ['categorie', 'montant']
  };

  ngOnInit(): void {
    const defaultFile: ProjectFile = {
      name: 'Projet_additive_delice.xlsx',
      data: createDemoWorkbook()
    };

    this.files = [defaultFile];
    this.selectedFile = defaultFile;
    this.message = 'Fichier de démonstration chargé.';
  }

  title(file: ProjectFile): string {
    const project = file.data.infoProjet[0];
    return project?.client || file.name.replace(/\.xlsx?$/i, '');
  }

  selectFile(file: ProjectFile): void {
    this.selectedFile = file;
    this.activeSheet = 'infoProjet';
  }

  selectSheet(sheet: SheetKey): void {
    this.activeSheet = sheet;
    if (sheet === 'planification') setTimeout(() => this.renderPlanningChart());
  }

  addRow(): void {
    const row: Row = {};
    for (const header of this.modalHeaders) {
      row[header] = header === 'id' ? `PRJ-${Date.now()}` : '';
    }

    this.editingRow = undefined;
    this.draftRow = row;
    this.modalMode = 'row';
  }

  editRow(row: Row): void {
    this.editingRow = row;
    this.draftRow = { ...row };
    this.modalMode = 'row';
  }

  saveRow(): void {
    if (!this.selectedFile) {
      return;
    }

    const currentRows = this.selectedFile.data[this.activeSheet] as unknown as Row[];
    const normalizedRow = this.normalizeRow(this.draftRow);

    if (this.editingRow) {
      const index = currentRows.indexOf(this.editingRow);
      if (index >= 0) {
        currentRows[index] = normalizedRow;
      }
    } else {
      currentRows.push(normalizedRow);
    }

    this.closeModal();
    this.message = `Ligne enregistrée dans ${this.activeSheet}.`;
    if (this.activeSheet === 'planification') setTimeout(() => this.renderPlanningChart());
  }

  askDeleteRow(row: Row): void {
    this.editingRow = row;
    this.draftRow = { ...row };
    this.modalMode = 'delete-row';
  }

  deleteRow(): void {
    if (!this.selectedFile || !this.editingRow) {
      return;
    }

    const currentRows = this.selectedFile.data[this.activeSheet] as unknown as Row[];
    const index = currentRows.indexOf(this.editingRow);

    if (index >= 0) {
      currentRows.splice(index, 1);
    }

    this.closeModal();
    this.message = 'Ligne supprimée.';
    if (this.activeSheet === 'planification') setTimeout(() => this.renderPlanningChart());
  }

  askDeleteFile(): void {
    this.modalMode = 'file';
  }

  deleteFile(): void {
    if (!this.selectedFile) {
      return;
    }

    this.files = this.files.filter((file) => file.name !== this.selectedFile?.name);
    this.selectedFile = this.files[0];
    this.closeModal();
    this.message = `${this.selectedFile ? this.selectedFile.name : 'Fichier'} supprimé.`;
  }

  importFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const buffer = reader.result as ArrayBuffer;
        const workbook = this.xlsx.read(buffer, { type: 'array' });
        const importedData = this.readWorkbook(workbook);

        const entry: ProjectFile = { name: file.name, data: importedData };
        this.files = [...this.files.filter((item) => item.name !== entry.name), entry];
        this.selectedFile = entry;
        this.activeSheet = 'infoProjet';
        this.message = `${file.name} est ouvert.`;
      } catch {
        this.message = 'Le fichier Excel est invalide ou illisible.';
      }
    };

    reader.onerror = () => {
      this.message = 'Impossible de lire le fichier sélectionné.';
    };

    reader.readAsArrayBuffer(file);
  }

  saveFile(): void {
    if (!this.selectedFile) {
      return;
    }

    const workbook = this.xlsx.utils.book_new();
    const sheetNames = Object.keys(PROJECT_WORKBOOK_SHEETS) as Array<keyof typeof PROJECT_WORKBOOK_SHEETS>;

    for (const key of sheetNames) {
      const sheetName = PROJECT_WORKBOOK_SHEETS[key];
      const rows = this.selectedFile.data[key] ?? [];
      this.xlsx.utils.book_append_sheet(workbook, this.xlsx.utils.json_to_sheet(rows), sheetName);
    }

    this.xlsx.writeFile(workbook, this.selectedFile.name);
    this.message = `${this.selectedFile.name} a été exporté.`;
  }

  get planningStats(): { total: number; completed: number; progress: number; variance: number } {
    const phases = this.selectedFile?.data.planification ?? [];
    const completed = phases.filter((phase) => phase.etat === 'TERMINE').length;
    const variance = phases.length
      ? Math.round(phases.reduce((sum, phase) => sum + Number(phase.avanceRetard || 0), 0) / phases.length)
      : 0;

    return {
      total: phases.length,
      completed,
      progress: phases.length ? Math.round((completed / phases.length) * 100) : 0,
      variance
    };
  }

  ngAfterViewInit(): void {
    this.renderPlanningChart();
  }

  ngOnDestroy(): void {
    this.planningChart?.destroy();
  }

  private renderPlanningChart(): void {
    if (!this.planningCanvas || this.activeSheet !== 'planification') return;

    this.planningChart?.destroy();
    const phases = this.selectedFile?.data.planification ?? [];
    this.planningChart = new Chart(this.planningCanvas.nativeElement, {
      type: 'line',
      data: {
        labels: phases.map((phase) => phase.phase),
        datasets: [
          {
            label: 'Durée prévue',
            data: phases.map((phase) => Number(phase.nombreJours || 0)),
            borderColor: '#2563eb',
            backgroundColor: '#2563eb22',
            pointBackgroundColor: '#2563eb',
            pointRadius: 5,
            tension: 0.35,
            fill: true
          },
          {
            label: 'Avance / retard',
            data: phases.map((phase) => Number(phase.avanceRetard || 0)),
            borderColor: '#e56b4f',
            backgroundColor: '#e56b4f22',
            pointBackgroundColor: '#e56b4f',
            pointRadius: 5,
            tension: 0.35,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 18 } } },
        scales: { y: { beginAtZero: true, grid: { color: '#e5e7eb' } }, x: { grid: { display: false } } }
      }
    });
  }

  private createPlanningChartImage(): string {
    const phases = this.selectedFile?.data.planification ?? [];
    if (!phases.length) return '';

    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 420;
    const chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: phases.map((phase) => phase.phase),
        datasets: [
          { label: 'Durée prévue', data: phases.map((phase) => phase.nombreJours), borderColor: '#2563eb', backgroundColor: '#2563eb22', pointRadius: 5, tension: .35, fill: true },
          { label: 'Avance / retard', data: phases.map((phase) => phase.avanceRetard), borderColor: '#e56b4f', backgroundColor: '#e56b4f22', pointRadius: 5, tension: .35, fill: true }
        ]
      },
      options: { animation: false, responsive: false, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true } } }
    });
    const image = chart.toBase64Image();
    chart.destroy();
    return image;
  }

  printReport(): void {
    if (!this.selectedFile) return;

    const project = this.selectedFile.data.infoProjet[0];
    const reportRows = this.selectedFile.data.rapport;
    const total = reportRows.reduce((sum, row) => sum + Number(row.montant || 0), 0);
    const payments = this.selectedFile.data.paiements;
    const phases = this.selectedFile.data.planification;
    const planningChartImage = this.createPlanningChartImage();
    const paid = payments.filter((payment) => payment.etat === 'PAYE').reduce((sum, payment) => sum + Number(payment.montant || 0), 0);
    const planned = payments.filter((payment) => payment.etat === 'PLANIFIE').reduce((sum, payment) => sum + Number(payment.montant || 0), 0);
    const popup = window.open('', '_blank', 'width=1000,height=800');

    if (!popup) {
      this.message = 'Autorisez les fenêtres popup pour imprimer le rapport.';
      return;
    }

    const money = (value: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
    popup.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Rapport - ${this.selectedFile.name}</title><style>
      *{box-sizing:border-box}body{margin:0;background:#f4f7fb;color:#172033;font:14px Arial,sans-serif}.report{max-width:920px;margin:32px auto;background:#fff;padding:48px;box-shadow:0 12px 40px #17203318}.head{display:flex;justify-content:space-between;border-bottom:3px solid #2563eb;padding-bottom:28px}.eyebrow{color:#2563eb;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase}.title{font:700 38px Georgia,serif;margin:10px 0}.meta{color:#64748b;text-align:right}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:28px 0}.card{padding:18px;background:#eff6ff;border-left:4px solid #2563eb}.card span{display:block;color:#64748b;font-size:11px;text-transform:uppercase}.card strong{display:block;margin-top:8px;font-size:23px}.section{margin-top:30px}.section h2{font:700 22px Georgia,serif}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:12px;border-bottom:1px solid #e2e8f0}th{background:#f8fafc;color:#475569;font-size:11px;text-transform:uppercase}.amount{text-align:right}.status{font-weight:700;color:#166534}.chart{display:block;width:100%;margin:12px 0 20px}.footer{margin-top:36px;color:#94a3b8;font-size:11px}@media print{body{background:#fff}.report{margin:0;box-shadow:none;width:100%}}</style></head><body><main class="report">
      <header class="head"><div><div class="eyebrow">Project Cost · Rapport financier</div><h1 class="title">${project?.client || this.selectedFile.name}</h1><div>${project?.description || 'Synthèse du projet'}</div></div><div class="meta">${this.selectedFile.name}<br>${new Date().toLocaleDateString('fr-FR')}</div></header>
      <section class="cards"><div class="card"><span>Coût total</span><strong>${money(total)}</strong></div><div class="card"><span>Paiements effectués</span><strong>${money(paid)}</strong></div><div class="card"><span>Paiements planifiés</span><strong>${money(planned)}</strong></div></section>
      <section class="section"><h2>Répartition des coûts</h2><table><thead><tr><th>Catégorie</th><th class="amount">Montant</th></tr></thead><tbody>${reportRows.map((row) => `<tr><td>${row.categorie}</td><td class="amount">${money(Number(row.montant || 0))}</td></tr>`).join('')}</tbody></table></section>
      <section class="section"><h2>Paiements</h2><table><thead><tr><th>Fournisseur</th><th>Date</th><th>État</th><th class="amount">Montant</th></tr></thead><tbody>${payments.map((payment) => `<tr><td>${payment.fournisseur}</td><td>${payment.date}</td><td class="status">${payment.etat === 'PAYE' ? 'Payé' : 'Planifié'}</td><td class="amount">${money(Number(payment.montant || 0))}</td></tr>`).join('')}</tbody></table></section>
      <section class="section"><h2>Planning du projet</h2>${planningChartImage ? `<img class="chart" src="${planningChartImage}" alt="Graphique du planning">` : ''}<table><thead><tr><th>Phase</th><th>Date début</th><th>Date fin</th><th>Jours</th><th>Avance / retard</th><th>État</th></tr></thead><tbody>${phases.map((phase) => `<tr><td>${phase.phase}</td><td>${phase.dateDebut}</td><td>${phase.dateFin}</td><td>${phase.nombreJours}</td><td>${phase.avanceRetard > 0 ? `${phase.avanceRetard} j d'avance` : phase.avanceRetard < 0 ? `${Math.abs(phase.avanceRetard)} j de retard` : 'Dans les délais'}</td><td class="status">${phase.etat === 'TERMINE' ? 'Clôturé' : phase.etat === 'EN_COURS' ? 'En cours' : phase.etat === 'EN_RETARD' ? 'En retard' : 'Planifié'}</td></tr>`).join('')}</tbody></table></section>
      <div class="footer">Document généré par Project Cost</div></main><script>window.onload=()=>window.print()</script></body></html>`);
    popup.document.close();
  }

  closeModal(): void {
    this.modalMode = '';
    this.editingRow = undefined;
    this.draftRow = {};
  }

  logout(): void {
    this.auth.logout();
    location.href = '/login';
  }

  private readWorkbook(workbook: XLSX.WorkBook): ProjectWorkbook {
    const readSheet = <T>(sheetName: string): T[] => {
      const sheet = workbook.Sheets[sheetName];
      return sheet ? (this.xlsx.utils.sheet_to_json<T>(sheet) ?? []) : [];
    };

    return {
      infoProjet: readSheet<Projet>(PROJECT_WORKBOOK_SHEETS.infoProjet),
      factures: readSheet<Facture>(PROJECT_WORKBOOK_SHEETS.factures),
      autresFactures: readSheet<AutreFacture>(PROJECT_WORKBOOK_SHEETS.autresFactures),
      restauration: readSheet<Restauration>(PROJECT_WORKBOOK_SHEETS.restauration),
      logistique: readSheet<Deplacement>(PROJECT_WORKBOOK_SHEETS.logistique),
      charges: readSheet<ChargeSociete>(PROJECT_WORKBOOK_SHEETS.charges),
      paiements: readSheet<Paiement>(PROJECT_WORKBOOK_SHEETS.paiements),
      planification: readSheet<PhaseProjet>(PROJECT_WORKBOOK_SHEETS.planification),
      rapport: readSheet<ProjetRapport>(PROJECT_WORKBOOK_SHEETS.rapport)
    };
  }
}
