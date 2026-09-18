# Miguelitos Ice Cream Web POS

Installable, online-first web POS for phones, tablets, and PCs. Blue/purple theme with the supplied Miguelitos logo.

## Current status — 18 September 2026

Implemented and TypeScript-checked. Thirty-two isolated sales/database workflow checks pass.
Not deployed and not yet verified in a browser or on a phone. Do not use this build for live sales yet.
The local environment rejects Node child processes (`spawn EPERM`), blocking the Vite preview and production build. Sites automatic publication after a source push is not enabled for this project, so publication still requires a successful build.

The existing desktop POS and its business database were not changed. This web app starts with a separate empty database; no desktop products, pictures, users, or sales have been migrated.

## Included

- Product catalog with saved PNG/JPG pictures, category filters, search, prices and stock.
- Product create/edit/delete or deactivate when history exists.
- Cash, GCash and Card sale recording, stock deduction, receipts and browser printing.
- Per-item percentage discount, additional order discount, PWD/Senior name and ID on receipts.
- Inventory adjustments and stock movement history.
- Manila-date reports, transactions, best sellers, Hershey’s/Vanilla Cone/8oz/12oz counts, unclassified items.
- CRUNCHIES classified as Vanilla; item category/name/size snapshots preserve historical counts.
- Admin/Cashier roles, staff access and store settings.
- Web manifest, app icons, install guidance and an offline notice.
- Checkout request identifiers prevent duplicate saves on retry. An interrupted order is temporarily kept in session storage for recovery in the same browser tab. Sales remain authoritative in D1.

## Limits

- Internet is required. Offline sale recording is not implemented.
- Payments are recorded only; this does not charge cards or initiate GCash transfers.
- Printing uses device/browser print support; a particular thermal printer has not been tested.
- Hosted authentication is Sign in with ChatGPT. Staff need both Site viewer access and an active POS staff entry.
- The Site remains owner-private. Use the owner account for initial testing.
- Device/browser UI testing, hosted storage and sign-in validation, and WebMCP runtime validation remain pending.

## Development

Uses the retained Vinext/React starter, D1 structured storage, R2 product pictures, and Sites hosting. Keep the registered project ID in `.openai/hosting.json` unchanged.

Run `npm run install:ci` in an environment that allows package lifecycle scripts, then `npm run dev` / `npm run build`. This checkout's dependencies were extracted with lifecycle scripts disabled after the normal installer was denied process creation; rerun the normal installation when that restriction is resolved.

`node scripts/verify-workflows.mjs` tests the actual store and API handlers against an in-memory SQLite implementation of the D1 calls. It tests transaction rollback, calculations, idempotency, counts and access control. This is not a substitute for testing Cloudflare or the browser.

`npx tsc --noEmit` checks TypeScript.

Initial schema SQL and Drizzle metadata are in `drizzle/`. No migration has been deployed. Future applied migrations must remain immutable; use new migrations for later changes.

For local D1: after a successful build, apply the migration with the retained starter's documented local Wrangler workflow before testing the complete UI. Production migrations are applied by Sites during publishing.

## Image credit

Empty-catalog image: Steven Depolo, “Vanilla Ice Cream Cone at Camp Manitoulin,” CC BY 2.0.
Source: https://commons.wikimedia.org/wiki/File:Vanilla_Ice_Cream_Cone_at_Camp_Manitoulin.jpg
License: https://creativecommons.org/licenses/by/2.0/
Brand logo supplied by the user.


