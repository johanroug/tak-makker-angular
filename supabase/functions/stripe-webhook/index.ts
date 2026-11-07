import { createClient } from 'npm:@supabase/supabase-js';
import { stripe, stripeKey, subscriptionState, verifyStripeSignature } from '../_shared/billing/stripe.ts';

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response(null, { status: 405 });
  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!secret) return new Response('Webhook not configured', { status: 503 });
  const body = await request.text();
  if (!await verifyStripeSignature(body, request.headers.get('Stripe-Signature') ?? '', secret))
    return new Response('Invalid signature', { status: 400 });
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  let lease: any;
  try {
    const event = JSON.parse(body);
    if (event.livemode !== stripeKey().startsWith('sk_live_')) return new Response('Wrong Stripe environment', { status: 400 });
    const handled = ['checkout.session.completed','invoice.paid','invoice.payment_failed',
      'customer.subscription.created','customer.subscription.updated','customer.subscription.deleted'];
    if (!handled.includes(event.type)) return Response.json({ received: true });
    const object = event.data.object;
    const subscriptionId = event.type.startsWith('customer.subscription.') ? object.id :
      object.subscription ?? object.parent?.subscription_details?.subscription;
    if (typeof subscriptionId !== 'string' || typeof object.customer !== 'string') return Response.json({ received: true });
    const { data, error } = await admin.rpc('claim_stripe_billing_sync', { p_customer_id: object.customer });
    if (error || !data) throw new Error('Sync busy');
    if (data.unknown) return Response.json({ received: true });
    lease = data;
    // Serialize per company, then retrieve current state: webhook arrival order
    // must not replay an old invoice or overwrite a newer cancellation.
    const subscription = await stripe(`subscriptions/${encodeURIComponent(subscriptionId)}?expand[]=latest_invoice`);
    if (subscription.customer !== object.customer || typeof subscription.created !== 'number') throw new Error('Customer mismatch');
    const state = subscriptionState(subscription, Deno.env.get('STRIPE_PRICE_ID') ?? '');
    const { error: syncError } = await admin.rpc('apply_stripe_billing_sync', {
      p_company_id: lease.companyId, p_token: lease.token, p_event_id: event.id,
      p_event_created: event.created, p_subscription_id: subscription.id,
      p_subscription_created: subscription.created, p_status: state.status,
      p_period_start: state.periodStart, p_period_end: state.periodEnd,
      p_cancel_at_period_end: state.cancelAtPeriodEnd,
    });
    if (syncError) throw new Error('Subscription sync failed');
    lease = undefined;
    return Response.json({ received: true });
  } catch {
    if (lease) await admin.rpc('release_stripe_billing_sync', { p_company_id: lease.companyId, p_token: lease.token });
    return new Response('Subscription sync temporarily unavailable', { status: 503 });
  }
});
