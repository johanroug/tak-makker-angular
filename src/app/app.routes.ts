import { Routes } from '@angular/router';

import { authGuard } from './core/auth/auth-guard';
import { Login } from './features/login/login';
import { ProjectDetail } from './features/project-detail/project-detail.component';
import { CompanyProfileComponent } from './features/company-profile/company-profile';
import { OfferDetail } from './features/offer-detail/offer-detail.component';

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
        component: ProjectDetail,
      },
      {
        path: ':projectId',
        component: ProjectDetail,
      },
    ],
  },
  {
    path: 'offers/:offerId',
    canActivate: [authGuard],
    component: OfferDetail,
  },
  {
    path: 'company-profile',
    canActivate: [authGuard],
    component: CompanyProfileComponent,
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