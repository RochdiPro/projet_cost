import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
	{ path: '', pathMatch: 'full', redirectTo: 'login' },
	{
		path: 'login',
		loadComponent: () => import('./pages/login/login.component').then((module) => module.LoginComponent)
	},
	{
		path: 'dashboard',
		canActivate: [authGuard],
		loadComponent: () => import('./pages/dashboard/dashboard.component').then((module) => module.DashboardComponent)
	},
	{
		path: 'projects',
		canActivate: [authGuard],
		loadComponent: () => import('./pages/projects/projects.component').then((module) => module.ProjectsComponent)
	},
	{ path: '**', redirectTo: 'dashboard' }
];
