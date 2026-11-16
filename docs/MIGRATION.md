# Cloudflare → GitHub source-control migration

**Source:** existing Cloudflare account; no changes made to deployed Workers or D1.

## Imported
- Worker script `gst-desk-preview` — deployed source snapshot.
- Worker script `gst-desk-api-staging` — sanitized template, with owner email and Access AUD replaced.
- D1 `gst-desk-db` — schema-only SQL snapshot, no business records.

## Still managed by Cloudflare
- Runtime deployment, routes and domain `gst.nividhi.in`.
- Access policies, secrets, environment variables and other private settings.
- Production D1 records and database backups.
- Any static assets not contained in the Worker script.

## Before enabling GitHub-driven deployment
1. Recover/verify routes and compatibility settings.
2. Set up secure credentials as Cloudflare secrets and GitHub Actions secrets, never as source code.
3. Validate the current source and D1 migrations in an isolated environment.
4. Protect the production branch and use pull requests.
5. Prepare a rollback and D1 backup.
6. Confirm an explicit production deployment workflow.

**No automatic deployment is configured.** GitHub is now the source-code collaboration location; Cloudflare remains the runtime.
