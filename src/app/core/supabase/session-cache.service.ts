import { Injectable, OnDestroy } from '@angular/core';
import { supabase } from './supabase.client';

/** Memory only: shared requests and short-lived results for the current session. */
@Injectable({ providedIn: 'root' })
export class SessionCache implements OnDestroy {
  private readonly entries = new Map<string, { expires: number; request: Promise<unknown> }>();
  private readonly subscription = supabase.auth.onAuthStateChange(() => this.clear()).data.subscription;

  clear(prefix = ''): void {
    for (const key of this.entries.keys()) if (key.startsWith(prefix)) this.entries.delete(key);
  }

  async get<T>(key: string, load: () => Promise<T>, ttl = 30_000): Promise<T> {
    await supabase.auth.getSession();
    const existing = this.entries.get(key);
    if (existing && Date.now() < existing.expires) return existing.request as Promise<T>;
    const entry = { expires: Infinity, request: undefined as unknown as Promise<T> };
    entry.request = load().then(value => {
      if (this.entries.get(key) !== entry) throw new Error('Sessionen eller data er ændret. Prøv igen.');
      entry.expires = Date.now() + ttl;
      return value;
    }).catch(error => {
      if (this.entries.get(key) === entry) this.entries.delete(key);
      throw error;
    });
    this.entries.set(key, entry);
    return entry.request;
  }

  ngOnDestroy(): void { this.subscription.unsubscribe(); this.clear(); }
}
