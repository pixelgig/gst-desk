# GST Desk Cloudflare D1 cutover — same app and main branch

Status: **CODE PREPARED ONLY, NOT DEPLOYED**. Live site remains at https://gst.nividhi.in.
The D1 database is named gst-desk-db. This document is not an authorization to
overwrite stored customer/financial records or deploy untested changes.

## Current state verified November 18, 2026

- Production Worker gst-desk-preview has NO D1 binding; staging API has DB.
- Existing D1 schema has no users, memberships, businesses, drafts, or transactions.
- The legacy Worker is a large inlined HTML application storing several workspaces
  with localStorage. Browser data from different devices cannot be recovered from D1.
- The user owns two September Meesho archives:
  gst_4953898_9_2026.zip and
  4953898_2026-09-01_2026-09-30_TAX_INVOICE.zip.
- Original ZIP bytes are NOT available to this execution session. Do NOT claim
  to have imported documents, invoices, or raw archives.
- Filed GSTR-1/GSTR-3B September 2026 PDFs were read. Their summary can be
  imported PRIVATELY after migration; never commit unredacted GSTIN, owner
  contact details, invoice documents, or return values to the public repository.

## Changes made in the existing project

- Existing worker code now consumes an authenticated, D1-based adapter instead
  of localStorage. Cached state is memory-only and keyed by the authenticated
  business. A user may explicitly copy old localStorage keys into D1 after
  seeing a confirmation; no automatic overwrite of existing cloud data.
- New REST endpoints:
  - GET /api/state — list tenant state and revisions
  - PUT /api/state/:key — compare-and-swap update with origin check
  - DELETE /api/state/:key — compare-and-swap delete with origin check
  - GET /api/returns/summary?period=MMYYYY — filed return aggregate only
- State writes warn when cloud sync fails; the page offers an emergency JSON
  export. Unsaved changes warn before closing the page.
- D1 migration database/migrations/0002_cloud_state_and_filed_returns.sql is
  additive. ZIP/PDF binaries are not stored as SQL values.
- wrangler.jsonc refers to the EXISTING D1 database, not a new database.

## Blocking prerequisites before live deployment

1. Back up the existing D1 database AND export the old browser-local data
   from the browser where records currently exist.
2. Apply the new D1 migration and verify constraints and existing schema.
3. Provision the authenticated user/business/membership using a private,
   audited seed — never a seed containing personal details in public Git.
4. Protect gst.nividhi.in with Cloudflare Access and a strict owner-only
   allow policy. The existing /admin policy is NOT sufficient for the root URL.
5. Set runtime secrets/config securely on the Worker (NOT in GitHub):
   ACCESS_ISSUER — exact team issuer origin
   ACCESS_AUDIENCE — audience for the FULL SITE Access application
   GST_OWNER_EMAIL — authorized operator email
   GST_BUSINESS_ID — existing business ID in D1
6. Validate the JWT verification with the real Access app. Test unauthorized
   requests (401/403), expired/wrong-audience JWT, other tenant, double-write
   conflict (409), old browser import, second browser login, and offline edits.
7. Test all legacy workspaces and PDF imports in staging, including actual
   ZIP/PDF parsing, navigation, backup exports and the 17-workspace PR #1.
8. Only after those checks pass, deploy using a VERIFIED Wrangler config that
   matches live routes, D1 IDs, Access policy and rollback version.
9. Observe Cloudflare Worker logs and D1 metrics. Maintain a D1 backup/restore
   procedure separate from Worker version rollback.
10. Authenticate the Hindi Alexa integration independently before enabling
    financial figures. Alexa shared-user IDs don't identify the actual speaker.

## Data importing rules

- Preserve original ZIPs and every embedded file hash in an audit manifest.
- Parse all invoice PDFs and GST reports, validate month, invoice identity,
  GSTIN, rates and paise; flag disagreements instead of altering filed returns.
- September dates are determined by document date, not merely order date.
- Keep filed returns and draft reconciliation separate, never auto-file GST.
- Deduplicate by source checksum + suborder + invoice ID + document type.
- No fake sales, costs, expenses, settlements, tax invoices or ITC claims.
- Do not store large document binaries in D1; retain offline originals
  until a no-cost document archive with adequate retention is configured.
- Before activating the September import, obtain both original ZIP bytes in
  an authorized readable attachment or from the user's browser file picker.

## Validation record

Automated CI: .github/workflows/cloud-state.yml runs syntax, API isolation,
revision conflict and legacy HTML script checks. CI is NOT a real browser,
Cloudflare Access or D1 production validation.

No live production changes have been made by this source commit.
