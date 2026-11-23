# Checkpoint 04 — shipping and settlement evidence domains

Implemented pure, modular tracking capabilities/history and settlement/bank allocation calculations. Valmo capability explicitly reports no automatic synchronization and offers the official tracking URL. Late-arriving events remain in history; the latest actual event time supplies current status. No ETA or payment state is inferred from delivery.

Settlement totals deduplicate identical evidence, reject conflicting identities and duplicate allocations, distinguish partial/full/disputed/negative platform settlements, and keep forecasts unknown. Bank-received calculations require supplied bank-credit records and approved allocations; missing evidence or overallocated credits are rejected. These functions are not connected to the legacy tools or a persistent API yet. They do not verify authenticity of an uploaded source document or replace reviewer authorization.

Verification: `node --test` passes 24 tests, 0 failures, on Node 24.22.1. `git diff --check` passes. Existing generated browser scripts still parse (24 scripts); SQLite snapshot plus additive migration still yields 19 tables. HTTP preview and browser E2E remain unverified because localhost connections timed out. No D1 runtime, R2, post-deploy, real-PDF extraction, GST utility validation, accessibility or resource benchmark pass is claimed.

Deployed: nothing. No new costs, subscriptions, filings or production changes. All 17 workspaces remain partial in the acceptance matrix. Next work remains typed authenticated API, actual PDF extraction/manual review, browser persistence verification, shared event consumers and full import/restore integration.
