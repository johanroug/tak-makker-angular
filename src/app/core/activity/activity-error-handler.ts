import { ErrorHandler, Injectable, inject } from '@angular/core';
import { ActivityService } from './activity.service';

@Injectable()
export class ActivityErrorHandler implements ErrorHandler {
  private readonly activity = inject(ActivityService);
  private lastRecorded = 0;
  handleError(error: unknown): void {
    console.error(error);
    if (Date.now() - this.lastRecorded < 5000) return;
    this.lastRecorded = Date.now();
    this.activity.record('app_error', false, undefined, 'unhandled_error');
  }
}
