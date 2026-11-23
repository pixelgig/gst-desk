export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export function sniffDocument(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 8 || bytes.length > MAX_DOCUMENT_BYTES) throw new Error('invalid_file_size');
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d) return 'application/pdf';
  if ([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a].every((v,i) => bytes[i] === v)) return 'image/png';
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 3 && bytes[3] === 4) return 'application/zip';
  throw new Error('unsupported_file_signature');
}

// Check metadata before decompression; callers must also enforce streamed actual-byte limits.
export function validateArchiveEntries(entries) {
  if (!Array.isArray(entries) || entries.length < 1 || entries.length > 200) throw new Error('archive_entry_limit');
  let total = 0;
  const names = new Set();
  for (const entry of entries) {
    const name = entry.name;
    if (typeof name !== 'string' || name.length > 240 || /[\\\x00-\x1f:]/.test(name) || name.startsWith('/') ||
        name.split('/').some(part => part === '..' || part === '.') || names.has(name.toLowerCase())) throw new Error('unsafe_archive_path');
    names.add(name.toLowerCase());
    if (!Number.isSafeInteger(entry.size) || entry.size < 0 || entry.size > MAX_DOCUMENT_BYTES ||
        !Number.isSafeInteger(entry.compressedSize) || entry.compressedSize < 0 ||
        entry.size > Math.max(1, entry.compressedSize) * 100) throw new Error('archive_expansion_limit');
    total += entry.size;
    if (total > 50 * 1024 * 1024) throw new Error('archive_total_limit');
    if (/\.(zip|exe|js|html|svg)$/i.test(name)) throw new Error('unsupported_archive_entry');
  }
  return { entries: entries.length, bytes: total };
}
