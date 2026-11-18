# Workspace acceptance matrix

Baseline evidence: source at 3536eec. Existing screen presence is verified by tests/legacy.test.js; this is not behavioral acceptance. No workspace has passed independent-browser persistence, security, restore and post-deploy gates.

| Workspace / ID | Present implementation | Missing acceptance / priority | Phase | Tests | Status |
|---|---|---|---|---|---|
| Overview / dashboard | Embedded dashboard | DB-derived traceable KPIs; high | 3 | Navigation/syntax only | partial |
| Sales & Purchases / records | Local records UI | Typed source ledger, cloud CRUD; high | 3 | Navigation/syntax only | partial |
| GST Worksheets / returns | Embedded worksheets | Close/amend/audit, DB lineage; high | 4 | Navigation/syntax only | partial |
| Backup & Restore / backup | Browser export UI | Encrypted complete backup and restore rehearsal; critical | 1/6 | Navigation/syntax only | partial |
| Meesho Importer / meesho | ZIP reconciliation and PDF-date logic | Synthetic/private regression, official export validation; critical | 4 | Navigation/syntax only | partial |
| GSTR-3B / gstr3b | Embedded draft tool | Proven ITC decisions and versioned rules; high | 4 | Navigation/syntax only | partial |
| Filing Calendar / filing | Embedded calendar | Dated official sources, evidence, ICS; medium | 5 | Navigation/syntax only | partial |
| ITC / itcrecon | Embedded reconciliation | Reviewed 2B matching and audit; high | 4 | Navigation/syntax only | partial |
| Meesho Profit / profit | Embedded calculator | Actual settlement and bank evidence; high | 5 | Navigation/syntax only | partial |
| Orders / orders | Embedded management | Shared event lifecycle and source links; critical | 3 | Navigation/syntax only | partial |
| Inventory / inventory | Embedded inventory | Idempotent ledger and reservations; high | 3 | Navigation/syntax only | partial |
| Migration / migration | Embedded migration | Lossless dry-run and rollback; critical | 6 | Navigation/syntax only | partial |
| GST Lab / taxlab | Embedded calculation engine | Effective rules and comprehensive money tests; high | 4 | Navigation/syntax only | partial |
| Invoice Studio / invoice-studio | Local draft register/print/restore | Auth seller/sequence lifecycle and cloud CRUD; high | 6 | Navigation/syntax only | partial |
| Valmo / valmo | Proxy and tracking UI | Authorized manual workflow, truthful freshness; critical | 3 | Navigation/syntax only | partial |
| Catalogue / catalogue | Embedded catalogue | Shared SKU master and mapping audit; high | 3 | Navigation/syntax only | partial |
| Intake / order-intake | Absent at baseline | Full upload/extract/review/vault/distribution; critical | 1–3 | Pending | partial |
