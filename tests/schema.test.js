import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTestDatabase } from '../scripts/check-schema.js';

function seed(db) {
  db.exec("INSERT INTO gstdesk_users(id,email,display_name,role) VALUES('u','synthetic@example.invalid','Synthetic','owner')");
  db.exec("INSERT INTO gstdesk_businesses(id,legal_name,owner_user_id) VALUES('a','Synthetic A','u'),('b','Synthetic B','u')");
}
function document(db, id, business, hash) {
  db.prepare('INSERT INTO vault_documents(id,business_id,sha256,object_key,content_type,byte_size,created_by) VALUES(?,?,?,?,?,?,?)')
    .run(id,business,hash,`objects/${id}`,'application/pdf',10,'u');
}
test('migration preserves legacy schema and rejects duplicate document hash per tenant', () => {
  const db = createTestDatabase();
  try {
    seed(db); document(db,'d1','a','a'.repeat(64));
    assert.throws(() => document(db,'d2','a','a'.repeat(64)), /UNIQUE/);
    document(db,'d3','b','a'.repeat(64));
    assert.equal(db.prepare('SELECT count(*) AS n FROM vault_documents').get().n, 2);
    assert.ok(db.prepare("SELECT name FROM sqlite_master WHERE name='transactions'").get());
  } finally { db.close(); }
});
test('composite foreign keys reject cross-tenant document references', () => {
  const db = createTestDatabase();
  try {
    seed(db); document(db,'d1','a','a'.repeat(64));
    assert.throws(() => db.prepare("INSERT INTO intake_orders(id,business_id,marketplace,suborder_ref,source_document_id,shipping_contact_json,billing_contact_json,payment_method) VALUES('o','b','synthetic','s','d1','{}','{}','unknown')").run(), /FOREIGN KEY/);
  } finally { db.close(); }
});
test('outbox replay is unique and failed transaction leaves no falsely committed metadata', () => {
  const db = createTestDatabase();
  try {
    seed(db);
    db.prepare("INSERT INTO intake_outbox(id,business_id,event_key,event_type,payload_json) VALUES('e','a','document:d','document.ingested','{}')").run();
    assert.throws(() => db.prepare("INSERT INTO intake_outbox(id,business_id,event_key,event_type,payload_json) VALUES('e2','a','document:d','document.ingested','{}')").run(), /UNIQUE/);
    db.exec('BEGIN'); document(db,'d1','a','a'.repeat(64));
    try { document(db,'d2','a','a'.repeat(64)); } catch { db.exec('ROLLBACK'); }
    assert.equal(db.prepare('SELECT count(*) AS n FROM vault_documents').get().n, 0);
  } finally { db.close(); }
});
