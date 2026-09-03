import { Component, OnInit, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Projet } from '../../core/models/project-cost.models';
import { AuthService } from '../../core/services/auth.service';
import { XlsxDataService } from '../../core/services/xlsx-data.service';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [DecimalPipe, FormsModule, RouterLink],
  template: `
    <main class="projects-page">
      <header class="topbar"><a routerLink="/dashboard" class="logo">PROJECT <b>COST</b></a><nav><a routerLink="/dashboard">Tableau de bord</a><button (click)="logout()">Quitter</button></nav></header>
      <section class="heading"><div><p class="eyebrow">Portefeuille</p><h1>Vos projets<span>.</span></h1><p>Importez votre fichier Excel ou ajoutez un nouveau projet.</p></div><button class="outline" (click)="showForm = !showForm">{{ showForm ? 'Fermer' : '+ Nouveau projet' }}</button></section>
      <section class="workspace">
        @if (showForm) {
          <form class="form-panel" (ngSubmit)="addProject()"><div class="form-title"><p class="eyebrow">Création</p><h2>Nouveau projet</h2></div><label>Client<input name="client" [(ngModel)]="draft.client" required placeholder="Nom du client" /></label><label>Description<input name="description" [(ngModel)]="draft.description" required placeholder="Objet du projet" /></label><div class="form-row"><label>Début prévu<input name="dateDebutPrevue" [(ngModel)]="draft.dateDebutPrevue" type="date" required /></label><label>Fin prévue<input name="dateFinPrevue" [(ngModel)]="draft.dateFinPrevue" type="date" required /></label></div><button class="primary" type="submit">Créer le projet <span>→</span></button></form>
        }
        <div class="toolbar"><div><strong>{{ projects.length }}</strong> projet{{ projects.length > 1 ? 's' : '' }}</div><label class="import"><input type="file" accept=".xlsx,.xls" (change)="importFile($event)" /> Importer un fichier Excel <span>↥</span></label></div>
        @if (message) { <p class="message">{{ message }}</p> }
        @if (projects.length) { <div class="project-list">@for (project of projects; track project.id) { <article><div class="project-index">{{ $index + 1 | number:'2.0' }}</div><div class="project-main"><span class="status" [class.active]="project.etat === 'EN_COURS'">{{ project.etat || 'A VENIR' }}</span><h2>{{ project.client }}</h2><p>{{ project.description }}</p></div><div class="dates"><span>FIN PRÉVUE</span><strong>{{ project.dateFinPrevue || '—' }}</strong></div></article> }</div> } @else { <div class="empty"><span>∅</span><h2>Aucun projet pour le moment</h2><p>Ajoutez un projet ou importez votre fichier XLSX depuis le dossier assets.</p></div> }
      </section>
    </main>
  `,
  styles: [`
    :host { display:block; } .projects-page { min-height:100vh; background:#f5f1e9; color:#17221f; } .topbar { height:76px; display:flex; align-items:center; justify-content:space-between; padding:0 clamp(24px,6vw,100px); border-bottom:1px solid #d9ddd4; } .logo { color:#17221f; font:700 13px 'Courier New',monospace; letter-spacing:1px; text-decoration:none; } .logo b { color:#de6948; } nav { display:flex; gap:28px; align-items:center; } nav a, nav button { color:#354740; font:700 12px 'Courier New',monospace; text-decoration:none; } nav button { border:0; border-left:1px solid #bec8be; padding-left:28px; background:none; cursor:pointer; } .heading { display:flex; justify-content:space-between; align-items:flex-end; padding:75px clamp(24px,10vw,160px) 58px; background:#2f5148; color:#fff9ef; } .eyebrow { margin:0 0 17px; color:#de6948; font:700 11px 'Courier New',monospace; letter-spacing:1.5px; text-transform:uppercase; } .heading .eyebrow { color:#e7b86a; } h1 { margin:0; font:700 clamp(48px,7vw,88px)/.95 Georgia,serif; letter-spacing:0; } h1 span { color:#de6948; } .heading p:last-child { margin:22px 0 0; color:#c8d5ce; } button { cursor:pointer; } .outline { padding:15px 17px; border:1px solid #e7b86a; background:transparent; color:#fff9ef; font:700 12px 'Courier New',monospace; } .workspace { padding:0 clamp(24px,10vw,160px) 80px; } .form-panel { display:grid; gap:18px; max-width:700px; margin:0 0 35px; padding:30px; background:#fffdf8; border-bottom:3px solid #de6948; } .form-title h2 { margin:0 0 5px; font:700 28px Georgia,serif; } label { display:grid; gap:8px; color:#60706a; font:700 11px 'Courier New',monospace; text-transform:uppercase; } input { height:44px; border:1px solid #bec8be; background:#f5f1e9; padding:0 12px; color:#17221f; font:14px Georgia,serif; text-transform:none; outline:none; } input:focus { border-color:#de6948; } .form-row { display:grid; grid-template-columns:1fr 1fr; gap:15px; } .primary { width:max-content; padding:15px 18px; border:0; background:#de6948; color:#fff9ef; font:700 12px 'Courier New',monospace; } .primary span { margin-left:28px; font-size:18px; } .toolbar { display:flex; justify-content:space-between; align-items:center; padding:28px 0 18px; border-bottom:1px solid #bec8be; color:#60706a; font:12px 'Courier New',monospace; } .toolbar strong { color:#17221f; font-size:24px; } .import { display:block; color:#de6948; cursor:pointer; } .import input { display:none; } .import span { margin-left:7px; font-size:18px; } .message { padding:12px 15px; background:#e7b86a; color:#17221f; font-size:13px; } .project-list article { display:grid; grid-template-columns:60px 1fr 160px; gap:20px; align-items:center; min-height:130px; border-bottom:1px solid #bec8be; } .project-index { color:#a2aea6; font:18px Georgia,serif; } .status { color:#de6948; font:10px 'Courier New',monospace; letter-spacing:1px; } .status.active { color:#2f8b70; } .project-main h2 { margin:9px 0 5px; font:700 25px Georgia,serif; } .project-main p { margin:0; color:#75827b; font-size:13px; } .dates { display:grid; gap:8px; text-align:right; } .dates span { color:#8a978f; font:10px 'Courier New',monospace; } .dates strong { font:400 15px Georgia,serif; } .empty { padding:100px 20px; text-align:center; border-bottom:1px solid #bec8be; } .empty > span { color:#de6948; font:40px Georgia,serif; } .empty h2 { margin:18px 0 8px; font:700 28px Georgia,serif; } .empty p { color:#75827b; } @media(max-width:650px) { .heading { display:block; padding-top:55px; } .outline { margin-top:30px; } .project-list article { grid-template-columns:35px 1fr; padding:18px 0; } .dates { grid-column:2; text-align:left; } .toolbar { align-items:flex-end; gap:20px; } .form-row { grid-template-columns:1fr; } }
  `]
})
export class ProjectsComponent implements OnInit {
  private readonly xlsx = inject(XlsxDataService);
  private readonly auth = inject(AuthService);
  projects: Projet[] = [];
  showForm = false;
  message = '';
  draft: Partial<Projet> = {};

  async ngOnInit(): Promise<void> {
    try { this.projects = await this.xlsx.importAsset<Projet>('assets/projects.xlsx', 'Projets'); }
    catch { this.message = 'Aucun fichier assets/projects.xlsx détecté. Vous pouvez importer un fichier Excel ci-dessus.'; }
  }

  async importFile(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.projects = await this.xlsx.importSheet<Projet>(file, 'Projets');
    this.message = `${this.projects.length} projet(s) importé(s) depuis ${file.name}.`;
  }

  addProject(): void {
    const project = { ...this.draft, id: crypto.randomUUID(), etat: 'A_VENIR' } as Projet;
    this.projects = [...this.projects, this.xlsx.create('Projets', project)];
    this.draft = {};
    this.showForm = false;
    this.message = 'Projet créé avec succès.';
  }

  logout(): void { this.auth.logout(); location.href = '/login'; }
}
