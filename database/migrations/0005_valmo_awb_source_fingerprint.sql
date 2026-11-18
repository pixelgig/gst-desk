-- Proof-of-source hash only. Do not store shipping labels or PDFs in Cloudflare D1.
ALTER TABLE gstdesk_shipments ADD COLUMN awb_evidence_sha256 TEXT;
-- Apply once after 0004; not an online replacement for source documents.
