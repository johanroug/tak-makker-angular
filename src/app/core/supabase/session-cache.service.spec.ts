import { afterEach, describe, expect, it, vi } from 'vitest';
import { SessionCache } from './session-cache.service';

import { supabase } from './supabase.client';
const auth = { changed: () => {}, unsubscribe: vi.fn() };
vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({ data: { session: null }, error: null });
vi.spyOn(supabase.auth, 'onAuthStateChange').mockImplementation(callback => {
  auth.changed = () => { void callback('SIGNED_OUT', null); };
  return { data: { subscription: { id: 'test', callback, unsubscribe: auth.unsubscribe } } };
});

afterEach(() => vi.useRealTimers());

describe('SessionCache', () => {
  it('shares concurrent requests and expires results after 30 seconds', async () => {
    vi.useFakeTimers();
    const cache = new SessionCache();
    const load = vi.fn().mockResolvedValue('company');
    expect(await Promise.all([cache.get('company', load), cache.get('company', load)])).toEqual(['company', 'company']);
    await cache.get('company', load);
    expect(load).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(30_001);
    await cache.get('company', load);
    expect(load).toHaveBeenCalledTimes(2);
    cache.ngOnDestroy();
  });

  it('retries failed requests instead of caching errors', async () => {
    const cache = new SessionCache();
    const load = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue('active');
    await expect(cache.get('access', load)).rejects.toThrow('offline');
    await expect(cache.get('access', load)).resolves.toBe('active');
    cache.ngOnDestroy();
  });

  it('rejects old responses after session changes', async () => {
    const cache = new SessionCache();
    let finish!: (value: string) => void;
    const request = cache.get('company', () => new Promise<string>(resolve => { finish = resolve; }));
    await Promise.resolve();
    auth.changed();
    finish('previous company');
    await expect(request).rejects.toThrow('Sessionen');
    await expect(cache.get('company', async () => 'new company')).resolves.toBe('new company');
    cache.ngOnDestroy();
  });
});
