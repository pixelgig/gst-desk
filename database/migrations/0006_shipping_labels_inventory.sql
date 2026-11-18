-- Idempotent derived shipping-label inventory. No PDFs, ZIPs, buyer names, addresses, or images stored.
CREATE TABLE IF NOT EXISTS gstdesk_shipping_labels (
  business_id TEXT NOT NULL REFERENCES gstdesk_businesses(id),
  suborder_id TEXT NOT NULL,
  carrier TEXT NOT NULL CHECK(carrier IN ('valmo','delhivery')),
  awb TEXT NOT NULL,
  source_pdf_sha256 TEXT NOT NULL,
  source_page INTEGER NOT NULL CHECK(source_page >= 1),
  source_zip_sha256 TEXT NOT NULL,
  label_invoice_no TEXT,
  matched_invoice_no TEXT,
  match_status TEXT NOT NULL CHECK(match_status IN ('matched_invoice','awaiting_invoice')),
  duplicate_label_copies INTEGER NOT NULL DEFAULT 1 CHECK(duplicate_label_copies >= 1),
  imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (business_id,suborder_id),
  UNIQUE (business_id,awb)
);
CREATE INDEX IF NOT EXISTS idx_gstdesk_labels_match
  ON gstdesk_shipping_labels(business_id,match_status,carrier);
-- Apply once to existing shipment table (check PRAGMA table_info before rerunning).
ALTER TABLE gstdesk_shipments ADD COLUMN carrier_name TEXT;
-- For shipment records carrier='other', carrier_name='delhivery'.
-- Never infer delivery or return from a label. Verified delivery states are preserved.
