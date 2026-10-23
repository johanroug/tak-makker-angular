import { AppAccessService } from './app-access.service';
import { ActivityService } from '../activity/activity.service';
import { Injectable, inject, OnDestroy } from '@angular/core';
import { supabase } from '../supabase/supabase.client';

type UserResult = Awaited<ReturnType<typeof supabase.auth.getUser>>;

@Injectable({ providedIn: 'root' })
export class AuthService implements OnDestroy {
  private readonly activity = inject(ActivityService);
  private readonly access = inject(AppAccessService);
  private cachedUser?: UserResult;
  private validUntil = 0;
  private pending?: Promise<UserResult>;
  private generation = 0;
  private sessionToken: string | null | undefined;
  private sessionExpiresAt = Infinity;
  private readonly subscription = supabase.auth.onAuthStateChange((event, session) => {
    const token = session?.access_token ?? null;
    const changed = this.sessionToken !== undefined && this.sessionToken !== token;
    this.sessionToken = token;
    this.sessionExpiresAt = session?.expires_at ? session.expires_at * 1000 : Infinity;
    if (
      changed ||
      event === 'SIGNED_OUT' ||
      event === 'USER_UPDATED' ||
      event === 'TOKEN_REFRESHED'
    ) {
      this.invalidate();
    }
  }).data.subscription;

  private invalidate(): void {
    this.generation++;
    this.cachedUser = undefined;
    this.validUntil = 0;
    this.pending = undefined;
  }

  async signIn(email: string, password: string) {
    this.invalidate();
    const result = await supabase.auth.signInWithPassword({ email, password });
    if (!result.error) {
      try {
        if (!(await this.access.allowed()))
          throw new Error('Din adgang til Tak Makker er blokeret. Kontakt Tak Makker for hjælp.');
      } catch (error) {
        await this.signOut();
        throw error;
      }
      this.activity.record('login', true);
    }
    return result;
  }

  async signUp(email: string, password: string) {
    this.invalidate();
    return supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: window.location.origin + '/login' },
    });
  }

  async signOut() {
    this.activity.isAdmin.set(false);
    this.invalidate();
    try {
      return await supabase.auth.signOut();
    } finally {
      this.invalidate();
    }
  }

  getUser(): Promise<UserResult> {
    if (this.cachedUser && Date.now() < Math.min(this.validUntil, this.sessionExpiresAt)) {
      return Promise.resolve(this.cachedUser);
    }
    if (this.pending) return this.pending;
    const generation = this.generation;
    const request = supabase.auth
      .getUser()
      .then((result) => {
        // A response from before logout, token refresh or account switching cannot
        // restore the previous user's cache or be passed to a waiting route guard.
        if (generation !== this.generation) return this.getUser();
        if (!result.error && result.data.user) {
          this.cachedUser = result;
          this.validUntil = Date.now() + 30_000;
        }
        return result;
      })
      .finally(() => {
        if (this.pending === request) this.pending = undefined;
      });
    this.pending = request;
    return request;
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.invalidate();
  }
}
