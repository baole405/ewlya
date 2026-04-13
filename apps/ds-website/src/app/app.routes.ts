import { Routes } from '@angular/router';
import { adminGuard, adminRedirectGuard } from '@ds/web/data-access';
import { HomeComponent, LeaderboardComponent } from '@ds/web/ui-custom';

export const routes: Routes = [
  { path: '', component: HomeComponent, canActivate: [adminRedirectGuard] },
  { path: 'hall-of-flame', component: LeaderboardComponent },
  {
    path: 'auth',
    loadChildren: () => import('@ds/web/feature-auth').then((m) => m.authRoutes),
  },
  {
    path: 'admin',
    loadChildren: () => import('@ds/web/feature-admin').then((m) => m.adminRoutes),
    canActivate: [adminGuard],
  },
  { path: '**', redirectTo: '' },
];
