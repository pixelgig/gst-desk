-- GST Desk: additive Cloudflare D1 persistence and filed September 2026 summaries.
-- Existing schema/data must never be dropped or overwritten.
-- Run after a verified backup; authenticated API must be ready before public UI uses it.

CREATE TABLE IF NOT EXISTS gstdesk_browser_state (
  business_id TEXT NOT NULL REFERENCES gstdesk_businesses(id),
  storage_key TEXT NOT NULL CHECK (
    length(storage_key) BETWEEN 1 AND 128 AND
    (storage_key LIKE 'gstdesk%' OR storage_key LIKE 'gst-desk%' OR storage_key LIKE 'gstDesk%' OR storage_key LIKE 'gst_desk%')
  ),
  value_text TEXT NOT NULL CHECK (length(value_text) <= 524288),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (business_id, storage_key)
);

CREATE TABLE IF NOT EXISTS gstdesk_filed_return_summaries (
  business_id TEXT NOT NULL REFERENCES gstdesk_businesses(id),
  tax_period TEXT NOT NULL CHECK(tax_period GLOB '[0-1][0-9]20[0-9][0-9]'),
  return_type TEXT NOT NULL CHECK(return_type IN ('GSTR-1','GSTR-3B')),
  arn TEXT NOT NULL,
  filed_on TEXT NOT NULL,
  taxable_paise INTEGER NOT NULL CHECK(taxable_paise >= 0),
  igst_paise INTEGER NOT NULL CHECK(igst_paise >= 0),
  cgst_paise INTEGER NOT NULL CHECK(cgst_paise >= 0),
  sgst_paise INTEGER NOT NULL CHECK(sgst_paise >= 0),
  cess_paise INTEGER NOT NULL CHECK(cess_paise >= 0),
  itc_igst_paise INTEGER,
  itc_cgst_paise INTEGER,
  itc_sgst_paise INTEGER,
  source_document TEXT NOT NULL,
  details_json TEXT NOT NULL DEFAULT '{}',
  imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(business_id,tax_period,return_type)
);

CREATE INDEX IF NOT EXISTS idx_gstdesk_filed_business_period
  ON gstdesk_filed_return_summaries(business_id,tax_period);

-- September originals 'gst_4953898_9_2026.zip' and
-- '4953898_2026-09-01_2026-09-30_TAX_INVOICE.zip' are NOT imported
-- by this migration. ZIP bytes and invoice documents need extraction
-- and document-level validation before any row-level invoice import.
