import { afterEach, describe, expect, it, vi } from 'vitest';
import { BillingService } from './billing.service';
import { supabase } from '../supabase/supabase.client';
const api = {
  rpc: vi.spyOn(supabase, 'rpc'),
  invoke: vi.spyOn(Object.getPrototypeOf(supabase.functions), 'invoke'),
  changed: (_: string, __: unknown) => {},
};
vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({ data: { session: null }, error: null });
vi.spyOn(supabase.auth, 'onAuthStateChange').mockImplementation(callback => {
  api.changed = () => { void callback('SIGNED_OUT', null); };
  return { data: { subscription: { id: 'test', callback, unsubscribe: vi.fn() } } };
});
const usage = { companyId: 'company', status: 'trial', trialRemaining: 5, trialUsed: 0, canGenerate: true };
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });
describe('BillingService caching', () => {
  it('shares implicit and explicit company requests, expires and supports manual refresh', async () => {
    vi.useFakeTimers();
    api.rpc.mockResolvedValue({ data: usage, error: null } as never);
    const billing = new BillingService();
    await Promise.all([billing.load(), billing.load('company')]);
    await billing.load('company');
    expect(api.rpc).toHaveBeenCalledTimes(1);
    await billing.load('company', true);
    expect(api.rpc).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(30_001);
    await billing.load();
    expect(api.rpc).toHaveBeenCalledTimes(3);
    api.changed('SIGNED_OUT', null);
    expect(billing.usage()).toBeNull();
    billing.ngOnDestroy();
  });
  it('caches unavailable checkout configuration and shares requests', async () => {
    api.invoke.mockResolvedValue({ data: { checkoutReady: false }, error: null });
    const billing = new BillingService();
    await Promise.all([billing.loadCheckoutConfiguration(), billing.loadCheckoutConfiguration()]);
    await billing.loadCheckoutConfiguration();
    expect(api.invoke).toHaveBeenCalledTimes(1);
    await billing.loadCheckoutConfiguration(true);
    expect(api.invoke).toHaveBeenCalledTimes(2);
    billing.ngOnDestroy();
  });
  it('keeps fresh generation usage when an older billing read finishes', async () => {
    let finish!: (value: unknown) => void;
    api.rpc.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }) as never);
    const billing = new BillingService();
    const pending = billing.load();
    await Promise.resolve();
    await Promise.resolve();
    billing.accept({ ...usage, trialUsed: 1, trialRemaining: 4 });
    finish({ data: usage, error: null });
    await pending;
    expect(billing.usage()?.trialUsed).toBe(1);
    billing.ngOnDestroy();
  });
});
