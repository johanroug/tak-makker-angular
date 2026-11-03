# Registration company details

Registration now collects CVR, company name/address, one or more trades and optional phone.
CVR lookup fills the company fields; manual entry remains available during outages.
Lookup is informational and does not verify ownership or grant company membership.

## Release order

Multiple trades: `202611030002_multiple_company_trades.sql` has also been applied
on 3 November 2026. Existing single trades were copied into `companies.trades`.
The legacy `trade` column stays synchronized for older open clients. New signup
metadata supports `trades`, with a fallback for old single-trade registrations.
The deployed AI function reads all selected trades from the project's company.

1. `supabase/migrations/202611030001_registration_company.sql` was applied to the
   linked Supabase project on 3 November 2026. Do not re-run it; the new column and
   constraint already exist.
2. CVR lookup now calls CVR API v6 directly from the browser, without Supabase
   credentials or cookies. No Edge Function deployment is needed for this path.
   The obsolete Supabase lookup function and its local files have been removed.
3. A real browser lookup on localhost with CVR 19555305 was verified: it fills
   BAUHAUS DANMARK A/S, Anelystparken 16, 8381 Tilst. Repeat the smoke test on the
   production domain after frontend deployment.
4. Deploy the Angular build. The profile query requires the new `companies.trade`
   column, so do not release the frontend before the migration.
5. Register a new account and confirm its email, then verify the created company
   has the registration details and that
   the trades can be edited and saved together in the company profile.

Only newly created companies receive signup defaults. Existing companies are not
overwritten. The onboarding function retains its access check and user lock.

Direct requests use the visitor's connection and the provider's limits. Successful
lookups are cached for the lifetime of the page. Users can enter company details
manually if the provider or their network blocks lookup. Provider documentation:
https://cvrapi.dk/documentation

## Verification

- `npm.cmd run build`
- `node scripts/check-direct-company-lookup.mjs`
- `node scripts/check-ai-trade.mjs`
- `supabase/tests/multiple_company_trades.sql` (passed on the linked database;
  all fixture changes were rolled back)

## Outstanding product work

- Activate and verify company lookup and profile migration in the target environment.
- Company trial and self-service access are now deployed on the server; publish
  the frontend and complete the walkthrough in `company-trial.md`.
- Integrate Stripe checkout, subscription webhooks and customer portal.
- Confirm paid price and request allowance; 149 DKK excluding VAT and 500 monthly
  requests are proposals, not accepted pricing.
