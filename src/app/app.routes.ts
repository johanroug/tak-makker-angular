import { Routes } from '@angular/router';

import { authGuard } from './core/auth/auth-guard';
import { Login } from './features/login/login';
import { Projects } from './features/projects/projects';
import { ProjectDetail } from './features/project-detail/project-detail.component';

export const routes: Routes = [
  {
    path: 'login',
    component: Login,
  },
  {
    path: 'projects',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        component: Projects,
      },
      {
        path: ':projectId',
        component: ProjectDetail,
      },
    ],
  },
  {
    path: '',
    redirectTo: 'projects',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'projects',
  },
];
