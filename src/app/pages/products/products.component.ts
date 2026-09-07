import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { XlsxDataService } from '../../core/services/xlsx-data.service';

interface SupplierOption {
  nom: string;
}

interface Product {
  id: string;
  nom: string;
  reference: string;
  image: string;
  prix: number | null;
  lastUpdate: string;
  fournisseur: string;
}

type SheetRow = Record<string, unknown>;

const PRODUCTS_KEY = 'project-cost-products';
const SUPPLIERS_KEY = 'project-cost-suppliers';

@Component({
  selector: 'app-products',
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
          <button type="button" (click)="logout()">Quitter</button>
        </nav>
      </header>

      <section class="head">
        <div>
          <small>Archive produit</small>
          <h1>Produits<span>.</span></h1>
          @if (message) { <p>{{ message }}</p> }
        </div>
        <div class="head-actions">
          <label class="import">
            Importer XLSX
            <input type="file" accept=".xlsx,.xls" (change)="importProducts($event)" />
          </label>
          <button type="button" (click)="openCreateModal()">Nouveau produit</button>
        </div>
      </section>

      <section class="content">
        <div class="table-box">
          <table>
            <thead>
              <tr>
                <th>Image</th>
                <th>Nom</th>
                <th>Reference</th>
                <th>Prix</th>
                <th>Last update</th>
                <th>Fournisseur</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (product of products; track product.id) {
                <tr>
                  <td>
                    <div class="thumb">
                      @if (product.image) {
                        <img [src]="product.image" [alt]="product.nom" />
                      } @else {
                        <span>IMG</span>
                      }
                    </div>
                  </td>
                  <td><strong>{{ product.nom }}</strong></td>
                  <td>{{ product.reference || '-' }}</td>
                  <td>{{ formatPrice(product.prix) }}</td>
                  <td>{{ product.lastUpdate || '-' }}</td>
                  <td>{{ product.fournisseur || '-' }}</td>
                  <td>
                    <div class="row-actions">
                      <button type="button" (click)="openEditModal(product)">Modifier</button>
                      <button type="button" class="danger" (click)="deleteProduct(product.id)">Supprimer</button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="7" class="empty">Aucun produit archive.</td></tr>
              }
            </tbody>
          </table>
        </div>
      </section>

      @if (isModalOpen) {
        <div class="modal-backdrop">
          <form class="modal" (ngSubmit)="saveProduct()">
            <h2>{{ editingId ? 'Modifier produit' : 'Ajouter produit' }}</h2>
            <div class="fields">
              <label>Nom<input name="nom" [(ngModel)]="draft.nom" required /></label>
              <label>Reference<input name="reference" [(ngModel)]="draft.reference" required /></label>
              <label>Prix<input name="prix" type="number" min="0" step="0.001" [(ngModel)]="draft.prix" /></label>
              <label>Last update<input name="lastUpdate" type="date" [(ngModel)]="draft.lastUpdate" /></label>
              <label>Fournisseur
                <select name="fournisseur" [(ngModel)]="draft.fournisseur">
                  <option value="">Non renseigne</option>
                  @for (supplier of suppliers; track supplier.nom) { <option [value]="supplier.nom">{{ supplier.nom }}</option> }
                </select>
              </label>
              <label>Image<input name="image" [(ngModel)]="draft.image" placeholder="URL image" /></label>
            </div>
            <div class="preview">
              @if (draft.image) {
                <img [src]="draft.image" [alt]="draft.nom || 'Image produit'" />
              } @else {
                <span>Apercu image</span>
              }
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
    table { width:100%; min-width:940px; border-collapse:collapse; }
    th, td { padding:13px 12px; border-bottom:1px solid #e5e7df; text-align:left; vertical-align:middle; }
    th { color:#52645d; background:#eef1eb; font:700 11px 'Courier New',monospace; text-transform:uppercase; }
    td { color:#33453f; line-height:1.45; }
    .thumb { width:58px; aspect-ratio:1; display:grid; place-items:center; background:#eef1eb; color:#87918c; overflow:hidden; font:700 10px 'Courier New',monospace; }
    .thumb img, .preview img { width:100%; height:100%; object-fit:cover; display:block; }
    .row-actions { align-items:center; }
    .row-actions button, .ghost { background:#fff; border:1px solid #bec8be; color:#354740; padding:9px 10px; }
    .row-actions .danger { border-color:#efb4a6; color:#a43d28; }
    .empty { text-align:center; color:#68766e; }
    .modal-backdrop { position:fixed; inset:0; display:grid; place-items:center; padding:24px; background:rgba(23,34,31,.42); }
    .modal { width:min(680px,94vw); max-height:calc(100vh - 48px); overflow:auto; border:1px solid #d9ddd4; background:#fffdf8; padding:22px; box-shadow:0 18px 48px rgba(23,34,31,.24); }
    h2 { margin:0; font:700 28px Georgia,serif; letter-spacing:0; }
    .fields { display:grid; grid-template-columns:repeat(2,1fr); gap:12px; margin-top:18px; }
    label { display:grid; gap:6px; color:#52645d; font-size:12px; font-weight:700; }
    input, select { width:100%; border:1px solid #c8d0c8; background:#fff; color:#17221f; padding:11px 12px; font:14px Arial,sans-serif; box-sizing:border-box; }
    input:focus, select:focus { outline:2px solid rgba(222,105,72,.18); border-color:#de6948; }
    .preview { width:118px; aspect-ratio:1; display:grid; place-items:center; margin-top:16px; background:#eef1eb; color:#87918c; overflow:hidden; font:700 11px 'Courier New',monospace; }
    .actions { justify-content:flex-end; margin-top:18px; }
    @media (max-width:760px) { nav, .head, .head-actions { flex-wrap:wrap; } .head { display:block; } .head-actions { margin-top:22px; } .fields { grid-template-columns:1fr; } }
  `]
})
export class ProductsComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly xlsxData = inject(XlsxDataService);
  suppliers: SupplierOption[] = [];
  products: Product[] = [];
  editingId = '';
  isModalOpen = false;
  message = '';
  draft: Product = this.emptyProduct();

  ngOnInit(): void {
    this.refreshSuppliers();
    this.products = this.loadProducts();
  }

  openCreateModal(): void {
    this.refreshSuppliers();
    this.editingId = '';
    this.draft = this.emptyProduct();
    this.isModalOpen = true;
  }

  openEditModal(product: Product): void {
    this.refreshSuppliers();
    this.editingId = product.id;
    this.draft = { ...product };
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.editingId = '';
    this.draft = this.emptyProduct();
  }

  saveProduct(): void {
    const product = { ...this.draft, id: this.editingId || crypto.randomUUID(), prix: this.toNumber(this.draft.prix) };
    this.products = this.editingId
      ? this.products.map((item) => item.id === this.editingId ? product : item)
      : [product, ...this.products];
    this.persist();
    this.closeModal();
    this.message = `${product.nom} enregistre.`;
  }

  deleteProduct(id: string): void {
    this.products = this.products.filter((product) => product.id !== id);
    this.persist();
  }

  async importProducts(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const rows = await this.xlsxData.importSheet<SheetRow>(file);
      const imported = rows.map((row) => this.productFromRow(row)).filter((product) => product.nom || product.reference);
      this.products = this.mergeByReference(this.products, imported);
      this.persist();
      this.message = `${imported.length} produit(s) importe(s) depuis ${file.name}.`;
    } catch {
      this.message = 'Impossible de lire le fichier produits.';
    } finally {
      input.value = '';
    }
  }

  formatPrice(value: number | null): string {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'TND', minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(Number(value || 0));
  }

  logout(): void {
    this.auth.logout();
    location.href = '/login';
  }

  private emptyProduct(): Product {
    return { id: '', nom: '', reference: '', image: '', prix: null, lastUpdate: new Date().toISOString().slice(0, 10), fournisseur: '' };
  }

  private productFromRow(row: SheetRow): Product {
    return {
      id: crypto.randomUUID(),
      nom: this.cell(row, ['nom', 'name', 'produit', 'product', 'designation']),
      reference: this.cell(row, ['reference', 'ref', 'code']),
      image: this.cell(row, ['image', 'photo', 'urlimage', 'imageurl']),
      prix: this.toNumber(this.cell(row, ['prix', 'price', 'montant'])),
      lastUpdate: this.formatDate(this.cell(row, ['lastupdate', 'lastupdated', 'derniereupdate', 'dernieremiseajour', 'date'])),
      fournisseur: this.cell(row, ['fournisseur', 'supplier', 'vendor'])
    };
  }

  private cell(row: SheetRow, names: string[]): string {
    const entry = Object.entries(row).find(([key]) => names.includes(this.normalizeKey(key)));
    return String(entry?.[1] ?? '').trim();
  }

  private normalizeKey(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  private toNumber(value: unknown): number | null {
    if (value === null || value === '') return null;
    const numberValue = Number(String(value).replace(',', '.'));
    return Number.isFinite(numberValue) ? numberValue : null;
  }

  private formatDate(value: string): string {
    if (!value) return new Date().toISOString().slice(0, 10);
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toISOString().slice(0, 10);
  }

  private mergeByReference(current: Product[], imported: Product[]): Product[] {
    const merged = [...current];
    for (const product of imported) {
      const key = this.normalizeKey(product.reference || product.nom);
      const index = merged.findIndex((item) => this.normalizeKey(item.reference || item.nom) === key);
      if (index >= 0) {
        merged[index] = { ...product, id: merged[index].id };
      } else {
        merged.unshift(product);
      }
    }
    return merged;
  }

  private refreshSuppliers(): void {
    this.suppliers = this.loadSuppliers();
  }

  private loadProducts(): Product[] {
    try {
      return JSON.parse(localStorage.getItem(PRODUCTS_KEY) ?? '[]') as Product[];
    } catch {
      return [];
    }
  }

  private loadSuppliers(): SupplierOption[] {
    try {
      return JSON.parse(localStorage.getItem(SUPPLIERS_KEY) ?? '[]') as SupplierOption[];
    } catch {
      return [];
    }
  }

  private persist(): void {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(this.products));
  }
}
