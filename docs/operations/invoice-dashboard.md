# GST Desk — D1 invoice dashboard

This is part of the **existing** `pixelgig/gst-desk` repository on `main`.
It does not use a separate app, database, paid storage, or GitHub branch.

## Imported source documents

Tax-invoice ZIP exports for September, October and November 2026 were parsed
using their Excel invoice registers and matching PDFs.

- Every PDF was matched to its invoice number, suborder, issue date and
  document type.
- The stored D1 invoice metadata contains the product, HSN, order and issue
  dates, financial totals in integer paise, GST breakdown when present,
  place-of-supply region, source checksum and reversal references.
- All source ZIP archives are identified by SHA-256 in
  `gstdesk_source_archives`.
- Duplicate invoice numbers are not overwritten; a mismatching PDF checksum
  is treated as an import conflict.
- **Buyer names and full delivery addresses are not stored** in the invoice
  metadata. Original PDF binaries are not stored on D1 or R2.
- Filed GSTR data and imported GST report rows remain distinct from invoice
  documents. These archives **do not** establish live order, payout or
  delivery status.

## Correct monthly basis

The homepage and invoice lists group documents by **document issue date**
(`document_date`), not by the month in the ZIP filename. A document issued
on October 1 can appear in a September source ZIP and must be counted in
October for document-date reporting. `source_period` is preserved separately
for audit.

## Existing application routes

All the following endpoints require the existing verified Cloudflare Access
owner session and the owner/business membership in D1.

- `GET /api/overview`: monthly issue-date totals, recent invoices, saved
  workspace counts, archived GST reports and filed-return summaries.
- `GET /api/invoices?period=MMYYYY&page=1`: paginated list of tax invoices
  and credit notes from the chosen document month.
- `GET /api/invoices/{invoiceNo}`: full available parsed invoice metadata.
- `GET /api/returns/summary?period=MMYYYY`: previously filed summaries.
- Existing private state-storage and September reconciliation routes remain.

The old `gstdesk-react-root` homepage stays in place. The new database
overview is a sibling element injected before it and does not replace or
remove the existing 17 workspace navigation system.

The dashboard offers clickable monthly totals, individual invoices,
credit-note links to original invoice records, and filed GST return details.
Counts for persisted workspace keys, drafts, report rows and source manifests
link to the relevant existing workspace.

## Privacy and reliability

- D1 is the source of truth for imported records; no monthly total is
  guessed from browser localStorage.
- All SQL queries in the new API are filtered by the authenticated business,
  use bound parameters, and are read-only.
- API responses use `no-store` and return no customer addresses.
- The user should **not** mistake invoice value for business profit,
  GST payable, marketplace settlement or a delivered order.
- GitHub Actions verifies JavaScript syntax, authorization constraints,
  the invoice detail API contract, and safe DOM-based rendering.
- Unauthenticated live requests return HTTP 403; a Cloudflare Access
  owner-sign-in remains necessary to test the actual visual dashboard.

## Files

- `cloudflare/workers/gst-desk-preview/overview-api.mjs`
- `cloudflare/workers/gst-desk-preview/overview-client.mjs`
- `cloudflare/workers/gst-desk-preview/worker.js`
- `tests/overview.test.mjs`
- `database/migrations/0003_meesho_import.sql`
