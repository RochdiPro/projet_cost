import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { XlsxDataService } from '../../core/services/xlsx-data.service';
import { MissionAppel, MissionLot, MissionTache } from '../../core/models/project-cost.models';

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
          <button type="button" class="light-button" (click)="printReport()">Rapport PDF</button>
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
                  <div class="row-actions"><button type="button" (click)="openMission(mission)">Ouvrir</button><button type="button" (click)="openMissionModal(mission)">Modifier</button><button type="button" class="danger" (click)="deleteMission(mission)">Supprimer</button></div>
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
                  <button type="button" (click)="openMissionModal(mission)">Modifier</button>
                  <button type="button" class="danger" (click)="deleteMission(mission)">Supprimer</button>
                </div>
              </div>

              <div class="lots">
                @for (lot of mission.lots; track lot.id) {
                  <article class="lot-card">
                    <div class="lot-heading">
                      <div><small>Lot</small><h4>{{ lot.nom }}</h4><p>{{ lot.description || 'Aucune description' }}</p></div>
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
                          <div><strong>{{ task.nom }}</strong><p>{{ task.description || 'Aucune description' }}</p></div>
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
    .row-actions { flex-wrap:wrap; justify-content:flex-end; } .row-actions button { padding:8px 10px; } .row-actions .danger { background:#fff; border:1px solid #efb4a6; color:#a43d28; }
    .modal-backdrop { position:fixed; inset:0; z-index:10; display:grid; place-items:center; padding:20px; background:rgba(23,34,31,.45); } .modal { width:min(640px,94vw); max-height:calc(100vh - 40px); overflow:auto; padding:24px; background:#fffdf8; box-shadow:0 20px 50px rgba(23,34,31,.25); } .modal-context { color:#68766e; } .fields { display:grid; grid-template-columns:repeat(2,1fr); gap:14px; margin-top:20px; } label { display:grid; gap:6px; color:#52645d; font-size:12px; font-weight:700; } .wide { grid-column:1 / -1; } input, textarea { width:100%; box-sizing:border-box; border:1px solid #c8d0c8; padding:11px; background:#fff; color:#17221f; font:14px Arial,sans-serif; } textarea { min-height:90px; resize:vertical; } .actions { justify-content:flex-end; margin-top:20px; } .ghost { background:#fff; border:1px solid #bec8be; color:#354740; }
    @media print { .topbar, .hero-actions, .row-actions, .modal-backdrop { display:none !important; } .hero { padding:0 0 20px; background:#fff !important; color:#000 !important; } .hero p { color:#333; } .content { padding:0; } .summary-grid { grid-template-columns:repeat(3,1fr); } .mission-card, .lot-card { break-inside:avoid; } .task-row { grid-template-columns:1.3fr 1fr 1fr 1fr; } }
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

  formatPercent(value: number): string { return `${this.round(value)}%`; }

  openMission(mission: MissionAppel): void { this.selectedMission = mission; }
  closeMission(): void { this.selectedMission = undefined; }

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
  printReport(): void { window.print(); }
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
