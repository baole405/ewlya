import { Routes } from '@angular/router';
import { AdminShellComponent } from './admin-shell/admin-shell.component';

export const adminRoutes: Routes = [
  {
    path: '',
    component: AdminShellComponent,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./dashboard-home/dashboard-home.component').then((m) => m.DashboardHomeComponent),
      },
      {
        path: 'members',
        loadComponent: () =>
          import('./members/member-list.component').then((m) => m.MemberListComponent),
      },
      {
        path: 'seasons',
        loadComponent: () =>
          import('./seasons/season-manager.component').then((m) => m.SeasonManagerComponent),
      },
    ],
  },
];
