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
  SousTraitance,
  ProjetRapport
} from '../../core/models/project-cost.models';
import { AuthService } from '../../core/services/auth.service';
import { XlsxDataService } from '../../core/services/xlsx-data.service';

type SheetKey = keyof ProjectWorkbook;
type Row = Record<string, string | number | boolean | null>;

export interface PaymentTrancheDraft {
  tranche: number;
  pourcentage: number | string | null;
  jours: number | string | null;
}

export interface AutoPaymentDraft {
  nom: string;
  fournisseur: string;
  montantTotal: number;
  dateLivraison: string;
  nombreTranches: number;
  tranches: PaymentTrancheDraft[];
}

export interface AutoPaymentScheduleInput {
  nom: string;
  fournisseur: string;
  montantTotal: number;
  dateLivraison: string;
  tranches: PaymentTrancheDraft[];
}

export function validateAutoPaymentTranches(tranches: PaymentTrancheDraft[] | null | undefined): void {
  const visible = (tranches ?? []).filter((tranche) => Number(tranche.pourcentage ?? 0) > 0);
  if (!visible.length) {
    throw new Error('Aucune tranche avec pourcentage valide.');
  }

  const percentTotal = visible.reduce((sum, tranche) => sum + Number(tranche.pourcentage ?? 0), 0);
  if (percentTotal !== 100) {
    throw new Error('La somme des pourcentages de tranches doit être exactement 100%.');
  }
}

export function buildAutoPaymentRows(input: AutoPaymentScheduleInput): Row[] {
  const supplier = String(input.fournisseur ?? '').trim();
  const total = Number(String(input.montantTotal ?? 0).replace(',', '.')) || 0;
  const dateLivraison = String(input.dateLivraison ?? '').trim();
  const deliveryDate = new Date(`${dateLivraison}T00:00:00`);

  if (!supplier || total <= 0 || !dateLivraison || Number.isNaN(deliveryDate.getTime())) {
    throw new Error('Fournisseur, montant total et date de livraison sont obligatoires.');
  }

  validateAutoPaymentTranches(input.tranches);

  const tranches = (input.tranches ?? []).filter((tranche) => Number(tranche.pourcentage ?? 0) > 0);
  return tranches.map((tranche) => {
    const percent = Number(tranche.pourcentage ?? 0);
    const grossAmount = total * (percent / 100);
    const retenuSource = grossAmount * 0.01;
    const netAmount = grossAmount - retenuSource;
    const daysAfter = Number(tranche.jours ?? 0);
    const due = new Date(deliveryDate);
    due.setDate(due.getDate() + Math.max(0, daysAfter));

    return {
      id: `PAY-${Date.now()}-${tranche.tranche}`,
      nom: String(input.nom ?? '').trim(),
      fournisseur: supplier,
      date: due.toISOString().slice(0, 10),
      etat: 'NON_PAYE',
      montant: Number(netAmount.toFixed(2)),
      retenuSource: Number(retenuSource.toFixed(2))
    } as Row;
  });
}

interface ProjectFile {
  name: string;
  data: ProjectWorkbook;
  fromAssets?: boolean;
}

