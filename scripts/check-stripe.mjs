import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { runInNewContext } from 'node:vm';
import assert from 'node:assert/strict';

const env={STRIPE_SECRET_KEY:'sk_test_mock'};
const scope={Deno:{env:{get:(name)=>env[name]}},crypto,TextEncoder,Uint8Array,URL,Date,Set,
  AbortSignal,URLSearchParams,fetch:()=>{throw Error('Unexpected external call');}};
const source=readFileSync('supabase/functions/_shared/billing/stripe.ts','utf8')
  .replaceAll('export const ','const ').replaceAll('export class ','class ')
  .replaceAll('export function ','function ').replaceAll('export async function ','async function ');
runInNewContext(stripTypeScriptTypes(source)+
  '\nglobalThis.api={validatePlan,subscriptionState,verifyStripeSignature,appOrigin,stripeKey,checkoutIdempotencyKey};',scope);
const checkoutParams = { mode: 'subscription', customer: 'cus_test', success_url: 'http://localhost:4200/company-profile' };
const checkoutKey = await scope.api.checkoutIdempotencyKey('company', 'attempt', checkoutParams);
assert.equal(checkoutKey, await scope.api.checkoutIdempotencyKey('company', 'attempt', { ...checkoutParams }), 'Retries keep the same key');
assert.equal(checkoutKey, await scope.api.checkoutIdempotencyKey('company', 'attempt', Object.fromEntries(Object.entries(checkoutParams).reverse())), 'Field ordering does not change the key');
assert.notEqual(checkoutKey, await scope.api.checkoutIdempotencyKey('company', 'attempt', { ...checkoutParams, success_url: 'https://example.com/company-profile' }), 'Changed parameters require a different key');
assert.notEqual(checkoutKey, await scope.api.checkoutIdempotencyKey('company', 'new-attempt', checkoutParams));
assert.ok(checkoutKey.length <= 255);
const checkoutSource = readFileSync('supabase/functions/billing-session/index.ts', 'utf8');
assert.ok(!checkoutSource.includes('expires_at: String(Math.floor(Date.now()'), 'Checkout retries must not send a moving expiry');
assert.ok(!checkoutSource.includes('payment_method_types'), 'Checkout uses Dashboard-managed payment methods with the current Stripe API');
const {validatePlan,subscriptionState,verifyStripeSignature,appOrigin,stripeKey}=scope.api;
const price={id:'price_plan',active:true,currency:'dkk',unit_amount:29900,livemode:false,tax_behavior:'exclusive',
  billing_scheme:'per_unit',recurring:{interval:'month',interval_count:1,usage_type:'licensed'}};
validatePlan(price);
assert.throws(()=>validatePlan({...price,unit_amount:14900}));
assert.throws(()=>validatePlan({...price,tax_behavior:'inclusive'}));
assert.throws(()=>validatePlan({...price,livemode:true}));
const subscription={status:'active',cancel_at_period_end:false,latest_invoice:{status:'paid'},items:{data:[{
  quantity:1,price,current_period_start:1000,current_period_end:2000,
}]}};
assert.equal(subscriptionState(subscription,'price_plan').status,'active');
assert.equal(subscriptionState({...subscription,latest_invoice:{status:'open'}},'price_plan').status,'past_due');
assert.equal(subscriptionState({...subscription,status:'canceled'},'price_plan').status,'canceled');
assert.equal(subscriptionState(subscription,'another_price').status,'canceled');
assert.equal(subscriptionState({...subscription,cancel_at_period_end:true},'price_plan').status,'active');
assert.equal(subscriptionState({...subscription,cancel_at_period_end:false,cancel_at:2000},'price_plan').cancelAtPeriodEnd,true);
assert.equal(subscriptionState({...subscription,cancel_at_period_end:false,cancel_at:2000},'price_plan').status,'active');
assert.equal(subscriptionState({...subscription,cancel_at:null},'price_plan').cancelAtPeriodEnd,false);
assert.equal(subscriptionState({...subscription,cancel_at:3000},'price_plan').cancelAtPeriodEnd,false);
assert.equal(subscriptionState({...subscription,canceled_at:1500},'price_plan').cancelAtPeriodEnd,false);
assert.equal(appOrigin(new Request('https://example.test',{headers:{Origin:'http://localhost:4200'}})),'http://localhost:4200');
assert.throws(()=>appOrigin(new Request('https://example.test',{headers:{Origin:'https://evil.example'}})));
env.STRIPE_SECRET_KEY='sk_live_mock';
assert.throws(()=>stripeKey(),'Live payments must remain disabled by default');
env.STRIPE_SECRET_KEY='sk_test_mock';
const body='{"id":"evt_test","data":{"value":1}}';
const timestamp=Math.floor(Date.now()/1000);
const encoder=new TextEncoder();
const key=await crypto.subtle.importKey('raw',encoder.encode('whsec_mock'),{name:'HMAC',hash:'SHA-256'},false,['sign']);
const bytes=new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(`${timestamp}.${body}`)));
const signature=Array.from(bytes,(byte)=>byte.toString(16).padStart(2,'0')).join('');
assert.equal(await verifyStripeSignature(body,`t=${timestamp},v1=${signature}`,'whsec_mock'),true);
assert.equal(await verifyStripeSignature(body+' ',`t=${timestamp},v1=${signature}`,'whsec_mock'),false);
assert.equal(await verifyStripeSignature(body,`t=${timestamp},v1=${signature}`,'wrong_secret'),false);
assert.equal(await verifyStripeSignature(body,`t=${timestamp},v1=${signature}`,'whsec_mock',Date.now()+301000),false);
assert.equal(await verifyStripeSignature(body,`t=${timestamp},v1=bad,v1=${signature}`,'whsec_mock'),true);
console.log('Stripe checks passed: plan, paid access, cancellation, environment, redirects and signed raw-body webhooks.');
