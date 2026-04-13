import { Routes } from '@angular/router';

export const adminRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./admin-shell.component').then((m) => m.AdminShellComponent),
    children: [
      {
        path: 'members',
        loadComponent: () => import('./members.page').then((m) => m.MembersPage),
      },
      {
        path: 'settings',
        loadComponent: () => import('./settings.page').then((m) => m.SettingsPage),
      },
      {
        path: '',
        redirectTo: 'members',
        pathMatch: 'full',
      },
    ],
  },
];
