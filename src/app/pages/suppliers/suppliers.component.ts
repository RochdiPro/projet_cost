import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { XlsxDataService } from '../../core/services/xlsx-data.service';

interface Supplier {
  id: string;
  nom: string;
  adresse: string;
  materielVendu: string;
  description: string;
  contact: string;
  categorie: string;
}

type SheetRow = Record<string, unknown>;

const STORAGE_KEY = 'project-cost-suppliers';

@Component({
  selector: 'app-suppliers',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <main class="page">
      <header class="topbar">
        <a routerLink="/dashboard" class="logo"><b>PC</b> PROJECT COST</a>
        <nav>
          <a routerLink="/dashboard">Tableau de bord</a>
          <a routerLink="/projects">Projets</a>
          <a routerLink="/products">Produits</a>
          <button type="button" (click)="logout()">Quitter</button>
        </nav>
      </header>

      <section class="head">
        <div>
          <small>Liste fournisseurs</small>
          <h1>Fournisseurs<span>.</span></h1>
          @if (message) { <p>{{ message }}</p> }
        </div>
        <div class="head-actions">
          <label class="import">
            Importer XLSX
            <input type="file" accept=".xlsx,.xls" (change)="importSuppliers($event)" />
          </label>
          <button type="button" (click)="openCreateModal()">Nouveau fournisseur</button>
        </div>
      </section>

      <section class="content">
        <div class="table-box">
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Adresse</th>
                <th>Materiel vendu</th>
                <th>Description</th>
                <th>Contact</th>
                <th>Categorie</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (supplier of suppliers; track supplier.id) {
                <tr>
                  <td><strong>{{ supplier.nom }}</strong></td>
                  <td>{{ supplier.adresse || '-' }}</td>
                  <td>{{ supplier.materielVendu || '-' }}</td>
                  <td>{{ supplier.description || '-' }}</td>
                  <td>{{ supplier.contact || '-' }}</td>
                  <td><span class="pill">{{ supplier.categorie || '-' }}</span></td>
                  <td>
                    <div class="row-actions">
                      <button type="button" (click)="openEditModal(supplier)">Modifier</button>
                      <button type="button" class="danger" (click)="deleteSupplier(supplier.id)">Supprimer</button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="7" class="empty">Aucun fournisseur enregistre.</td></tr>
              }
            </tbody>
          </table>
        </div>
      </section>

      @if (isModalOpen) {
        <div class="modal-backdrop">
          <form class="modal" (ngSubmit)="saveSupplier()">
            <h2>{{ editingId ? 'Modifier fournisseur' : 'Ajouter fournisseur' }}</h2>
            <div class="fields">
              <label>Nom<input name="nom" [(ngModel)]="draft.nom" required /></label>
              <label>Contact<input name="contact" [(ngModel)]="draft.contact" /></label>
              <label>Adresse<input name="adresse" [(ngModel)]="draft.adresse" /></label>
              <label>Categorie
                <select name="categorie" [(ngModel)]="draft.categorie">
                  @for (category of categories; track category) { <option [value]="category">{{ category }}</option> }
                </select>
              </label>
              <label>Materiel vendu<input name="materielVendu" [(ngModel)]="draft.materielVendu" /></label>
              <label class="wide">Description<textarea name="description" [(ngModel)]="draft.description"></textarea></label>
            </div>
            <div class="actions">
              <button type="button" class="ghost" (click)="closeModal()">Annuler</button>
              <button type="submit">{{ editingId ? 'Enregistrer' : 'Ajouter' }}</button>
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
    .import { position:relative; display:inline-flex; align-items:center; min-height:40px; box-sizing:border-box; }
    .import input { display:none; }
    .content { padding:28px clamp(20px,7vw,96px) 70px; }
    .table-box { overflow:auto; border:1px solid #d9ddd4; background:#fffdf8; }
    table { width:100%; min-width:980px; border-collapse:collapse; }
    th, td { padding:13px 12px; border-bottom:1px solid #e5e7df; text-align:left; vertical-align:top; }
    th { color:#52645d; background:#eef1eb; font:700 11px 'Courier New',monospace; text-transform:uppercase; }
    td { color:#33453f; line-height:1.45; }
    .pill { display:inline-block; padding:5px 8px; background:#fff3e8; color:#a43d28; font:700 10px 'Courier New',monospace; }
    .row-actions { align-items:flex-start; }
    .row-actions button, .ghost { background:#fff; border:1px solid #bec8be; color:#354740; padding:9px 10px; }
    .row-actions .danger { border-color:#efb4a6; color:#a43d28; }
    .empty { text-align:center; color:#68766e; }
    .modal-backdrop { position:fixed; inset:0; display:grid; place-items:center; padding:24px; background:rgba(23,34,31,.42); }
    .modal { width:min(620px,94vw); max-height:calc(100vh - 48px); overflow:auto; border:1px solid #d9ddd4; background:#fffdf8; padding:22px; box-shadow:0 18px 48px rgba(23,34,31,.24); }
    h2 { margin:0; font:700 28px Georgia,serif; letter-spacing:0; }
    .fields { display:grid; grid-template-columns:repeat(2,1fr); gap:12px; margin-top:18px; }
    label { display:grid; gap:6px; color:#52645d; font-size:12px; font-weight:700; }
    .wide { grid-column:1 / -1; }
    input, select, textarea { width:100%; border:1px solid #c8d0c8; background:#fff; color:#17221f; padding:11px 12px; font:14px Arial,sans-serif; box-sizing:border-box; }
    textarea { min-height:88px; resize:vertical; }
    input:focus, select:focus, textarea:focus { outline:2px solid rgba(222,105,72,.18); border-color:#de6948; }
    .actions { justify-content:flex-end; margin-top:18px; }
    @media (max-width:760px) { nav, .head, .head-actions { flex-wrap:wrap; } .head { display:block; } .head-actions { margin-top:22px; } .fields { grid-template-columns:1fr; } }
  `]
})
export class SuppliersComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly xlsxData = inject(XlsxDataService);
  categories = ['Automatisme', 'Inox', 'Informatique', 'Electricite', 'Mecanique', 'Logistique', 'Autre'];
  suppliers: Supplier[] = [];
  editingId = '';
  isModalOpen = false;
  message = '';
  draft: Supplier = this.emptySupplier();

  ngOnInit(): void {
    this.suppliers = this.loadSuppliers();
  }

  openCreateModal(): void {
    this.editingId = '';
    this.draft = this.emptySupplier();
    this.isModalOpen = true;
  }

  openEditModal(supplier: Supplier): void {
    this.editingId = supplier.id;
    this.draft = { ...supplier };
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.editingId = '';
    this.draft = this.emptySupplier();
  }

  saveSupplier(): void {
    const supplier = { ...this.draft, id: this.editingId || crypto.randomUUID() };
    this.suppliers = this.editingId
      ? this.suppliers.map((item) => item.id === this.editingId ? supplier : item)
      : [supplier, ...this.suppliers];
    this.persist();
    this.closeModal();
    this.message = `${supplier.nom} enregistre.`;
  }

  deleteSupplier(id: string): void {
    this.suppliers = this.suppliers.filter((supplier) => supplier.id !== id);
    this.persist();
  }

  async importSuppliers(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const rows = await this.xlsxData.importSheet<SheetRow>(file);
      const imported = rows.map((row) => this.supplierFromRow(row)).filter((supplier) => supplier.nom);
      this.suppliers = this.mergeByName(this.suppliers, imported);
      this.persist();
      this.message = `${imported.length} fournisseur(s) importe(s) depuis ${file.name}.`;
    } catch {
      this.message = 'Impossible de lire le fichier fournisseurs.';
    } finally {
      input.value = '';
    }
  }

  logout(): void {
    this.auth.logout();
    location.href = '/login';
  }

  private emptySupplier(): Supplier {
    return { id: '', nom: '', adresse: '', materielVendu: '', description: '', contact: '', categorie: this.categories?.[0] ?? 'Automatisme' };
  }

  private supplierFromRow(row: SheetRow): Supplier {
    return {
      id: crypto.randomUUID(),
      nom: this.cell(row, ['nom', 'name', 'fournisseur', 'supplier']),
      adresse: this.cell(row, ['adresse', 'address', 'adr']),
      materielVendu: this.cell(row, ['materielvendu', 'materiel', 'material', 'produits', 'products']),
      description: this.cell(row, ['description', 'desc']),
      contact: this.cell(row, ['contact', 'telephone', 'tel', 'phone', 'email']),
      categorie: this.cell(row, ['categorie', 'category']) || 'Autre'
    };
  }

  private cell(row: SheetRow, names: string[]): string {
    const entry = Object.entries(row).find(([key]) => names.includes(this.normalizeKey(key)));
    return String(entry?.[1] ?? '').trim();
  }

  private normalizeKey(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  private mergeByName(current: Supplier[], imported: Supplier[]): Supplier[] {
    const merged = [...current];
    for (const supplier of imported) {
      const index = merged.findIndex((item) => this.normalizeKey(item.nom) === this.normalizeKey(supplier.nom));
      if (index >= 0) {
        merged[index] = { ...supplier, id: merged[index].id };
      } else {
        merged.unshift(supplier);
      }
    }
    return merged;
  }

  private loadSuppliers(): Supplier[] {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as Supplier[];
    } catch {
      return [];
    }
  }

  private persist(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.suppliers));
  }
}
