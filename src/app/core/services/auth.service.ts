import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly accessCode = '0000';
  readonly isAuthenticated = signal(sessionStorage.getItem('project-cost-auth') === 'true');

  login(code: string): boolean {
    const valid = code === this.accessCode;
    this.isAuthenticated.set(valid);
    if (valid) {
      sessionStorage.setItem('project-cost-auth', 'true');
    }
    return valid;
  }

  logout(): void {
    sessionStorage.removeItem('project-cost-auth');
    this.isAuthenticated.set(false);
  }
}
