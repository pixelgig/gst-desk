# GST Desk — zero-recurring-cost guardrails and Telegram alerts

Status (2026-11-23): **proposal / not deployed**. The standalone webhook relay and pure policy helpers are in this branch. They are not wired to any active R2 operation and do not yet limit real usage. Do not claim Telegram notifications are active until a test alert is delivered to both owners.

## Verified account facts

- Cloudflare R2 subscription enabled; connected account currently has **zero buckets**. No R2 Worker binding is configured in production.
- Cloudflare production Worker uses the existing D1 binding; no Telegram secrets exist in its listed bindings.
- An account-level **US $0.10 projected spend email alert was created** on 2026-11-23. An earlier default $10 projected spend alert remains. These are notifications, not shutdowns.
- Connected Cloudflare OAuth returns HTTP 403 for native Billing / Spend Policies APIs and usage APIs; do not misreport hard spend controls as configured.

## Cost ceilings for GST Desk itself

| Resource | Safety policy | Enforcement status |
|---|---|---|
| R2 Standard stored original files | 8,000,000,000 decimal bytes; max single upload 50,000,000 bytes | Policy code only; enforce with atomic D1 reservation before R2 is enabled |
| R2 Class A operations | At most 50,000 per UTC calendar month | Policy code only; meter all writes/lists and retries before each R2 call |
| R2 Class B operations | At most 250,000 per UTC calendar month | Policy code only; meter all downloads/reads and retries before each R2 call |
| Worker, D1, platform products | Remain on Free; prohibit optional paid services, cron storms and unapproved bindings | Needs configuration review; app code cannot cap all account usage |
| Workers / Durable Objects spend | Use Cloudflare's native **Spend limits** with blocking, if the plan permits | NOT configured: API returns HTTP 403 |
| Other R2 buckets or API keys | Disallow untracked public writes; review all accounts and credentials | NOT enforced by app quota |

Thresholds at 50%, 75% and 90% of the application quota should generate one warning per metric and month through Telegram; at 100%, fail closed. The `r2-policy.mjs` pure calculation is not a complete guard: it must be wired to **server-trusted D1 counters**, with one atomic conditional reservation per operation and storage reconciliation, before an R2 binding, bucket, or upload route goes live. Account-wide operation usage and GB-month billed storage are not identical to app-owned counters.

## Telegram relay

Proposed flow: Cloudflare account budget notification -> **Cloudflare generic webhook** -> separate Worker `gst-desk-cost-alerts` -> Telegram Bot API -> one or two authorized chat IDs. No polling or scheduled cron is needed for the billing event relay.

1. In Telegram, create a bot with @BotFather and send it `/start` from each intended recipient account. Obtain each numeric chat ID via a trusted local Telegram Bot API `getUpdates` call.
2. Do **not** share bot tokens, chat IDs, invoice data or webhook secrets in GitHub, issues, screenshots, public chat or source code.
3. Deploy the isolated relay using `npx wrangler deploy -c wrangler.cost-alerts.jsonc` from a trusted environment, then set the secrets `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_IDS` (comma-separated, at most two), and `CLOUDFLARE_WEBHOOK_SECRET` using `npx wrangler secret put <NAME> -c wrangler.cost-alerts.jsonc` or equivalent authenticated dashboard controls.
4. In Cloudflare Notifications, register a generic webhook destination for `https://<relay-worker-host>/cloudflare-budget` and set the same strong random webhook secret. Cloudflare dispatches that secret in the `cf-webhook-auth` header.
5. Associate the webhook destination with the existing `$0.10` **billing_budget_alert** policy, leaving email as fallback. Test with Cloudflare's test notification capability if supported for this alert type; otherwise verify a real notification without intentionally incurring charges.
6. Verify delivery, invalid-header rejection, no secret disclosure, optional second recipient, and emergency bot revocation.

Unlike app-record warnings, Cloudflare budget alerts are calculated periodically from projected usage and may be late. Telegram itself cannot guarantee delivery. Configure native Workers/Durable Objects **Spend limits** at the smallest practical blocking thresholds in **Manage Account -> Billing -> Spend limits**, and disable any unneeded metered products.

## Cutover acceptance gates

- Do not create the R2 bucket or bind it to production until the full upload/download/delete handlers and atomic usage accounting are implemented and tested.
- Operate only one private Standard-class bucket; public R2 routes disabled; all access through Cloudflare Access-verified Worker routes.
- Backfill/reconcile existing objects and metadata before permitting writes; reject when the usage ledger is unavailable, stale or mismatched.
- Keep storage bytes as actual byte counts, including reserved incomplete uploads and all retained previous versions; do not rely on a single unverified `SUM(byte_size)`.
- Meter **every** R2 read/write/list/delete/multipart action and retry, with conservative spare headroom, since R2 operations can be billed independently of storage.
- Preserve D1 historical import/export paths; never delete data when quota is hit; allow read/export and cleanup under appropriate controlled budgets.
- Never claim ₹0 guaranteed. Review the official [R2 pricing](https://developers.cloudflare.com/r2/pricing/) and [Cloudflare Spend Management](https://developers.cloudflare.com/billing/manage/spend-management/) periodically.

## AI change record

- 2026-11-23: ChatGPT GPT-6; added standalone authenticated Telegram relay, policy calculators and regression tests on a review branch. Created verified $0.10 email account budget alert. No production Worker deployment, R2 bucket creation, R2 quota enforcement, billing spend-policy change, or Telegram delivery claimed.
