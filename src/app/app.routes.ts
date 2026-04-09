import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { HomeComponent } from './pages/home/home.component';
import { InfoComponent } from './pages/info/info.component';
import { TurnamentComponent } from './pages/turnament/turnament.component';
import { ProfilesComponent } from './pages/profiles/profiles.component';
import { ChallengesComponent } from './pages/challenges/challenges.component';
import { LoginComponent } from './pages/login/login.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },

  { path: '', component: HomeComponent, canActivate: [authGuard] },
  { path: 'info', component: InfoComponent, canActivate: [authGuard] },
  {
    path: 'turnering',
    component: TurnamentComponent,
    canActivate: [authGuard],
  },
  { path: 'profiler', component: ProfilesComponent, canActivate: [authGuard] },
  {
    path: 'challenges',
    component: ChallengesComponent,
    canActivate: [authGuard],
  },

  { path: '**', redirectTo: '' },
];
