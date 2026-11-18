-- GST Desk manual-only Valmo shipment tracking.
-- Only derived metadata is stored, never source PDF/ZIP images or responses with PII.
CREATE TABLE IF NOT EXISTS gstdesk_shipments (
  business_id TEXT NOT NULL,
  suborder_id TEXT NOT NULL,
  invoice_no TEXT NOT NULL,
  carrier TEXT NOT NULL DEFAULT 'unconfirmed' CHECK(carrier IN ('unconfirmed','valmo','other')),
  awb TEXT,
  awb_source TEXT,
  awb_set_at TEXT,
  status TEXT NOT NULL DEFAULT 'awaiting_awb'
    CHECK(status IN ('awaiting_awb','not_checked','in_transit','out_for_delivery','delivered','returned','delivery_failed','needs_review')),
  status_description TEXT,
  delivered_at TEXT,
  delivered_date_ist TEXT,
  last_checked_at TEXT,
  last_event_at TEXT,
  last_check_error TEXT,
  last_status_source TEXT,
  events_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(business_id,suborder_id),
  UNIQUE(business_id,invoice_no),
  FOREIGN KEY(business_id,invoice_no) REFERENCES gstdesk_meesho_invoices(business_id,invoice_no),
  CHECK(status != 'delivered' OR (delivered_at IS NOT NULL AND delivered_date_ist IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_gstdesk_valmo_awb
 ON gstdesk_shipments(business_id,awb) WHERE awb IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gstdesk_valmo_pending
 ON gstdesk_shipments(business_id,status,last_checked_at);
-- Seed exactly one shipment candidate per ORIGINAL tax invoice, never for credit notes.
-- An invoice does not prove dispatch or courier assignment; carrier/status remain unknown.
INSERT OR IGNORE INTO gstdesk_shipments(business_id,suborder_id,invoice_no)
 SELECT business_id,suborder_id,invoice_no
 FROM gstdesk_meesho_invoices
 WHERE document_type='tax-invoice';
