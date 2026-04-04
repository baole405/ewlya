import { Routes } from '@angular/router';
import { HomeComponent } from '@ds/web/feature-home';
import { LeaderboardComponent } from '@ds/web/feature-hof';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'hall-of-flame', component: LeaderboardComponent },
  { path: '**', redirectTo: '' },
];
