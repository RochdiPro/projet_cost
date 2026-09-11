import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="dashboard">
      <header class="topbar">
        <a routerLink="/dashboard" class="logo">PROJECT <b>COST</b></a>
        <nav>
          <a routerLink="/projects">Projets</a>
          <a routerLink="/suppliers">Fournisseurs</a>
          <a routerLink="/products">Produits</a>
          <a routerLink="/employees">Employés</a>
          <a routerLink="/vehicles">Véhicules</a>
          <button (click)="logout()">Quitter</button>
        </nav>
      </header>
    
      <section class="features">
        <div class="section-heading">
          <p class="eyebrow">Vos espaces de gestion.</p>
         </div>
        <div class="feature-grid">
          <article class="module-projects">
            <span class="number">01</span>
            <h3>Projets</h3>
            <p>Suivez les couts et l'avancement de vos projets.</p>
            <a routerLink="/projects">Ouvrir <span>-></span></a>
          </article>
          <article class="module-suppliers">
            <span class="number">02</span>
            <h3>Fournisseurs</h3>
            <p>Consultez et gerez votre liste de fournisseurs.</p>
            <a routerLink="/suppliers">Ouvrir <span>-></span></a>
          </article>
          <article class="module-products">
            <span class="number">03</span>
            <h3>Produits</h3>
            <p>Retrouvez les produits et leurs informations.</p>
            <a routerLink="/products">Ouvrir <span>-></span></a>
          </article>
          <article class="module-employees">
            <span class="number">04</span>
            <h3>Employés</h3>
            <p>Suivez le temps de travail et les tâches de l'équipe.</p>
            <a routerLink="/employees">Ouvrir <span>-></span></a>
          </article>
          <article class="module-vehicles">
            <span class="number">05</span>
            <h3>Véhicules</h3>
            <p>Gérez les immatriculations, visites, assurances, taxes et frais.</p>
            <a routerLink="/vehicles">Ouvrir <span>-></span></a>
          </article>
        </div>
      </section>

      <footer><span>PROJECT COST - 2026</span><span>Gestion et analyse des couts de projets</span></footer>
    </main>
  `,
  styles: [`
    :host { display:block; }
    .dashboard { min-height:100vh; background:#f5f1e9; color:#17221f; }
    .topbar { height:76px; display:flex; align-items:center; justify-content:space-between; padding:0 clamp(24px,6vw,100px); border-bottom:1px solid #d9ddd4; }
    .logo { color:#17221f; font:700 13px 'Courier New',monospace; letter-spacing:1px; text-decoration:none; }
    .logo b, .number, article a span { color:#de6948; }
    nav { display:flex; align-items:center; gap:24px; }
    nav a, nav button { color:#354740; font:700 12px 'Courier New',monospace; text-decoration:none; }
    nav button { border:0; border-left:1px solid #bec8be; padding-left:24px; background:none; cursor:pointer; }
    .hero { display:flex; justify-content:space-between; min-height:430px; padding:clamp(56px,8vw,116px) clamp(24px,12vw,180px) 62px clamp(24px,10vw,150px); background:#2f5148; color:#fff9ef; }
    .eyebrow { margin:0 0 18px; color:#de6948; font:700 11px 'Courier New',monospace; letter-spacing:1.5px; text-transform:uppercase; }
    .hero .eyebrow, h1 em, .hero-stamp strong { color:#e7b86a; }
    h1 { margin:0; font:700 clamp(48px,7vw,92px)/.94 Georgia,serif; letter-spacing:0; }
    h1 em { font-weight:400; }
    .lead { max-width:460px; margin:28px 0 32px; color:#c8d5ce; line-height:1.7; }
    .primary { display:inline-flex; gap:28px; align-items:center; padding:15px 18px; background:#de6948; color:#fff9ef; font:700 12px 'Courier New',monospace; text-decoration:none; }
    .hero-stamp { align-self:flex-end; display:flex; gap:14px; align-items:center; color:#c8d5ce; font:700 10px 'Courier New',monospace; letter-spacing:1px; }
    .hero-stamp strong { font:400 72px Georgia,serif; }
    .features { padding:78px clamp(24px,10vw,150px); }
    .section-heading { display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:40px; }
    h2 { margin:0; font:700 clamp(34px,5vw,58px)/1 Georgia,serif; letter-spacing:0; }
    .feature-grid { display:grid; grid-template-columns:repeat(5,1fr); border-top:1px solid #bec8be; }
    article { min-height:230px; padding:27px 26px 25px; border-right:1px solid #bec8be; }
    article:not(:first-child) { padding-left:26px; }
    article:last-child { border-right:0; }
    .module-projects { background:#2f5148; color:#fff9ef; }
    .module-suppliers { background:#fff0df; }
    .module-products { background:#e6eef6; }
    .module-employees { background:#e9e1f4; }
    .module-vehicles { background:#eaf6ee; }
    .module-projects .number, .module-projects a, .module-projects a span { color:#e7b86a; }
    .module-suppliers .number, .module-suppliers a span { color:#bd632e; }
    .module-products .number, .module-products a span { color:#2d6a9f; }
    .module-employees .number, .module-employees a span { color:#7650a5; }
    .module-vehicles .number, .module-vehicles a span { color:#2f8b58; }
    .number { font:700 12px 'Courier New',monospace; }
    h3 { margin:22px 0 13px; font:700 27px Georgia,serif; }
    article p { max-width:300px; color:#68766e; font-size:14px; line-height:1.65; }
    article a { color:#17221f; font:700 11px 'Courier New',monospace; text-decoration:none; }
    footer { display:flex; justify-content:space-between; padding:25px clamp(24px,10vw,150px); border-top:1px solid #d9ddd4; color:#8a978f; font:10px 'Courier New',monospace; }
    @media (max-width:1000px) { .feature-grid { grid-template-columns:repeat(2,1fr); } article:nth-child(2) { border-right:0; } }
    @media (max-width:760px) { nav { gap:12px; flex-wrap:wrap; justify-content:flex-end; } .hero { min-height:500px; padding:62px 24px; } .hero-stamp { display:none; } .feature-grid { grid-template-columns:1fr; } article, article:not(:first-child) { padding:25px 0; border-right:0; border-bottom:1px solid #bec8be; } .section-heading, footer { display:block; } footer { line-height:2; } }
  `]
})
export class DashboardComponent {
  private readonly auth = inject(AuthService);
  logout(): void { this.auth.logout(); location.href = '/login'; }
}
