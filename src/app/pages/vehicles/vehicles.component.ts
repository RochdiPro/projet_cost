import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { XlsxDataService } from '../../core/services/xlsx-data.service';
import { Vehicule, VehiculeFrais, VehiculeWorkbook } from '../../core/models/project-cost.models';

@Component({
  selector: 'app-vehicles',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <main class="page">
      <header class="topbar">
        <a routerLink="/dashboard" class="logo"><b>PC</b> PROJECT COST</a>
        <nav>
          <a routerLink="/dashboard">Tableau de bord</a>
          <a routerLink="/projects">Projets</a>
          <a routerLink="/suppliers">Fournisseurs</a>
          <a routerLink="/products">Produits</a>
          <a routerLink="/employees">Employés</a>
          <a routerLink="/vehicles">Véhicules</a>
          <button type="button" (click)="logout()">Quitter</button>
        </nav>
      </header>

      <section class="head">
        <div>
          <small>Liste véhicules</small>
          <h1>Véhicules<span>.</span></h1>
          @if (message) { <p>{{ message }}</p> }
        </div>
        <div class="head-actions">
          <label class="import">
            Importer XLSX
            <input type="file" accept=".xlsx,.xls" (change)="importVehicles($event)" />
          </label>
          <button type="button" (click)="saveFile()">Sauvegarder XLSX</button>
          <button type="button" (click)="printList()">Imprimer PDF</button>
          <button type="button" (click)="openCreateModal()">Nouveau véhicule</button>
        </div>
      </section>

      <section class="category-bar">
        <button type="button" class="category-button" (click)="openCreateExpenseModal('reparation')">Réparation</button>
        <button type="button" class="category-button" (click)="openCreateExpenseModal('gazoil')">Gazoil</button>
        <button type="button" class="category-button" (click)="openCreateExpenseModal('vidange')">Vidange</button>
      </section>

      <section class="content">
        <div class="filters">
          @for (column of columns; track column) {
            <label>{{ column }}<input [name]="'filter-' + column" [(ngModel)]="filters[column]" placeholder="Rechercher" /></label>
          }
        </div>

        <div class="table-box">
          <table>
            <thead>
              <tr>
                @for (column of columns; track column) {
                  <th>{{ column }}</th>
                }
                <th class="action-column">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (vehicule of filteredVehicles; track vehicule.id) {
                <tr>
                  @for (column of columns; track column) {
                    <td [class.primary-cell]="column === 'matricule'"><strong>{{ vehicleCellValue(column, vehicule) || '-' }}</strong></td>
                  }
                  <td class="action-column">
                    <div class="row-actions">
                      <button type="button" (click)="openEditModal(vehicule)">Modifier</button>
                      <button type="button" class="danger" (click)="deleteVehicle(vehicule.id)">Supprimer</button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr><td [attr.colspan]="columns.length + 1" class="empty">Aucun véhicule enregistré.</td></tr>
              }
            </tbody>
          </table>
        </div>

        <section class="expense-section">
          <div class="section-heading">
            <div><small>Dépenses véhicules</small><h2>Réparations / Gazoil / Vidanges</h2></div>
          </div>
          <div class="table-box">
            <table>
              <thead>
                <tr>
                  <th>Véhicule</th>
                  <th>Montant</th>
                  <th>Description</th>
                  <th>Catégorie</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (expense of expenses; track expense.id) {
                  <tr>
                    <td>{{ getVehicleMatricule(expense.vehiculeId ?? '') }}</td>
                    <td>{{ expense.montant }}</td>
                    <td>{{ expense.description }}</td>
                    <td>{{ expense.categorie }}</td>
                    <td class="row-actions">
                      <button type="button" (click)="openEditExpenseModal(expense)">Modifier</button>
                      <button type="button" class="danger" (click)="deleteExpense(expense.id)">Supprimer</button>
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="5" class="empty">Aucune dépense enregistrée.</td></tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      </section>

      @if (isModalOpen) {
        <div class="modal-backdrop">
          <form class="modal" (ngSubmit)="saveVehicle()">
            <h2>{{ editingId ? 'Modifier véhicule' : 'Ajouter véhicule' }}</h2>
            <div class="fields">
              <label>Matricule<input name="matricule" [(ngModel)]="draft.matricule" required /></label>
              <label>Visite technique<input name="visiteTechnique" type="date" [(ngModel)]="draft.visiteTechnique" required /></label>
              <label>Assurance<input name="assurance" type="date" [(ngModel)]="draft.assurance" required /></label>
              <label>Taxe<input name="taxe" type="date" [(ngModel)]="draft.taxe" required /></label>
            </div>
            <div class="actions">
              <button type="button" class="ghost" (click)="closeModal()">Annuler</button>
              <button type="submit">{{ editingId ? 'Enregistrer' : 'Ajouter' }}</button>
            </div>
          </form>
        </div>
      }

      @if (isExpenseModalOpen) {
        <div class="modal-backdrop">
          <form class="modal" (ngSubmit)="saveExpense()">
            <h2>{{ editingExpenseId ? 'Modifier dépense' : 'Ajouter dépense' }}</h2>
            <div class="fields">
              <label>Véhicule
                <select name="vehiculeId" [(ngModel)]="expenseDraft.vehiculeId" required>
                  <option value="">Choisir un véhicule</option>
                  @for (vehicle of vehicles; track vehicle.id) {
                    <option [value]="vehicle.id">{{ vehicle.matricule }}</option>
                  }
                </select>
              </label>
              <label>Montant<input name="montant" type="number" min="0" step="0.01" [(ngModel)]="expenseDraft.montant" required /></label>
              <label>Description<input name="description" [(ngModel)]="expenseDraft.description" required /></label>
              <label>Catégorie
                <select name="categorie" [(ngModel)]="expenseDraft.categorie">
                  @for (category of expenseCategories; track category) { <option [value]="category">{{ category }}</option> }
                </select>
              </label>
            </div>
            <div class="actions">
              <button type="button" class="ghost" (click)="closeExpenseModal()">Annuler</button>
              <button type="submit">{{ editingExpenseId ? 'Enregistrer' : 'Ajouter' }}</button>
            </div>
          </form>
        </div>
      }
    </main>
  `,
  styles: [`
    :host { display:block; }
    .page { min-height:100vh; background:#f7f4ed; color:#17221f; }
    .topbar { height:72px; display:flex; align-items:center; justify-content:space-between; padding:0 clamp(20px,6vw,90px); border-bottom:1px solid #d9ddd4; background:#fffaf2; }
    .logo, nav a, nav button { color:#354740; font:700 12px 'Courier New',monospace; text-decoration:none; }
    .logo b, .head span, small { color:#de6948; }
    nav, .head-actions, .actions, .row-actions { display:flex; align-items:center; gap:12px; }
    nav { gap:20px; }
    nav button { border:0; border-left:1px solid #bec8be; padding-left:20px; background:none; cursor:pointer; }
    .head { display:flex; align-items:flex-end; justify-content:space-between; gap:20px; padding:48px clamp(20px,7vw,96px) 32px; background:#2f5148; color:#fff9ef; }
    .head p { margin:12px 0 0; color:#c8d5ce; }
    small { display:block; margin-bottom:12px; font:700 11px 'Courier New',monospace; letter-spacing:1.4px; text-transform:uppercase; }
    h1 { margin:0; font:700 clamp(42px,7vw,76px)/.95 Georgia,serif; letter-spacing:0; }
    button, .import { border:0; background:#de6948; color:#fff9ef; padding:12px 14px; font:700 12px 'Courier New',monospace; cursor:pointer; }
    .category-bar { display:flex; gap:12px; flex-wrap:wrap; padding:16px clamp(20px,7vw,96px) 0; background:#f7f4ed; }
    .category-button { border:1px solid #354740; background:#fffdf8; color:#354740; }
    .import { position:relative; display:inline-flex; align-items:center; min-height:40px; box-sizing:border-box; }
    .import input { display:none; }
    .content { padding:28px clamp(20px,7vw,96px) 70px; }
    .filters { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:10px; margin-bottom:18px; }
    .filters label { min-width:0; }
    .filters input { padding:9px 10px; }
    .table-box { overflow:auto; border:1px solid #d9ddd4; background:#fffdf8; }
    table { width:100%; min-width:980px; border-collapse:collapse; }
    th, td { padding:13px 12px; border-bottom:1px solid #e5e7df; text-align:left; vertical-align:top; }
    th { color:#52645d; background:#eef1eb; font:700 11px 'Courier New',monospace; text-transform:uppercase; }
    td { color:#33453f; line-height:1.45; }
    .row-actions { align-items:flex-start; }
    .row-actions button, .ghost { background:#fff; border:1px solid #bec8be; color:#354740; padding:9px 10px; }
    .row-actions .danger { border-color:#efb4a6; color:#a43d28; }
    .empty { text-align:center; color:#68766e; }
    .expense-section { margin-top:24px; }
    .section-heading { display:flex; align-items:flex-end; justify-content:space-between; gap:15px; }
    .section-heading h2 { margin:0; font:700 26px Georgia,serif; }
    .modal-backdrop { position:fixed; inset:0; display:grid; place-items:center; padding:24px; background:rgba(23,34,31,.42); }
    .modal { width:min(620px,94vw); max-height:calc(100vh - 48px); overflow:auto; border:1px solid #d9ddd4; background:#fffdf8; padding:22px; box-shadow:0 18px 48px rgba(23,34,31,.24); }
    h2 { margin:0; font:700 28px Georgia,serif; letter-spacing:0; }
    .fields { display:grid; grid-template-columns:repeat(2,1fr); gap:12px; margin-top:18px; }
    label { display:grid; gap:6px; color:#52645d; font-size:12px; font-weight:700; }
    input, select { width:100%; border:1px solid #c8d0c8; background:#fff; color:#17221f; padding:11px 12px; font:14px Arial,sans-serif; box-sizing:border-box; }
    input:focus, select:focus { outline:2px solid rgba(222,105,72,.18); border-color:#de6948; }
    .actions { justify-content:flex-end; margin-top:18px; }
    @media (max-width:760px) { nav, .head, .head-actions { flex-wrap:wrap; } .head { display:block; } .head-actions { margin-top:22px; } .fields { grid-template-columns:1fr; } }
  `]
})
export class VehiclesComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly xlsxData = inject(XlsxDataService);

  expenseCategories = ['reparation', 'gazoil', 'vidange'];
  vehicles: Vehicule[] = [];
  expenses: VehiculeFrais[] = [];
  columns: string[] = this.defaultColumns();
  filters: Record<string, string> = {}
  editingId = '';
  isModalOpen = false;
  isExpenseModalOpen = false;
  editingExpenseId = '';
  message = '';
  draft: Vehicule = this.emptyVehicle();
  expenseDraft: VehiculeFrais = this.emptyExpense();

  get filteredVehicles(): Vehicule[] {
    return this.vehicles.filter((vehicle) => this.columns.every((column) => {
      const filter = this.normalizeKey(this.filters[column] ?? '');
      if (!filter) return true;
      return this.normalizeKey(this.vehicleCellValue(column, vehicle)).includes(filter);
    }));
  }

  async ngOnInit(): Promise<void> {
    this.refreshColumns();
    try {
      const stored = localStorage.getItem('project-cost-vehicles');
      if (stored) {
        const parsed = JSON.parse(stored) as VehiculeWorkbook;
        this.vehicles = parsed.vehicules ?? [];
        this.expenses = parsed.depenses ?? [];
      }

      const workbook = await this.xlsxData.importVehicleWorkbook('assets/vehicule.xlsx');
      this.vehicles = workbook.vehicules;
      this.expenses = workbook.depenses;
      this.persist();
      this.refreshColumns();
    } catch {
      this.vehicles = [];
      this.expenses = [];
    }
  }

  openCreateModal(): void {
    this.editingId = '';
    this.draft = this.emptyVehicle();
    this.isModalOpen = true;
  }

  openEditModal(vehicle: Vehicule): void {
    this.editingId = vehicle.id;
    this.draft = { ...vehicle };
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.editingId = '';
    this.draft = this.emptyVehicle();
  }

  saveVehicle(): void {
    if (!this.isValidDateValue(this.draft.visiteTechnique) || !this.isValidDateValue(this.draft.assurance) || !this.isValidDateValue(this.draft.taxe)) {
      this.message = 'Les dates de visite technique, assurance et taxe doivent être des dates réelles.';
      return;
    }

    const vehicle = { ...this.draft, id: this.editingId || crypto.randomUUID() };
    this.vehicles = this.editingId
      ? this.vehicles.map((item) => item.id === this.editingId ? vehicle : item)
      : [vehicle, ...this.vehicles];
    this.persist();
    this.refreshColumns();
    this.closeModal();
    this.message = `${vehicle.matricule} enregistré.`;
  }

  deleteVehicle(id: string): void {
    this.vehicles = this.vehicles.filter((vehicle) => vehicle.id !== id);
    this.expenses = this.expenses.filter((expense) => expense.vehiculeId !== id);
    this.persist();
  }

  openCreateExpenseModal(category = 'reparation'): void {
    this.editingExpenseId = '';
    this.expenseDraft = this.emptyExpense(category);
    this.expenseDraft.vehiculeId = this.vehicles[0]?.id ?? '';
    this.expenseDraft.categorie = category;
    this.isExpenseModalOpen = true;
  }

  openEditExpenseModal(expense: VehiculeFrais): void {
    this.editingExpenseId = expense.id;
    this.expenseDraft = { ...expense };
    this.isExpenseModalOpen = true;
  }

  closeExpenseModal(): void {
    this.isExpenseModalOpen = false;
    this.editingExpenseId = '';
    this.expenseDraft = this.emptyExpense();
  }

  saveExpense(): void {
    if (!this.expenseDraft.vehiculeId) {
      this.message = 'Veuillez sélectionner un véhicule pour cette dépense.';
      return;
    }

    if (this.expenseDraft.montant <= 0) {
      this.message = 'Le montant doit être supérieur à zéro.';
      return;
    }

    const expense = { ...this.expenseDraft, id: this.editingExpenseId || crypto.randomUUID() };
    expense.categorie = this.normalizeCategory(expense.categorie);
    this.expenses = this.editingExpenseId
      ? this.expenses.map((item) => item.id === this.editingExpenseId ? expense : item)
      : [expense, ...this.expenses];
    this.persist();
    this.closeExpenseModal();
    this.message = `${expense.categorie} enregistré.`;
  }

  deleteExpense(id: string): void {
    this.expenses = this.expenses.filter((expense) => expense.id !== id);
    this.persist();
  }

  async importVehicles(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (file.name.toLowerCase() !== 'vehicule.xlsx') {
      this.message = 'Le fichier doit être nommé vehicule.xlsx.';
      input.value = '';
      return;
    }

    try {
      const workbook = await this.xlsxData.importVehicleWorkbookFromFile(file);
      this.vehicles = workbook.vehicules;
      this.expenses = workbook.depenses;
      this.persist();
      this.refreshColumns();
      this.message = `${this.vehicles.length} véhicule(s) importé(s) depuis ${file.name}.`;
    } catch {
      this.message = 'Impossible de lire le fichier véhicule.';
    } finally {
      input.value = '';
    }
  }

  async saveFile(): Promise<void> {
    const workbook: VehiculeWorkbook = { vehicules: this.vehicles, depenses: this.expenses };
    try {
      await this.xlsxData.saveVehicleWorkbookToAssets('vehicule.xlsx', workbook);
      this.message = `${this.vehicles.length} véhicule(s) et ${this.expenses.length} dépense(s) sauvegardés dans vehicule.xlsx.`;
    } catch {
      this.message = 'Impossible de sauvegarder vehicule.xlsx.';
    }
  }

  printList(): void {
    window.print();
  }

  logout(): void {
    this.auth.logout();
    location.href = '/login';
  }

  getVehicleMatricule(vehicleId: string): string {
    const found = this.vehicles.find((vehicle) => vehicle.id === vehicleId);
    return found?.matricule ?? 'Non renseigné';
  }

  vehicleCellValue(column: string, vehicle: Vehicule): string {
    const value = vehicle[column as keyof Vehicule];
    return String(value ?? '').trim();
  }

  private emptyVehicle(): Vehicule {
    return { id: '', matricule: '', visiteTechnique: '', assurance: '', taxe: '' };
  }

  private emptyExpense(category = 'reparation'): VehiculeFrais {
    return { id: '', vehiculeId: this.vehicles[0]?.id ?? '', montant: 0, description: '', categorie: category };
  }

  private isValidDateValue(value: string): boolean {
    if (!value || value.length !== 10) return false;
    const date = new Date(`${value}T00:00:00`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }

  private normalizeCategory(category: string): string {
    return category.trim().toLowerCase();
  }

  private refreshColumns(): void {
    const columns = [...new Set(this.vehicles.flatMap((vehicle) => Object.keys(vehicle)))].filter((column) => column !== 'id');
    this.columns = columns.length ? columns : this.defaultColumns();
  }

  private defaultColumns(): string[] {
    return ['matricule', 'visiteTechnique', 'assurance', 'taxe'];
  }

  private persist(): void {
    localStorage.setItem('project-cost-vehicles', JSON.stringify({ vehicules: this.vehicles, depenses: this.expenses }));
  }

  private normalizeKey(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }
}
