import { activityGuard } from './core/activity/activity.guard';
import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth-guard';
import { Login } from './features/login/login';
import { PasswordRecovery } from './features/login/password-recovery';
import { ProjectDetail } from './features/project-detail/project-detail.component';
import { CompanyProfileComponent } from './features/company-profile/company-profile';
import { OfferDetail } from './features/offer-detail/offer-detail.component';
import { AppShell } from './shared/components/app-shell/app-shell.component';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'register', component: Login, data: { register: true } },
  { path: 'forgot-password', component: PasswordRecovery },
  { path: 'reset-password', component: PasswordRecovery, data: { resetPassword: true } },
  {
    path: '',
    component: AppShell,
    canActivateChild: [authGuard],
    children: [
      {
        path: 'projects',
        children: [
          { path: '', component: ProjectDetail },
          { path: ':projectId', component: ProjectDetail },
        ],
      },
      { path: 'offers/:offerId', component: OfferDetail },
      {
        path: 'activity',
        canActivate: [activityGuard],
        loadComponent: () =>
          import('./features/activity/activity.component').then((m) => m.ActivityComponent),
      },
      {
        path: 'users',
        canActivate: [activityGuard],
        loadComponent: () =>
          import('./features/users/users.component').then((m) => m.UsersComponent),
      },
      { path: 'company-profile', component: CompanyProfileComponent },
      { path: '', redirectTo: 'projects', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: 'projects' },
];
