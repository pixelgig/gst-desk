# GST Desk Alexa — Public Privacy and Terms pages

**Owner request (2026-11-19):** Alexa Certification → Validation was down to two missing items: **Export compliance confirmation** (must be accepted by the owner if accurate) and a public **Privacy Policy URL for hi-IN** because the skill was marked as processing user information.

## Public HTTPS endpoints

- Privacy Policy URL: https://gst-desk-legal.gstdesk-nividhi.workers.dev/privacy
- Terms of Use URL: https://gst-desk-legal.gstdesk-nividhi.workers.dev/terms
- Directory landing page: https://gst-desk-legal.gstdesk-nividhi.workers.dev/

These are hosted by a **separate** lightweight Cloudflare Worker named `gst-desk-legal` on the Cloudflare account's `gstdesk-nividhi.workers.dev` subdomain. It has no D1 binding, no API token, no private data and no cookies. The public URL is intentionally **different** from the protected `gst-desk-api-staging` Worker, whose public workers.dev URL remains disabled. Publishing legal pages does not connect Alexa to GST Desk data, change GST return records or publish the Alexa skill itself.

## Source / change management

- Source legal texts supplied by owner: `privacy.txt`, `terms.txt` at repository root.
- Public HTML renderer source: `cloudflare/workers/gst-desk-legal/worker.js`. It embeds a **snapshot** of the original two files, escapes HTML and renders the existing Markdown headings and bold spans.
- Future text edits must update the root `.txt` files first, then synchronize the Worker snapshot and deploy it. A GitHub-only edit **does not** update the live legal pages automatically.
- A browser check of both URLs should be performed after deployment, and its outcome recorded separately.
- Alexa Distribution → Skill Preview → Hindi (IN) → **Privacy Policy URL**: use the privacy link above.
- Alexa Distribution → Skill Preview → Hindi (IN) → **Terms of Use URL**: use the terms link above (if requested).
- Alexa Distribution → Privacy & Compliance → **Export compliance**: the owner must review and confirm; an AI must not silently accept this legal acknowledgement.

## Mandatory content completion

Both original files contain the literal placeholder **`[CONTACT EMAIL]`**. This is **not a genuine support contact**. Before certification submission, obtain an email that the Nividhi Ecommerce/GST Desk business agrees to publish and replace this placeholder in both root legal text files **and** in the Worker source, then redeploy and verify. Never automatically publish the owner's private email without explicit approval.

Ensure the final privacy policy accurately reflects actual Alexa user-ID validation, authentication, voice request handling, logs/retention and any AWS/Cloudflare data processing. Do not claim the private Alexa-to-Cloudflare voice integration is working: it remained unconfigured at the time of initial legal-page setup.

## Rollback

Disable only `gst-desk-legal` worker's workers.dev subdomain or redeploy its prior version. Do not modify, disable or roll back `gst-desk-api-staging` or `gst-desk-preview`.
