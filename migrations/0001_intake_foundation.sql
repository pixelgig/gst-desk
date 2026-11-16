-- Additive migration. Existing snapshot tables must already exist.
-- Execute in isolated staging first; never apply automatically to production.
PRAGMA foreign_keys = ON;
CREATE TABLE vault_documents (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES gstdesk_businesses(id),
  sha256 TEXT NOT NULL CHECK(length(sha256)=64 AND sha256 NOT GLOB '*[^0-9a-f]*'),
  object_key TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL CHECK(content_type IN ('application/pdf','image/png','image/jpeg','application/zip')),
  byte_size INTEGER NOT NULL CHECK(byte_size > 0 AND byte_size <= 10485760),
  state TEXT NOT NULL DEFAULT 'pending_upload' CHECK(state IN ('pending_upload','uploaded','review_required','approved','rejected')),
  created_by TEXT NOT NULL REFERENCES gstdesk_users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(business_id,sha256), UNIQUE(business_id,id)
);
CREATE TABLE vault_document_versions (
  id TEXT PRIMARY KEY, business_id TEXT NOT NULL,
  document_id TEXT NOT NULL, version INTEGER NOT NULL CHECK(version>0),
  sha256 TEXT NOT NULL, object_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(business_id,document_id) REFERENCES vault_documents(business_id,id),
  UNIQUE(document_id,version)
);
CREATE TABLE vault_extracted_fields (
  id TEXT PRIMARY KEY, business_id TEXT NOT NULL, document_id TEXT NOT NULL,
  field_path TEXT NOT NULL, source_value TEXT NOT NULL, normalized_json TEXT NOT NULL CHECK(json_valid(normalized_json)),
  page INTEGER NOT NULL CHECK(page>0), box_json TEXT NOT NULL CHECK(json_valid(box_json)),
  method TEXT NOT NULL CHECK(method IN ('pdf_text','barcode','manual','local_ocr')),
  confidence REAL NOT NULL CHECK(confidence>=0 AND confidence<=1),
  rule_version TEXT NOT NULL,
  FOREIGN KEY(business_id,document_id) REFERENCES vault_documents(business_id,id)
);
CREATE TABLE vault_review_decisions (
  id TEXT PRIMARY KEY, business_id TEXT NOT NULL, document_id TEXT NOT NULL,
  actor_user_id TEXT NOT NULL REFERENCES gstdesk_users(id), reason TEXT NOT NULL,
  before_json TEXT NOT NULL CHECK(json_valid(before_json)), after_json TEXT NOT NULL CHECK(json_valid(after_json)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(business_id,document_id) REFERENCES vault_documents(business_id,id)
);
CREATE TABLE intake_orders (
  id TEXT PRIMARY KEY, business_id TEXT NOT NULL REFERENCES gstdesk_businesses(id),
  marketplace TEXT NOT NULL, suborder_ref TEXT NOT NULL,
  source_document_id TEXT NOT NULL,
  shipping_contact_json TEXT NOT NULL CHECK(json_valid(shipping_contact_json)),
  billing_contact_json TEXT NOT NULL CHECK(json_valid(billing_contact_json)),
  payment_method TEXT NOT NULL CHECK(payment_method IN ('prepaid','cod','unknown')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(business_id,source_document_id) REFERENCES vault_documents(business_id,id),
  UNIQUE(business_id,marketplace,suborder_ref), UNIQUE(business_id,id)
);
CREATE TABLE intake_invoices (
  id TEXT PRIMARY KEY, business_id TEXT NOT NULL, order_id TEXT NOT NULL,
  source_document_id TEXT NOT NULL,
  semantic_identity TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK(document_type IN ('tax_invoice','credit_note')),
  invoice_number TEXT NOT NULL, invoice_date TEXT NOT NULL, seller_gstin TEXT NOT NULL,
  taxable_paise INTEGER NOT NULL CHECK(taxable_paise>=0),
  igst_paise INTEGER NOT NULL CHECK(igst_paise>=0), cgst_paise INTEGER NOT NULL CHECK(cgst_paise>=0),
  sgst_paise INTEGER NOT NULL CHECK(sgst_paise>=0), cess_paise INTEGER NOT NULL CHECK(cess_paise>=0),
  total_paise INTEGER NOT NULL CHECK(total_paise>=0),
  reviewed_by TEXT NOT NULL REFERENCES gstdesk_users(id), reviewed_at TEXT NOT NULL,
  FOREIGN KEY(business_id,order_id) REFERENCES intake_orders(business_id,id),
  FOREIGN KEY(business_id,source_document_id) REFERENCES vault_documents(business_id,id),
  UNIQUE(business_id,semantic_identity), UNIQUE(business_id,id)
);
CREATE TABLE intake_invoice_lines (
  id TEXT PRIMARY KEY, business_id TEXT NOT NULL, invoice_id TEXT NOT NULL,
  line_number INTEGER NOT NULL CHECK(line_number>0),
  line_kind TEXT NOT NULL CHECK(line_kind IN ('product','other_charge')),
  hsn TEXT NOT NULL, quantity INTEGER NOT NULL CHECK(quantity>0),
  source_amounts_json TEXT NOT NULL CHECK(json_valid(source_amounts_json)),
  normalized_amounts_json TEXT NOT NULL CHECK(json_valid(normalized_amounts_json)),
  FOREIGN KEY(business_id,invoice_id) REFERENCES intake_invoices(business_id,id),
  UNIQUE(invoice_id,line_number)
);
CREATE TABLE intake_shipments (
  id TEXT PRIMARY KEY, business_id TEXT NOT NULL, order_id TEXT NOT NULL,
  carrier TEXT NOT NULL, awb TEXT NOT NULL,
  label_note TEXT, status TEXT NOT NULL DEFAULT 'unknown',
  status_source TEXT NOT NULL DEFAULT 'label_only', last_verified_at TEXT,
  FOREIGN KEY(business_id,order_id) REFERENCES intake_orders(business_id,id),
  UNIQUE(business_id,carrier,awb)
);
CREATE TABLE intake_outbox (
  id TEXT PRIMARY KEY, business_id TEXT NOT NULL REFERENCES gstdesk_businesses(id),
  event_key TEXT NOT NULL, event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL CHECK(json_valid(payload_json)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(business_id,event_key)
);
CREATE TABLE intake_consumer_receipts (
  consumer TEXT NOT NULL, event_id TEXT NOT NULL REFERENCES intake_outbox(id),
  completed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(consumer,event_id)
);
CREATE TABLE intake_idempotency_keys (
  business_id TEXT NOT NULL REFERENCES gstdesk_businesses(id), key TEXT NOT NULL,
  request_sha256 TEXT NOT NULL, response_json TEXT NOT NULL CHECK(json_valid(response_json)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(business_id,key)
);
CREATE INDEX vault_documents_business_created ON vault_documents(business_id,created_at,id);
CREATE INDEX vault_fields_document ON vault_extracted_fields(business_id,document_id);
CREATE INDEX intake_invoices_period ON intake_invoices(business_id,invoice_date,id);
CREATE INDEX intake_outbox_pending ON intake_outbox(business_id,created_at,id);
