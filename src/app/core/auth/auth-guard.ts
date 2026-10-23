import { AppAccessService } from './app-access.service';
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const access = inject(AppAccessService);

  const { data } = await authService.getUser();

  if (data.user) {
    try {
      const state = await access.state();
      if (state === 'active') return true;
      await authService.signOut();
      return router.createUrlTree(['/login'], {
        queryParams: { access: state === 'pending' ? 'pending' : 'blocked' },
      });
    } catch {
      return router.createUrlTree(['/login'], { queryParams: { access: 'unavailable' } });
    }
  }

  return router.createUrlTree(['/login']);
};
