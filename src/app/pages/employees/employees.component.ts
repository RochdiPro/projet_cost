import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { AuthService } from '../../core/services/auth.service';
import { XlsxDataService } from '../../core/services/xlsx-data.service';

Chart.register(...registerables);

interface EmployeeTask {
  id: string;
  nom: string;
  poste: string;
  projet: string;
  tache: string;
  dureeHeures: number;
  date: string;
  mois: number;
  annee: number;
  source: string;
}

interface ReportLine {
  label: string;
  heures: number;
  taches: number;
}

type SheetRow = Record<string, unknown>;

@Component({
  selector: 'app-employees',
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
          <button type="button" (click)="logout()">Quitter</button>
        </nav>
      </header>

      <section class="head">
        <div>
          <small>Temps de travail</small>
          <h1>Employés<span>.</span></h1>
          <p>Analysez les tâches et les heures de travail par mois.</p>
        </div>
        <div class="head-actions">
          <button type="button" (click)="openAddEmployee()">Ajouter un employé</button>
          <button type="button" (click)="openAddTask()">Ajouter une tâche</button>
          <button type="button" (click)="openProjectsModal()">Gérer les projets</button>
          <button type="button" (click)="saveAllEmployees()">Sauvegarder les fiches</button>
          <button type="button" class="report-button" (click)="goToReport()">Rapport</button>
          <button type="button" class="report-button" (click)="printTeamReport()">Imprimer équipe</button>
          <button type="button" (click)="loadEmployees()">Actualiser</button>
        </div>
      </section>

      <section class="content">
        @if (message) { <p class="message">{{ message }}</p> }
        @if (printTitle) { <h2 class="print-title">{{ printTitle }}</h2> }
        <div class="filters">
          <label>Employé
            <select [(ngModel)]="selectedEmployee" (ngModelChange)="refreshCharts()">
              <option value="">Toute l'équipe</option>
              @for (employee of employeeNames; track employee) { <option [value]="employee">{{ employee }}</option> }
            </select>
          </label>
          <label>Année
            <select [(ngModel)]="selectedYear" (ngModelChange)="refreshCharts()">
              @for (year of years; track year) { <option [value]="year">{{ year }}</option> }
            </select>
          </label>
          <label>Mois
            <select [(ngModel)]="selectedMonth" (ngModelChange)="refreshCharts()">
              <option [ngValue]="0">Toute l'année</option>
              @for (month of monthOptions; track month.value) { <option [ngValue]="month.value">{{ month.label }}</option> }
            </select>
          </label>
          <label>Projet
            <select [(ngModel)]="selectedProject" (ngModelChange)="refreshCharts()">
              <option value="">Tous les projets</option>
              @for (project of projects; track project) { <option [value]="project">{{ project }}</option> }
            </select>
          </label>
        </div>

        <div class="stats">
          <article><small>Heures totales</small><strong>{{ formatHours(totalHours) }}</strong><span>{{ periodLabel }}</span></article>
          <article><small>Tâches</small><strong>{{ filteredTasks.length }}</strong><span>lignes Excel analysées</span></article>
          <article><small>Employés actifs</small><strong>{{ activeEmployees }}</strong><span>sur la période</span></article>
        </div>

        <div class="charts">
          <article class="chart-card">
            <div class="card-heading"><div><small>Rapport individuel / équipe</small><h2>Répartition des tâches</h2></div></div>
            <div class="chart-frame"><canvas #taskChart></canvas></div>
          </article>
          <article class="chart-card">
            <div class="card-heading"><div><small>Rapport mensuel équipe</small><h2>Heures par employé</h2></div></div>
            <div class="chart-frame"><canvas #employeeChart></canvas></div>
          </article>
        </div>

        <section class="report-section" id="team-report">
          <div class="section-heading"><div><small>Fiches Excel</small><h2>Détail des tâches</h2></div><strong>{{ filteredTasks.length }} ligne(s)</strong></div>
          <div class="table-box">
            <table>
              <thead><tr><th>Employé</th><th>Poste</th><th>Projet</th><th>Tâche</th><th>Date</th><th>Durée</th><th>Fichier</th><th>Actions</th></tr></thead>
              <tbody>
                @for (task of filteredTasks; track task.id) {
                  <tr><td><strong>{{ task.nom }}</strong></td><td>{{ task.poste || '-' }}</td><td>{{ task.projet }}</td><td>{{ task.tache || '-' }}</td><td>{{ task.date }}</td><td>{{ formatHours(task.dureeHeures) }}</td><td>{{ task.source }}</td><td class="row-actions"><button type="button" (click)="openEditTask(task)">Modifier</button><button type="button" class="danger" (click)="deleteTask(task)">Supprimer</button></td></tr>
                } @empty { <tr><td colspan="8" class="empty">Aucune tâche pour cette période.</td></tr> }
              </tbody>
            </table>
          </div>
        </section>

        <section class="report-section">
          <div class="section-heading"><div><small>Détail de la période</small><h2>Rapport équipe</h2></div><div class="report-actions"><strong>{{ periodLabel }}</strong><button type="button" (click)="printTeamReport()">Imprimer équipe</button></div></div>
          <div class="table-box">
            <table>
              <thead><tr><th>Employé</th><th>Poste</th><th>Nombre de tâches</th><th>Durée totale</th><th>Actions</th></tr></thead>
              <tbody>
                @for (line of employeeReport; track line.label) {
                  <tr><td><strong>{{ line.label }}</strong></td><td>{{ employeePost(line.label) }}</td><td>{{ line.taches }}</td><td>{{ formatHours(line.heures) }}</td><td class="row-actions"><button type="button" (click)="printEmployeeReport(line.label)">Imprimer</button><button type="button" (click)="openEditEmployee(line.label)">Modifier</button><button type="button" class="danger" (click)="deleteEmployee(line.label)">Supprimer</button></td></tr>
                } @empty { <tr><td colspan="5" class="empty">Aucune donnée pour cette période.</td></tr> }
              </tbody>
            </table>
          </div>
        </section>

        <section class="report-section">
          <div class="section-heading"><div><small>Historique annuel</small><h2>Rapport par mois</h2></div><strong>{{ selectedYear }}</strong></div>
          <div class="table-box">
            <table>
              <thead><tr><th>Mois</th><th>Employés</th><th>Tâches</th><th>Durée totale</th></tr></thead>
              <tbody>
                @for (line of monthlyReport; track line.label) {
                  <tr><td><strong>{{ line.label }}</strong></td><td>{{ line.employes }}</td><td>{{ line.taches }}</td><td>{{ formatHours(line.heures) }}</td></tr>
                } @empty { <tr><td colspan="4" class="empty">Aucun rapport mensuel.</td></tr> }
              </tbody>
            </table>
          </div>
        </section>

        <p class="source">Source : fichiers Excel de <b>src/assets/employees</b>. Colonnes reconnues : nom, poste, tache, dureeHeures et date.</p>
      </section>

      @if (isModalOpen) {
        <div class="modal-backdrop">
          <form class="modal" (ngSubmit)="saveEmployee()">
            <h2>{{ isAddingEmployee ? 'Ajouter un employé' : isEditingEmployee ? 'Modifier un employé' : editingTaskId ? 'Modifier une tâche' : 'Ajouter une tâche' }}</h2>
            <div class="modal-fields">
              @if (isAddingEmployee || isEditingEmployee) {
                <label>Nom<input name="nom" [(ngModel)]="draft.nom" required /></label>
              } @else {
                <label>Employé
                  <select name="nom" [(ngModel)]="draft.nom" (ngModelChange)="setPosteForEmployee($event)" required>
                    <option value="">Sélectionner</option>
                    @for (employee of employeeNames; track employee) { <option [value]="employee">{{ employee }}</option> }
                  </select>
                </label>
              }
              <label>Poste<input name="poste" [(ngModel)]="draft.poste" [readonly]="!isAddingEmployee && !isEditingEmployee" required /></label>
              @if (!isAddingEmployee && !isEditingEmployee) {
                <label class="wide">Projet
                  <select name="projet" [(ngModel)]="draft.projet" required>
                    <option value="">Sélectionner un projet</option>
                    @for (project of projects; track project) { <option [value]="project">{{ project }}</option> }
                  </select>
                </label>
                <label class="wide">Tâche<input name="tache" [(ngModel)]="draft.tache" required /></label>
                <label>Durée en heures<input name="dureeHeures" type="number" min="0" step="0.25" [(ngModel)]="draft.dureeHeures" required /></label>
                <label>Date<input name="date" type="date" [(ngModel)]="draft.date" required /></label>
              }
            </div>
            <div class="modal-actions">
              <button type="button" class="cancel" (click)="closeModal()">Annuler</button>
              <button type="submit">Enregistrer</button>
            </div>
          </form>
        </div>
      }

      @if (isProjectsModalOpen) {
        <div class="modal-backdrop">
          <section class="modal project-modal">
            <h2>Projets</h2>
            <form class="project-form" (ngSubmit)="saveProject()">
              <input name="projectName" [(ngModel)]="projectDraft" placeholder="Nom du projet" required />
              <button type="submit">{{ editingProjectName ? 'Modifier' : 'Ajouter' }}</button>
              @if (editingProjectName) { <button type="button" class="cancel" (click)="cancelProjectEdit()">Annuler</button> }
            </form>
            <div class="project-list">
              @for (project of projects; track project) {
                <div><strong>{{ project }}</strong><span><button type="button" (click)="editProject(project)">Modifier</button><button type="button" class="danger" (click)="deleteProject(project)">Supprimer</button></span></div>
              } @empty { <p class="empty">Aucun projet ajouté.</p> }
            </div>
            <div class="modal-actions"><button type="button" class="cancel" (click)="closeProjectsModal()">Fermer</button></div>
          </section>
        </div>
      }
    </main>
  `,
  styles: [`
    :host { display:block; }
    .page { min-height:100vh; background:#f7f4ed; color:#17221f; }
    .topbar { min-height:72px; display:flex; align-items:center; justify-content:space-between; gap:20px; padding:0 clamp(20px,6vw,90px); border-bottom:1px solid #d9ddd4; background:#fffaf2; }
    .logo, nav a, nav button { color:#354740; font:700 12px 'Courier New',monospace; text-decoration:none; }
    .logo b, .head span, small { color:#7650a5; }
    nav, .head-actions { display:flex; align-items:center; gap:18px; }
    nav button { border:0; border-left:1px solid #bec8be; padding-left:18px; background:none; cursor:pointer; }
    .head { display:flex; align-items:flex-end; justify-content:space-between; gap:20px; padding:48px clamp(20px,7vw,96px) 32px; background:#7650a5; color:#fff9ef; }
    .head p { margin:12px 0 0; color:#e8def2; }
    small { display:block; margin-bottom:10px; font:700 11px 'Courier New',monospace; letter-spacing:1.2px; text-transform:uppercase; }
    h1 { margin:0; font:700 clamp(42px,7vw,76px)/.95 Georgia,serif; }
    button { border:0; background:#e7b86a; color:#17221f; padding:12px 14px; font:700 12px 'Courier New',monospace; cursor:pointer; }
    .report-button { background:#fff9ef; color:#7650a5; }
    .report-actions { display:flex; align-items:center; gap:10px; }
    .report-actions button { padding:8px 10px; }
    .content { padding:28px clamp(20px,7vw,96px) 70px; }
    .message, .source { color:#68766e; line-height:1.5; }
    .print-title { display:none; }
    .filters { display:grid; grid-template-columns:repeat(3, minmax(150px, 1fr)); gap:12px; margin-bottom:20px; }
    label { display:grid; gap:6px; color:#52645d; font-size:12px; font-weight:700; }
    select { width:100%; box-sizing:border-box; border:1px solid #c8d0c8; background:#fff; color:#17221f; padding:11px 12px; font:14px Arial,sans-serif; }
    .stats { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-bottom:22px; }
    .stats article, .chart-card { border:1px solid #d9ddd4; background:#fffdf8; padding:20px; }
    .stats strong { display:block; margin:8px 0 4px; font:700 34px Georgia,serif; }
    .stats span { color:#68766e; font-size:12px; }
    .charts { display:grid; grid-template-columns:repeat(2,1fr); gap:14px; }
    .card-heading, .section-heading { display:flex; align-items:flex-end; justify-content:space-between; gap:15px; }
    h2 { margin:0; font:700 26px Georgia,serif; }
    .chart-frame { position:relative; height:300px; margin-top:12px; }
    .report-section { margin-top:28px; }
    .report-section > .section-heading { margin-bottom:14px; }
    .report-section > .section-heading > strong { color:#7650a5; font:700 12px 'Courier New',monospace; }
    .table-box { overflow:auto; border:1px solid #d9ddd4; background:#fffdf8; }
    table { width:100%; border-collapse:collapse; }
    th, td { padding:13px 12px; border-bottom:1px solid #e5e7df; text-align:left; }
    th { color:#52645d; background:#eef1eb; font:700 11px 'Courier New',monospace; text-transform:uppercase; }
    td { color:#33453f; }
    .row-actions { display:flex; gap:8px; white-space:nowrap; }
    .row-actions button { padding:8px 10px; }
    .row-actions .danger { background:#fff; border:1px solid #efb4a6; color:#a43d28; }
    .empty { text-align:center; color:#68766e; }
    .source { margin-top:22px; font-size:12px; }
    .modal-backdrop { position:fixed; inset:0; z-index:2; display:grid; place-items:center; padding:24px; background:rgba(23,34,31,.42); }
    .modal { width:min(560px,94vw); border:1px solid #d9ddd4; background:#fffdf8; padding:24px; box-shadow:0 18px 48px rgba(23,34,31,.24); }
    .modal h2 { margin:0 0 20px; }
    .modal-fields { display:grid; grid-template-columns:repeat(2,1fr); gap:12px; }
    .wide { grid-column:1 / -1; }
    input { width:100%; box-sizing:border-box; border:1px solid #c8d0c8; background:#fff; color:#17221f; padding:11px 12px; font:14px Arial,sans-serif; }
    .modal-actions { display:flex; justify-content:flex-end; gap:10px; margin-top:20px; }
    .cancel { border:1px solid #bec8be; background:#fff; }
    .project-form { display:flex; gap:8px; margin:18px 0; }
    .project-form input { flex:1; }
    .project-list { border-top:1px solid #e5e7df; }
    .project-list > div { display:flex; justify-content:space-between; align-items:center; gap:12px; padding:12px 0; border-bottom:1px solid #e5e7df; }
    .project-list span { display:flex; gap:8px; }
    .project-list button { padding:8px 10px; }
    .project-list .danger { background:#fff; border:1px solid #efb4a6; color:#a43d28; }
    @media print { .topbar, .head-actions, .filters, .row-actions, .report-actions button, .modal-backdrop { display:none !important; } .head { padding:0 0 20px; background:#fff !important; color:#000 !important; } .head h1, .head p { color:#000 !important; } .content { padding:0; } .charts { grid-template-columns:repeat(2,1fr); } .chart-card { break-inside:avoid; } .table-box { overflow:visible; border:0; } .report-section { break-inside:avoid; } .print-title { display:block; margin:0 0 20px; } }
    @media (max-width:800px) { nav { flex-wrap:wrap; justify-content:flex-end; gap:10px; } .head { display:block; } .head-actions { margin-top:22px; } .filters, .stats, .charts { grid-template-columns:1fr; } .modal-fields { grid-template-columns:1fr; } .wide { grid-column:auto; } }
  `]
})
export class EmployeesComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('taskChart') private taskCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('employeeChart') private employeeCanvas?: ElementRef<HTMLCanvasElement>;

  private readonly auth = inject(AuthService);
  private readonly xlsxData = inject(XlsxDataService);
  private taskChart?: Chart;
  private employeeChart?: Chart;
  tasks: EmployeeTask[] = [];
  employeeNames: string[] = [];
  years: number[] = [];
  selectedEmployee = '';
  selectedYear = new Date().getFullYear();
  selectedMonth = 0;
  selectedProject = '';
  message = '';
  isModalOpen = false;
  isAddingEmployee = true;
  isEditingEmployee = false;
  editingEmployeeName = '';
  editingTaskId = '';
  employeePosts: Record<string, string> = {};
  printTitle = '';
  private isPrintAll = false;
  projects: string[] = [];
  isProjectsModalOpen = false;
  projectDraft = '';
  editingProjectName = '';
  draft = this.emptyDraft();
  private viewReady = false;

  readonly monthOptions = Array.from({ length: 12 }, (_, index) => ({
    value: index + 1,
    label: new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(new Date(2024, index, 1))
  }));

  ngOnInit(): void { void this.loadEmployees(); }
  ngAfterViewInit(): void { this.viewReady = true; this.refreshCharts(); }
  ngOnDestroy(): void { this.taskChart?.destroy(); this.employeeChart?.destroy(); }

  async loadEmployees(): Promise<void> {
    try {
      const files = await this.xlsxData.listEmployeeFiles();
      const loaded = await Promise.all(files.map(async (file) => {
        const rows = await this.xlsxData.importAsset<SheetRow>(`assets/employees/${encodeURIComponent(file)}`);
        return rows.map((row) => this.taskFromRow(row, file));
      }));
      const allRows = loaded.flat();
      this.employeePosts = {};
      allRows.forEach((task) => { if (task.nom) this.employeePosts[task.nom] = task.poste; });
      this.tasks = allRows.filter((task) => task.nom && (task.tache || task.dureeHeures > 0 || task.date));
      this.projects = [...new Set([...this.loadSavedProjects(), ...allRows.map((task) => task.projet).filter(Boolean)])].sort((a, b) => a.localeCompare(b));
      this.employeeNames = [...new Set(allRows.map((task) => task.nom).filter(Boolean))].sort((a, b) => a.localeCompare(b));
      this.years = [...new Set(this.tasks.map((task) => task.annee))].sort((a, b) => b - a);
      if (this.years.length && !this.years.includes(this.selectedYear)) this.selectedYear = this.years[0];
      this.message = files.length ? `${this.tasks.length} tâche(s) chargée(s) depuis ${files.length} fichier(s).` : 'Aucun fichier Excel employé dans src/assets/employees.';
      this.refreshCharts();
    } catch {
      this.tasks = [];
      this.message = 'Impossible de lire les fichiers Excel des employés.';
    }
  }

  get filteredTasks(): EmployeeTask[] {
    return this.tasks.filter((task) => (!this.selectedEmployee || task.nom === this.selectedEmployee)
      && (this.isPrintAll || task.annee === Number(this.selectedYear))
      && (!this.selectedMonth || task.mois === Number(this.selectedMonth))
      && (!this.selectedProject || task.projet === this.selectedProject));
  }

  get projectNames(): string[] { return [...new Set(this.tasks.map((task) => task.projet).filter(Boolean))].sort((a, b) => a.localeCompare(b)); }

  get totalHours(): number { return this.filteredTasks.reduce((sum, task) => sum + task.dureeHeures, 0); }
  get activeEmployees(): number { return new Set(this.filteredTasks.map((task) => task.nom)).size; }
  get periodLabel(): string { return this.isPrintAll ? 'toutes les dates' : this.selectedMonth ? `${this.monthOptions[this.selectedMonth - 1].label} ${this.selectedYear}` : `année ${this.selectedYear}`; }

  get employeeReport(): ReportLine[] {
    const report = this.reportBy(this.filteredTasks, (task) => task.nom);
    const names = this.selectedEmployee ? [this.selectedEmployee] : this.employeeNames;
    return names.map((name) => report.find((line) => line.label === name) ?? { label: name, heures: 0, taches: 0 });
  }

  get monthlyReport(): Array<ReportLine & { employes: number }> {
    return Array.from({ length: 12 }, (_, index) => {
      const rows = this.tasks.filter((task) => (this.isPrintAll || task.annee === Number(this.selectedYear)) && task.mois === index + 1
        && (!this.selectedEmployee || task.nom === this.selectedEmployee)
        && (!this.selectedProject || task.projet === this.selectedProject));
      return { label: this.monthOptions[index].label, heures: this.hours(rows), taches: rows.length, employes: new Set(rows.map((row) => row.nom)).size };
    }).filter((line) => line.taches > 0);
  }

  employeePost(name: string): string { return this.employeePosts[name] || this.filteredTasks.find((task) => task.nom === name)?.poste || '-'; }
  formatHours(hours: number): string { return `${hours.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} h`; }
  logout(): void { this.auth.logout(); location.href = '/login'; }
  refreshCharts(): void { if (this.viewReady) setTimeout(() => { this.renderTaskChart(); this.renderEmployeeChart(); }); }
  openAddEmployee(): void { this.draft = this.emptyDraft(); this.isAddingEmployee = true; this.isEditingEmployee = false; this.isModalOpen = true; }
  openAddTask(): void {
    const employee = this.employeeNames[0] ?? '';
    this.draft = { ...this.emptyDraft(), nom: employee, poste: this.employeePosts[employee] ?? '', projet: this.projects[0] ?? '' };
    this.isAddingEmployee = false; this.isEditingEmployee = false; this.editingTaskId = ''; this.isModalOpen = true;
  }
  setPosteForEmployee(name: string): void { this.draft.poste = this.employeePosts[name] ?? ''; }
  openProjectsModal(): void { this.projectDraft = ''; this.editingProjectName = ''; this.isProjectsModalOpen = true; }
  closeProjectsModal(): void { this.isProjectsModalOpen = false; this.projectDraft = ''; this.editingProjectName = ''; }
  editProject(project: string): void { this.editingProjectName = project; this.projectDraft = project; }
  cancelProjectEdit(): void { this.editingProjectName = ''; this.projectDraft = ''; }
  saveProject(): void {
    const name = this.projectDraft.trim();
    if (!name) return;
    const duplicate = this.projects.some((project) => project !== this.editingProjectName && this.normalizeKey(project) === this.normalizeKey(name));
    if (duplicate) { this.message = 'Ce projet existe déjà.'; return; }
    if (this.editingProjectName) {
      const oldName = this.editingProjectName;
      this.projects = this.projects.map((project) => project === oldName ? name : project).sort((a, b) => a.localeCompare(b));
      this.tasks = this.tasks.map((task) => task.projet === oldName ? { ...task, projet: name } : task);
      this.selectedProject = this.selectedProject === oldName ? name : this.selectedProject;
      void Promise.all(this.employeeNames.map((employee) => this.saveTasksForEmployee(employee)));
      this.message = `${name} a été modifié.`;
    } else {
      this.projects = [...this.projects, name].sort((a, b) => a.localeCompare(b));
      this.message = `${name} a été ajouté.`;
    }
    this.persistProjects();
    this.cancelProjectEdit();
  }
  deleteProject(project: string): void {
    if (this.tasks.some((task) => task.projet === project)) { this.message = 'Ce projet est utilisé par une tâche.'; return; }
    if (!window.confirm(`Supprimer le projet ${project} ?`)) return;
    this.projects = this.projects.filter((item) => item !== project);
    if (this.selectedProject === project) this.selectedProject = '';
    this.persistProjects();
  }
  openEditTask(task: EmployeeTask): void {
    this.draft = { nom: task.nom, poste: task.poste, projet: task.projet, tache: task.tache, dureeHeures: task.dureeHeures, date: task.date };
    this.isAddingEmployee = false;
    this.isEditingEmployee = false;
    this.editingTaskId = task.id;
    this.isModalOpen = true;
  }
  openEditEmployee(name: string): void {
    this.editingEmployeeName = name;
    this.draft = { ...this.emptyDraft(), nom: name, poste: this.employeePost(name) === '-' ? '' : this.employeePost(name) };
    this.isAddingEmployee = false;
    this.isEditingEmployee = true;
    this.isModalOpen = true;
  }
  closeModal(): void { this.isModalOpen = false; this.isEditingEmployee = false; this.editingEmployeeName = ''; this.editingTaskId = ''; }
  goToReport(): void { document.getElementById('team-report')?.scrollIntoView({ behavior: 'smooth' }); }
  printTeamReport(): void {
    const previousEmployee = this.selectedEmployee;
    const previousMonth = this.selectedMonth;
    const previousProject = this.selectedProject;
    const previousPrintAll = this.isPrintAll;
    this.selectedEmployee = '';
    this.selectedMonth = 0;
    this.selectedProject = '';
    this.isPrintAll = true;
    this.printTitle = `Rapport équipe - ${this.periodLabel}`;
    this.printAfterRestore(previousEmployee, previousMonth, previousProject, previousPrintAll);
  }
  printEmployeeReport(name: string): void {
    const previousEmployee = this.selectedEmployee;
    const previousMonth = this.selectedMonth;
    const previousProject = this.selectedProject;
    const previousPrintAll = this.isPrintAll;
    this.selectedEmployee = name;
    this.selectedMonth = 0;
    this.selectedProject = '';
    this.isPrintAll = true;
    this.printTitle = `Rapport de ${name} - ${this.periodLabel}`;
    this.printAfterRestore(previousEmployee, previousMonth, previousProject, previousPrintAll);
  }
  private printAfterRestore(previousEmployee: string, previousMonth: number, previousProject: string, previousPrintAll: boolean): void {
    setTimeout(() => {
      window.onafterprint = () => {
        this.selectedEmployee = previousEmployee;
        this.selectedMonth = previousMonth;
        this.selectedProject = previousProject;
        this.isPrintAll = previousPrintAll;
        this.printTitle = '';
        this.refreshCharts();
        window.onafterprint = null;
      };
      window.print();
    });
  }

  async saveEmployee(): Promise<void> {
    if (!this.draft.nom.trim()) {
      this.message = 'Sélectionnez ou saisissez un employé.';
      return;
    }

    if (!this.isAddingEmployee && !this.isEditingEmployee && !this.draft.projet.trim()) {
      this.message = 'Le nom du projet est obligatoire pour chaque tâche.';
      return;
    }

    if ((this.isAddingEmployee || this.isEditingEmployee) && this.employeeNames.some((name) => name !== this.editingEmployeeName && this.normalizeKey(name) === this.normalizeKey(this.draft.nom))) {
      this.message = 'Cet employé existe déjà.';
      return;
    }

    if (this.isAddingEmployee) {
      const fileName = `${this.safeFileName(this.draft.nom)}.xlsx`;
      try {
        await this.xlsxData.saveEmployeeSheetToAssets(fileName, [{ nom: this.draft.nom.trim(), poste: this.draft.poste.trim(), projet: '', tache: '', dureeHeures: '', date: '' }]);
        this.employeeNames = [...this.employeeNames, this.draft.nom.trim()].sort((a, b) => a.localeCompare(b));
        this.isModalOpen = false;
        this.message = `${this.draft.nom} a été ajouté. Vous pouvez maintenant ajouter ses tâches.`;
      } catch {
        this.message = 'Impossible d’enregistrer le nouvel employé.';
      }
      return;
    }

    if (this.isEditingEmployee) {
      const oldName = this.editingEmployeeName;
      const newName = this.draft.nom.trim();
      const updatedTasks = this.tasks.map((task) => task.nom === oldName ? { ...task, nom: newName, poste: this.draft.poste.trim() } : task);
      const rows = updatedTasks.filter((task) => task.nom === newName).map((task) => ({ nom: task.nom, poste: task.poste, projet: task.projet, tache: task.tache, dureeHeures: task.dureeHeures, date: task.date }));
      if (!rows.length) rows.push({ nom: newName, poste: this.draft.poste.trim(), projet: '', tache: '', dureeHeures: 0, date: '' });
      const newFileName = `${this.safeFileName(newName)}.xlsx`;
      try {
        await this.xlsxData.saveEmployeeSheetToAssets(newFileName, rows);
        if (oldName !== newName) await this.xlsxData.deleteEmployeeFile(`${this.safeFileName(oldName)}.xlsx`);
        this.tasks = updatedTasks;
        delete this.employeePosts[oldName];
        this.employeePosts[newName] = this.draft.poste.trim();
        this.employeeNames = this.employeeNames.map((name) => name === oldName ? newName : name).sort((a, b) => a.localeCompare(b));
        this.selectedEmployee = newName;
        this.closeModal();
        this.message = `${newName} a été modifié.`;
        this.refreshCharts();
      } catch {
        this.message = 'Impossible de modifier cet employé.';
      }
      return;
    }

    if (this.editingTaskId) {
      const updatedTask = this.taskFromDraft(this.editingTaskId);
      this.tasks = this.tasks.map((item) => item.id === this.editingTaskId ? updatedTask : item);
      await this.saveTasksForEmployee(updatedTask.nom);
      this.closeModal();
      this.message = 'La tâche et son projet ont été modifiés.';
      this.refreshCharts();
      return;
    }

    const task = this.taskFromDraft();
    const employeeTasks = [...this.tasks.filter((item) => item.nom === task.nom), task];
    const rows = employeeTasks.map((item) => ({ nom: item.nom, poste: item.poste, projet: item.projet, tache: item.tache, dureeHeures: item.dureeHeures, date: item.date }));
    const fileName = `${this.safeFileName(task.nom)}.xlsx`;

    try {
      await this.xlsxData.saveEmployeeSheetToAssets(fileName, rows);
      this.tasks = [...this.tasks, task];
      this.employeeNames = [...new Set(this.tasks.map((item) => item.nom))].sort((a, b) => a.localeCompare(b));
      this.years = [...new Set(this.tasks.map((item) => item.annee))].sort((a, b) => b - a);
      this.selectedEmployee = task.nom;
      this.selectedYear = task.annee;
      this.selectedMonth = task.mois;
      this.isModalOpen = false;
      this.message = `${task.nom} enregistré dans employees/${fileName}.`;
      this.refreshCharts();
    } catch {
      this.message = 'Impossible d’enregistrer la fiche employé.';
    }
  }

  async saveAllEmployees(): Promise<void> {
    try {
      await Promise.all(this.employeeNames.map((employee) => this.saveTasksForEmployee(employee)));
      this.message = `${this.employeeNames.length} fiche(s) employé sauvegardée(s) dans src/assets/employees.`;
    } catch {
      this.message = 'Impossible de sauvegarder toutes les fiches employés.';
    }
  }

  async deleteTask(task: EmployeeTask): Promise<void> {
    if (!window.confirm('Supprimer cette tâche ?')) return;
    this.tasks = this.tasks.filter((item) => item.id !== task.id);
    try {
      await this.saveTasksForEmployee(task.nom);
      this.message = 'La tâche a été supprimée.';
      this.refreshCharts();
    } catch {
      this.message = 'Impossible de supprimer la tâche.';
    }
  }

  async deleteEmployee(name: string): Promise<void> {
    if (!window.confirm(`Supprimer ${name} et son fichier Excel ?`)) return;
    try {
      await this.xlsxData.deleteEmployeeFile(`${this.safeFileName(name)}.xlsx`);
      this.tasks = this.tasks.filter((task) => task.nom !== name);
      this.employeeNames = this.employeeNames.filter((employee) => employee !== name);
      delete this.employeePosts[name];
      if (this.selectedEmployee === name) this.selectedEmployee = '';
      this.message = `${name} a été supprimé.`;
      this.refreshCharts();
    } catch {
      this.message = 'Impossible de supprimer cet employé.';
    }
  }

  private taskFromRow(row: SheetRow, source: string): EmployeeTask {
    const dateValue = this.cell(row, ['date', 'jour', 'datetache', 'moisannee']);
    const month = this.toNumber(this.cell(row, ['mois', 'month'])) ?? 0;
    const year = this.toNumber(this.cell(row, ['annee', 'year'])) ?? 0;
    const parsedDate = this.parseDate(dateValue) ?? (month >= 1 && month <= 12 && year > 0 ? new Date(year, month - 1, 1) : undefined);
    return {
      id: crypto.randomUUID(),
      nom: this.cell(row, ['nom', 'employe', 'employee', 'collaborateur']) || this.fileEmployeeName(source),
      poste: this.cell(row, ['poste', 'fonction', 'role', 'job']),
      projet: this.cell(row, ['projet', 'project', 'projetaffecte', 'projectname']),
      tache: this.cell(row, ['tache', 'tâche', 'task', 'activite', 'activite']),
      dureeHeures: this.toNumber(this.cell(row, ['dureeheures', 'duree', 'heures', 'hours', 'temps'])) ?? 0,
      date: parsedDate?.toISOString().slice(0, 10) ?? '', mois: parsedDate ? parsedDate.getMonth() + 1 : 0, annee: parsedDate?.getFullYear() ?? 0, source
    };
  }

  private taskFromDraft(id: string = crypto.randomUUID()): EmployeeTask {
    const date = this.parseDate(this.draft.date) ?? new Date();
    return {
      id, nom: this.draft.nom.trim(), poste: this.draft.poste.trim(), projet: this.draft.projet.trim(), tache: this.draft.tache.trim(),
      dureeHeures: Number(this.draft.dureeHeures) || 0, date: date.toISOString().slice(0, 10),
      mois: date.getMonth() + 1, annee: date.getFullYear(), source: `${this.safeFileName(this.draft.nom)}.xlsx`
    };
  }

  private emptyDraft(): { nom: string; poste: string; projet: string; tache: string; dureeHeures: number; date: string } {
    return { nom: '', poste: '', projet: '', tache: '', dureeHeures: 0, date: new Date().toISOString().slice(0, 10) };
  }

  private async saveTasksForEmployee(name: string): Promise<void> {
    const rows = this.tasks.filter((item) => item.nom === name).map((item) => ({ nom: item.nom, poste: item.poste, projet: item.projet, tache: item.tache, dureeHeures: item.dureeHeures, date: item.date }));
    if (!rows.length) rows.push({ nom: name, poste: this.employeePost(name), projet: '', tache: '', dureeHeures: 0, date: '' });
    await this.xlsxData.saveEmployeeSheetToAssets(`${this.safeFileName(name)}.xlsx`, rows);
  }

  private safeFileName(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_|_$/g, '') || 'employe';
  }

  private loadSavedProjects(): string[] {
    try { return JSON.parse(localStorage.getItem('project-cost-employee-projects') ?? '[]') as string[]; } catch { return []; }
  }

  private persistProjects(): void { localStorage.setItem('project-cost-employee-projects', JSON.stringify(this.projects)); }

  private cell(row: SheetRow, names: string[]): string {
    const entry = Object.entries(row).find(([key]) => names.includes(this.normalizeKey(key)));
    return String(entry?.[1] ?? '').trim();
  }
  private normalizeKey(value: string): string { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
  private toNumber(value: unknown): number | null { const numberValue = Number(String(value ?? '').replace(',', '.')); return Number.isFinite(numberValue) ? numberValue : null; }
  private parseDate(value: string): Date | undefined {
    if (!value) return undefined;
    const serial = Number(value);
    if (Number.isFinite(serial) && serial > 20000) return new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }
  private fileEmployeeName(file: string): string { return file.replace(/\.xlsx?$/i, '').replace(/[_-]+/g, ' ').trim(); }
  private hours(rows: EmployeeTask[]): number { return rows.reduce((sum, row) => sum + row.dureeHeures, 0); }
  private reportBy(rows: EmployeeTask[], key: (task: EmployeeTask) => string): ReportLine[] {
    const grouped = new Map<string, EmployeeTask[]>();
    rows.forEach((row) => grouped.set(key(row), [...(grouped.get(key(row)) ?? []), row]));
    return [...grouped.entries()].map(([label, values]) => ({ label, heures: this.hours(values), taches: values.length })).sort((a, b) => b.heures - a.heures);
  }

  private renderTaskChart(): void {
    if (!this.taskCanvas) return;
    this.taskChart?.destroy();
    const report = this.reportBy(this.filteredTasks, (task) => task.tache || 'Sans tâche');
    this.taskChart = new Chart(this.taskCanvas.nativeElement, {
      type: 'doughnut', data: { labels: report.map((line) => line.label), datasets: [{ data: report.map((line) => line.heures), backgroundColor: ['#7650a5', '#de6948', '#2f5148', '#e7b86a', '#2d6a9f', '#36734b'] }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
  }

  private renderEmployeeChart(): void {
    if (!this.employeeCanvas) return;
    this.employeeChart?.destroy();
    const report = this.reportBy(this.tasks.filter((task) => (this.isPrintAll || task.annee === Number(this.selectedYear))
      && (!this.selectedMonth || task.mois === Number(this.selectedMonth))
      && (!this.selectedProject || task.projet === this.selectedProject)), (task) => task.nom);
    this.employeeChart = new Chart(this.employeeCanvas.nativeElement, {
      type: 'bar', data: { labels: report.map((line) => line.label), datasets: [{ label: 'Heures', data: report.map((line) => line.heures), backgroundColor: '#7650a5' }] },
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } }, plugins: { legend: { display: false } } }
    });
  }
}
