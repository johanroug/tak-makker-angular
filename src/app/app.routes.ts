import { activityGuard } from './core/activity/activity.guard';
import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth-guard';
import { TRADE_PAGES } from './features/trades/trade-pages';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Hovedet på sømmet – tilbud til håndværkere',
    data: {
      seo: {
        path: '/',
        description:
          'Lav tilbud med Hovedet på sømmet. Få hjælp til opgaver, materialer og priser, tilpas med din faglighed, og hent en PDF. Bliv testfirma og vær med til at forme udviklingen.',
      },
    },
    loadComponent: () =>
      import('./features/landing/landing.component').then((m) => m.LandingComponent),
  },
  ...TRADE_PAGES.map((page) => ({
    path: page.slug,
    title: page.title,
    data: { page, seo: { path: '/' + page.slug, description: page.description } },
    loadComponent: () => import('./features/trades/trade.component').then((m) => m.TradeComponent),
  })),
  {
    path: 'login',
    title: 'Log ind | Hovedet på sømmet',
    loadComponent: () => import('./features/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    title: 'Bliv testfirma | Hovedet på sømmet',
    loadComponent: () => import('./features/login/login').then((m) => m.Login),
    data: { register: true },
  },
  {
    path: 'forgot-password',
    title: 'Glemt adgangskode | Hovedet på sømmet',
    loadComponent: () =>
      import('./features/login/password-recovery').then((m) => m.PasswordRecovery),
  },
  {
    path: 'reset-password',
    title: 'Ny adgangskode | Hovedet på sømmet',
    loadComponent: () =>
      import('./features/login/password-recovery').then((m) => m.PasswordRecovery),
    data: { resetPassword: true },
  },
  {
    path: '',
    loadComponent: () =>
      import('./shared/components/app-shell/app-shell.component').then((m) => m.AppShell),
    canActivateChild: [authGuard],
    children: [
      {
        path: 'projects',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/project-detail/project-detail.component').then(
                (m) => m.ProjectDetail,
              ),
          },
          {
            path: ':projectId',
            loadComponent: () =>
              import('./features/project-detail/project-detail.component').then(
                (m) => m.ProjectDetail,
              ),
          },
        ],
      },
      {
        path: 'offers/:offerId',
        loadComponent: () =>
          import('./features/offer-detail/offer-detail.component').then((m) => m.OfferDetail),
      },
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
      {
        path: 'company-profile',
        loadComponent: () =>
          import('./features/company-profile/company-profile').then(
            (m) => m.CompanyProfileComponent,
          ),
      },
      { path: '', redirectTo: 'projects', pathMatch: 'full' },
    ],
  },
  {
    path: '**',
    title: 'Siden blev ikke fundet | Hovedet på sømmet',
    loadComponent: () =>
      import('./features/not-found/not-found.component').then((m) => m.NotFoundComponent),
  },
];
