import { encryptArchive, decryptArchive, sha256, encodeDocument, decodeDocument } from './encrypted-archive.js';
import { sniffDocument } from '../parsers/file-policy.js';

export class LocalVault {
  constructor(store) { this.store = store; }

  async stage(bytes, passphrase) {
    // The entire encrypted payload includes private metadata; only its hash is indexed.
    const contentType = sniffDocument(bytes);
    if (contentType !== 'application/pdf') throw new Error('local_vault_pdf_only');
    const hash = await sha256(bytes);
    const existing = await this.store.get(hash);
    if (existing) {
      // Require successful unlock before claiming an existing record is usable.
      await this.read(hash, passphrase);
      return { hash, duplicate: true, mode: 'local-only' };
    }
    const payload = { version: 1, hash, contentType, byteSize: bytes.length, createdAt: new Date().toISOString(), original: encodeDocument(bytes), state: 'review_required' };
    const encrypted = await encryptArchive(payload, passphrase);
    // addIfAbsent must be atomic (IndexedDB add / primary key), never read-then-put.
    const added = await this.store.addIfAbsent(hash, encrypted);
    if (!added) await this.read(hash, passphrase);
    return { hash, duplicate: !added, mode: 'local-only' };
  }

  async read(hash, passphrase) {
    if (!/^[a-f0-9]{64}$/.test(hash)) throw new Error('invalid_document_id');
    const encrypted = await this.store.get(hash);
    if (!encrypted) throw new Error('document_not_found');
    const payload = await decryptArchive(encrypted, passphrase);
    const bytes = decodeDocument(payload.original);
    if (payload.version !== 1 || payload.hash !== hash || payload.byteSize !== bytes.length ||
        payload.contentType !== sniffDocument(bytes) || await sha256(bytes) !== hash) throw new Error('document_integrity_failed');
    return { payload, bytes };
  }
}

// Private bytes remain encrypted at rest. The passphrase/key is never persisted.
export async function openIndexedDbStore(indexedDB = globalThis.indexedDB) {
  if (!indexedDB) throw new Error('indexeddb_unavailable');
  const database = await new Promise((resolve, reject) => {
    const request = indexedDB.open('gstdesk-local-vault-v1', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('documents');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('local_storage_unavailable'));
    request.onblocked = () => reject(new Error('local_storage_blocked'));
  });
  return {
    get(hash) {
      return new Promise((resolve, reject) => {
        const tx = database.transaction('documents', 'readonly');
        const request = tx.objectStore('documents').get(hash);
        tx.oncomplete = () => resolve(request.result);
        tx.onabort = () => reject(new Error('local_read_failed'));
      });
    },
    addIfAbsent(hash, encrypted) {
      return new Promise((resolve, reject) => {
        const tx = database.transaction('documents', 'readwrite');
        let added = true;
        const request = tx.objectStore('documents').add(encrypted, hash);
        request.onerror = event => {
          if (request.error?.name === 'ConstraintError') { event.preventDefault(); event.stopPropagation(); added = false; }
        };
        tx.oncomplete = () => resolve(added);
        tx.onabort = () => reject(new Error('local_write_failed_or_quota_exceeded'));
      });
    },
    close() { database.close(); },
  };
}
