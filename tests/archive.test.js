import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encryptArchive, decryptArchive } from '../src/storage/encrypted-archive.js';
import { LocalVault } from '../src/storage/local-vault.js';

const password = 'synthetic-only-password';
test('encrypted archive restores exactly and uses fresh salt/IV', async () => {
  const payload = { format: 'synthetic', records: [{ id: 'SYNTHETIC-1', totalPaise: 12531 }] };
  const a = await encryptArchive(payload, password), b = await encryptArchive(payload, password);
  assert.notEqual(a.salt, b.salt); assert.notEqual(a.iv, b.iv);
  assert.deepEqual(await decryptArchive(a, password), payload);
  assert.ok(!JSON.stringify(a).includes('SYNTHETIC-1'));
});
test('wrong passphrase, modified ciphertext and expensive attacker KDF rejected', async () => {
  const a = await encryptArchive({ synthetic: true }, password);
  await assert.rejects(decryptArchive(a, 'incorrect-password'), /authentication_failed/);
  await assert.rejects(decryptArchive({ ...a, ciphertext: (a.ciphertext[0] === 'A' ? 'B' : 'A') + a.ciphertext.slice(1) }, password), /authentication_failed/);
  await assert.rejects(decryptArchive({ ...a, iterations: 999999999 }, password), /invalid_archive/);
  await assert.rejects(encryptArchive({}, 'short'), /passphrase/);
});
test('local PDF reupload stores one encrypted original and checksum matches reopened bytes', async () => {
  const records = new Map();
  const vault = new LocalVault({
    async get(id) { return records.get(id); },
    async addIfAbsent(id, value) { if (records.has(id)) return false; records.set(id, value); return true; },
  });
  const original = new TextEncoder().encode('%PDF-1.7\n% synthetic test only; not an extraction fixture\n%%EOF');
  const first = await vault.stage(original, password);
  assert.equal(first.duplicate, false);
  assert.equal((await vault.stage(original, password)).duplicate, true);
  assert.equal((await vault.stage(original, password)).duplicate, true);
  assert.equal(records.size, 1);
  const reopened = await vault.read(first.hash, password);
  assert.deepEqual(reopened.bytes, original);
  assert.equal(reopened.payload.state, 'review_required');
  await assert.rejects(vault.read(first.hash, 'incorrect-password'), /authentication_failed/);
});
