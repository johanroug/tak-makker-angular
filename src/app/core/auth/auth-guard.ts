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
      if (await access.allowed()) return true;
      await authService.signOut();
      return router.createUrlTree(['/login'], { queryParams: { access: 'blocked' } });
    } catch {
      return router.createUrlTree(['/login'], { queryParams: { access: 'unavailable' } });
    }
  }

  return router.createUrlTree(['/login']);
};
