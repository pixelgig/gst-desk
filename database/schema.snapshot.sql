-- Schema snapshot from existing Cloudflare D1 gst-desk-db.
-- Structure only; no production records or private data.
-- Do not run against production automatically.

CREATE TABLE gstdesk_audit_events (id TEXT PRIMARY KEY, business_id TEXT NOT NULL REFERENCES gstdesk_businesses(id), actor_user_id TEXT REFERENCES gstdesk_users(id), event_type TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, details_json TEXT NOT NULL DEFAULT '{}');

CREATE TABLE gstdesk_businesses (id TEXT PRIMARY KEY, legal_name TEXT NOT NULL, gstin TEXT, owner_user_id TEXT NOT NULL REFERENCES gstdesk_users(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);

CREATE TABLE gstdesk_invoice_drafts (id TEXT PRIMARY KEY, business_id TEXT NOT NULL REFERENCES gstdesk_businesses(id), draft_ref TEXT, document_type TEXT NOT NULL CHECK(document_type IN ('tax-invoice','credit-note')), payload_json TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>0), created_by TEXT NOT NULL REFERENCES gstdesk_users(id), updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, deleted_at TEXT, UNIQUE(business_id,draft_ref));

CREATE TABLE gstdesk_memberships (business_id TEXT NOT NULL REFERENCES gstdesk_businesses(id), user_id TEXT NOT NULL REFERENCES gstdesk_users(id), role TEXT NOT NULL CHECK(role IN ('owner','accountant','viewer')), PRIMARY KEY(business_id,user_id));

CREATE TABLE gstdesk_users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('owner','accountant','viewer')), status TEXT NOT NULL DEFAULT 'invited' CHECK(status IN ('invited','active','disabled')), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);

CREATE TABLE import_batches (id TEXT PRIMARY KEY, source TEXT NOT NULL, source_sha256 TEXT NOT NULL UNIQUE, period TEXT NOT NULL, imported_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'staged');

CREATE TABLE return_workings (id TEXT PRIMARY KEY, period TEXT NOT NULL, return_type TEXT NOT NULL, payload_json TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft', created_at TEXT NOT NULL);

CREATE TABLE transactions (id TEXT PRIMARY KEY, batch_id TEXT REFERENCES import_batches(id), source_ref TEXT NOT NULL, transaction_date TEXT NOT NULL, kind TEXT NOT NULL, marketplace TEXT, taxable_paise INTEGER NOT NULL, igst_paise INTEGER NOT NULL DEFAULT 0, cgst_paise INTEGER NOT NULL DEFAULT 0, sgst_paise INTEGER NOT NULL DEFAULT 0, hsn TEXT, pos TEXT, metadata_json TEXT, UNIQUE(batch_id, source_ref, kind));

CREATE INDEX idx_gstdesk_audit_business_time ON gstdesk_audit_events(business_id,created_at);

CREATE INDEX idx_gstdesk_drafts_business_updated ON gstdesk_invoice_drafts(business_id,updated_at);
