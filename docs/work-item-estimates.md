# Internal estimate basis

`project_work_items.estimate_basis` stores internal assumptions separately from
the customer-facing task description. It is displayed under the description in
the draft review and is not copied into offer snapshots or PDFs.

AI work items include nullable `estimateBasis`. A string means an unresolved
assumption; null explicitly removes a note once its important facts are clarified.
Older responses without this property leave the stored note unchanged. The next
AI call receives the saved note in its work-item context. A note-only change is
allowed even when hours are manual, while descriptions, status and manual hours
remain protected. Updates compare the original row snapshot so concurrent edits
win rather than being overwritten.

Migration `202611030004_work_item_estimate_basis.sql` was applied on 3 November
2026. It also moves recognizable trailing sentences beginning with “Foreløbigt
estimeret” from suggested (not yet approved) work items into the new note field.
Approved tasks and existing offer snapshots are untouched.

The new response schema and instructions were deployed in `generate-offer`.
Frontend deployment is still needed for note rendering and note-only updates.

Validation: `npm.cmd run build`, `node scripts/check-work-item-notes.mjs`,
`node scripts/check-ai-trade.mjs` and `supabase/tests/work_item_estimate_basis.sql`
passed. Live AI wording and the full browser walkthrough remain to be verified.
