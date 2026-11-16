import { LocalVault, openIndexedDbStore } from '../storage/local-vault.js';
import { decryptArchive, decodeDocument, sha256 } from '../storage/encrypted-archive.js';
import { sniffDocument } from '../parsers/file-policy.js';

const $ = id => document.getElementById(id);
let store, vault, unlocked;
const errors = {
  archive_authentication_failed: 'Unable to unlock. Check the passphrase and that the export has not changed.',
  document_not_found: 'This fingerprint is not stored in this browser.',
  local_write_failed_or_quota_exceeded: 'Storage failed. Browser quota may be exhausted. Keep the original and retry after exporting older files.',
  unsupported_file_signature: 'The file does not have a supported PDF signature.',
  local_vault_pdf_only: 'This preview currently accepts PDF originals only.',
};
function errorText(error) { return errors[error.message] || 'Unable to complete this operation. Check the file, fingerprint and passphrase, then retry.'; }
function lock() {
  unlocked = null; $('download').disabled = true; $('backup').disabled = true;
  $('metadata').textContent = ''; $('integrity').textContent = '';
}
async function connect() {
  if (!store) { store = await openIndexedDbStore(); vault = new LocalVault(store); }
  return vault;
}
function download(blob, filename) {
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function reopen() {
  lock();
  try {
    const local = await connect();
    unlocked = await local.read($('document-id').value.trim(), $('passphrase').value);
    $('metadata').textContent = JSON.stringify({ fingerprint: unlocked.payload.hash, bytes: unlocked.bytes.length, contentType: unlocked.payload.contentType, state: 'Review required', storage: 'Local-only; no cloud sync', invoiceExtraction: 'Not implemented', settlement: 'Unknown; no evidence' }, null, 2);
    $('integrity').textContent = 'Unlocked original; SHA-256 matches the saved fingerprint.';
    $('download').disabled = false; $('backup').disabled = false;
  } catch (error) { $('integrity').textContent = errorText(error); }
}
$('upload-form').addEventListener('submit', async event => {
  event.preventDefault(); lock(); $('save').disabled = true;
  try {
    const file = $('document').files[0];
    if (!file || file.size < 8 || file.size > 10 * 1024 * 1024) throw new Error('invalid_file_size');
    $('status').textContent = 'Fingerprinting and encrypting locally…';
    const local = await connect(), result = await local.stage(new Uint8Array(await file.arrayBuffer()), $('passphrase').value);
    $('document-id').value = result.hash;
    $('status').textContent = result.duplicate ? 'Existing encrypted original found. No duplicate was saved.' : 'Encrypted original saved in this browser. Review and accounting distribution remain pending.';
    await reopen();
  } catch (error) { $('status').textContent = errorText(error); }
  finally { $('save').disabled = false; }
});
$('reopen').addEventListener('click', reopen);
$('passphrase').addEventListener('input', lock);
$('document-id').addEventListener('input', lock);
$('download').addEventListener('click', () => { if (unlocked) download(new Blob([unlocked.bytes], { type: 'application/pdf' }), 'original-document.pdf'); });
$('backup').addEventListener('click', async () => {
  if (!unlocked) return;
  try {
    const encrypted = await store.get(unlocked.payload.hash);
    download(new Blob([JSON.stringify(encrypted)], { type: 'application/json' }), 'gstdesk-encrypted-original.json');
  } catch { $('integrity').textContent = 'Export failed. Keep the original and retry.'; }
});
$('inspect').addEventListener('click', async () => {
  $('inspect').disabled = true;
  try {
    const file = $('archive').files[0];
    if (!file || file.size > 24 * 1024 * 1024) throw new Error('invalid_archive');
    const payload = await decryptArchive(JSON.parse(await file.text()), $('passphrase').value);
    const bytes = decodeDocument(payload.original);
    if (payload.version !== 1 || payload.byteSize !== bytes.length || payload.contentType !== sniffDocument(bytes) || payload.hash !== await sha256(bytes)) throw new Error('document_integrity_failed');
    $('restore-status').textContent = `Integrity verified: ${bytes.length} bytes. Fingerprint ${payload.hash}. No records changed.`;
  } catch (error) { $('restore-status').textContent = errorText(error); }
  finally { $('inspect').disabled = false; }
});
window.addEventListener('pagehide', () => { lock(); $('passphrase').value = ''; store?.close(); store = null; vault = null; });
