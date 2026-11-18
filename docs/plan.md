# Engineering checkpoints

0. Audit source, capture executable generated-client syntax tests, establish privacy exclusions and acceptance matrix.
1. Add decimal-safe intake contracts, review validation and additive tenant-scoped storage schema. Keep deployment entrypoint unchanged until staging passes.
2. Implement authenticated vault API and browser extraction/review UI, private original storage, hash verification, quota admission and recoverable commits. Fail closed while bindings or identity are absent.
3. Add idempotent events and projections for order, sales, inventory, catalogue and tracking. No inventory movement merely from an upload.
4. Preserve and modularize the existing GST importer; prove September cross-period reconciliation with private inputs and synthetic public tests.
5. Settlement/bank imports and audited matching, evidence-based forecasts, profit and return workflows.
6. Complete remaining workspace CRUD/import/export, encrypted backups and migration dry runs.
7. Browser/security/resource/restore tests, isolated staging and gated production cutover.

Each checkpoint records implemented behavior, tests, deployment state and unresolved acceptance requirements. Internal schema checks are never GST portal certification. Do not enable paid subscriptions, file returns or change production credentials.
