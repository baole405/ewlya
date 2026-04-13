import { Routes } from '@angular/router';

export const authRoutes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./login.page').then((m) => m.LoginPage),
  },
  {
    path: 'callback',
    loadComponent: () => import('./callback.component').then((m) => m.CallbackComponent),
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
];
