import { Routes } from '@angular/router';
import { HomeComponent } from '@ds/web/feature-home';
import { LeaderboardComponent } from '@ds/web/feature-hof';
import { AuthCallbackComponent } from './auth/callback.component';
import { adminGuard } from '@ds/web/data-access';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'hall-of-flame', component: LeaderboardComponent },
  { path: 'auth/callback', component: AuthCallbackComponent },
  {
    path: 'admin',
    loadChildren: () => import('@ds/web/feature-admin').then((m) => m.adminRoutes),
    canActivate: [adminGuard],
  },
  { path: '**', redirectTo: '' },
];
