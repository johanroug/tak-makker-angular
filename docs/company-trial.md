# Company trial and subscription status

Each company starts with 10 free completed generations from activation; historical
usage is not retroactively billed. All company members share this allowance.
Administratorrollen giver ikke automatisk fri adgang. Virksomheder kan få en
udtrykkelig manuel undtagelse; se `manual-ai-access.md`. Ejerens virksomhed har
nu denne interne adgang.

`202611030003_company_trial.sql` creates private billing and request tables plus
guarded RPCs. It removes manual approval as an app entry requirement. The user
blocklist, company membership checks, RLS and admin checks remain in effect.
Email confirmation remains controlled by Supabase Auth settings.

Only the Edge Function's service-role client may reserve or settle a request.
Company-row locks serialize reservations and settlements. Pending reservations
take up slots without incrementing completed usage. They expire after five
minutes so interrupted workers cannot permanently consume trial capacity.
OpenAI calls time out after 90 seconds without automatic retries. A structured
response must succeed before settlement; failed or expired calls are not charged.
Duplicate settlements cannot double count. Generations are counted on the server
when the structured response is completed, before the browser saves it to the
project. A connection loss after completion or a later browser save failure does
not undo a completed generation.

The member RPC exposes only the current company's subscription status and usage.
Exhaustion does not affect ordinary project, profile or PDF access. The UI shows
usage in the profile, conversation and project-creation dialog. Completion number
10 raises a persistent, dismissible notice with a link to the profile's subscription
section. Payment is not available yet; that section makes this clear.

Stripe integration, paid plan price, renewal rules and paid monthly allowance are
still separate work. The private `subscription_status` and `access_until` fields
provide a future integration point. No API currently grants paid access to users.
An active subscription with a future access date bypasses the trial counter; do
not activate this field until the paid usage policy is implemented.

## Deployment and verification

1. Apply the trial migration before deploying the Edge Function or frontend.
2. Run `supabase/tests/company_trial.sql`; fixtures are rolled back. It needs two
   existing nonblocked users and checks shared allowance, reserved slots,
   failed/expired calls, duplicate completion, permissions and company isolation.
3. Deploy `generate-offer`. `SUPABASE_SERVICE_ROLE_KEY` is read only inside the
   function; never put it in Angular configuration.
4. Run `node scripts/check-ai-trade.mjs` and `npm.cmd run build`.
   `node scripts/check-billing.mjs` also checks the exhaustion notice, session
   changes and network errors in the frontend service.
5. Deploy the frontend and verify the profile, remaining-call display, tenth-call
   notice, exhausted request rejection and new-user email confirmation in-browser.

The SQL migration and Edge Function were deployed on 3 November 2026. Database
tests passed with rollback. Frontend deployment and the full browser walkthrough
remain outstanding.
