# GST Desk — Online Application

**Live application:** https://gst.nividhi.in  
**Hosting:** Cloudflare Workers  
**Database:** Cloudflare D1 (`gst-desk-db`)  
**Source control:** This GitHub repository

## Migration status

This repository contains **read-only source snapshots** retrieved from the existing Cloudflare account on 2026-11-17. Importing the source did **not** redeploy or modify the live application.

- `cloudflare/workers/gst-desk-preview/worker.js` — actual deployed preview Worker source
- `cloudflare/workers/gst-desk-api-staging/worker.template.js` — sanitized staging API Worker source; authentication configuration placeholders must be replaced securely
- `database/schema.snapshot.sql` — current D1 schema only, **no production records**

## Development workflow

1. Branch from `main` for changes.
2. Review and test changes locally or in an isolated staging environment.
3. Open a pull request for review by Codex, Gemini or another AI coding assistant.
4. Deploy only after validation and explicit approval; **pushing to GitHub does not currently deploy the live website**.

## Priorities

Build the online GST Returns tool: upload Meesho GST ZIP + Tax Invoice ZIP, parse, match, reconcile and generate validated GSTR-1 JSON. Keep source and tax records separate.

## Security

**This is a public repository.** Never commit real invoices, customer records, GST return archives, database exports, API keys, Cloudflare tokens, private Access identifiers or unredacted logs. The staging source has placeholders in place of owner identity and Access audience configuration. Configure secrets via Cloudflare secure bindings.

## Known migration limitations

The preview Worker is currently a single large deployed script, not the original modular source tree. Future refactoring must preserve existing behavior. Cloudflare deployment settings, routes, secrets, Access policies and production D1 **data** are not stored here. The schema snapshot is not a live database backup.

Do not assume the current source tree can be deployed unchanged until build configuration, routing, bindings, and staging tests have been verified.

## Hindi Alexa integration (in development)

A read-only Hindi voice interface for the **existing GST Desk**, using its D1-backed staging API and an Amazon Alexa Skill. See [setup, privacy limits, and tests](docs/integrations/alexa-hindi.md). The voice feature is not deployed or attached to an Echo yet. Never deploy the sanitized staging snapshot without validating runtime bindings and Access policies.
