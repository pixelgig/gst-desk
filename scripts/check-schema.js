import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
export function createTestDatabase() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys=ON');
  db.exec(fs.readFileSync(new URL('../database/schema.snapshot.sql', import.meta.url), 'utf8'));
  db.exec(fs.readFileSync(new URL('../migrations/0001_intake_foundation.sql', import.meta.url), 'utf8'));
  const violations = db.prepare('PRAGMA foreign_key_check').all();
  if (violations.length) throw new Error('foreign_key_check_failed');
  return db;
}
// Importable for integration tests; no disk files and no remote database access.
if (process.argv[1]?.endsWith('check-schema.js')) {
  const db = createTestDatabase();
  console.log(JSON.stringify({ status: 'pass', tables: db.prepare("SELECT count(*) AS n FROM sqlite_master WHERE type='table'").get().n }));
  db.close();
}
