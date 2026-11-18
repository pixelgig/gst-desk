-- GST Desk D1 / Meesho historical September data storage (idempotent schema only)
-- Never commit real transaction rows or original invoices to the public repo.
CREATE TABLE IF NOT EXISTS gstdesk_meesho_report_rows (
 business_id TEXT NOT NULL REFERENCES gstdesk_businesses(id),
 source_file_sha256 TEXT NOT NULL,
 suborder_id TEXT NOT NULL,
 document_kind TEXT NOT NULL CHECK(document_kind IN ('sale','return')),
 order_date TEXT NOT NULL, hsn TEXT, customer_state TEXT,
 taxable_raw TEXT NOT NULL, tax_raw TEXT NOT NULL,
 taxable_paise INTEGER NOT NULL, tax_paise INTEGER NOT NULL,
 invoice_paise INTEGER NOT NULL, period TEXT NOT NULL,
 imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(business_id,source_file_sha256,suborder_id,document_kind)
);
CREATE INDEX IF NOT EXISTS idx_meesho_business_date
 ON gstdesk_meesho_report_rows(business_id,order_date,document_kind);
CREATE TABLE IF NOT EXISTS gstdesk_meesho_invoices (
 business_id TEXT NOT NULL REFERENCES gstdesk_businesses(id),
 invoice_no TEXT NOT NULL,
 suborder_id TEXT NOT NULL,
 document_type TEXT NOT NULL CHECK(document_type IN ('tax-invoice','credit-note')),
 order_date TEXT NOT NULL,
 document_date TEXT, hsn TEXT,
 pdf_filename TEXT, pdf_sha256 TEXT,
 document_total_paise INTEGER,
 details_json TEXT NOT NULL DEFAULT '{}',
 source_zip_sha256 TEXT NOT NULL, source_period TEXT NOT NULL,
 imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(business_id,invoice_no)
);
CREATE INDEX IF NOT EXISTS idx_meesho_invoice_order
 ON gstdesk_meesho_invoices(business_id,suborder_id);
CREATE TABLE IF NOT EXISTS gstdesk_source_archives (
 business_id TEXT NOT NULL REFERENCES gstdesk_businesses(id),
 archive_name TEXT NOT NULL, sha256 TEXT NOT NULL, period TEXT NOT NULL,
 entries INTEGER NOT NULL,
 imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(business_id,sha256)
);
