import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import {
  ActivityService,
  activityLabels,
  ActivityEvent,
} from '../../core/activity/activity.service';

@Component({
  selector: 'app-activity',
  imports: [DatePipe, DecimalPipe],
  templateUrl: './activity.component.html',
  styleUrl: './activity.component.scss',
})
export class ActivityComponent implements OnInit {
  private readonly activity = inject(ActivityService);
  readonly labels = activityLabels;
  readonly states: Record<string, string> = {
    accepted: 'Accepteret',
    rejected: 'Afvist',
    suggested: 'Foreslået',
    finalized: 'Færdiggjort',
    sent: 'Sendt',
  };
  readonly events = signal<ActivityEvent[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly user = signal('');
  readonly onlyErrors = signal(false);
  readonly users = computed(() => [
    ...new Map(this.events().map((e) => [e.user_id, { id: e.user_id, email: e.email }])).values(),
  ]);
  readonly userEvents = computed(() =>
    this.events().filter((e) => !this.user() || e.user_id === this.user()),
  );
  readonly visible = computed(() =>
    this.userEvents().filter((e) => !this.onlyErrors() || !e.success),
  );
  readonly failures = computed(() => this.userEvents().filter((e) => !e.success).length);
  readonly projects = computed(
    () => this.userEvents().filter((e) => e.success && e.action === 'project_created').length,
  );
  readonly pdfs = computed(
    () => this.userEvents().filter((e) => e.success && e.action === 'pdf_downloaded').length,
  );
  readonly aiAverage = computed(() => {
    const events = this.userEvents().filter(
      (e) => e.action === 'ai_request' && e.success && e.duration_ms !== null,
    );
    return events.length
      ? events.reduce((sum, e) => sum + e.duration_ms!, 0) / events.length / 1000
      : null;
  });
  ngOnInit(): void {
    void this.reload();
  }
  async reload(): Promise<void> {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    try {
      this.events.set(await this.activity.loadEvents());
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Kunne ikke hente loggen.');
    } finally {
      this.loading.set(false);
    }
  }
}
