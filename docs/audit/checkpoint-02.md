# Checkpoint 02 — encrypted local storage primitives

Implemented AES-256-GCM archive encryption with per-export random salt/IV, PBKDF2-SHA256, authenticated format/version binding, fixed work factor, bounded input and a nonpersisted passphrase. Added local PDF vault orchestration with SHA-256 identity, encrypted original bytes, checksum verification on read and atomic add-if-absent storage adapter. IndexedDB implementation stores ciphertext; no passphrase is persisted.

Tests: 16 passed total on Node 24.22.1, including exact archive restoration, fresh salt/IV, wrong passphrase, ciphertext tampering, malicious work factor, triple reupload and checksum-matching original read. The vault tests use an in-memory adapter. IndexedDB browser behavior, browser quota failures and concurrent browser tabs are not verified. The minimal synthetic byte fixture tests storage only; it is not a real PDF extraction fixture.

No UI, OCR, PDF text extraction, cloud sync or workspace distribution is implemented by these primitives. They must not be advertised as a completed vault. Browser-specific storage may be cleared; without the passphrase there is no recovery. Owner-download backup UI and restore preview remain necessary.

Deployed: nothing. No production configuration, credentials or customer data modified. R2 activation and billing inspection remain external dependencies; local implementation work does not depend on activating them.
