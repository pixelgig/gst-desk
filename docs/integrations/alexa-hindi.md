# Hindi Alexa voice access — GST Desk (existing project)

**Status (19 November 2026):** A protected read-only voice route was confirmed deployed on `gst-desk-api-staging` and returned an authenticated D1 JSON summary during owner testing. The Alexa-hosted handler has not yet been configured to call it successfully; the physical Echo remains unverified. Shipment-breakdown enhancements are now deployed to **gst-desk-api-staging** as Worker version 8 (ID `4a152e7a-c1ad-4327-ada4-c0493d590d55`, verified 100% staging traffic); the main GST Desk Worker was not touched. The Alexa-hosted handler/model still require synchronization and secure configuration.
The live app remains https://gst.nividhi.in. This is a feature of the existing
`pixelgig/gst-desk` repository, not a new GST application, tenant database, or server.

## What works once configured

- Hindi India (`hi-IN`) skill model with invocation name `जीएसटी डेस्क`
- Read-only **draft invoice count** for one explicitly authorized business
- Saved shipment status summary: carrier-confirmed deliveries, separately owner-confirmed Delhivery deliveries, in transit/out for delivery, missing AWB, returned
- Voice connection status, help, and stop
- Fail-closed behavior if credentials, database, membership, or API are unavailable

**Not yet connected:** live Meesho orders, settlements, profit, tax liability, filing.
The current schema snapshot does not establish a business-scoped sales read model;
Alexa **must not** guess these metrics. There is no voice mutation endpoint.

## Meesho order voice commands (prepared, live data pending)

The same Hindi skill now defines `TodayMeeshoOrdersIntent` and
`PendingDeliveriesIntent` in `hi-IN.json` and in the Lambda handler.

Examples after opening the skill or through a compatible Alexa Routine:
- "आज मीशो पर कितने ऑर्डर आए?"
- "कितने ऑर्डर डिलीवर होने बाकी हैं?"

The read-only voice API contract includes:
```json
{
  "availableMetrics": {"ordersToday": false, "pendingDeliveries": false},
  "orders": {"today": null, "pendingDeliveries": null, "asOf": null,
             "timeZone": "Asia/Kolkata", "source": "meesho_sync_not_connected"}
}
```

**Never interpret `null` as zero.** Alexa states that Meesho sync is not yet
connected. Once a trusted order feed is imported into D1, the backend may mark
a metric available and supply a nonnegative integer. No SMS/email polling or
undocumented Meesho API is assumed to exist.

**Metric rules for eventual synchronization:** `ordersToday` counts unique
Meesho order/sub-order IDs created on the current Asia/Kolkata calendar day.
`pendingDeliveries` counts active unique orders not yet confirmed delivered;
exclude cancelled and returned items and avoid counting shipment scans twice.
Mark any stale/partial source explicitly and do not call it live data.

**No-invocation experience:** A private Custom Skill does not automatically
intercept all "Alexa, ..." requests. Alexa Routines can sometimes map selected
phrases to a skill action where supported by the account/locale, but we must
verify compatibility on the actual Hindi device. Do not promise universal
invocation-free queries or automatic interpretation of any Meesho question.

**Amazon console sync:** Updating GitHub does not automatically update the
Amazon-hosted skill. Re-import `hi-IN.json`, build the model, and update the
Alexa-hosted Lambda handler under the existing Amazon skill. Then set secrets
in Amazon's supported secure environment/configuration mechanism. Never put
API secrets in repository or screenshots.

## Existing project files

- `cloudflare/workers/gst-desk-api-staging/worker.template.js`: existing staging API, now routes `GET /api/voice/summary`
- `cloudflare/workers/gst-desk-api-staging/voice-summary.mjs`: new read-only endpoint
- `integrations/alexa/lambda/index.js`: Amazon ASK Node.js handler
- `integrations/alexa/interaction-models/hi-IN.json`: voice commands
- `integrations/alexa/test/voice-summary.test.mjs`: security and contract checks

## Saved shipment metrics for Alexa (19 November 2026 source update)

