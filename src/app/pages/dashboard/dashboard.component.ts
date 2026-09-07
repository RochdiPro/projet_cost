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
          <button (click)="logout()">Quitter</button>
        </nav>
      </header>

      <section class="hero">
        <div>
          <p class="eyebrow">Espace de pilotage</p>
          <h1>Gestion projet<br><em>cout et achats.</em></h1>
          <p class="lead">Suivez vos projets, vos fournisseurs et votre archive produit depuis un seul tableau de bord.</p>
          <a routerLink="/projects" class="primary">Gerer les projets <span>-></span></a>
        </div>
        <div class="hero-stamp"><strong>03</strong><span>MODULES<br>ACTIFS</span></div>
      </section>

      <section class="features">
        <div class="section-heading">
          <p class="eyebrow">Les modules</p>
          <h2>Vos espaces<br>de gestion.</h2>
        </div>
        <div class="feature-grid">
          <article>
            <span class="number">01</span>
            <h3>Gerer les projets</h3>
            <p>Creer, ouvrir et suivre les fichiers projet avec leurs couts, factures, paiements et planning.</p>
            <a routerLink="/projects">Ouvrir <span>-></span></a>
          </article>
          <article>
            <span class="number">02</span>
            <h3>Liste fournisseurs</h3>
            <p>Centraliser le nom, l'adresse, le contact, la categorie et le materiel vendu par chaque fournisseur.</p>
            <a routerLink="/suppliers">Ouvrir <span>-></span></a>
          </article>
          <article>
            <span class="number">03</span>
            <h3>Archive produit</h3>
            <p>Archiver les produits avec reference, image, prix, derniere mise a jour et fournisseur associe.</p>
            <a routerLink="/products">Ouvrir <span>-></span></a>
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
    .feature-grid { display:grid; grid-template-columns:repeat(3,1fr); border-top:1px solid #bec8be; }
    article { min-height:230px; padding:27px 26px 25px 0; border-right:1px solid #bec8be; }
    article:not(:first-child) { padding-left:26px; }
    article:last-child { border-right:0; }
    .number { font:700 12px 'Courier New',monospace; }
    h3 { margin:22px 0 13px; font:700 27px Georgia,serif; }
    article p { max-width:300px; color:#68766e; font-size:14px; line-height:1.65; }
    article a { color:#17221f; font:700 11px 'Courier New',monospace; text-decoration:none; }
    footer { display:flex; justify-content:space-between; padding:25px clamp(24px,10vw,150px); border-top:1px solid #d9ddd4; color:#8a978f; font:10px 'Courier New',monospace; }
    @media (max-width:760px) { nav { gap:12px; flex-wrap:wrap; justify-content:flex-end; } .hero { min-height:500px; padding:62px 24px; } .hero-stamp { display:none; } .feature-grid { grid-template-columns:1fr; } article, article:not(:first-child) { padding:25px 0; border-right:0; border-bottom:1px solid #bec8be; } .section-heading, footer { display:block; } footer { line-height:2; } }
  `]
})
export class DashboardComponent {
  private readonly auth = inject(AuthService);
  logout(): void { this.auth.logout(); location.href = '/login'; }
}
