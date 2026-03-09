import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { LeaderboardComponent } from './pages/leaderboard/leaderboard.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'hall-of-flame', component: LeaderboardComponent },
  { path: '**', redirectTo: '' },
];