const sanitizeFileNamePart = (value: unknown): string => String(value ?? '')
  .trim()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-zA-Z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '');

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
      description: 'Prestation principale',
      montantTotal: 12000,
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
    { phase: 'Préparation', dateDebut: '2026-09-01', dateFin: '2026-09-05', dateFinReelle: '2026-09-05', nombreJours: 5, pourcentageRealisation: 100, avanceRetard: 0, etat: 'TERMINE' },
    { phase: 'Réalisation', dateDebut: '2026-09-06', dateFin: '2026-09-25', nombreJours: 20, pourcentageRealisation: 0, avanceRetard: 0, etat: 'EN_COURS' },
    { phase: 'Clôture', dateDebut: '2026-09-26', dateFin: '2026-09-30', nombreJours: 5, pourcentageRealisation: 0, avanceRetard: 0, etat: 'A_VENIR' }
  ] as PhaseProjet[],
  sousTraitance: [
    { collaborateur: 'Atelier Delta', contact: '+33 6 00 00 00 00', description: 'Installation technique', montant: 2800 }
  ] as SousTraitance[],
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
          <a routerLink="/suppliers">Fournisseurs</a>
          <a routerLink="/products">Produits</a>
          <a routerLink="/employees">Employés</a>
          <button type="button" (click)="logout()">Quitter</button>
        </nav>
      </header>

      <section class="hero">
        <div>
          <small>Bibliothèque de projets</small>
          <h1>Vos fichiers<span>.</span></h1>
          <p>Ouvrez un fichier Excel pour consulter et modifier ses feuilles.</p>
        </div>

        <div class="hero-actions">
          <label class="import">
            ＋ Importer un fichier
            <input type="file" accept=".xlsx,.xls" (change)="importFile($event)" />
          </label>
          <button type="button" class="new-project" (click)="addProject()">＋ Ajouter projet</button>
        </div>
      </section>

      <section class="content">
        @if (message) {
          <p class="message">{{ message }}</p>
        }

        <div class="cards">
          @for (file of files; track file.name) {
            <article
              class="card"
              [class.selected]="selectedFile?.name === file.name"
            >
              <span class="icon">▦</span>
              <small>XLSX · PROJET</small>
              <strong>{{ title(file) }}</strong>
              <em>{{ file.name }}</em>
              <div class="card-actions">
                <button type="button" class="open-file" (click)="selectFile(file)">Ouvrir <b>→</b></button>
                <button type="button" class="download-file" title="Télécharger le fichier" (click)="downloadFile(file)">Télécharger</button>
              </div>
            </article>
          } @empty {
            <div class="empty">
              <span>□</span>
              <h2>Aucun fichier Excel</h2>
              <p>Ajoutez un fichier dans <b>src/assets/projets</b> ou importez-le.</p>
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
                @if (activeSheet === 'paiements') {
                  <button type="button" class="action auto-payment" title="Créer un paiement automatique" (click)="openAutoPaymentModal()">✦</button>
                }
                <button type="button" class="action save" title="Enregistrer le fichier" (click)="saveFile()">✓</button>
                <button type="button" class="action print-sheet" title="Imprimer l'onglet actif" (click)="printActiveSheet()">▤</button>
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

            <section class="global-summary" aria-label="Résumé global du projet">
              <div class="global-summary-title"><small>Résumé global</small><strong>Coût total du projet</strong><b>{{ formatAmount(globalSummary.total) }}</b></div>
              <div><small>Factures avec BC</small><strong>{{ formatAmount(globalSummary.factures) }}</strong></div>
              <div><small>Autres factures</small><strong>{{ formatAmount(globalSummary.autresFactures) }}</strong></div>
              <div><small>Restauration</small><strong>{{ formatAmount(globalSummary.restauration) }}</strong></div>
              <div><small>Logistique</small><strong>{{ formatAmount(globalSummary.logistique) }}</strong></div>
              <div><small>Charge service interne</small><strong>{{ formatAmount(globalSummary.charges) }}</strong></div>
              <div><small>Sous-traitance</small><strong>{{ formatAmount(globalSummary.sousTraitance) }}</strong></div>
            </section>

            @if (activeSheet !== 'infoProjet' && activeSheet !== 'planification') {
              <section class="sheet-summary" aria-label="Résumé de la feuille active">
                <div><small>Éléments</small><strong>{{ sheetSummary.count }}</strong></div>
                <div><small>Coût total</small><strong>{{ formatAmount(sheetSummary.total) }}</strong></div>
                @if (activeSheet === 'paiements') {
                  <div><small>Total payé</small><strong>{{ formatAmount(paymentSummary.paye) }}</strong></div>
                  <div><small>Total non payé</small><strong>{{ formatAmount(paymentSummary.nonPaye) }}</strong></div>
                }
              </section>
            }

            @if (hasFilter('fournisseur') || hasFilter('etat') || activeSheet === 'paiements') {
              <div class="filters" aria-label="Filtres de la feuille">
                @if (hasFilter('fournisseur')) {
                  <label>Fournisseur
                    <select [(ngModel)]="supplierFilter" (ngModelChange)="refreshPlanningChart()">
                      <option value="">Tous les fournisseurs</option>
                      @for (supplier of suppliers; track supplier) { <option [value]="supplier">{{ supplier }}</option> }
                    </select>
                  </label>
                }
                @if (hasFilter('etat')) {
                  <label>État
                    <select [(ngModel)]="stateFilter" (ngModelChange)="refreshPlanningChart()">
                      <option value="">Tous les états</option>
                      @for (state of states; track state.value) { <option [value]="state.value">{{ state.label }}</option> }
                    </select>
                  </label>
                }
                @if (activeSheet === 'paiements') {
                  <label>Date début
                    <input type="date" [(ngModel)]="paymentStartDate" (ngModelChange)="refreshPlanningChart()" />
                  </label>
                  <label>Date fin
                    <input type="date" [(ngModel)]="paymentEndDate" (ngModelChange)="refreshPlanningChart()" />
                  </label>
                }
              </div>
            }

            @if (activeSheet === 'rapport') {
              <section class="report-summary">
                <div><small>Factures avec BC</small><strong>{{ formatAmount(reportSummary.factures) }}</strong></div>
                <div><small>Autres factures</small><strong>{{ formatAmount(reportSummary.autresFactures) }}</strong></div>
                <div><small>Sous-traitance</small><strong>{{ formatAmount(reportSummary.sousTraitance) }}</strong></div>
                <div><small>Paiements payés</small><strong>{{ formatAmount(reportSummary.paye) }}</strong></div>
                <div><small>Paiements non payés</small><strong>{{ formatAmount(reportSummary.nonPaye) }}</strong></div>
                <div><small>État du projet</small><strong>{{ reportSummary.etatProjet }}</strong></div>
              </section>
            }

            <div class="table-box">
              @if (filteredRows.length) {
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
                    @for (row of filteredRows; track $index) {
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
                <div class="chart-frame timeline-frame"><canvas #timelineChart></canvas></div>
                <div class="chart-frame timeline-frame"><canvas #costChart></canvas></div>
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
              } @else if (modalMode === 'auto-payment') {
                <h2>Créer un paiement automatique</h2>
                <p>Entrez le nom, le fournisseur, le montant total, la date de livraison, le nombre de tranches et les pourcentages.</p>
                <div class="fields-grid">
                  <label class="field">
                    Nom
                    <input type="text" [(ngModel)]="autoPaymentDraft.nom" />
                  </label>
                  <label class="field">
                    Fournisseur
                    <input type="text" [(ngModel)]="autoPaymentDraft.fournisseur" />
                  </label>
                  <label class="field">
                    Montant total
                    <input type="number" min="0" step="0.01" [(ngModel)]="autoPaymentDraft.montantTotal" />
                  </label>
                  <label class="field">
                    Date de livraison
                    <input type="date" [(ngModel)]="autoPaymentDraft.dateLivraison" />
                  </label>
                  <label class="field">
                    Nombre de tranches
                    <input type="number" min="1" step="1" [(ngModel)]="autoPaymentDraft.nombreTranches" (ngModelChange)="syncAutoPaymentTranchesCount()" />
                  </label>
                </div>
                <div class="tranches-grid">
                  <table class="tranches-table">
                    <thead>
                      <tr><th>Tranche</th><th>Pourcentage</th><th>Jours après livraison</th></tr>
                    </thead>
                    <tbody>
                      @for (tranche of autoPaymentDraft.tranches; track tranche.tranche) {
                        <tr>
                          <td><strong>Tranche {{ tranche.tranche }}</strong></td>
                          <td><input type="number" min="0" max="100" step="1" [(ngModel)]="autoPaymentDraft.tranches[$index].pourcentage" /></td>
                          <td><input type="number" min="0" step="1" [(ngModel)]="autoPaymentDraft.tranches[$index].jours" /></td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
                <div class="modal-actions">
                  <button type="button" class="cancel" (click)="closeModal()">Annuler</button>
                  <button type="button" class="save-text" (click)="saveAutoPaymentSchedule()">Créer</button>
                </div>
              } @else {
                <h2>{{ modalTitle }}</h2>
                <p>Complétez les champs de cette feuille.</p>
                <div class="fields-grid">
                  @for (header of modalHeaders; track header) {
                    <label class="field">
                      {{ fieldLabel(header) }}
                      @if (isStatus(header)) {
                        <select [(ngModel)]="draftRow[header]" (ngModelChange)="onFieldChange(header)" [disabled]="isCalculatedField(header)">
                          @for (status of statusOptions; track status.value) {
                            <option [value]="status.value">{{ status.label }}</option>
                          }
                        </select>
                      } @else {
                        <input
                          [(ngModel)]="draftRow[header]"
                          (ngModelChange)="onFieldChange(header)"
                          [type]="fieldType(header)"
                          [attr.inputmode]="fieldInputMode(header)"
                          [attr.step]="fieldStep(header)"
                          [attr.min]="isRealization(header) ? 0 : null"
                          [attr.max]="isRealization(header) ? 100 : null"
                          [readonly]="isIdentifier(header) || isCalculatedField(header) || isChargeCalculated(header)"
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
      .hero-actions { display: flex; align-items: center; gap: 12px; }
      .new-project { padding: 14px 16px; border: 1px solid #bfdbfe; background: #2563eb; color: #fff; font: 700 12px monospace; cursor: pointer; white-space: nowrap; }
      .new-project:hover { background: #1d4ed8; }
      .content { padding: 38px 10% 80px; }
      .message { padding: 13px; border-left: 3px solid #2563eb; background: #dbeafe; color: #1e40af; font-size: 13px; }
      .cards { display: grid; grid-template-columns: repeat(auto-fill,minmax(220px,1fr)); gap: 16px; }
      .card { display: flex; flex-direction: column; min-height: 205px; padding: 20px; border: 1px solid #e2e8f0; background: #fff; color: #1e293b; text-align: left; cursor: pointer; }
      .card:hover, .card.selected { border-color: #2563eb; box-shadow: 0 4px 16px rgba(30,58,95,.1); }
      .icon { display: grid; place-items: center; width: 40px; height: 40px; margin-bottom: 22px; background: #eff6ff; color: #2563eb; font-size: 20px; }
      .card small { color: #94a3b8; font: 10px monospace; }
      .card strong { margin-top: 9px; font: 700 20px Georgia,serif; }
      .card em { overflow: hidden; margin-top: 6px; color: #64748b; font-style: normal; }
      .card-actions { display: flex; align-items: center; gap: 14px; margin-top: auto; }
      .open-file, .download-file { border: 0; background: none; padding: 0; cursor: pointer; font: 700 12px monospace; }
      .open-file { color: #2563eb; }
      .download-file { color: #64748b; }
      .download-file:hover { color: #1e3a5f; text-decoration: underline; }
      .empty { padding: 26px; border: 1px dashed #cbd5e1; background: #fff; color: #475569; text-align: center; }
      .viewer { margin-top: 28px; border: 1px solid #dfe7f4; background: #fff; }
      .viewer-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 20px 22px; border-bottom: 1px solid #e2e8f0; }
      .viewer-head h2 { margin: 8px 0 0; font: 700 24px Georgia,serif; }
      .file-actions { display: flex; gap: 8px; }
      .action { width: 36px; height: 36px; border: 1px solid #dbeafe; background: #eff6ff; cursor: pointer; }
      .action:disabled { opacity: .4; cursor: not-allowed; }
      .action.save { background: #e0f2fe; }
      .action.print-sheet { background: #dcfce7; color: #166534; }
      .action.report { background: #fef3c7; color: #92400e; }
      .action.delete { background: #fee2e2; }
      .tabs { display: flex; flex-wrap: wrap; gap: 8px; padding: 14px 16px; border-bottom: 1px solid #e2e8f0; background: #f8fafc; }
      .tabs button { padding: 8px 12px; border: 1px solid #dbeafe; background: #fff; color: #334155; font: 11px monospace; cursor: pointer; }
      .tabs .active { background: #dbeafe; border-color: #93c5fd; }
      .global-summary { display: grid; grid-template-columns: 1.35fr repeat(3, 1fr); gap: 10px; padding: 16px; border-bottom: 1px solid #e2e8f0; background: #f8fafc; }
      .global-summary div { padding: 12px; border: 1px solid #dbeafe; background: #fff; }
      .global-summary small { display: block; color: #64748b; font: 10px sans-serif; text-transform: uppercase; }
      .global-summary strong { display: block; margin-top: 6px; color: #1e3a5f; font: 700 16px sans-serif; }
      .global-summary-title { grid-row: span 2; background: #1e3a5f !important; border-color: #1e3a5f !important; }
      .global-summary-title small, .global-summary-title strong { color: #dbeafe; }
      .global-summary-title b { display: block; margin-top: 18px; color: #fff; font: 400 25px sans-serif; }
      .sheet-summary { display: flex; gap: 12px; padding: 14px 16px; background: #fff; border-bottom: 1px solid #e2e8f0; }
      .sheet-summary div { min-width: 150px; padding: 11px 14px; border: 1px solid #e2e8f0; background: #f8fafc; }
      .sheet-summary small { display: block; color: #64748b; font: 10px sans-serif; text-transform: uppercase; }
      .sheet-summary strong { display: block; margin-top: 5px; color: #1e3a5f; font: 700 21px sans-serif; }
      .report-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; padding: 16px; border-bottom: 1px solid #e2e8f0; background: #f8fafc; }
      .report-summary div { padding: 12px; border: 1px solid #dbeafe; background: #fff; }
      .report-summary small { display: block; color: #64748b; font: 10px sans-serif; text-transform: uppercase; }
      .report-summary strong { display: block; margin-top: 6px; color: #1e3a5f; font: 700 17px sans-serif; }
      .filters { display: flex; flex-wrap: wrap; gap: 12px; padding: 14px 16px; border-bottom: 1px solid #e2e8f0; background: #fff; }
      .filters label { display: grid; gap: 5px; color: #64748b; font: 11px sans-serif; }
      .filters select { min-width: 190px; padding: 8px 10px; border: 1px solid #cbd5e1; background: #fff; color: #334155; }
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
      .timeline-frame { margin-top: 16px; }
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
      @media (max-width: 560px) { .hero-actions { width: 100%; flex-wrap: wrap; } }
      @media (max-width: 820px) { .global-summary { grid-template-columns: repeat(2, 1fr); } .global-summary-title { grid-row: auto; } }
      @media (max-width: 560px) { .fields-grid, .planning-stats, .global-summary { grid-template-columns: 1fr; } .insights-head { align-items: flex-start; flex-direction: column; } }
    `
  ]
})
export class ProjectsComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly xlsx = XLSX;
  private readonly auth = inject(AuthService);
  private readonly xlsxData = inject(XlsxDataService);
  @ViewChild('planningChart') private planningCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('timelineChart') private timelineCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('costChart') private costCanvas?: ElementRef<HTMLCanvasElement>;
  private planningChart?: Chart;
  private timelineChart?: Chart;
  private costChart?: Chart;

  files: ProjectFile[] = [];
  selectedFile?: ProjectFile;
  activeSheet: SheetKey = 'infoProjet';
  supplierFilter = '';
  stateFilter = '';
  paymentStartDate = '';
  paymentEndDate = '';
  message = '';
  modalMode: '' | 'row' | 'delete-row' | 'file' | 'auto-payment' = '';
  editingRow?: Row;
  draftRow: Row = {};
  autoPaymentDraft: AutoPaymentDraft = this.createEmptyAutoPaymentDraft();

  readonly sheets: Array<{ key: SheetKey; label: string; icon: string }> = [
    { key: 'infoProjet', label: 'INFO_PROJET', icon: '⌂' },
    { key: 'factures', label: 'FACTURES', icon: '' },
    { key: 'autresFactures', label: 'AUTRES_FACTURES', icon: '¤' },
    { key: 'restauration', label: 'RESTAURATION', icon: '◇' },
    { key: 'logistique', label: 'LOGISTIQUE', icon: '↗' },
    { key: 'charges', label: 'CHARGE SERVICE INTERNE', icon: '♙' },
    { key: 'paiements', label: 'PAIEMENTS', icon: '€' },
    { key: 'planification', label: 'PLANIFICATION', icon: '◷' },
    { key: 'sousTraitance', label: 'SOUS-TRAITANCE', icon: '◇' },
  ];

  get rows(): Row[] {
    const rows = this.selectedFile?.data[this.activeSheet] ?? [];
    return rows as unknown as Row[];
  }

  get headers(): string[] {
    return this.rows.length ? Object.keys(this.rows[0]).filter((header) => !this.isHiddenInvoiceField(header) && !this.isIdentifier(header)) : [];
  }

  get filteredRows(): Row[] {
    return this.rows.filter((row) => {
      const supplierMatches = !this.supplierFilter || String(row['fournisseur'] ?? '').trim() === this.supplierFilter.trim();
      const stateMatches = !this.stateFilter || String(row['etat'] ?? '').trim() === this.stateFilter.trim();
      const paymentDate = String(row['date'] ?? '').trim();
      const startDateMatches = this.activeSheet !== 'paiements' || !this.paymentStartDate || this.compareDates(paymentDate, this.paymentStartDate) >= 0;
      const endDateMatches = this.activeSheet !== 'paiements' || !this.paymentEndDate || this.compareDates(paymentDate, this.paymentEndDate) <= 0;
      return supplierMatches && stateMatches && startDateMatches && endDateMatches;
    });
  }

  get suppliers(): string[] {
    return [...new Set(this.rows.map((row) => String(row['fournisseur'] ?? '').trim()).filter(Boolean))].sort();
  }

  get states(): Array<{ value: string; label: string }> {
    const available = new Set(this.rows.map((row) => String(row['etat'] ?? '').trim()));
    return this.statusOptions.filter((state) => available.has(state.value));
  }

  hasFilter(field: 'fournisseur' | 'etat'): boolean {
    return this.rows.some((row) => row[field] !== undefined);
  }

  get paymentSummary(): { paye: number; nonPaye: number } {
    return this.filteredRows.reduce<{ paye: number; nonPaye: number }>((summary, row) => {
      const amount = Number(String(row['montant'] ?? 0).replace(',', '.')) || 0;
      if (String(row['etat'] ?? '').trim() === 'PAYE') summary['paye'] += amount;
      else if (String(row['etat'] ?? '').trim() === 'NON_PAYE') summary['nonPaye'] += amount;
      return summary;
    }, { paye: 0, nonPaye: 0 });
  }

  private compareDates(left: string, right: string): number {
    const leftDate = this.parsePlanningDate(left)?.getTime() ?? 0;
    const rightDate = this.parsePlanningDate(right)?.getTime() ?? 0;
    return leftDate - rightDate;
  }

  refreshPlanningChart(): void {
    if (this.activeSheet === 'planification') setTimeout(() => this.renderPlanningChart());
  }

  get sheetSummary(): { count: number; total: number } {
    const total = this.filteredRows.reduce((sum, row) => {
      const amountKeys = ['montant', 'montantTotal'];
      return sum + amountKeys.reduce((rowTotal, key) => rowTotal + (Number(String(row[key] ?? 0).replace(',', '.')) || 0), 0);
    }, 0);

    return { count: this.filteredRows.length, total };
  }

  get globalSummary(): { factures: number; autresFactures: number; restauration: number; logistique: number; charges: number; sousTraitance: number; total: number } {
    const data = this.selectedFile?.data;
    const sum = (rows: Array<{ montant?: number; montantTotal?: number }>): number =>
      rows.reduce((total, row) => total + Number(row.montant ?? row.montantTotal ?? 0), 0);
    const factures = sum(data?.factures ?? []);
    const autresFactures = sum(data?.autresFactures ?? []);
    const restauration = sum(data?.restauration ?? []);
    const logistique = sum(data?.logistique ?? []);
    const charges = sum(data?.charges ?? []);
    const sousTraitance = sum(data?.sousTraitance ?? []);

    return { factures, autresFactures, restauration, logistique, charges, sousTraitance, total: factures + autresFactures + restauration + logistique + charges + sousTraitance };
  }

  get reportSummary(): { factures: number; autresFactures: number; restauration: number; logistique: number; charges: number; sousTraitance: number; paye: number; nonPaye: number; etatProjet: string } {
    const data = this.selectedFile?.data;
    const sum = (rows: Array<{ montant?: number; montantTotal?: number }>): number =>
      rows.reduce((total, row) => total + Number(row.montant ?? row.montantTotal ?? 0), 0);
    const projectState = data?.infoProjet[0]?.etat;
    const stateLabels: Record<string, string> = {
      A_VENIR: 'Planifié', EN_COURS: 'En cours', EN_AVANCE: 'En avance', A_SURVEILLER: 'À surveiller', EN_RETARD: 'En retard', TERMINE: 'Clôturé'
    };

    return {
      factures: sum(data?.factures ?? []),
      autresFactures: sum(data?.autresFactures ?? []),
      restauration: sum(data?.restauration ?? []),
      logistique: sum(data?.logistique ?? []),
      charges: sum(data?.charges ?? []),
      sousTraitance: sum(data?.sousTraitance ?? []),
      paye: (data?.paiements ?? []).filter((payment) => payment.etat === 'PAYE').reduce((total, payment) => total + Number(payment.montant || 0), 0),
      nonPaye: (data?.paiements ?? []).filter((payment) => payment.etat === 'NON_PAYE').reduce((total, payment) => total + Number(payment.montant || 0), 0),
      etatProjet: stateLabels[projectState ?? ''] ?? 'Non renseigné'
    };
  }

  formatAmount(value: number): string {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'TND', minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(value || 0);
  }

  get modalHeaders(): string[] {
    const headers = this.headers.length ? this.headers : this.defaultHeaders[this.activeSheet];
    const requiredHeaders = this.activeSheet === 'planification' || this.activeSheet === 'factures' || this.activeSheet === 'paiements' ? this.defaultHeaders[this.activeSheet] : [];
    return [...new Set([...headers, ...requiredHeaders])].filter((header) => !this.isHiddenInvoiceField(header) && !this.isIdentifier(header));
  }

  get modalTitle(): string {
    const action = this.editingRow ? 'Modifier' : 'Ajouter';
    const sheetNames: Record<SheetKey, string> = {
      infoProjet: 'le projet',
      factures: 'une facture',
      autresFactures: 'une autre facture',
      restauration: 'une dépense de restauration',
      logistique: 'une dépense logistique',
      charges: 'une charge service interne',
      paiements: 'un paiement',
      planification: 'une phase projet',
      sousTraitance: 'une prestation de sous-traitance',
      rapport: 'une ligne de rapport'
    };

    return `${action} ${sheetNames[this.activeSheet]}`;
  }

  get statusOptions(): Array<{ value: string; label: string }> {
    return this.activeSheet === 'paiements'
      ? [
          { value: 'PAYE', label: 'Payé' },
          { value: 'NON_PAYE', label: 'Non payé' }
        ]
      : [
          { value: 'A_VENIR', label: 'Planifié' },
          { value: 'EN_COURS', label: 'En cours' },
          { value: 'EN_AVANCE', label: 'En avance' },
          { value: 'A_SURVEILLER', label: 'À surveiller' },
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
      montantRestant: 'Montant restant',
      montantJour: 'Montant par jour',
      fournisseur: 'Fournisseur',
      collaborateur: 'Collaborateur',
      contact: 'Contact',
      etat: 'État',
      phase: 'Phase',
      nombreJours: 'Nombre de jours',
      avanceRetard: 'Avance / retard (jours)',
      pourcentageRealisation: 'Réalisation (%)',
      dateDebut: 'Date de début',
      dateFin: 'Date de fin',
      dateFinReelle: 'Date de fin réelle',
      dateDebutPrevue: 'Date de début prévue',
      dateDebutReelle: 'Date de début réelle',
      dateFinPrevue: 'Date de fin prévue',
      dateEcheance: "Date d'échéance",
      nombreJoursTravail: 'Nombre de jours travaillés',
      categorie: 'Catégorie'
    };

    return labels[header] ?? header;
  }

  fieldType(header: string): 'date' | 'number' | 'text' {
    if (header.toLowerCase().includes('date')) return 'date';
    if (header.toLowerCase().includes('jours') || header.toLowerCase().includes('avance') || header.toLowerCase().includes('retard') || header.toLowerCase().includes('pourcentage')) return 'number';
    return 'text';
  }

  cellValue(header: string, value: Row[string]): string | number | boolean | null {
    if (this.isStatus(header)) {
      const status = this.statusOptions.find((option) => option.value === value);
      return status?.label ?? value;
    }

    if (header === 'pourcentageRealisation' && typeof value === 'number') {
      return `${value}%`;
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
    const normalizedHeader = header.toLowerCase().replace(/[\s_-]/g, '');
    return normalizedHeader === 'id' || normalizedHeader.startsWith('idprojet');
  }

  isStatus(header: string): boolean {
    return header.toLowerCase() === 'etat' || header.toLowerCase().includes('état');
  }

  isPlanningCalculated(header: string): boolean {
    return this.activeSheet === 'planification' && ['nombrejours', 'avanceretard'].includes(header.toLowerCase().replace(/[\s_-]/g, ''));
  }

  isProjectTimingCalculated(header: string): boolean {
    return this.activeSheet === 'infoProjet' && ['jourspasses', 'joursrestants', 'joursretard', 'etat'].includes(header.toLowerCase().replace(/[\s_-]/g, ''));
  }

  isCalculatedField(header: string): boolean {
    return this.isPlanningCalculated(header) || this.isProjectTimingCalculated(header);
  }

  isRealization(header: string): boolean {
    return header.toLowerCase().replace(/[\s_-]/g, '') === 'pourcentagerealisation';
  }

  isChargeCalculated(header: string): boolean {
    return this.activeSheet === 'charges' && header === 'montantTotal';
  }

  refreshPlanningDraft(): void {
    if (this.activeSheet === 'planification') {
      this.calculatePlanningRow(this.draftRow);
    }
  }

  refreshProjectDraft(): void {
    if (this.activeSheet === 'infoProjet') {
      this.calculateProjectRow(this.draftRow);
    }
  }

  onFieldChange(header: string): void {
    if (header !== 'etat') {
      this.refreshProjectDraft();
      this.refreshPlanningDraft();
      if (this.activeSheet === 'charges') {
        this.calculateChargeDraft();
      }
    }
  }

  private isAmount(header: string): boolean {
    return header.toLowerCase().includes('montant');
  }

  private isHiddenInvoiceField(header: string): boolean {
    const normalizedHeader = header.toLowerCase().replace(/[\s_-]/g, '');
    return this.activeSheet === 'factures' && ['montantpaye', 'montantrestant', 'dateecheance'].includes(normalizedHeader);
  }

  private normalizeRow(row: Row): Row {
    const normalized: Row = { ...row };

    for (const header of Object.keys(normalized)) {
      const value = normalized[header];
      if (this.isAmount(header) && typeof value === 'string') {
        normalized[header] = Number(value.replace(',', '.')) || 0;
      }
    }

    if (this.activeSheet === 'factures') {
      delete normalized['montantPaye'];
      delete normalized['montantRestant'];
      delete normalized['dateEcheance'];
      normalized['description'] ??= '';
    }

    if (this.activeSheet === 'paiements') {
      if (normalized['montant'] === undefined) {
        normalized['montant'] = Number(normalized['montantPaye'] ?? 0) + Number(normalized['montantPlanifie'] ?? 0);
      }
      delete normalized['montantPaye'];
      delete normalized['montantPlanifie'];
      normalized['montant'] ??= 0;
      normalized['etat'] = normalized['etat'] === 'PAYE' ? 'PAYE' : 'NON_PAYE';
    }

    if (this.activeSheet === 'planification') {
      this.calculatePlanningRow(normalized);
    }

    if (this.activeSheet === 'infoProjet') {
      this.calculateProjectRow(normalized);
    }

    if (this.activeSheet === 'charges') {
      this.calculateChargeDraft(normalized);
    }

    return normalized;
  }

  private calculateChargeDraft(row: Row = this.draftRow): void {
    const days = Number(row['nombreJoursTravail'] || 0);
    const dailyAmount = Number(String(row['montantJour'] ?? 0).replace(',', '.')) || 0;
    row['montantTotal'] = Math.max(0, days) * Math.max(0, dailyAmount);
  }

  private calculateProjectRow(row: Row): void {
    Object.assign(row, this.xlsxData.calculateProjectTiming(row as unknown as Projet));
  }

  private hasDuplicateEmployee(rows: Row[], candidate: Row): boolean {
    const employee = String(candidate['employe'] ?? '').trim().toLocaleLowerCase();
    if (!employee) return false;

    return rows.some((row) => row !== this.editingRow && String(row['employe'] ?? '').trim().toLocaleLowerCase() === employee);
  }

  private calculatePlanningRow(row: Row): void {
    const start = this.parsePlanningDate(row['dateDebut']);
    const plannedEnd = this.parsePlanningDate(row['dateFin']);
    const actualEnd = this.parsePlanningDate(row['dateFinReelle']);

    if (!start || !plannedEnd) {
      row['nombreJours'] = '';
      row['pourcentageRealisation'] = this.clampRealization(row['pourcentageRealisation']) ?? '';
      row['avanceRetard'] = '';
      row['etat'] = '';
      return;
    }

    row['nombreJours'] = Math.max(0, this.daysBetween(start, plannedEnd) + 1);

    if (actualEnd) {
      const elapsedDays = this.daysBetween(start, actualEnd) + 1;
      row['dateFinReelle'] = this.formatPlanningDate(actualEnd);
      const variance = this.daysBetween(actualEnd, plannedEnd);
      row['pourcentageRealisation'] = 100;
      row['avanceRetard'] = variance;
      row['etat'] = variance > 0 ? 'EN_AVANCE' : variance < 0 ? 'EN_RETARD' : 'TERMINE';
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const enteredRealization = this.clampRealization(row['pourcentageRealisation']);
    const elapsedDays = this.daysBetween(start, today) + 1;
    row['pourcentageRealisation'] = enteredRealization ?? (today < start
      ? 0
      : Math.min(99, Math.max(0, Math.round((elapsedDays / (Number(row['nombreJours']) || 1)) * 100))));
    if (today < start) {
      row['avanceRetard'] = 0;
      if (!row['etat']) row['etat'] = 'A_VENIR';
    } else if (today > plannedEnd) {
      row['avanceRetard'] = -this.daysBetween(plannedEnd, today);
      if (!row['etat']) row['etat'] = 'EN_RETARD';
    } else {
      row['avanceRetard'] = 0;
      if (!row['etat']) row['etat'] = 'EN_COURS';
    }
  }

  private parsePlanningDate(value: Row[string]): Date | undefined {
    if (typeof value !== 'string' || !value) return undefined;
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  private formatPlanningDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private daysBetween(from: Date, to: Date): number {
    return Math.round((to.getTime() - from.getTime()) / 86400000);
  }

  private clampRealization(value: Row[string]): number | undefined {
    if (value === null || value === '' || typeof value === 'boolean') return undefined;
    const percentage = Number(value);
    return Number.isFinite(percentage) ? Math.min(100, Math.max(0, percentage)) : undefined;
  }

  private readonly defaultHeaders: Record<SheetKey, string[]> = {
    infoProjet: ['id', 'client', 'description', 'dateDebutPrevue', 'dateDebutReelle', 'dateFinPrevue', 'dateFinReelle', 'joursPasses', 'joursRestants', 'joursRetard', 'etat'],
    factures: ['id', 'fournisseur', 'description', 'numeroFacture', 'numeroBC', 'montantTotal'],
    autresFactures: ['id', 'fournisseur', 'description', 'montant', 'date'],
    restauration: ['id', 'date', 'montant', 'description'],
    logistique: ['id', 'type', 'date', 'montant', 'description'],
    charges: ['id', 'employe', 'nombreJoursTravail', 'montantJour', 'montantTotal', 'description'],
    paiements: ['id', 'fournisseur', 'date', 'etat', 'montant'],
    planification: ['phase', 'dateDebut', 'dateFin', 'dateFinReelle', 'nombreJours', 'pourcentageRealisation', 'avanceRetard', 'etat'],
    sousTraitance: ['collaborateur', 'contact', 'description', 'montant'],
    rapport: ['categorie', 'montant']
  };

  async ngOnInit(): Promise<void> {
    const defaultFile: ProjectFile = {
      name: 'Projet_additive_delice.xlsx',
      data: this.withCalculatedProjectTiming(createDemoWorkbook())
    };

    try {
      const names = await this.xlsxData.listAssetFiles();
      this.files = await Promise.all(
        names.map(async (name) => ({
          name,
          data: this.withCalculatedProjectTiming(await this.xlsxData.importProjectWorkbookFromAsset(`assets/projets/${name}`)),
          fromAssets: true
        }))
      );
    } catch {
      this.files = [];
    }

    if (!this.files.length) {
      this.files = [defaultFile];
      this.message = 'Fichier de démonstration chargé. Enregistrez-le pour le créer dans src/assets/projets.';
    } else {
      this.message = `${this.files.length} fichier(s) Excel chargé(s) depuis src/assets/projets.`;
    }

    this.selectedFile = this.files[0];
  }

  title(file: ProjectFile): string {
    const project = file.data.infoProjet[0];
    return project?.client || file.name.replace(/\.xlsx?$/i, '');
  }

  projectFileName(file: ProjectFile): string {
    const project = file.data.infoProjet[0];
    const client = sanitizeFileNamePart(project?.client);
    const projectName = sanitizeFileNamePart(project?.description);
    const parts = ['Projet', client, projectName].filter(Boolean);

    return parts.length > 1 ? `${parts.join('_')}.xlsx` : file.name;
  }

  selectFile(file: ProjectFile): void {
    this.selectedFile = file;
    this.activeSheet = 'infoProjet';
  }

  addProject(): void {
    const projectFile: ProjectFile = {
      name: `Projet_${Date.now()}.xlsx`,
      data: {
        infoProjet: [],
        factures: [],
        autresFactures: [],
        restauration: [],
        logistique: [],
        charges: [],
        paiements: [],
        planification: [],
        sousTraitance: [],
        rapport: []
      }
    };

    this.files = [...this.files, projectFile];
    this.selectedFile = projectFile;
    this.activeSheet = 'infoProjet';
    this.editingRow = undefined;
    this.draftRow = {};
    for (const header of this.modalHeaders) this.draftRow[header] = '';
    this.refreshProjectDraft();
    this.modalMode = 'row';
    this.message = 'Complétez les informations du nouveau projet, puis enregistrez le fichier.';
  }

  selectSheet(sheet: SheetKey): void {
    this.activeSheet = sheet;
    this.supplierFilter = '';
    this.stateFilter = '';
    this.paymentStartDate = '';
    this.paymentEndDate = '';
    if (sheet === 'planification') setTimeout(() => this.renderPlanningChart());
  }

  addRow(): void {
    const row: Row = {};
    for (const header of this.modalHeaders) {
      row[header] = '';
    }

    this.editingRow = undefined;
    this.draftRow = row;
    this.modalMode = 'row';
  }

  editRow(row: Row): void {
    this.editingRow = row;
    this.draftRow = { ...row };
    this.refreshProjectDraft();
    this.refreshPlanningDraft();
    if (this.activeSheet === 'charges') {
      this.calculateChargeDraft();
    }
    this.modalMode = 'row';
  }

  saveRow(): void {
    if (!this.selectedFile) {
      return;
    }

    const currentRows = this.selectedFile.data[this.activeSheet] as unknown as Row[];
    const normalizedRow = this.normalizeRow(this.draftRow);

    if (this.activeSheet === 'charges' && this.hasDuplicateEmployee(currentRows, normalizedRow)) {
      this.message = 'Cet employé existe déjà dans les charges service interne.';
      return;
    }

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
    this.refreshNewProjectFileName();
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

  async deleteFile(): Promise<void> {
    if (!this.selectedFile) {
      return;
    }

    const fileName = this.selectedFile.name;
    try {
      if (this.selectedFile.fromAssets) {
        await this.xlsxData.deleteAssetFile(fileName);
      }
      this.files = this.files.filter((file) => file.name !== fileName);
      this.selectedFile = this.files[0];
      this.closeModal();
      this.message = `${fileName} supprimé de src/assets/projets.`;
    } catch {
      this.message = `Impossible de supprimer ${fileName} de src/assets/projets.`;
    }
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

  async saveFile(): Promise<void> {
    if (!this.selectedFile) {
      return;
    }

    const previousFileName = this.selectedFile.name;
    const fileName = this.projectFileName(this.selectedFile);

    try {
      this.withCalculatedProjectTiming(this.selectedFile.data);
      await this.xlsxData.saveProjectWorkbookToAssets(fileName, this.selectedFile.data);
      if (this.selectedFile.fromAssets && previousFileName !== fileName) {
        await this.xlsxData.deleteAssetFile(previousFileName);
      }
      this.selectedFile.name = fileName;
      this.selectedFile.fromAssets = true;
      this.message = `${fileName} enregistré dans src/assets/projets.`;
    } catch {
      this.message = `Impossible d'enregistrer ${fileName} dans src/assets/projets.`;
    }
  }

  downloadFile(file: ProjectFile): void {
    const fileName = this.projectFileName(file);
    const workbook = this.xlsx.utils.book_new();
    const sheetNames = Object.keys(PROJECT_WORKBOOK_SHEETS) as Array<keyof typeof PROJECT_WORKBOOK_SHEETS>;

    for (const key of sheetNames) {
      const sheetName = PROJECT_WORKBOOK_SHEETS[key];
      const rows = file.data[key] ?? [];
      this.xlsx.utils.book_append_sheet(workbook, this.xlsx.utils.json_to_sheet(rows), sheetName);
    }

    this.xlsx.writeFile(workbook, fileName);
    this.message = `${fileName} téléchargé.`;
  }

  private refreshNewProjectFileName(): void {
    if (!this.selectedFile || this.selectedFile.fromAssets || this.activeSheet !== 'infoProjet') {
      return;
    }

    this.selectedFile.name = this.projectFileName(this.selectedFile);
  }

  private createEmptyAutoPaymentDraft(): AutoPaymentDraft {
    return {
      nom: '',
      fournisseur: '',
      montantTotal: 0,
      dateLivraison: '',
      nombreTranches: 4,
      tranches: [
        { tranche: 1, pourcentage: null, jours: null },
        { tranche: 2, pourcentage: null, jours: null },
        { tranche: 3, pourcentage: null, jours: null },
        { tranche: 4, pourcentage: null, jours: null }
      ]
    };
  }

  syncAutoPaymentTranchesCount(): void {
    const expected = Math.max(1, Math.min(12, Number(this.autoPaymentDraft.nombreTranches || 1)));
    this.autoPaymentDraft.nombreTranches = expected;

    while (this.autoPaymentDraft.tranches.length < expected) {
      const nextTranche = this.autoPaymentDraft.tranches.length + 1;
      this.autoPaymentDraft.tranches.push({ tranche: nextTranche, pourcentage: null, jours: null });
    }

    while (this.autoPaymentDraft.tranches.length > expected) {
      this.autoPaymentDraft.tranches.pop();
    }

    this.autoPaymentDraft.tranches = this.autoPaymentDraft.tranches.map((tranche, index) => ({
      tranche: index + 1,
      pourcentage: tranche.pourcentage,
      jours: tranche.jours
    }));
  }

  openAutoPaymentModal(): void {
    this.modalMode = 'auto-payment';
    this.autoPaymentDraft = this.createEmptyAutoPaymentDraft();
  }

  saveAutoPaymentSchedule(): void {
    if (!this.selectedFile) {
      return;
    }

    try {
      const rows = this.selectedFile.data.paiements as unknown as Row[];
      const generated = buildAutoPaymentRows({
        nom: String(this.autoPaymentDraft.nom ?? '').trim(),
        fournisseur: String(this.autoPaymentDraft.fournisseur ?? '').trim(),
        montantTotal: Number(String(this.autoPaymentDraft.montantTotal ?? 0).replace(',', '.')) || 0,
        dateLivraison: String(this.autoPaymentDraft.dateLivraison ?? '').trim(),
        tranches: this.autoPaymentDraft.tranches
      });

      rows.push(...generated);
      this.closeModal();
      this.message = `${generated.length} paiement(s) automatique(s) créé(s).`;
    } catch (error) {
      this.message = error instanceof Error ? error.message : 'La création du paiement automatique a échoué.';
    }
  }

  get planningStats(): { total: number; completed: number; progress: number; variance: number } {
    const phases = this.filteredRows as unknown as PhaseProjet[];
    const completed = phases.filter((phase) => phase.etat === 'TERMINE').length;
    const progress = phases.length
      ? Math.round(phases.reduce((sum, phase) => sum + this.planningPercentage(phase), 0) / phases.length)
      : 0;
    const variance = phases.length
      ? Math.round(phases.reduce((sum, phase) => sum + Number(phase.avanceRetard || 0), 0) / phases.length)
      : 0;

    return {
      total: phases.length,
      completed,
      progress,
      variance
    };
  }

  ngAfterViewInit(): void {
    this.renderPlanningChart();
  }

  ngOnDestroy(): void {
    this.planningChart?.destroy();
    this.timelineChart?.destroy();
    this.costChart?.destroy();
  }

  private renderPlanningChart(): void {
    if (!this.planningCanvas || this.activeSheet !== 'planification') return;

    this.planningChart?.destroy();
    const phases = this.filteredRows as unknown as PhaseProjet[];
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
          },
          {
            label: 'Réalisation %',
            data: phases.map((phase) => Number(phase.pourcentageRealisation || 0)),
            borderColor: '#16a34a',
            backgroundColor: '#16a34a22',
            pointBackgroundColor: '#16a34a',
            pointRadius: 5,
            tension: 0.35,
            fill: false
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
    this.renderTimelineChart();
    this.renderCostChart();
  }

  private renderTimelineChart(): void {
    if (!this.timelineCanvas || this.activeSheet !== 'planification') return;

    this.timelineChart?.destroy();
    const phases = this.selectedFile?.data.planification ?? [];
    this.timelineChart = new Chart(this.timelineCanvas.nativeElement, {
      type: 'line',
      data: {
        labels: phases.map((phase) => `${phase.dateDebut} - ${phase.phase}`),
        datasets: [{
          label: 'Réalisation (%)',
          data: phases.map((phase) => this.planningPercentage(phase)),
          borderColor: '#16a34a',
          backgroundColor: '#16a34a22',
          pointBackgroundColor: '#16a34a',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 7,
          tension: 0.25,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: { display: true, text: 'Chronologie des phases et réalisation' },
          tooltip: { callbacks: { title: (items) => phases[items[0]?.dataIndex ?? 0]?.phase ?? '' } },
          legend: { display: false }
        },
        scales: { y: { min: 0, max: 100, ticks: { callback: (value) => `${value}%` } }, x: { title: { display: true, text: 'Date de début' }, grid: { display: false } } }
      }
    });
  }

  private renderCostChart(): void {
    if (!this.costCanvas || this.activeSheet !== 'planification') return;

    this.costChart?.destroy();
    const summary = this.globalSummary;
    this.costChart = new Chart(this.costCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: ['Factures avec BC', 'Autres factures', 'Restauration', 'Logistique', 'Charge interne', 'Sous-traitance'],
        datasets: [{
          label: 'Coût (TND)',
          data: [summary.factures, summary.autresFactures, summary.restauration, summary.logistique, summary.charges, summary.sousTraitance],
          backgroundColor: ['#2563eb', '#60a5fa', '#f59e0b', '#8b5cf6', '#16a34a', '#e56b4f'],
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { title: { display: true, text: 'Répartition des coûts par onglet' }, legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { callback: (value) => `${value} TND` } }, x: { grid: { display: false } } }
      }
    });
  }

  private planningPercentage(phase: PhaseProjet): number {
    if (Number.isFinite(Number(phase.pourcentageRealisation))) return Number(phase.pourcentageRealisation);
    if (phase.etat === 'TERMINE' || phase.etat === 'EN_AVANCE') return 100;
    if (phase.etat === 'EN_COURS') return 50;
    return 0;
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
          { label: 'Avance / retard', data: phases.map((phase) => phase.avanceRetard), borderColor: '#e56b4f', backgroundColor: '#e56b4f22', pointRadius: 5, tension: .35, fill: true },
          { label: 'Réalisation %', data: phases.map((phase) => this.planningPercentage(phase)), borderColor: '#16a34a', backgroundColor: '#16a34a22', pointRadius: 5, tension: .35, fill: false }
        ]
      },
      options: { animation: false, responsive: false, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true } } }
    });
    const image = chart.toBase64Image();
    chart.destroy();
    return image;
  }

  private createTimelineChartImage(): string {
    const phases = this.selectedFile?.data.planification ?? [];
    if (!phases.length) return '';

    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 420;
    const chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: phases.map((phase) => `${phase.dateDebut} - ${phase.phase}`),
        datasets: [{
          label: 'Réalisation (%)',
          data: phases.map((phase) => phase.pourcentageRealisation),
          borderColor: '#16a34a',
          backgroundColor: '#16a34a22',
          pointRadius: 7,
          tension: .25,
          fill: true
        }]
      },
      options: { animation: false, responsive: false, plugins: { title: { display: true, text: 'Chronologie des phases et réalisation' }, legend: { display: false } }, scales: { y: { min: 0, max: 100, ticks: { callback: (value) => `${value}%` } } } }
    });
    const image = chart.toBase64Image();
    chart.destroy();
    return image;
  }

  private createCostChartImage(): string {
    const summary = this.globalSummary;
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 420;
    const chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: ['Factures avec BC', 'Autres factures', 'Restauration', 'Logistique', 'Charge interne', 'Sous-traitance'],
        datasets: [{
          label: 'Coût (TND)',
          data: [summary.factures, summary.autresFactures, summary.restauration, summary.logistique, summary.charges, summary.sousTraitance],
          backgroundColor: ['#2563eb', '#60a5fa', '#f59e0b', '#8b5cf6', '#16a34a', '#e56b4f'],
          borderRadius: 4
        }]
      },
      options: { animation: false, responsive: false, plugins: { legend: { display: false }, title: { display: true, text: 'Répartition des coûts du projet' } }, scales: { y: { beginAtZero: true } } }
    });
    const image = chart.toBase64Image();
    chart.destroy();
    return image;
  }

  private reportTable(title: string, rows: Row[], columns: string[]): string {
    const visibleColumns = columns.filter((column) => !this.isIdentifier(column));
    const header = visibleColumns.map((column) => `<th>${this.fieldLabel(column)}</th>`).join('');
    const body = rows.map((row) => `<tr>${visibleColumns.map((column) => `<td>${this.reportValue(column, row[column])}</td>`).join('')}</tr>`).join('');
    return `<section class="section"><h2>${title}</h2><table><thead><tr>${header}</tr></thead><tbody>${body || `<tr><td colspan="${visibleColumns.length}">Aucune donnée</td></tr>`}</tbody></table></section>`;
  }

  private reportValue(column: string, value: Row[string]): string {
    if (this.isStatus(column)) return String(this.cellValue(column, value) ?? '');
    if (this.isAmount(column)) return this.formatAmount(Number(String(value ?? 0).replace(',', '.')) || 0);
    if (column === 'pourcentageRealisation') return `${value ?? 0}%`;
    return String(value ?? '');
  }

  printActiveSheet(): void {
    if (!this.selectedFile) return;

    const sheet = this.sheets.find((item) => item.key === this.activeSheet);
    const columns = this.headers.length ? this.headers : this.defaultHeaders[this.activeSheet];
    const section = this.reportTable(sheet?.label ?? this.activeSheet, this.filteredRows, columns);
    const summary = this.sheetSummary;
    const activeFilters = [
      this.supplierFilter.trim() ? `Fournisseur: ${this.supplierFilter.trim()}` : '',
      this.stateFilter.trim() ? `État: ${this.cellValue('etat', this.stateFilter.trim())}` : '',
      this.activeSheet === 'paiements' && this.paymentStartDate ? `Date début: ${this.paymentStartDate}` : '',
      this.activeSheet === 'paiements' && this.paymentEndDate ? `Date fin: ${this.paymentEndDate}` : ''
    ].filter(Boolean);
    const filters = activeFilters.length ? `<div class="filters"><strong>Filtres:</strong> ${activeFilters.join(' · ')}</div>` : '';
    const financialCards = this.activeSheet === 'paiements'
      ? `<div class="card"><span>Total payé</span><strong>${this.formatAmount(this.paymentSummary.paye)}</strong></div><div class="card"><span>Total non payé</span><strong>${this.formatAmount(this.paymentSummary.nonPaye)}</strong></div>`
      : '';
    const popup = window.open('', '_blank', 'width=1000,height=800');

    if (!popup) {
      this.message = 'Autorisez les fenêtres popup pour imprimer la feuille.';
      return;
    }

    popup.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${sheet?.label ?? this.activeSheet}</title><style>
      *{box-sizing:border-box}body{margin:0;padding:32px;background:#fff;color:#172033;font:14px Arial,sans-serif}h1{margin:0 0 24px;font:700 30px Georgia,serif}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:18px}.card{padding:14px;background:#f1f5f9;border-left:4px solid #2563eb}.card span{display:block;color:#64748b;font-size:11px;text-transform:uppercase}.card strong{display:block;margin-top:6px;font-size:20px}.filters{margin-bottom:18px;padding:10px 12px;background:#fff7ed;color:#9a3412}.section h2{display:none}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:10px;border-bottom:1px solid #dbe3ee}th{background:#f1f5f9;color:#475569;font-size:11px;text-transform:uppercase}@media print{body{padding:0}}
    </style></head><body><h1>${sheet?.label ?? this.activeSheet}</h1><section class="cards"><div class="card"><span>Éléments</span><strong>${summary.count}</strong></div><div class="card"><span>Coût total</span><strong>${this.formatAmount(summary.total)}</strong></div>${financialCards}</section>${filters}${section}<script>window.onload=()=>window.print()</script></body></html>`);
    popup.document.close();
  }

  printReport(): void {
    if (!this.selectedFile) return;

    const project = this.selectedFile.data.infoProjet[0];
    const reportRows = this.selectedFile.data.rapport;
    const reportSummary = this.reportSummary;
    const total = this.globalSummary.total;
    const payments = this.selectedFile.data.paiements;
    const phases = this.selectedFile.data.planification;
    const planningChartImage = this.createPlanningChartImage();
    const timelineChartImage = this.createTimelineChartImage();
    const costChartImage = this.createCostChartImage();
    const data = this.selectedFile.data;
    const reportSections = [
      this.reportTable('Informations du projet', data.infoProjet as unknown as Row[], ['client', 'description', 'dateDebutPrevue', 'dateDebutReelle', 'dateFinPrevue', 'dateFinReelle', 'etat']),
      this.reportTable('Factures avec BC', data.factures as unknown as Row[], ['fournisseur', 'description', 'numeroFacture', 'numeroBC', 'montantTotal']),
      this.reportTable('Autres factures', data.autresFactures as unknown as Row[], ['fournisseur', 'description', 'montant', 'date']),
      this.reportTable('Restauration', data.restauration as unknown as Row[], ['date', 'montant', 'description']),
      this.reportTable('Logistique', data.logistique as unknown as Row[], ['type', 'date', 'montant', 'description']),
      this.reportTable('Charge service interne', data.charges as unknown as Row[], ['employe', 'nombreJoursTravail', 'montantJour', 'montantTotal', 'description']),
      this.reportTable('Paiements', data.paiements as unknown as Row[], ['fournisseur', 'date', 'etat', 'montant']),
      this.reportTable('Planification', data.planification as unknown as Row[], ['phase', 'dateDebut', 'dateFin', 'dateFinReelle', 'nombreJours', 'pourcentageRealisation', 'avanceRetard', 'etat']),
      this.reportTable('Sous-traitance', data.sousTraitance as unknown as Row[], ['collaborateur', 'contact', 'description', 'montant'])
    ].join('');
    const paid = payments.filter((payment) => payment.etat === 'PAYE').reduce((sum, payment) => sum + Number(payment.montant || 0), 0);
    const planned = payments.filter((payment) => payment.etat === 'NON_PAYE').reduce((sum, payment) => sum + Number(payment.montant || 0), 0);
    const popup = window.open('', '_blank', 'width=1000,height=800');

    if (!popup) {
      this.message = 'Autorisez les fenêtres popup pour imprimer le rapport.';
      return;
    }

    const money = (value: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'TND', minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(value || 0);
    popup.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Rapport - ${this.selectedFile.name}</title><style>
      *{box-sizing:border-box}body{margin:0;background:#f4f7fb;color:#172033;font:14px Arial,sans-serif}.report{max-width:920px;margin:32px auto;background:#fff;padding:48px;box-shadow:0 12px 40px #17203318}.head{display:flex;justify-content:space-between;border-bottom:3px solid #2563eb;padding-bottom:28px}.eyebrow{color:#2563eb;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase}.title{font:700 38px Georgia,serif;margin:10px 0}.meta{color:#64748b;text-align:right}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:28px 0}.card{padding:18px;background:#eff6ff;border-left:4px solid #2563eb}.card span{display:block;color:#64748b;font-size:11px;text-transform:uppercase}.card strong{display:block;margin-top:8px;font-size:23px}.section{margin-top:30px}.section h2{font:700 22px Georgia,serif}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:12px;border-bottom:1px solid #e2e8f0}th{background:#f8fafc;color:#475569;font-size:11px;text-transform:uppercase}.amount{text-align:right}.status{font-weight:700;color:#166534}.chart{display:block;width:100%;margin:12px 0 20px}.footer{margin-top:36px;color:#94a3b8;font-size:11px}@media print{body{background:#fff}.report{margin:0;box-shadow:none;width:100%}}</style></head><body><main class="report">
      <header class="head"><div><div class="eyebrow">Project Cost · Rapport financier</div><h1 class="title">${project?.client || this.selectedFile.name}</h1><div>${project?.description || 'Synthèse du projet'}</div></div><div class="meta">${this.selectedFile.name}<br>${new Date().toLocaleDateString('fr-FR')}<br><strong>${reportSummary.etatProjet}</strong></div></header>
      <section class="cards"><div class="card"><span>Coût total</span><strong>${money(total)}</strong></div><div class="card"><span>Paiements effectués</span><strong>${money(paid)}</strong></div><div class="card"><span>Paiements planifiés</span><strong>${money(planned)}</strong></div></section>
      <section class="section"><h2>Répartition des coûts</h2><table><thead><tr><th>Catégorie</th><th class="amount">Montant</th></tr></thead><tbody><tr><td>Factures avec BC</td><td class="amount">${money(reportSummary.factures)}</td></tr><tr><td>Autres factures</td><td class="amount">${money(reportSummary.autresFactures)}</td></tr><tr><td>Restauration</td><td class="amount">${money(reportSummary.restauration)}</td></tr><tr><td>Logistique</td><td class="amount">${money(reportSummary.logistique)}</td></tr><tr><td>Charge service interne</td><td class="amount">${money(reportSummary.charges)}</td></tr><tr><td>Sous-traitance</td><td class="amount">${money(reportSummary.sousTraitance)}</td></tr><tr><th>Coût total</th><th class="amount">${money(total)}</th></tr></tbody></table></section>
      ${planningChartImage ? `<section class="section"><h2>Graphique du planning</h2><img class="chart" src="${planningChartImage}" alt="Graphique du planning">${timelineChartImage ? `<img class="chart" src="${timelineChartImage}" alt="Chronologie des phases et réalisation">` : ''}</section>` : ''}
      <section class="section"><h2>Graphique des coûts</h2><img class="chart" src="${costChartImage}" alt="Répartition des coûts du projet"></section>
      ${reportSections}
      <div class="footer">Document généré par Project Cost</div></main><script>window.onload=()=>window.print()</script></body></html>`);
    popup.document.close();
  }

  closeModal(): void {
    this.modalMode = '';
    this.editingRow = undefined;
    this.draftRow = {};
    this.autoPaymentDraft = this.createEmptyAutoPaymentDraft();
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

    return this.withCalculatedProjectTiming({
      infoProjet: readSheet<Projet>(PROJECT_WORKBOOK_SHEETS.infoProjet),
      factures: readSheet<Facture>(PROJECT_WORKBOOK_SHEETS.factures),
      autresFactures: readSheet<AutreFacture>(PROJECT_WORKBOOK_SHEETS.autresFactures),
      restauration: readSheet<Restauration>(PROJECT_WORKBOOK_SHEETS.restauration),
      logistique: readSheet<Deplacement>(PROJECT_WORKBOOK_SHEETS.logistique),
      charges: readSheet<ChargeSociete>(PROJECT_WORKBOOK_SHEETS.charges),
      paiements: readSheet<Paiement>(PROJECT_WORKBOOK_SHEETS.paiements),
      planification: readSheet<PhaseProjet>(PROJECT_WORKBOOK_SHEETS.planification),
      sousTraitance: readSheet<SousTraitance>(PROJECT_WORKBOOK_SHEETS.sousTraitance),
      rapport: readSheet<ProjetRapport>(PROJECT_WORKBOOK_SHEETS.rapport)
    });
  }

  private withCalculatedProjectTiming(data: ProjectWorkbook): ProjectWorkbook {
    data.infoProjet = data.infoProjet.map((project) => ({
      ...project,
      ...this.xlsxData.calculateProjectTiming(project)
    }));
    return data;
  }
}
