import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AppAccessService, AppUser } from '../../core/auth/app-access.service';

@Component({
  selector: 'app-users',
  imports: [DatePipe],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
})
export class UsersComponent implements OnInit {
  private readonly access = inject(AppAccessService);
  readonly users = signal<AppUser[]>([]);
  readonly search = signal('');
  readonly loading = signal(false);
  readonly busy = signal<string | null>(null);
  readonly error = signal('');
  readonly message = signal('');
  readonly confirmation = signal<AppUser | null>(null);
  readonly filtered = computed(() => {
    const query = this.search().trim().toLowerCase();
    return this.users().filter((u) =>
      (u.email + ' ' + (u.company_name ?? '')).toLowerCase().includes(query),
    );
  });
  ngOnInit(): void {
    void this.reload();
  }
  async reload(): Promise<void> {
    if (this.loading() || this.busy()) return;
    this.loading.set(true);
    this.error.set('');
    try {
      this.users.set(await this.access.listUsers());
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Kunne ikke hente brugere.');
    } finally {
      this.loading.set(false);
    }
  }
  async changeAccess(user: AppUser, blocked: boolean): Promise<void> {
    if (this.busy() || user.is_admin) return;
    this.busy.set(user.id);
    this.error.set('');
    this.message.set('');
    try {
      await this.access.setBlocked(user.id, blocked);
      this.users.update((users) => users.map((u) => (u.id === user.id ? { ...u, blocked } : u)));
      this.confirmation.set(null);
      this.message.set(blocked ? 'Brugerens adgang er blokeret.' : 'Brugeren har adgang igen.');
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Kunne ikke ændre adgang.');
    } finally {
      this.busy.set(null);
    }
  }
}
