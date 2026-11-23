const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
const ITERATIONS = 600000;
const MAX_ARCHIVE_BYTES = 16 * 1024 * 1024;
const FORMAT = 'gstdesk-private-archive';

function base64(bytes) {
  let result = '';
  for (let i = 0; i < bytes.length; i += 32768) result += String.fromCharCode(...bytes.subarray(i, i + 32768));
  return btoa(result);
}
function unbase64(value, max) {
  if (typeof value !== 'string' || value.length > Math.ceil(max / 3) * 4 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) throw new Error('invalid_archive');
  const bytes = Uint8Array.from(atob(value), c => c.charCodeAt(0));
  if (bytes.length > max) throw new Error('invalid_archive');
  return bytes;
}
async function keyFor(passphrase, salt, usage) {
  if (typeof passphrase !== 'string' || passphrase.length < 12 || passphrase.length > 1024) throw new Error('passphrase_requires_12_to_1024_characters');
  const material = await crypto.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, usage);
}
function additionalData() { return encoder.encode(`${FORMAT}:1:${ITERATIONS}`); }

// Browser/local tooling only. Never execute PBKDF2 or PDF processing in the Worker.
export async function encryptArchive(payload, passphrase) {
  const bytes = encoder.encode(JSON.stringify(payload));
  if (bytes.length > MAX_ARCHIVE_BYTES) throw new Error('archive_size_limit');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await keyFor(passphrase, salt, ['encrypt']);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: additionalData() }, key, bytes));
  return { format: FORMAT, version: 1, kdf: 'PBKDF2-SHA256', iterations: ITERATIONS, cipher: 'AES-256-GCM', salt: base64(salt), iv: base64(iv), ciphertext: base64(ciphertext) };
}

export async function decryptArchive(archive, passphrase) {
  if (!archive || archive.format !== FORMAT || archive.version !== 1 || archive.kdf !== 'PBKDF2-SHA256' ||
      archive.iterations !== ITERATIONS || archive.cipher !== 'AES-256-GCM') throw new Error('invalid_archive');
  const salt = unbase64(archive.salt, 16), iv = unbase64(archive.iv, 12);
  const ciphertext = unbase64(archive.ciphertext, MAX_ARCHIVE_BYTES + 16);
  if (salt.length !== 16 || iv.length !== 12 || ciphertext.length < 16) throw new Error('invalid_archive');
  const key = await keyFor(passphrase, salt, ['decrypt']);
  try {
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: additionalData() }, key, ciphertext);
    return JSON.parse(decoder.decode(plaintext));
  } catch { throw new Error('archive_authentication_failed'); }
}

export async function sha256(bytes) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), x => x.toString(16).padStart(2, '0')).join('');
}

export function encodeDocument(bytes) { return base64(bytes); }
export function decodeDocument(value) { return unbase64(value, 10 * 1024 * 1024); }
