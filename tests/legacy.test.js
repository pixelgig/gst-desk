import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inspectLegacy } from '../scripts/verify-legacy.js';

test('Worker renders HTML and every classic inline browser script parses', async () => {
  const result = await inspectLegacy();
  assert.equal(result.status, 200);
  assert.ok(result.inline > 10);
  for (const id of ['dashboard','records','returns','backup','meesho','gstr3b','filing','itcrecon','profit','orders','inventory','migration','taxlab','invoice-studio','valmo','catalogue']) {
    assert.ok(result.html.includes(`id="${id}"`), `missing workspace ${id}`);
  }
});
