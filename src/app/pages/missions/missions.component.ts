import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { XlsxDataService } from '../../core/services/xlsx-data.service';
import { MissionAppel, MissionLot, MissionTache } from '../../core/models/project-cost.models';

interface MissionTimelineEntry {
  id: string;
  kind: 'lot' | 'tache';
  nom: string;
  dateDebut: string;
  dateFin: string;
  description: string;
  avancement: number;
  lotNom?: string;
}

@Component({
  selector: 'app-missions',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <main class="page">
      <header class="topbar">
        <a routerLink="/dashboard" class="logo"><b>PC</b> PROJECT COST</a>
        <nav>
          <a routerLink="/dashboard">Tableau de bord</a>
          <a routerLink="/projects">Projets</a>
          <a routerLink="/employees">Employés</a>
          <a routerLink="/vehicles">Véhicules</a>
          <button type="button" (click)="logout()">Quitter</button>
        </nav>
      </header>

      <section class="hero">
        <div>
          <small>Organisation des missions</small>
          <h1>Mission<span>.</span></h1>
          <p>Structurez chaque mission en lots et tâches, avec un avancement calculé automatiquement.</p>
        </div>
        <div class="hero-actions">
          <button type="button" (click)="openMissionModal()">Nouvelle mission</button>
          <label class="import">
            Importer XLSX
            <input type="file" accept=".xlsx,.xls,.xlns" (change)="importMissionFile($event)" />
          </label>
          <button type="button" class="light-button" (click)="saveXlsx()">Sauvegarder XLSX</button>
        </div>
      </section>

      <section class="content">
        @if (message) { <p class="message">{{ message }}</p> }

        <div class="summary-grid">
          <article><small>Missions</small><strong>{{ missions.length }}</strong><span>enregistrées</span></article>
          <article><small>Lots</small><strong>{{ totalLots }}</strong><span>dans les missions</span></article>
          <article><small>Avancement moyen</small><strong>{{ formatPercent(averageProgress) }}</strong><span>toutes missions</span></article>
        </div>

        @if (!selectedMission) {
          <section class="available-section">
            <div class="section-heading"><div><small>Fichiers XLSX disponibles</small><h2>Mes missions</h2></div><strong>{{ missions.length }} fichier(s)</strong></div>
            <div class="available-grid">
              @for (mission of missions; track mission.id) {
                <article class="available-card">
                  <div><small>Mission</small><h3>{{ mission.nom }}</h3><p>{{ mission.description || 'Aucune description' }}</p><span>{{ mission.dateDebut || '-' }} → {{ mission.dateFin || '-' }}</span></div>
                  <div class="file-name">{{ missionFileName(mission.nom, mission.id) }}</div>
                  <div class="progress-panel"><strong>{{ formatPercent(missionProgress(mission)) }}</strong><div class="progress-track"><i [style.width.%]="missionProgress(mission)"></i></div></div>
                  <div class="row-actions"><button type="button" (click)="openMission(mission)">Ouvrir</button><button type="button" (click)="printMission(mission)">Imprimer</button><button type="button" (click)="openMissionModal(mission)">Modifier</button><button type="button" class="danger" (click)="deleteMission(mission)">Supprimer</button></div>
                </article>
              } @empty {
                <div class="empty empty-page">Aucun fichier mission dans src/assets/mission.</div>
              }
            </div>
          </section>
        }

        @if (selectedMission) {
        <section class="report-section">
          <div class="section-heading"><div><small>Mission ouverte</small><h2>Mission → Lots → Tâches</h2></div><button type="button" class="ghost" (click)="closeMission()">Retour à la liste</button></div>
          @for (mission of missions; track mission.id) {
            @if (mission.id === selectedMission.id) {
            <article class="mission-card">
              <div class="mission-heading">
                <div>
                  <small>Mission</small>
                  <h3>{{ mission.nom }}</h3>
                  <p>{{ mission.description || 'Aucune description' }}</p>
                  <span>{{ mission.dateDebut || '-' }} → {{ mission.dateFin || '-' }}</span>
                </div>
                <div class="progress-panel">
                  <strong>{{ formatPercent(missionProgress(mission)) }}</strong>
                  <div class="progress-track"><i [style.width.%]="missionProgress(mission)"></i></div>
                  <small>avancement global</small>
                </div>
                <div class="row-actions">
                  <button type="button" (click)="openLotModal(mission)">+ Lot</button>
                  <button type="button" (click)="printMission(mission)">Imprimer</button>
                  <button type="button" (click)="openMissionModal(mission)">Modifier</button>
                  <button type="button" class="danger" (click)="deleteMission(mission)">Supprimer</button>
                </div>
              </div>

              <div class="lots">
                @for (lot of mission.lots; track lot.id) {
                  <article class="lot-card">
                    <div class="lot-heading">
                      <div><small>Lot</small><h4>{{ lot.nom }} @if (isLate(lotEndDate(lot), lotProgress(lot))) { <span class="late-label">EN RETARD</span> }</h4><p>{{ lot.description || 'Aucune description' }}</p></div>
                      <div class="lot-progress"><strong>{{ formatPercent(lotProgress(lot)) }}</strong><div class="progress-track"><i [style.width.%]="lotProgress(lot)"></i></div></div>
                      <div class="row-actions">
                        <button type="button" (click)="openTaskModal(mission, lot)">+ Tâche</button>
                        <button type="button" (click)="openLotModal(mission, lot)">Modifier</button>
                        <button type="button" class="danger" (click)="deleteLot(mission, lot)">Supprimer</button>
                      </div>
                    </div>
                    <div class="task-list">
                      @for (task of lot.taches; track task.id) {
                        <div class="task-row">
                          <div><strong>{{ task.nom }} @if (isLate(task.dateFin, task.avancement)) { <span class="late-label">EN RETARD</span> }</strong><p>{{ task.description || 'Aucune description' }}</p></div>
                          <span>{{ task.dateDebut || '-' }} → {{ task.dateFin || '-' }}</span>
                          <div class="task-progress"><b>{{ formatPercent(task.avancement) }}</b><div class="progress-track"><i [style.width.%]="task.avancement"></i></div></div>
                          <div class="row-actions"><button type="button" (click)="openTaskModal(mission, lot, task)">Modifier</button><button type="button" class="danger" (click)="deleteTask(mission, lot, task)">Supprimer</button></div>
                        </div>
                      } @empty {
                        <p class="empty">Aucune tâche dans ce lot.</p>
                      }
                    </div>
                  </article>
                } @empty {
                  <p class="empty">Aucun lot dans cette mission.</p>
                }
              </div>
            </article>
            }
          } @empty {
            <div class="empty empty-page">Aucune mission. Créez votre première mission.</div>
          }
        </section>
        }

      </section>


        @if (selectedMission) {
          <section class="print-summary">
            <small>Rapport mission</small>
            <h2>{{ selectedMission.nom }}</h2>
            <p class="print-description">{{ selectedMission.description || 'Aucune description' }}</p>
            <div class="print-progress"><strong>{{ formatPercent(missionProgress(selectedMission)) }}</strong><span>Avancement global</span><div class="progress-track"><i [style.width.%]="missionProgress(selectedMission)"></i></div></div>
            <div class="print-stats">
              <div><strong>{{ selectedMission.lots.length }}</strong><span>Lots</span></div>
              <div><strong>{{ missionTaskCount(selectedMission) }}</strong><span>Tâches</span></div>
              <div class="late-stat"><strong>{{ lateLotCount(selectedMission) }}</strong><span>Lots en retard</span></div>
              <div class="late-stat"><strong>{{ lateTaskCount(selectedMission) }}</strong><span>Tâches en retard</span></div>
            </div>
            <div class="print-timeline">
              @for (entry of missionTimeline(selectedMission); track entry.id) {
                <div class="print-timeline-entry" [class.late-entry]="isLate(entry.dateFin, entry.avancement)">
                  <div class="print-timeline-dot"></div>
                  <div class="print-timeline-content">
                    <div class="print-timeline-meta"><strong>{{ entry.kind === 'lot' ? 'LOT' : 'TÂCHE' }}</strong><span>{{ entry.dateDebut || '-' }} → {{ entry.dateFin || '-' }}</span></div>
                    <h4>{{ entry.nom }}</h4>
                    @if (entry.kind === 'tache') { <p>Lot : {{ entry.lotNom }}</p> }
                    <small>{{ entry.description || 'Aucune description' }}</small>
                    <div class="print-timeline-progress"><span>{{ formatPercent(entry.avancement) }}</span><div class="progress-track"><i [style.width.%]="entry.avancement"></i></div></div>
                    @if (isLate(entry.dateFin, entry.avancement)) { <b class="late-label">EN RETARD</b> }
                  </div>
                </div>
              } @empty {
                <p class="empty">Aucun lot ou tâche dans cette mission.</p>
              }
            </div>
          </section>
        }
      @if (modal === 'mission') {
        <div class="modal-backdrop"><form class="modal" (ngSubmit)="saveMission()">
          <h2>{{ editingMission ? 'Modifier la mission' : 'Nouvelle mission' }}</h2>
          <div class="fields"><label>Nom<input name="nom" [(ngModel)]="missionDraft.nom" required /></label><label>Date début<input name="dateDebut" type="date" [(ngModel)]="missionDraft.dateDebut" required /></label><label>Date fin<input name="dateFin" type="date" [(ngModel)]="missionDraft.dateFin" required /></label><label class="wide">Description<textarea name="description" [(ngModel)]="missionDraft.description"></textarea></label></div>
          <div class="actions"><button type="button" class="ghost" (click)="closeModal()">Annuler</button><button type="submit">Enregistrer</button></div>
        </form></div>
      }

      @if (modal === 'lot' && selectedMission) {
        <div class="modal-backdrop"><form class="modal" (ngSubmit)="saveLot()">
          <h2>{{ editingLot ? 'Modifier le lot' : 'Ajouter un lot' }}</h2><p class="modal-context">Mission : {{ selectedMission.nom }}</p>
          <div class="fields"><label>Nom du lot<input name="nom" [(ngModel)]="lotDraft.nom" required /></label><label class="wide">Description<textarea name="description" [(ngModel)]="lotDraft.description"></textarea></label></div>
          <div class="actions"><button type="button" class="ghost" (click)="closeModal()">Annuler</button><button type="submit">Enregistrer</button></div>
        </form></div>
      }

      @if (modal === 'task' && selectedMission && selectedLot) {
        <div class="modal-backdrop"><form class="modal" (ngSubmit)="saveTask()">
          <h2>{{ editingTask ? 'Modifier la tâche' : 'Ajouter une tâche' }}</h2><p class="modal-context">{{ selectedMission.nom }} / {{ selectedLot.nom }}</p>
          <div class="fields"><label>Nom de la tâche<input name="nom" [(ngModel)]="taskDraft.nom" required /></label><label>Date début<input name="dateDebut" type="date" [(ngModel)]="taskDraft.dateDebut" required /></label><label>Date fin<input name="dateFin" type="date" [(ngModel)]="taskDraft.dateFin" required /></label><label>Avancement (%)<input name="avancement" type="number" min="0" max="100" step="1" [(ngModel)]="taskDraft.avancement" required /></label><label class="wide">Description<textarea name="description" [(ngModel)]="taskDraft.description"></textarea></label></div>
          <div class="actions"><button type="button" class="ghost" (click)="closeModal()">Annuler</button><button type="submit">Enregistrer</button></div>
        </form></div>
      }
    </main>
  `,
  styles: [`
    :host { display:block; }
    .page { min-height:100vh; background:#f7f4ed; color:#17221f; }
    .topbar { min-height:72px; display:flex; align-items:center; justify-content:space-between; gap:20px; padding:0 clamp(20px,6vw,90px); border-bottom:1px solid #d9ddd4; background:#fffaf2; }
    .logo, nav a, nav button { color:#354740; font:700 12px 'Courier New',monospace; text-decoration:none; }
    .logo b, .hero span, small { color:#de6948; }
    nav, .hero-actions, .row-actions, .actions { display:flex; align-items:center; gap:10px; }
    nav { gap:20px; } nav button { border:0; border-left:1px solid #bec8be; padding-left:20px; background:none; cursor:pointer; }
    .hero { display:flex; justify-content:space-between; align-items:flex-end; gap:25px; padding:55px clamp(20px,7vw,96px) 40px; background:#2f5148; color:#fff9ef; }
    h1 { margin:0; font:700 clamp(42px,7vw,76px)/.95 Georgia,serif; } h2 { margin:0; font:700 32px Georgia,serif; } h3 { margin:6px 0; font:700 27px Georgia,serif; } h4 { margin:4px 0; font:700 20px Georgia,serif; }
    .hero p, .mission-heading p, .lot-heading p, .task-row p { color:#68766e; line-height:1.5; } .hero p { color:#c8d5ce; max-width:580px; }
    .hero-actions button, button, .import { border:0; background:#de6948; color:#fff9ef; padding:11px 13px; font:700 12px 'Courier New',monospace; cursor:pointer; } .import { display:inline-flex; align-items:center; } .import input { display:none; } .light-button { background:#fff9ef; color:#354740; }
    .content { padding:30px clamp(20px,7vw,96px) 70px; } .message { padding:12px; background:#fff0df; color:#8c4c27; }
    .summary-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:30px; } .summary-grid article { padding:20px; border:1px solid #d9ddd4; background:#fffdf8; } .summary-grid strong { display:block; margin:8px 0 3px; font:700 32px Georgia,serif; } .summary-grid span { color:#68766e; font-size:13px; }
    .section-heading { display:flex; justify-content:space-between; align-items:end; margin-bottom:18px; } .available-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:14px; } .available-card { display:grid; gap:14px; padding:20px; border:1px solid #cfd7ce; background:#fffdf8; } .available-card h3 { margin:6px 0; } .available-card p { margin:4px 0; color:#68766e; line-height:1.5; } .available-card span { color:#68766e; font:12px 'Courier New',monospace; } .file-name { overflow:hidden; color:#52645d; font:11px 'Courier New',monospace; text-overflow:ellipsis; white-space:nowrap; } .mission-card { margin-bottom:18px; border:1px solid #cfd7ce; background:#fffdf8; } .mission-heading { display:grid; grid-template-columns:minmax(220px,1fr) 170px auto; gap:22px; align-items:center; padding:22px; background:#edf3ee; } .mission-heading p, .lot-heading p { margin:5px 0; } .mission-heading span, .task-row > span { color:#68766e; font:12px 'Courier New',monospace; }
    .lots { padding:14px; } .lot-card { margin:10px 0; border:1px solid #d9ddd4; background:#fff; } .lot-heading { display:grid; grid-template-columns:minmax(180px,1fr) 140px auto; gap:16px; align-items:center; padding:16px; border-bottom:1px solid #e5e7df; } .lot-progress { min-width:110px; } .lot-progress strong, .task-progress b { display:block; margin-bottom:4px; font:700 12px 'Courier New',monospace; }
    .task-row { display:grid; grid-template-columns:minmax(180px,1.3fr) 160px 130px auto; gap:14px; align-items:center; padding:13px 16px; border-bottom:1px solid #edf0eb; } .task-row:last-child { border-bottom:0; } .task-row p { margin:3px 0 0; font-size:13px; } .task-progress { min-width:110px; }
    .progress-track { height:7px; overflow:hidden; background:#dfe7df; } .progress-track i { display:block; height:100%; background:#de6948; } .empty { padding:18px; color:#68766e; } .empty-page { border:1px dashed #bec8be; text-align:center; }
    .print-summary { display:none; } .print-description { color:#52645d; line-height:1.5; } .print-progress { display:grid; grid-template-columns:auto 1fr; gap:4px 12px; align-items:center; margin:20px 0; } .print-progress strong { color:#de6948; font:700 30px Georgia,serif; } .print-progress span { font:700 11px 'Courier New',monospace; text-transform:uppercase; } .print-progress .progress-track { grid-column:1 / -1; } .print-stats { display:grid; grid-template-columns:repeat(4,1fr); border:1px solid #bec8be; } .print-stats div { padding:15px; text-align:center; border-right:1px solid #bec8be; } .print-stats div:last-child { border-right:0; } .print-stats strong { display:block; font:700 27px Georgia,serif; } .print-stats span { font:11px 'Courier New',monospace; text-transform:uppercase; } .late-stat strong, .late-stat span { color:#c62828; } .print-timeline { position:relative; margin:24px 0 0 12px; padding:12px 0 0 28px; border-left:2px solid #2f5148; } .print-timeline-entry { position:relative; padding:0 0 18px; break-inside:avoid; } .print-timeline-dot { position:absolute; top:5px; left:-36px; width:13px; height:13px; border:3px solid #fff; border-radius:50%; background:#de6948; } .print-timeline-content { border-bottom:1px solid #d9ddd4; padding-bottom:12px; } .print-timeline-meta { display:flex; justify-content:space-between; gap:15px; color:#68766e; font:10px 'Courier New',monospace; } .print-timeline-meta strong { color:#2f5148; } .print-timeline-content h4 { margin:5px 0 2px; font:700 18px Georgia,serif; } .print-timeline-content p, .print-timeline-content small { display:block; margin:3px 0; color:#52645d; } .print-timeline-progress { display:flex; align-items:center; gap:10px; max-width:260px; margin-top:6px; } .print-timeline-progress > span { min-width:35px; font:700 10px 'Courier New',monospace; } .print-timeline-progress .progress-track { flex:1; } .late-entry .print-timeline-dot { background:#c62828; } .late-entry .print-timeline-content { border-color:#e3a4a4; }
    .row-actions { flex-wrap:wrap; justify-content:flex-end; } .row-actions button { padding:8px 10px; } .row-actions .danger { background:#fff; border:1px solid #efb4a6; color:#a43d28; }
    .modal-backdrop { position:fixed; inset:0; z-index:10; display:grid; place-items:center; padding:20px; background:rgba(23,34,31,.45); } .modal { width:min(640px,94vw); max-height:calc(100vh - 40px); overflow:auto; padding:24px; background:#fffdf8; box-shadow:0 20px 50px rgba(23,34,31,.25); } .modal-context { color:#68766e; } .fields { display:grid; grid-template-columns:repeat(2,1fr); gap:14px; margin-top:20px; } label { display:grid; gap:6px; color:#52645d; font-size:12px; font-weight:700; } .wide { grid-column:1 / -1; } input, textarea { width:100%; box-sizing:border-box; border:1px solid #c8d0c8; padding:11px; background:#fff; color:#17221f; font:14px Arial,sans-serif; } textarea { min-height:90px; resize:vertical; } .actions { justify-content:flex-end; margin-top:20px; } .ghost { background:#fff; border:1px solid #bec8be; color:#354740; }
    @keyframes lateBlink { 50% { opacity:.25; } } .late-label, .late-entry .timeline-marker { animation:lateBlink 1s step-end infinite; }
    @keyframes lateBlink { 50% { opacity:.25; } } .late-label, .late-entry .print-timeline-dot { animation:lateBlink 1s step-end infinite; }
    @media print { .topbar, .hero-actions, .row-actions, .modal-backdrop, .summary-grid, .available-section, .report-section, .message { display:none !important; } .hero { padding:0 0 20px; background:#fff !important; color:#000 !important; } .hero p { color:#333; } .content { padding:0; } .print-summary { display:block; } .print-summary h2 { margin:4px 0; font-size:34px; } .print-stats, .print-timeline-entry { break-inside:avoid; } .late-label, .late-entry .print-timeline-dot { animation:none; } }
    @media (max-width:900px) { .mission-heading, .lot-heading, .task-row { grid-template-columns:1fr; } .row-actions { justify-content:flex-start; } }
    @media (max-width:640px) { nav { flex-wrap:wrap; justify-content:flex-end; gap:10px; } .hero { display:block; } .hero-actions { margin-top:20px; flex-wrap:wrap; } .summary-grid { grid-template-columns:1fr; } .fields { grid-template-columns:1fr; } .wide { grid-column:auto; } }
  `]
})
export class MissionsComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly xlsxData = inject(XlsxDataService);

  missions: MissionAppel[] = [];
  modal: 'mission' | 'lot' | 'task' | '' = '';
  selectedMission?: MissionAppel;
  selectedLot?: MissionLot;
  editingMission?: MissionAppel;
  editingLot?: MissionLot;
  editingTask?: MissionTache;
  message = '';
  missionDraft: Omit<MissionAppel, 'id' | 'lots'> = this.emptyMission();
  lotDraft: Omit<MissionLot, 'id' | 'taches'> = this.emptyLot();
  taskDraft: Omit<MissionTache, 'id'> = this.emptyTask();

  async ngOnInit(): Promise<void> {
    await this.loadMissionFiles();
  }

  get totalLots(): number { return this.missions.reduce((total, mission) => total + mission.lots.length, 0); }
  get averageProgress(): number { return this.missions.length ? this.missions.reduce((total, mission) => total + this.missionProgress(mission), 0) / this.missions.length : 0; }

  missionProgress(mission: MissionAppel): number {
    const tasks = mission.lots.flatMap((lot) => lot.taches);
    return tasks.length ? this.round(tasks.reduce((total, task) => total + this.clamp(task.avancement), 0) / tasks.length) : 0;
  }

  lotProgress(lot: MissionLot): number {
    return lot.taches.length ? this.round(lot.taches.reduce((total, task) => total + this.clamp(task.avancement), 0) / lot.taches.length) : 0;
  }

  lotEndDate(lot: MissionLot): string {
    return lot.taches.map((task) => task.dateFin).filter(Boolean).sort().at(-1) ?? '';
  }

  missionTaskCount(mission: MissionAppel): number {
    return mission.lots.reduce((total, lot) => total + lot.taches.length, 0);
  }

  missionTimeline(mission: MissionAppel): MissionTimelineEntry[] {
    const entries: MissionTimelineEntry[] = [];
    for (const lot of mission.lots) {
      const dates = lot.taches.flatMap((task) => [task.dateDebut, task.dateFin]).filter(Boolean).sort();
      entries.push({
        id: `lot-${lot.id}`,
        kind: 'lot',
        nom: lot.nom,
        dateDebut: dates[0] ?? '',
        dateFin: dates.at(-1) ?? '',
        description: lot.description,
        avancement: this.lotProgress(lot)
      });
      for (const task of lot.taches) {
        entries.push({
          id: `task-${task.id}`,
          kind: 'tache',
          nom: task.nom,
          dateDebut: task.dateDebut,
          dateFin: task.dateFin,
          description: task.description,
          avancement: this.clamp(task.avancement),
          lotNom: lot.nom
        });
      }
    }
    return entries.sort((first, second) => {
      const firstDate = first.dateDebut || first.dateFin || '9999-12-31';
      const secondDate = second.dateDebut || second.dateFin || '9999-12-31';
      return firstDate.localeCompare(secondDate) || (first.kind === 'lot' ? -1 : 1);
    });
  }

  lateLotCount(mission: MissionAppel): number {
    return mission.lots.filter((lot) => this.isLate(this.lotEndDate(lot), this.lotProgress(lot))).length;
  }

  lateTaskCount(mission: MissionAppel): number {
    return mission.lots.reduce((total, lot) => total + lot.taches.filter((task) => this.isLate(task.dateFin, task.avancement)).length, 0);
  }

  isLate(dateFin: string, avancement: number): boolean {
    if (!dateFin || this.clamp(avancement) >= 100) return false;
    const end = new Date(`${dateFin}T23:59:59`);
    return !Number.isNaN(end.getTime()) && end.getTime() < Date.now();
  }

  formatPercent(value: number): string { return `${this.round(value)}%`; }
  openMission(mission: MissionAppel): void { this.selectedMission = mission; }
  closeMission(): void { this.selectedMission = undefined; }
  printMission(mission: MissionAppel): void {
    const previousMission = this.selectedMission;
    this.selectedMission = mission;
    setTimeout(() => {
      window.onafterprint = () => {
        this.selectedMission = previousMission;
        window.onafterprint = null;
      };
      window.print();
    });
  }

  openMissionModal(mission?: MissionAppel): void {
    this.editingMission = mission;
    this.missionDraft = mission ? { nom: mission.nom, dateDebut: mission.dateDebut, dateFin: mission.dateFin, description: mission.description } : this.emptyMission();
    this.modal = 'mission';
  }

  saveMission(): void {
    const draft = { ...this.missionDraft, nom: this.missionDraft.nom.trim() };
    if (!draft.nom) return;
    if (this.editingMission) Object.assign(this.editingMission, draft);
    else this.missions = [{ ...draft, id: this.makeId(), lots: [] }, ...this.missions];
    void this.persist(); this.closeModal(); this.message = 'Mission enregistrée dans les fichiers XLSX.';
  }

  deleteMission(mission: MissionAppel): void {
    if (!window.confirm(`Supprimer la mission « ${mission.nom} » et tout son contenu ?`)) return;
    this.missions = this.missions.filter((item) => item.id !== mission.id);
    if (this.selectedMission?.id === mission.id) this.closeMission();
    void this.persist();
  }

  openLotModal(mission: MissionAppel, lot?: MissionLot): void {
    this.selectedMission = mission; this.editingLot = lot;
    this.lotDraft = lot ? { nom: lot.nom, description: lot.description } : this.emptyLot(); this.modal = 'lot';
  }

  saveLot(): void {
    if (!this.selectedMission || !this.lotDraft.nom.trim()) return;
    const draft = { ...this.lotDraft, nom: this.lotDraft.nom.trim() };
    if (this.editingLot) Object.assign(this.editingLot, draft);
    else this.selectedMission.lots.push({ ...draft, id: this.makeId(), taches: [] });
    void this.persist(); this.closeModal(); this.message = 'Lot enregistré dans le fichier XLSX.';
  }

  deleteLot(mission: MissionAppel, lot: MissionLot): void {
    if (!window.confirm(`Supprimer le lot « ${lot.nom} » et ses tâches ?`)) return;
    mission.lots = mission.lots.filter((item) => item.id !== lot.id); void this.persist();
  }

  openTaskModal(mission: MissionAppel, lot: MissionLot, task?: MissionTache): void {
    this.selectedMission = mission; this.selectedLot = lot; this.editingTask = task;
    this.taskDraft = task ? { nom: task.nom, dateDebut: task.dateDebut, dateFin: task.dateFin, description: task.description, avancement: task.avancement } : this.emptyTask(); this.modal = 'task';
  }

  saveTask(): void {
    if (!this.selectedLot || !this.taskDraft.nom.trim()) return;
    const draft = { ...this.taskDraft, nom: this.taskDraft.nom.trim(), avancement: this.clamp(Number(this.taskDraft.avancement)) };
    if (this.editingTask) Object.assign(this.editingTask, draft);
    else this.selectedLot.taches.push({ ...draft, id: this.makeId() });
    void this.persist(); this.closeModal(); this.message = 'Tâche enregistrée dans le fichier XLSX.';
  }

  deleteTask(mission: MissionAppel, lot: MissionLot, task: MissionTache): void {
    lot.taches = lot.taches.filter((item) => item.id !== task.id); void this.persist();
  }

  async saveXlsx(): Promise<void> {
    await this.persist();
    if (!this.message.startsWith('Impossible')) this.message = 'Chaque mission a été sauvegardée dans src/assets/mission avec son propre nom de fichier XLSX.';
  }

  async importMissionFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const workbook = await this.xlsxData.importMissionWorkbookFromFile(file);
      this.missions = this.rowsToMissions(workbook.missionRows, workbook.taskRows);
      await this.persist();
      this.message = `${this.missions.length} mission(s) importée(s) depuis ${file.name}.`;
    } catch {
      this.message = 'Impossible de lire le fichier mission XLSX.';
    } finally {
      input.value = '';
    }
  }

  closeModal(): void { this.modal = ''; this.selectedMission = undefined; this.selectedLot = undefined; this.editingMission = undefined; this.editingLot = undefined; this.editingTask = undefined; }
  logout(): void { this.auth.logout(); location.href = '/login'; }

  private emptyMission(): Omit<MissionAppel, 'id' | 'lots'> { return { nom: '', dateDebut: '', dateFin: '', description: '' }; }
  private emptyLot(): Omit<MissionLot, 'id' | 'taches'> { return { nom: '', description: '' }; }
  private emptyTask(): Omit<MissionTache, 'id'> { return { nom: '', dateDebut: '', dateFin: '', description: '', avancement: 0 }; }
  private clamp(value: number): number { return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0)); }
  private round(value: number): number { return Math.round(value * 100) / 100; }
  private makeId(): string { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }
  private async loadMissionFiles(): Promise<void> {
    try {
      const files = await this.xlsxData.listMissionFiles();
      const loaded = await Promise.all(files.map((file) => this.xlsxData.importMissionWorkbook(file)));
      this.missions = loaded.flatMap((workbook) => this.rowsToMissions(workbook.missionRows, workbook.taskRows));
      this.message = files.length ? `${this.missions.length} mission(s) chargée(s) depuis ${files.length} fichier(s) XLSX.` : 'Aucun fichier mission dans src/assets/mission.';
    } catch {
      this.missions = [];
      this.message = 'Impossible de lire les fichiers XLSX des missions.';
    }
  }

  private async persist(): Promise<void> {
    try {
      const existingFiles = await this.xlsxData.listMissionFiles();
      await Promise.all(existingFiles.map((file) => this.xlsxData.deleteMissionFile(file).catch(() => undefined)));
      await Promise.all(this.missions.map((mission) => {
        const missionRows = [{ id: mission.id, nom: mission.nom, dateDebut: mission.dateDebut, dateFin: mission.dateFin, description: mission.description }];
        const taskRows = mission.lots.flatMap((lot) => lot.taches.map((task) => ({ missionId: mission.id, lotId: lot.id, lotNom: lot.nom, lotDescription: lot.description, tacheId: task.id, tacheNom: task.nom, dateDebut: task.dateDebut, dateFin: task.dateFin, description: task.description, avancement: task.avancement })));
        return this.xlsxData.saveMissionWorkbook(this.missionFileName(mission.nom, mission.id), missionRows, taskRows);
      }));
    } catch {
      this.message = 'Impossible de sauvegarder les missions dans src/assets/mission.';
    }
  }

  missionFileName(name: string, id: string): string {
    const safeName = name.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    return `${safeName || `mission_${id}`}.xlsx`;
  }

  private rowsToMissions(missionRows: Record<string, unknown>[], taskRows: Record<string, unknown>[]): MissionAppel[] {
    return missionRows.map((row) => {
      const missionId = String(row['id'] ?? this.makeId());
      const rows = taskRows.filter((task) => String(task['missionId'] ?? '') === missionId);
      const lotMap = new Map<string, MissionLot>();
      for (const task of rows) {
        const lotId = String(task['lotId'] ?? this.makeId());
        const lot = lotMap.get(lotId) ?? { id: lotId, nom: String(task['lotNom'] ?? ''), description: String(task['lotDescription'] ?? ''), taches: [] };
        lot.taches.push({ id: String(task['tacheId'] ?? this.makeId()), nom: String(task['tacheNom'] ?? ''), dateDebut: String(task['dateDebut'] ?? ''), dateFin: String(task['dateFin'] ?? ''), description: String(task['description'] ?? ''), avancement: this.clamp(Number(task['avancement'] ?? 0)) });
        lotMap.set(lotId, lot);
      }
      return { id: missionId, nom: String(row['nom'] ?? ''), dateDebut: String(row['dateDebut'] ?? ''), dateFin: String(row['dateFin'] ?? ''), description: String(row['description'] ?? ''), lots: [...lotMap.values()] };
    });
  }
}
