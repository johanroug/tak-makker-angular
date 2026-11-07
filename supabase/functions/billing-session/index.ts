import { createClient } from 'npm:@supabase/supabase-js';
import { appOrigin, BillingError, checkoutIdempotencyKey, paymentsEnabled, stripe, stripeKey, validatePlan } from '../_shared/billing/stripe.ts';

Deno.serve(async (request) => {
  let origin: string;
  try { origin = appOrigin(request); } catch { return new Response(null, { status: 403 }); }
  const headers = { 'Access-Control-Allow-Origin': origin, Vary: 'Origin',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
  if (request.method === 'OPTIONS') return new Response(null, { headers });
  const paymentEnabled = paymentsEnabled(origin, Deno.env.get('STRIPE_SECRET_KEY') ?? '',
    Deno.env.get('STRIPE_ALLOW_LIVE') === 'true');
  // Public status exposes configuration readiness, never secrets or customer data.
  if (request.method === 'GET') return Response.json({
    checkoutReady: paymentEnabled && !!Deno.env.get('STRIPE_PRICE_ID') &&
      !!Deno.env.get('STRIPE_WEBHOOK_SECRET') && !!Deno.env.get('STRIPE_TAX_RATE_ID'),
    testMode: !(Deno.env.get('STRIPE_SECRET_KEY') ?? '').startsWith('sk_live_'),
  }, { headers });
  if (request.method !== 'POST') return new Response(null, { status: 405, headers });
  if (!paymentEnabled) return Response.json({ error: 'Abonnementer åbner snart. Du kan fortsat bruge dine gratis forespørgsler.' },
    { status: 503, headers });
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  let companyId: string | undefined;
  let token: string | undefined;
  let customerId: string | null = null;
  const save = async (session?: any, release = true) => {
    const { data, error } = await admin.rpc('save_company_checkout', {
      p_company_id: companyId, p_token: token, p_customer_id: customerId,
      p_session_id: session?.id ?? null,
      p_expires_at: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
      p_release: release,
    });
    if (error || data !== true) throw new BillingError('Betalingsopsætningen blev afbrudt. Prøv igen.', 503);
    if (release) token = undefined;
  };
  const portal = async () => {
    const configs = await stripe('billing_portal/configurations?active=true&limit=100');
    let config = configs.data.find((entry: any) => entry.metadata?.app === 'hovedet-paa-soemmet-v1');
    if (!config) config = await stripe('billing_portal/configurations', {
      'metadata[app]': 'hovedet-paa-soemmet-v1',
      'features[payment_method_update][enabled]': 'true',
      'features[invoice_history][enabled]': 'true',
      'features[subscription_cancel][enabled]': 'true',
      'features[subscription_cancel][mode]': 'at_period_end',
    }, 'hovedet-paa-soemmet-portal-v1');
    const session = await stripe('billing_portal/sessions', {
      customer: customerId!, configuration: config.id, return_url: `${origin}/company-profile#subscription`,
    });
    await save();
    return Response.json({ url: session.url }, { headers });
  };
  try {
    const authorization = request.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) throw new BillingError('Log ind igen.', 401);
    const user = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: identity, error: authError } = await user.auth.getUser(authorization.slice(7));
    if (authError || !identity.user) throw new BillingError('Log ind igen.', 401);
    const body = await request.json();
    if (!['checkout','portal'].includes(body.action)) throw new BillingError('Ukendt handling.');
    const { data: usage, error: accessError } = await user.rpc('get_company_billing',
      body.companyId ? { p_company_id: body.companyId } : {});
    if (accessError || !usage?.companyId) throw new BillingError('Ingen adgang til virksomhedens abonnement.', 403);
    stripeKey();
    companyId = usage.companyId;
    const { data: lease, error: leaseError } = await admin.rpc('claim_company_checkout', {
      p_company_id: companyId, p_user_id: identity.user.id,
    });
    if (leaseError) throw new BillingError('Kunne ikke gøre betalingen klar.', 503);
    if (!lease) throw new BillingError('En betaling er ved at blive gjort klar. Prøv igen om lidt.', 409);
    token = lease.token;
    let attempt = lease.attempt;
    customerId = lease.customerId;
    if (body.action === 'portal') {
      if (!customerId) throw new BillingError('Virksomheden har endnu ikke et Stripe-abonnement.');
      return await portal();
    }
    if (lease.accessOverride !== 'none') throw new BillingError('Virksomheden har allerede fri adgang.');
    const priceId = Deno.env.get('STRIPE_PRICE_ID');
    const taxRateId = Deno.env.get('STRIPE_TAX_RATE_ID');
    if (!priceId || !taxRateId || !Deno.env.get('STRIPE_WEBHOOK_SECRET'))
      throw new BillingError('Abonnementer er snart klar. Betalingsopsætningen mangler at blive afsluttet.', 503);
    const price = await stripe(`prices/${encodeURIComponent(priceId)}`);
    validatePlan(price);
    if (price.tax_behavior !== 'exclusive') {
      const settings = await stripe('tax/settings');
      if (settings.defaults?.tax_behavior !== 'exclusive') throw new BillingError('Prisen skal være ekskl. moms.', 503);
    }
    const tax = await stripe(`tax_rates/${encodeURIComponent(taxRateId)}`);
    if (!tax.active || tax.inclusive || tax.percentage !== 25 || tax.country !== 'DK')
      throw new BillingError('Dansk moms er ikke korrekt konfigureret.', 503);
    if (!customerId) {
      const { data: company, error } = await user.from('companies').select('name,cvr,email,address').eq('id', companyId).single();
      if (error || !company?.name?.trim() || !/^\d{8}$/.test(company.cvr ?? ''))
        throw new BillingError('Udfyld navn og CVR i virksomhedsprofilen først.');
      const customer = await stripe('customers', {
        name: company.name, email: company.email || identity.user.email || '',
        'address[country]': 'DK', 'address[line1]': (company.address ?? '').slice(0, 200),
        'invoice_settings[custom_fields][0][name]': 'CVR',
        'invoice_settings[custom_fields][0][value]': company.cvr,
        'metadata[company_id]': companyId!,
      }, `company-customer-${companyId}`);
      customerId = customer.id;
      await save(undefined, false);
    }
    const subscriptions = await stripe(`subscriptions?customer=${encodeURIComponent(customerId!)}&status=all&limit=100`);
    if (subscriptions.data.some((entry: any) => !['canceled','incomplete_expired','incomplete'].includes(entry.status))) return await portal();
    if (lease.sessionId) {
      const session = await stripe(`checkout/sessions/${encodeURIComponent(lease.sessionId)}`);
      if (session.customer !== customerId) throw new BillingError('Ugyldig betalingssession.', 503);
      if (session.status === 'open' && session.expires_at * 1000 > Date.now()) {
        await save();
        return Response.json({ url: session.url }, { headers });
      }
      if (session.status === 'complete' && !subscriptions.data.some((entry: any) =>
          entry.id === session.subscription && ['canceled','incomplete_expired'].includes(entry.status)))
        throw new BillingError('Betalingen er modtaget. Vent et øjeblik på aktivering, og opdatér siden.', 409);
      const { data: nextAttempt, error: rotateError } = await admin.rpc('rotate_company_checkout_attempt', {
        p_company_id: companyId, p_token: token,
      });
      if (rotateError || !nextAttempt) throw new BillingError('Kunne ikke gøre betalingen klar.', 503);
      attempt = nextAttempt;
    }
    if (subscriptions.data.some((entry: any) => !['canceled','incomplete_expired'].includes(entry.status))) return await portal();
    // Let Stripe set its default expiry. A moving timestamp breaks safe retries.
    const params = {
      mode: 'subscription', customer: customerId!,
      'line_items[0][price]': priceId, 'line_items[0][quantity]': '1',
      'subscription_data[metadata][company_id]': companyId!,
      'subscription_data[default_tax_rates][0]': taxRateId,
      client_reference_id: companyId!, locale: 'da',
      success_url: `${origin}/company-profile?checkout=success#subscription`,
      cancel_url: `${origin}/company-profile?checkout=canceled#subscription`,
    };
    const session = await stripe('checkout/sessions', params,
      await checkoutIdempotencyKey(companyId!, attempt, params));
    await save(session);
    return Response.json({ url: session.url }, { headers });
  } catch (error) {
    if (token) { try { await save(); } catch { /* A stale lease expires automatically. */ } }
    return Response.json({ error: error instanceof BillingError ? error.message : 'Kunne ikke åbne betalingen. Prøv igen.' }, {
      status: error instanceof BillingError ? error.status : 503, headers,
    });
  }
});
