import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ActivityService } from './activity.service';

export const activityGuard: CanActivateFn = async () => {
  const router = inject(Router);
  return (await inject(ActivityService).checkAdmin()) || router.createUrlTree(['/projects']);
};
