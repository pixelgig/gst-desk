# Checkpoint 03 — local intake preview

Added an isolated development route at /order-intake with accessible file/passphrase controls, encrypted local save, duplicate feedback, fingerprint-based reopen, verified original download, encrypted-original export and nonmutating export inspection. Start with `node scripts/dev.js`. The existing application remains the development root route. Production Worker source/configuration is unchanged.

This preview is deliberately labeled local-only. No searchable index, field extraction, invoice approval, cloud persistence or downstream accounting is connected. It is not yet the accepted 17th workspace. The HTTP server exposes only allowlisted source module paths and never serves arbitrary workspace/private files.

Verification: client/dev scripts pass Node syntax checks. All 16 tests pass; 24 legacy inline scripts parse; schema check reports 19 tables. Browser navigation to localhost timed out in the available browser environment. Therefore upload/download/IndexedDB behavior and responsive visual QA are unverified. No browser E2E pass is claimed. Existing unit tests exercise storage orchestration through an in-memory adapter.

Deployed: nothing. The branch is for incremental review only. Keep the production release gate closed.
