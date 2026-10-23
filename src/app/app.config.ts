import { ActivityErrorHandler } from './core/activity/activity-error-handler';
import {
  ApplicationConfig,
  ErrorHandler,
  inject,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, Router, withViewTransitions } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: ErrorHandler, useClass: ActivityErrorHandler },
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withViewTransitions({
        skipInitialTransition: true,
        onViewTransitionCreated: ({ transition }) => {
          const router = inject(Router);
          const target = router.currentNavigation()?.finalUrl;
          const samePath =
            target && target.toString().split(/[?#]/)[0] === router.url.split(/[?#]/)[0];
          if (samePath || window.matchMedia('(prefers-reduced-motion: reduce)').matches)
            transition.skipTransition();
        },
      }),
    ),
  ],
};