The owner requested that Alexa focus on **existing shipping data**, not claim current Meesho order sync. The D1 baseline at review was: 24 shipment candidates, 9 carrier-confirmed Valmo deliveries, 4 owner-confirmed Delhivery deliveries, 2 tracked in transit/out-for-delivery, 8 awaiting AWB, and 1 returned. These numbers are a dated diagnostic, **not constants** in the skill.

The enhanced read-only voice response now distinguishes:
- `delivery.verifiedDelivered`: real carrier-confirmed delivery, includes actual carrier delivery date evidence.
- `delivery.ownerConfirmedDelivered`: distinct owner confirmation for Delhivery, **no fabricated delivered date**.
- `delivery.totalDelivered`: same combined delivered category shown in GST Desk's Valmo dashboard; do not double-count.
- `delivery.verifiedInTransit`: recorded in-transit or out-for-delivery.
- `delivery.awaitingAwb`: AWB missing, **delivery status unknown**, not automatically late or in transit.
- `delivery.returned`: confirmed returned status.
- `availableMetrics.shipmentBreakdown`: tells Alexa these saved-record metrics are available; `orders.today` remains null because live Meesho sync is unavailable.

Added Hindi intents: `DeliveryOverviewIntent`, `AwaitingAwbIntent`, `ReturnedOrdersIntent`. Existing `PendingDeliveriesIntent` describes moving vs AWB-missing shipments explicitly rather than pretending to know the real-time pending Meesho order total. The handler uses Node.js 16-compatible HTTPS requests because Alexa-hosted Node runtimes can lack built-in `fetch`.

These are **aggregate-only household-safe answers**. Listing exact order references, customer names, shipping addresses or financial details over a shared household Echo needs additional voice authorization/privacy design; no such details are disclosed by this change. The Alexa developer console must be synchronized with updated `index.js` and `hi-IN.json` and redeployed separately. The staging Worker must also receive the tested new `voice-summary.mjs` while preserving the existing owner's Access JWT checks and D1/secret bindings. GitHub commits alone update neither platform.

## ALEXA-003: broad Hindi interaction model and backend-only upgrades

See the detailed [voice question catalogue](./alexa-question-catalog.md). Our source now includes **52 custom business intents**, including **40 planned business topics**, **230 Hindi sample utterances**, and `BusinessQueryIntent` with a single `AMAZON.SearchQuery` slot. This is a broad interface, **not literally unlimited recognition**; Amazon must still build/validate the model.

The Lambda handler includes `GenericBusinessHandler` for future topics and uses Node.js 16-compatible HTTPS to send recognized intent names and the optionally captured question to **`POST /api/voice/query`**. This read-only endpoint performs the same owner/membership/bearer checks as the summary endpoint and returns `{readOnly,available,spokenText}`. When a requested metric is not in trustworthy D1, it answers **"इस सवाल का डेटा अभी जीएसटी डेस्क में उपलब्ध नहीं है।"** It never guesses zeros, invents a live marketplace feed, executes voice-selected SQL, writes financial/shipping data, or returns buyer/order-identifying information.

**Future change principle:** When a new authorized metric becomes available, update the Cloudflare D1 read model and deterministic voice dispatcher. The existing Alexa code need not be edited for every metric if the intent was already registered or matched through the flexible query. For entirely new voice patterns, locales, Alexa API permissions, or endpoint changes, Amazon may still require a model rebuild and code deployment. Github source changes do not automatically deploy to Alexa.

**Release status:** The earlier saved-shipment summary was deployed as Cloudflare staging v8. The new **ALEXA-003 voice question endpoint and expanded model** are not considered active until the new staging version and Amazon model/Lambda are independently deployed and verified. The production GST Desk Worker remains separate.

## Backend prerequisites — do NOT deploy the sanitized snapshot blindly

1. Verify the *actual* staging Worker deployment, routing, and bindings. The checked-in
   `worker.template.js` contains sanitized Cloudflare Access JWT configuration.
   Replace placeholders in a secure deployment environment; do not commit credentials.
2. Ensure the staging Worker has the **existing** D1 binding `DB` for `gst-desk-db`.
   Do not create a second database and do not automatically run migrations.
3. Configure runtime secrets/environment values on that Worker:
   - `VOICE_API_TOKEN`: random, high-entropy secret, never in GitHub
   - `VOICE_OWNER_EMAIL`: owner email already authorized by GST Desk
   - `VOICE_BUSINESS_ID`: existing business UUID/ID, never taken from a voice request
