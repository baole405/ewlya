import { Routes } from '@angular/router';
import { HomeComponent } from '@ds/web/feature-home';
import { LeaderboardComponent } from '@ds/web/feature-hof';
import { AuthCallbackComponent } from './auth/callback.component';
import { AdminDashboardComponent } from './admin/dashboard.component';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'hall-of-flame', component: LeaderboardComponent },
  { path: 'auth/callback', component: AuthCallbackComponent },
  { 
    path: 'admin', 
    component: AdminDashboardComponent,
    canActivate: [adminGuard]
  },
  { path: '**', redirectTo: '' },
];
