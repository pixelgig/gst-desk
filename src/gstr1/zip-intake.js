import { inflateRawSync, inflateSync } from 'node:zlib';

export const ZIP_POLICY = Object.freeze({
  maxEntries: 200,
  maxEntryBytes: 10 * 1024 * 1024,
  maxTotalBytes: 50 * 1024 * 1024,
  maxExpansionRatio: 100,
  blockedExtensionPattern: /\.(zip|exe|js|mjs|cjs|html|htm|svg|sh|bat|cmd|ps1)$/i,
});

const EOCD_SIG = 0x06054b50;
const CEN_SIG = 0x02014b50;
const LOC_SIG = 0x04034b50;
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04];

export function hasZipSignature(bytes) {
  return bytes instanceof Uint8Array
    && bytes.length >= 4
    && bytes[0] === ZIP_MAGIC[0]
    && bytes[1] === ZIP_MAGIC[1]
    && bytes[2] === ZIP_MAGIC[2]
    && bytes[3] === ZIP_MAGIC[3];
}

export function validateArchiveEntryMetadata(entries, policy = ZIP_POLICY) {
  if (!Array.isArray(entries) || entries.length < 1 || entries.length > policy.maxEntries) {
    throw new Error('archive_entry_limit');
  }
  let totalUncompressed = 0;
  const seenPaths = new Set();

  for (const entry of entries) {
    const rawName = entry?.name;
    if (typeof rawName !== 'string' || rawName.length === 0 || rawName.length > 240) {
      throw new Error('unsafe_archive_path');
    }
    if (/[\\\x00-\x1f:]/.test(rawName) || rawName.startsWith('/')) {
      throw new Error('unsafe_archive_path');
    }
    const normalized = rawName.endsWith('/') ? rawName.slice(0, -1) : rawName;
    if (!normalized) {
      throw new Error('unsafe_archive_path');
    }
    const segments = normalized.split('/');
    if (segments.some((part) => part === '' || part === '.' || part === '..')) {
      throw new Error('unsafe_archive_path');
    }
    const lowerPath = normalized.toLowerCase();
    if (seenPaths.has(lowerPath)) {
      throw new Error('duplicate_archive_path');
    }
    seenPaths.add(lowerPath);

    const uncompressedSize = entry?.uncompressedSize;
    const compressedSize = entry?.compressedSize;
    if (!Number.isSafeInteger(uncompressedSize) || uncompressedSize < 0 || uncompressedSize > policy.maxEntryBytes) {
      throw new Error('archive_entry_size_limit');
    }
    if (!Number.isSafeInteger(compressedSize) || compressedSize < 0) {
      throw new Error('archive_compressed_size_invalid');
    }
    const ratioDenominator = Math.max(1, compressedSize);
    if (uncompressedSize > ratioDenominator * policy.maxExpansionRatio) {
      throw new Error('archive_expansion_limit');
    }

    totalUncompressed += uncompressedSize;
    if (totalUncompressed > policy.maxTotalBytes) {
      throw new Error('archive_total_limit');
    }

    if (!rawName.endsWith('/') && policy.blockedExtensionPattern.test(normalized)) {
      throw new Error('blocked_archive_entry');
    }
  }

  return {
    entryCount: entries.length,
    totalUncompressedBytes: totalUncompressed,
  };
}

function findEocdOffset(buf) {
  const minOffset = Math.max(0, buf.length - 22 - 65535);
  for (let i = buf.length - 22; i >= minOffset; i--) {
    if (buf.readUInt32LE(i) === EOCD_SIG) {
      const commentLen = buf.readUInt16LE(i + 20);
      if (i + 22 + commentLen === buf.length) {
        return i;
      }
    }
  }
  return -1;
}

function decompressEntry(method, compressedSlice, maxEntryBytes) {
  let out;
  if (method === 0) {
    out = Buffer.from(compressedSlice);
  } else if (method === 8) {
    out = inflateRawSync(compressedSlice, { maxOutputLength: maxEntryBytes });
  } else if (method === 12) {
    out = inflateSync(compressedSlice, { maxOutputLength: maxEntryBytes });
  } else {
    throw new Error('unsupported_zip_compression_method');
  }
  if (out.byteLength > maxEntryBytes) {
    throw new Error('archive_entry_size_limit');
  }
  return out;
}

/**
 * Extracts and decodes text/tabular entries from a ZIP archive in memory without
 * returning or retaining the source archive buffer (parsed-only retention).
 */
