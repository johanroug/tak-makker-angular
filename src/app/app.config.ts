import { ActivityErrorHandler } from './core/activity/activity-error-handler';
import {
  ApplicationConfig,
  ErrorHandler,
  inject,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import {
  provideRouter,
  Router,
  TitleStrategy,
  withInMemoryScrolling,
  withNavigationErrorHandler,
  withViewTransitions,
} from '@angular/router';
import { routes } from './app.routes';
import { SeoTitleStrategy } from './core/seo/seo-title.strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideClientHydration(withEventReplay()),
    { provide: TitleStrategy, useClass: SeoTitleStrategy },
    { provide: ErrorHandler, useClass: ActivityErrorHandler },
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withNavigationErrorHandler(() => {
        if (typeof window !== 'undefined') window.dispatchEvent(new Event('app-load-failed'));
      }),
      withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'top' }),
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
