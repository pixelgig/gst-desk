-- Carrier estimates are informational, not proof of actual delivery.
-- Store the human-readable ETA exactly as displayed, without inferring an unshown year.
-- Already applied in Nividhi's existing Cloudflare D1 before deploying the Worker.
ALTER TABLE gstdesk_shipments ADD COLUMN estimated_delivery_text TEXT;
