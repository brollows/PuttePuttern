import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { InfoComponent } from './pages/info/info.component';
import { TurnamentComponent } from './pages/turnament/turnament.component';
import { ProfilesComponent } from './pages/profiles/profiles.component';
import { ChallengesComponent } from './pages/challenges/challenges.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'info', component: InfoComponent },
  { path: 'turnering', component: TurnamentComponent },
  { path: 'profiler', component: ProfilesComponent },
  { path: 'challenges', component: ChallengesComponent },
  { path: '**', redirectTo: '' }
];
