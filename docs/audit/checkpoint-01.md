# Checkpoint 01 — discovery and intake foundations

Implemented: privacy exclusions, generated-client syntax regression, exact paise arithmetic, real-date validation, semantic invoice identities, separate recipient roles, charge-line reconciliation, field provenance checks and bounded file/archive metadata policy. These are modular pure functions; no claim of a finished extraction pipeline.

Storage: additive migration for immutable-document metadata/version records, extracted fields, review decisions, orders, invoices/lines, shipments, transactional outbox, consumer receipts and idempotency responses. Composite business/document keys prohibit cross-tenant references. No production database changes.

Verification on Windows / Node 24.22.1: `node --test`: 13 passed, 0 failed. `node scripts/check-schema.js`: 19 total tables after applying snapshot and migration in memory. `node scripts/verify-legacy.js`: HTTP 200 and 24 generated inline scripts parsed. Original 16 workspace IDs present. `git diff --check`: no whitespace errors. No browser E2E, PDF extraction, D1 runtime, Worker CPU benchmark, authentication or R2 authorization test has passed yet. SQLite tests are not D1 runtime tests.

Synthetic normalization totals: taxable 12,166 paise; IGST 365 paise; invoice 12,531 paise. Billing/shipping differences produce review issues. Payout and bank receipt remain null. This test does not establish private-label extraction or end-to-end duplicate handling. Schema tests cover hash uniqueness, cross-tenant foreign keys, outbox event uniqueness and transaction rollback.

Deployment: none. Existing production Worker and customer data unchanged. Build IDs: none. Existing production URL: https://gst.nividhi.in/ (not functionally verified in this checkpoint).

Human-only dependencies: R2 subscription decision and billing review (no automatic activation); authorized owner login configuration before deployment; November reference PDF under ignored private-fixtures; accountant/official utility validation before statutory export claims. Engineering may continue locally without these.

Next executable work: secure typed API and identity verification, local-only encrypted vault adapter, browser extraction/review wizard, constrained private R2 adapter behind explicit entitlement flag, integration/E2E tests and workspace event consumers. All 17 workspace acceptance statuses remain partial; see workspace-matrix.md. No final release claim.