export function extractZipParsedEntries(zipBytes, policy = ZIP_POLICY) {
  if (!hasZipSignature(zipBytes)) {
    throw new Error('invalid_zip_signature');
  }
  const buf = Buffer.from(zipBytes);
  const eocdOffset = findEocdOffset(buf);
  if (eocdOffset < 0) {
    throw new Error('malformed_zip_eocd');
  }

  const totalEntries = buf.readUInt16LE(eocdOffset + 10);
  const cdSize = buf.readUInt32LE(eocdOffset + 12);
  const cdOffset = buf.readUInt32LE(eocdOffset + 16);
  if (cdOffset + cdSize > eocdOffset) {
    throw new Error('malformed_zip_central_directory');
  }

  const parsedDescriptors = [];
  let cursor = cdOffset;
  for (let idx = 0; idx < totalEntries; idx++) {
    if (cursor + 46 > cdOffset + cdSize) {
      throw new Error('malformed_zip_entry');
    }
    if (buf.readUInt32LE(cursor) !== CEN_SIG) {
      throw new Error('malformed_zip_entry_signature');
    }
    const flags = buf.readUInt16LE(cursor + 8);
    if ((flags & 0x0001) !== 0) {
      throw new Error('encrypted_zip_entry_unsupported');
    }
    const method = buf.readUInt16LE(cursor + 10);
    const compressedSize = buf.readUInt32LE(cursor + 20);
    const uncompressedSize = buf.readUInt32LE(cursor + 24);
    const nameLen = buf.readUInt16LE(cursor + 28);
    const extraLen = buf.readUInt16LE(cursor + 30);
    const commentLen = buf.readUInt16LE(cursor + 32);
    const localHeaderOffset = buf.readUInt32LE(cursor + 42);

    const nameStart = cursor + 46;
    const nameEnd = nameStart + nameLen;
    if (nameEnd + extraLen + commentLen > cdOffset + cdSize) {
      throw new Error('malformed_zip_entry_bounds');
    }
    const name = buf.subarray(nameStart, nameEnd).toString('utf8');
    parsedDescriptors.push({
      name,
      method,
      compressedSize,
      uncompressedSize,
      localHeaderOffset,
    });
    cursor = nameEnd + extraLen + commentLen;
  }

  validateArchiveEntryMetadata(parsedDescriptors, policy);

  const extracted = [];
  let cumulativeBytes = 0;

  for (const desc of parsedDescriptors) {
    if (desc.name.endsWith('/')) continue;
    const loc = desc.localHeaderOffset;
    if (loc + 30 > cdOffset || buf.readUInt32LE(loc) !== LOC_SIG) {
      throw new Error('malformed_zip_local_header');
    }
    const locNameLen = buf.readUInt16LE(loc + 26);
    const locExtraLen = buf.readUInt16LE(loc + 28);
    const dataStart = loc + 30 + locNameLen + locExtraLen;
    const dataEnd = dataStart + desc.compressedSize;
    if (dataEnd > cdOffset) {
      throw new Error('malformed_zip_payload_bounds');
    }

    const rawEntry = decompressEntry(desc.method, buf.subarray(dataStart, dataEnd), policy.maxEntryBytes);
    if (rawEntry.byteLength > policy.maxEntryBytes) {
      throw new Error('archive_entry_size_limit');
    }
    cumulativeBytes += rawEntry.byteLength;
    if (cumulativeBytes > policy.maxTotalBytes) {
      throw new Error('archive_total_limit');
    }

    extracted.push({
      name: desc.name,
      byteLength: rawEntry.byteLength,
      text: rawEntry.toString('utf8'),
    });
  }

  return {
    entries: extracted,
    totalParsedBytes: cumulativeBytes,
    rawArchiveRetained: false,
  };
}

export function parseCsvRows(csvText) {
  if (typeof csvText !== 'string') {
    throw new Error('invalid_csv_text');
  }
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const ch = csvText[i];
    if (inQuotes) {
      if (ch === '"') {
        if (csvText[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\r' && csvText[i + 1] === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      i++;
    } else if (ch === '\n' || ch === '\r') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  if (inQuotes) {
    throw new Error('unterminated_csv_quote');
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  const nonEmpty = rows.filter((r) => r.some((c) => c.trim() !== ''));
  if (nonEmpty.length < 2) return [];
  const headers = nonEmpty[0].map((h) => h.trim());
  return nonEmpty.slice(1).map((vals, index) => {
    const record = { _rowIndex: index + 1 };
    headers.forEach((h, i) => {
      record[h] = (vals[i] ?? '').trim();
    });
    return record;
  });
}
