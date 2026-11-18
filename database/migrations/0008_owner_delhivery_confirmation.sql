-- The existing constraint requires a real carrier-delivery timestamp when status='delivered'.
-- Owner-reported deliveries must not fabricate those timestamps or alter carrier-verified evidence.
-- Already applied to the live Nividhi D1 database.
ALTER TABLE gstdesk_shipments ADD COLUMN owner_confirmed_delivered INTEGER NOT NULL DEFAULT 0 CHECK (owner_confirmed_delivered IN (0,1));
ALTER TABLE gstdesk_shipments ADD COLUMN owner_delivery_confirmed_at TEXT;
-- Record owner confirmation separately. Actual delivery date stays NULL until verified.
