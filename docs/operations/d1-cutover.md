# GST Desk Cloudflare D1 migration — existing project

## Production state (18 November 2026)

**Deployed:** GST Desk `gst.nividhi.in` is now protected by an owner-only
Cloudflare Access application named `GST Desk Private Workspace`. The existing
`gst-desk-preview` Worker serves the database-backed compatibility frontend,
authenticated D1 API and September Meesho historical summary.

The D1 database is the **existing** `gst-desk-db`; no second database, repository
or paid storage plan was created. Production Worker source and all schema
migrations live in the existing repository's `main` branch.

The Worker validates a Cloudflare Access JWT (signed RS256, audience and
issuer verification, expiration and owner email), followed by an active
business-owner membership check in D1.

### September 2026 import: verified persisted rows

- **2 source ZIP manifests** with SHA-256 checksums, not ZIP binaries
- **12 Meesho sales**, **1 return**: source precision retained beside per-row paise
- **14 invoice/credit-note metadata records**, including product descriptions,
  HSN, order/document dates, SHA-256 hashes, and PDF-printed tax components
- Of those documents, **13 are dated September** and **one invoice is dated
  2026-10-01**, so do not count that invoice as issued in September
- **2 filed-return summaries**, GSTR-1 and GSTR-3B, from previously supplied
  September PDFs, preserving the filed totals independently from worksheets
- Filed taxable outward value is ₹1,695.85; IGST ₹46.64, CGST ₹3.52 and SGST
  ₹3.52. Row-by-row rounding gives differences of ₹0.01 taxable and ₹0.02 tax
  against the filed totals. This is logged, not silently normalized.

**Original PDFs and ZIP binaries are not stored in D1.** Keep the originals,
which were examined and hashed during this migration. A future archive/upload
solution must avoid paid R2 activation and use authenticated access.

### Verification

- D1 SQL queries confirmed the imported row counts and intact records.
- GitHub Actions tests validate syntax, data isolation, revision conflicts,
  browser compatibility scripts and Hindi Alexa model source.
- Unauthenticated request to direct workers.dev endpoint returned HTTP 403
  `not_authorized`, not `cloud_configuration_incomplete`.
- Unauthenticated custom-domain request redirected to private Cloudflare
  Access login. The secure Worker and Access bindings were verified by API.
- **An owner-signed-in end-to-end browser test is still required**. The
  assistant cannot complete the user's one-time-passcode login from here.

### Remaining manual/operational actions

1. Open `https://gst.nividhi.in`, log in through Cloudflare Access with
   the email allowed in your existing owner policy.
2. Confirm the September cloud-import card appears in the Meesho workspace
   and that it displays 12 sales, 1 return, and 14 document records.
3. If the same phone/browser has older `localStorage` data, use the
   **Import old browser records** action when shown. This is an explicit copy
   into D1; existing cloud records are never silently overwritten.
   **Do not clear browser data before verifying cloud save.**
4. Confirm another authorized browser shows the same persistent records.
5. Inspect the GST/Meesho workspaces and reconcile any discrepancies against
   original invoices and filed returns. Imported records are historical;
   there is no live Meesho API feed or present-day delivery status.
6. Configure the existing Amazon Alexa-hosted skill separately with secure
   read-only API access. Its handler can never infer today's Meesho counts
   from historical September returns.
7. Monitor D1 storage and query quotas; take periodic private exports/backups.

### Deployment configuration

- `wrangler.jsonc` binds the existing D1 and uses `keep_vars: true` to
  preserve environment variables configured through Cloudflare.
- The deployed Worker currently requires:
  `DB`, `ACCESS_ISSUER`, `ACCESS_AUDIENCE`,
  `GST_OWNER_EMAIL`, `GST_BUSINESS_ID`.
  **Never commit owner email or credentials to the public repository**.
- For future deployments, verify active Cloudflare Access application,
  binding IDs, the secure environment variables, and the current
  Worker version before pushing. Accidentally redeploying a version
  without these settings will cause `cloud_configuration_incomplete`.
- Keep the older Worker versions available for code rollback; rolling back
  a Worker does **not** roll back D1 data. Avoid replacing imported financial
  records with browser backups automatically.