4. Confirm that the owner is an **active** user with an **owner** membership for that
   business in `gstdesk_memberships`. This intentionally blocks unauthorized businesses.
5. If Cloudflare Access protects the API route, configure a **scoped service token**
   policy for the voice client. Do **not** broadly bypass Access for the whole API.
   Worker bearer-token validation is still mandatory and independently enforced.
6. The GitHub staging reference imports `voice-summary.mjs`, but the existing deployed Cloudflare editor uses the same module code as `voice-summary.js`. Preserve the actual current `worker.js` and update its imported voice module with explicit `/api/voice/query` routing. Do not blindly deploy the sanitized template. The repository's root `wrangler.jsonc` targets **production `gst-desk-preview`**, not staging.
7. Validate both endpoints in staging (401 without token, 403 for unauthorized membership, 405 for unsafe method, 200 for allowed owner). Ensure unsupported topics reply unavailable and no buyer records enter voice responses.

## Alexa setup — required Amazon-hosted skill endpoint

1. In [Alexa Developer Console](https://developer.amazon.com/alexa/console/ask),
   create a **Custom** skill for Hindi (India). Its backend is an Alexa-hosted
   Node.js function or a skill-specific AWS Lambda endpoint: Amazon requires this
   endpoint even though GST Desk remains the sole business backend.
2. Load `interaction-models/hi-IN.json` in the JSON interaction-model editor.
   Build and validate. Adjust the invocation name if Amazon's validation rejects it.
3. Use `lambda/index.js` and its `package.json` in the skill's handler project.
   Install the SDK dependencies. For a regular Lambda, configure the Alexa Skills
   Kit trigger with **only your skill ID**; do not create an unprotected public HTTP endpoint.
4. Configure the handler's runtime environment (secrets should be managed using
   supported encrypted settings/secret facilities; never embed them in source):
   - `ALEXA_SKILL_ID`: exact skill ID from Amazon's skill console
   - `ALEXA_ALLOWED_USER_ID`: the Alexa account user ID from a controlled test
     request, belonging to the owner; do not use an arbitrary fabricated ID
   - `GST_DESK_VOICE_API_URL`: exact HTTPS staging URL ending in `/api/voice/summary`
   - `GST_DESK_VOICE_API_TOKEN`: same secret as `VOICE_API_TOKEN`
   - Optional `CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET`: paired service
     credentials if staging is behind Cloudflare Access
5. Test in Amazon's developer simulator, then on the authorized Echo/account.
   Sample utterances: "एलेक्सा, जीएसटी डेस्क खोलो",
   "कितने ड्राफ्ट चालान हैं", "सिस्टम की स्थिति बताओ".

## Security and privacy notes

- Requests are restricted to the configured Alexa skill and account user ID.
  **Alexa account user ID does not authenticate which household member is speaking.**
  The initial feature therefore exposes only aggregate draft and shipment counts. Do not add
  customer details, payment values, profit, or tax amounts without a separate
  strong authorization step such as secure phone confirmation/account linking.
- The backend checks a separate bearer token, active owner membership, and a fixed
  business ID. Responses are `no-store` and contain no names or invoice values.
- Amazon's skill endpoint must validate request authenticity/skill ID. Use Amazon's
  ASK SDK and skill-specific Lambda trigger, not a raw unauthenticated HTTP webhook.
- Rotate any exposed secret and audit Cloudflare routing before enabling production.
- This feature cannot reach data only stored in the browser's `localStorage`.
  Data must be deliberately migrated/synchronized with proper tenant isolation.

## Tests

Run: `node --test integrations/alexa/test/*.test.mjs`

The CI workflow checks the read-only endpoint, authorization failures, schema
contract, syntax, and Hindi interaction model. These tests do **not** constitute
an Alexa-device test, Cloudflare deployment test, or GST calculation audit.

**Deployment boundary:** Protected staging voice endpoint and three encrypted staging secrets have been observed in Cloudflare; the Alexa-hosted skill has not yet completed authenticated integration. Never confuse cloud staging with the main production Worker. No D1 records were changed by the voice feature or submitted to GSTN.
