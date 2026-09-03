import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <main class="login-page">
      <section class="login-panel">
        <div class="brand-mark">PC</div>
        <p class="eyebrow">Gestion de projets</p>
        <h1>Project Cost</h1>
        <p class="intro">Suivez les coûts, les délais et la rentabilité de chaque projet depuis un seul espace.</p>
        <form (ngSubmit)="submit()">
          <label for="access-code">Code d'accès</label>
          <input id="access-code" name="accessCode" [(ngModel)]="accessCode" type="password" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="••••" />
          @if (hasError) {
            <p class="error">Code d'accès incorrect.</p>
          }
          <button type="submit">Accéder au tableau de bord <span>→</span></button>
        </form>
        <small>Accès local sécurisé par code</small>
      </section>
      <aside class="login-aside">
        <span class="aside-label">Votre pilotage financier</span>
        <h2>Une vue claire sur chaque décision.</h2>
        <div class="aside-rule"></div>
        <p>Projets, factures, paiements et charges internes réunis pour transformer vos données en actions.</p>
      </aside>
    </main>
  `,
  styles: [`
    :host { display:block; min-height:100vh; }
    .login-page { min-height:100vh; display:grid; grid-template-columns:minmax(360px, .92fr) 1.08fr; background:#f5f1e9; color:#17221f; }
    .login-panel { display:flex; flex-direction:column; justify-content:center; width:min(390px, calc(100% - 48px)); margin:auto; }
    .brand-mark { width:52px; height:52px; display:grid; place-items:center; background:#de6948; color:#fff9ef; font:700 16px/1 'Courier New', monospace; letter-spacing:0; }
    .eyebrow, .aside-label { margin:34px 0 10px; color:#de6948; font:700 11px/1 'Courier New', monospace; letter-spacing:1.5px; text-transform:uppercase; }
    h1 { margin:0; font:700 clamp(42px, 6vw, 72px)/.95 Georgia, serif; letter-spacing:0; }
    .intro { max-width:350px; margin:24px 0 42px; color:#60706a; font-size:16px; line-height:1.65; }
    form { display:grid; gap:12px; }
    label { color:#33453f; font-size:13px; font-weight:700; }
    input { height:52px; border:1px solid #bec8be; background:#fffdf8; padding:0 16px; color:#17221f; font:500 20px 'Courier New', monospace; letter-spacing:5px; outline:none; }
    input:focus { border-color:#de6948; box-shadow:0 0 0 3px rgba(222,105,72,.12); }
    button { height:54px; margin-top:8px; border:0; background:#17221f; color:#fff9ef; cursor:pointer; font:700 13px 'Courier New', monospace; text-align:left; padding:0 18px; }
    button span { float:right; font-size:20px; line-height:12px; }
    button:hover { background:#de6948; }
    .error { margin:0; color:#b13d35; font-size:13px; }
    small { margin-top:20px; color:#87918c; font-size:11px; }
    .login-aside { position:relative; display:flex; flex-direction:column; justify-content:flex-end; padding:clamp(40px, 8vw, 120px); min-height:100vh; background:#2f5148; overflow:hidden; }
    .login-aside::before { content:''; position:absolute; width:420px; height:420px; right:-130px; top:-100px; border:1px solid rgba(255,249,239,.2); border-radius:50%; }
    .login-aside::after { content:''; position:absolute; width:620px; height:620px; right:-250px; top:-200px; border:1px solid rgba(255,249,239,.12); border-radius:50%; }
    .login-aside h2 { position:relative; z-index:1; max-width:600px; margin:0; color:#fff9ef; font:700 clamp(42px, 6vw, 88px)/.98 Georgia, serif; letter-spacing:0; }
    .aside-label { position:relative; z-index:1; color:#e7b86a; margin:0 0 25px; }
    .aside-rule { position:relative; z-index:1; width:70px; height:4px; margin:32px 0 22px; background:#de6948; }
    .login-aside p { position:relative; z-index:1; max-width:430px; margin:0; color:#c8d5ce; line-height:1.7; }
    @media (max-width: 760px) { .login-page { grid-template-columns:1fr; } .login-aside { display:none; } .login-panel { width:min(390px, calc(100% - 40px)); } }
  `]
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  accessCode = '';
  hasError = false;

  submit(): void {
    this.hasError = !this.auth.login(this.accessCode);
    if (!this.hasError) {
      this.router.navigateByUrl('/dashboard');
    }
  }
}
