export const STRIPE_VERSION = '2026-10-28.endive';
export const PLAN_AMOUNT = 29900;
export const PAID_LIMIT = 200;

export function paymentsEnabled(origin: string, secretKey: string, allowLive: boolean): boolean {
  if (secretKey.startsWith('sk_test_'))
    return ['http://localhost:4200', 'http://127.0.0.1:4200',
      'http://localhost:4201', 'http://127.0.0.1:4201'].includes(origin);
  return allowLive && secretKey.startsWith('sk_live_');
}

export async function checkoutIdempotencyKey(companyId: string, attempt: string, params: Record<string, string>): Promise<string> {
  const canonical = new URLSearchParams(Object.entries(params).sort(([a], [b]) => a.localeCompare(b))).toString();
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical));
  const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `company-checkout-v2-${companyId}-${attempt}-${hash}`;
}

export class BillingError extends Error {
  readonly status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}

export function stripeKey(): string {
  const key = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
  if (!key.startsWith('sk_test_') && !(Deno.env.get('STRIPE_ALLOW_LIVE') === 'true' && key.startsWith('sk_live_')))
    throw new BillingError('Stripe er ikke klar til betaling endnu.', 503);
  return key;
}

// Keys stay inside the Edge Function. Never include Stripe response bodies or
// request headers in user-facing errors/logging.
export async function stripe(path: string, params?: Record<string, string>, idempotencyKey?: string): Promise<any> {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: params ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${stripeKey()}`, 'Stripe-Version': STRIPE_VERSION,
      ...(params ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    },
    body: params ? new URLSearchParams(params) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    // Return only our own messages and Stripe's non-secret request reference.
    // Never expose the provider body, which can echo submitted customer data.
    const resource = path.split(/[/?]/)[0];
    const labels: Record<string, string> = {
      prices: 'abonnementsprisen', tax_rates: 'momssatsen', tax: 'momsindstillingerne',
      customers: 'kunden', subscriptions: 'abonnementet', checkout: 'betalingssiden',
      billing_portal: 'kundeportalen',
    };
    const reference = response.headers.get('request-id');
    const safeReference = reference && /^req_[a-zA-Z0-9]+$/.test(reference) ? ` Reference: ${reference}.` : '';
    const failure = await response.json().catch(() => null);
    const code = failure?.error?.code;
    const param = failure?.error?.param;
    const diagnostic = [
      typeof code === 'string' && /^[a-z_]{1,80}$/.test(code) ? `kode: ${code}` : '',
      typeof param === 'string' && /^[a-z_][a-z_0-9\[\]]{0,100}$/.test(param) ? `felt: ${param}` : '',
    ].filter(Boolean).join(', ');
    const message = response.status === 401
      ? 'Stripe afviser API-nøglen. Kontrollér STRIPE_SECRET_KEY i Supabase.'
      : response.status === 403
        ? 'Stripe-nøglen mangler adgang til betalingsopsætningen.'
        : response.status === 404
          ? `Stripe kunne ikke finde ${labels[resource] ?? 'opsætningen'}. Kontrollér ID og sandbox.`
          : `Stripe afviste kaldet til ${labels[resource] ?? 'betalingsopsætningen'} (HTTP ${response.status}).`;
    throw new BillingError(message + (diagnostic ? ` (${diagnostic})` : '') + safeReference, 503);
  }
  return response.json();
}

export function validatePlan(price: any): void {
  if (!price?.active || price.currency !== 'dkk' || price.unit_amount !== PLAN_AMOUNT ||
      price.recurring?.interval !== 'month' || price.recurring?.interval_count !== 1 ||
      price.recurring?.usage_type !== 'licensed' || price.billing_scheme !== 'per_unit' ||
      price.tax_behavior === 'inclusive')
    throw new BillingError('Abonnementsprisen er ikke korrekt konfigureret.', 503);
  if (price.livemode !== stripeKey().startsWith('sk_live_')) throw new BillingError('Stripe-miljøerne stemmer ikke overens.', 503);
}

export function subscriptionState(subscription: any, priceId: string) {
  const items = subscription?.items?.data;
  const item = items?.[0];
  const invoice = subscription?.latest_invoice;
  const valid = Array.isArray(items) && items.length === 1 && item.price?.id === priceId && item.quantity === 1 &&
    item.price.currency === 'dkk' && item.price.unit_amount === PLAN_AMOUNT &&
    item.price.recurring?.interval === 'month' && item.price.recurring?.interval_count === 1;
  const start = item?.current_period_start;
  const end = item?.current_period_end;
  const periods = Number.isInteger(start) && Number.isInteger(end) && start < end;
  // Active alone does not prove payment. Only a canonical paid invoice grants
  // a paid billing period; a successful browser redirect never grants access.
  const paid = valid && periods && subscription.status === 'active' && invoice?.status === 'paid';
  return {
    status: paid ? 'active' : subscription.status === 'canceled' || !valid ? 'canceled' : 'past_due',
    periodStart: periods ? new Date(start * 1000).toISOString() : null,
    periodEnd: periods ? new Date(end * 1000).toISOString() : null,
    // Portal cancellations can specify cancel_at rather than the boolean flag.
    // Only map a date matching this period; a later date must not hide renewal.
    cancelAtPeriodEnd: subscription.cancel_at_period_end === true ||
      (periods && Number.isInteger(subscription.cancel_at) && subscription.cancel_at === end),
  };
}

export async function verifyStripeSignature(body: string, signature: string, secret: string, now = Date.now()): Promise<boolean> {
  const values = signature.split(',').map((part) => part.trim().split('='));
  const timestamp = values.find(([name]) => name === 't')?.[1];
  if (!timestamp || !/^\d+$/.test(timestamp) || Math.abs(now / 1000 - Number(timestamp)) > 300) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  for (const [name, value] of values) {
    if (name !== 'v1' || !/^[a-f0-9]{64}$/i.test(value ?? '')) continue;
    const bytes = Uint8Array.from(value.match(/../g)!, (byte) => parseInt(byte, 16));
    if (await crypto.subtle.verify('HMAC', key, bytes, encoder.encode(`${timestamp}.${body}`))) return true;
  }
  return false;
}


export function appOrigin(request: Request): string {
  const configured = Deno.env.get('APP_URL') ?? 'https://xn--hovedetpsmmet-wfb00a.dk';
  const origin = request.headers.get('Origin') ?? new URL(configured).origin;

  const allowed = new Set([
    new URL(configured).origin,
    'http://localhost:4200',
    'http://127.0.0.1:4200',
    'http://localhost:4201', // NYT: Testmiljø
    'http://127.0.0.1:4201', // NYT: Testmiljø
  ]);

  if (!allowed.has(origin)) {
    throw new BillingError('Denne hjemmeside er ikke godkendt til betaling.', 403);
  }

  return origin;
}
