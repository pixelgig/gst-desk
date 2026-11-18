# Zero-cost checkpoint — 17 November 2026

No resources provisioned and no paid services activated. Billing entitlement remains unverified: Cloudflare OAuth connection cannot call subscription billing endpoint (403). R2 API returns activation-required code 10042. Owner-controlled subscription review is required before provisioning. Do not assume any free allowance prevents overage charges.

Official sources checked on this date:

| Product | Published allowance | Source |
|---|---|---|
| Workers Free | 100,000 requests/day, 10 ms CPU/request, 5 cron triggers/account | https://developers.cloudflare.com/workers/platform/limits/ |
| D1 Free | 5M rows read/day, 100k written/day, 5 GB account storage | https://developers.cloudflare.com/d1/platform/pricing/ |
| D1 Free database | 500 MB each; 7-day Time Travel | https://developers.cloudflare.com/d1/platform/limits/ |
| R2 Standard | 10 GB-month/month, 1M Class A and 10M Class B requests/month | https://developers.cloudflare.com/r2/pricing/ |
| R2 onboarding | Subscription checkout required; usage billed monthly | https://developers.cloudflare.com/r2/get-started/ |

No Queues, Access onboarding, cron, external OCR or notifications activated. Verify their current terms before use. Existing D1 measured size: 106,496 bytes; daily row usage is unknown. New migration only ran in an ephemeral local SQLite database. No document storage exists yet. Capacity projection requires actual average document bytes, monthly order count, retention and backup overhead; do not invent operating usage.

Future write admission must include atomic reservations and concurrent upload headroom, monthly operation budgets, backup overhead and refusal when quota information is stale. R2 billing integrates GB-month usage; a static byte ceiling alone does not establish a bill cap. Until entitlements are known, use the specified explicitly labeled local-only fallback. This fallback remains to be implemented and tested.
