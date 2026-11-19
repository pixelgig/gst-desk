# NIVIDHI / GST Desk — Alexa Hindi voice question catalogue (ALEXA-003)

> Working source and setup reference for the **existing GST Desk**. These are *sample phrases*, not a claim that every possible Alexa utterance can be recognized or that every corresponding data source exists. The Alexa Developer Console must still import, build and deploy the new model and code.

## New voice model

- Latest source: [hi-IN.json](../../integrations/alexa/interaction-models/hi-IN.json)
- Lambda handler: [index.js](../../integrations/alexa/lambda/index.js)
- Protected backend: [voice-summary.mjs](../../cloudflare/workers/gst-desk-api-staging/voice-summary.mjs)
- Invocation: **जीएसटी डेस्क** for a private Custom Skill; supported Routines/name-free entry are not guaranteed.
- Broad sample utterances cover the old 11 business intents plus **40 additional topic intents**; a dedicated `BusinessQueryIntent` has exactly one `AMAZON.SearchQuery` slot named `question` (Hindi-IN supported), with required carrier phrases such as `मुझे {question} के बारे में बताओ`.
- Total source model at ALEXA-003 drafting: 56 intents including four built-in intents, 58 custom intents, and 322 sample utterances. Changes must be validated in Amazon's Hindi interaction-model builder.

## Questions that can use today's saved D1 data

Only when the Alexa skill account authorization, bearer secret and staging route are fully configured:

| Example spoken Hindi question | Current source-of-truth answer |
|---|---|
| कितने ऑर्डर डिलीवर हुए | Combined **carrier-confirmed and owner-confirmed** delivery count, with the two sources identified |
| कितने पार्सल रास्ते में हैं | Shipment records marked `in_transit` or `out_for_delivery` |
| कितने पार्सल की ए डब्ल्यू बी नहीं मिली | No-AWB count, not automatically overdue/in transit |
| कितने पार्सल रिटर्न हुए | Records marked `returned` |
| पूरा शिपमेंट स्टेटस बताओ | Read-only delivery breakdown |
| कितने ड्राफ्ट चालान हैं | Currently saved authorized D1 draft-invoice count |

Known historical D1 snapshot (2026-11-19, *not* persistent constants): 24 candidates, 13 combined delivered (9 carrier + 4 owner), 2 in transit/out-for-delivery, 8 awaiting AWB, 1 returned.

**Not supported:** voice-triggered carrier checks or writes; speaking customer names, addresses, exact order IDs, private order details, payout amounts or profit on an ordinary shared Echo without stronger voice/phone authorization.

## Future topic coverage (recognized now, not necessarily answerable)

**Commerce:** today's Meesho orders (not yet a trusted live feed); total/channel orders; awaiting dispatch; cancellations; refunds; marketplace settlement; pending payouts; platform charges; customer complaints; return rates.

**Sales and finance:** today/month sales; total revenue; cashflow; expenses; purchases; net profit; product profit; sales comparisons; bestselling products. These require verified normalized financial tables and suitable privacy gating.

**Product and listing:** inventory; low stock; catalogue; listing status for Meesho/Flipkart/Amazon; AI product drafts; SKU and listing activity.

**GST and documentation:** tax payable; GSTR-1; GSTR-3B; filing calendar; ITC; HSN/tax rates; invoice and credit-note summaries; historical imports; backups.

**Shipping operations:** couriers and fees, tracking exceptions, shipping-label imports and saved shipment details (individual identities remain private).

**Owner operations:** business overview, notifications, reminders and saved status.

Currently unimplemented data must be reported as **unavailable**, not as zero. Invoice metadata is not a new-order feed; GST computed totals are not filed returns; owner-checked delivery isn't carrier proof.

## GST Desk voice self-knowledge: frequently asked questions (ALEXA-004)

Six first-class Hindi intents are now included in the interaction model. They answer questions about Alexa's real **current read-only integration**, not the complete capabilities of the GST Desk website:

| Intent | Examples | Safely grounded answer |
|---|---|---|
| `CapabilitiesIntent` | "जीएसटी डेस्क में तुम क्या कर सकती हो", "तुम मेरे लिए क्या कर सकती हो" | Saved shipment and draft counts (only where flags confirm availability); no writes, filing or live orders |
| `AccessScopeIntent` | "तुम्हारे पास क्या एक्सेस है", "क्या तुम रिकॉर्ड बदल सकती हो" | Authorized owner aggregate summary only; cannot change, delete, submit or disclose customer details |
| `DataAvailabilityIntent` | "तुम्हारे पास कौन कौन सा डेटा है", "अभी कौन सा डेटा उपलब्ध है" | Current authorized D1 shipment-record and draft-count availability (not an assertion of real-time Meesho access) |
| `QuestionExamplesIntent` | "मैं तुमसे क्या पूछ सकता हूं", "कमांड के उदाहरण दो" | Examples of confirmed and read-only voice questions |
| `DataFreshnessIntent` | "क्या तुम्हारा डेटा लाइव है", "आखिरी बार डेटा कब सिंक हुआ" | Truthfully distinguish saved D1 records from absent live Meesho sync |
| `PrivacySafetyIntent` | "क्या मेरा डेटा सुरक्षित है", "क्या तुम ग्राहक के पते बता सकती हो" | No customer names/addresses/individual order details spoken on shared Echo |

Each intent has multiple Hindi examples; `BusinessQueryIntent` also recognizes some common paraphrases through its open question slot. Answers originate in the same authorized backend query dispatcher. An unavailable feature does not become available by adding a sample phrase.

**Model repair:** ALEXA-003's first generated model accidentally contained **single Hindi characters** as some utterance samples. The ALEXA-004 patch replaced all 40 affected future-topic samples with complete natural Hindi phrases and added a regression test to reject short/single-character samples. **Do not import any older 230-phrase version into Amazon.** Current validated source model has **62 intents (58 custom + 4 standard), 322 unique complete phrases**; Amazon model Build and on-Echo testing are still separate requirements.

## Flexible voice question

Once Alexa is launched, the broad slot allows prompts like:

- `मुझे कितने पार्सल डिलीवर हैं के बारे में बताओ`
- `जीएसटी डेस्क में इस महीने की बिक्री की जानकारी दो`
- `बिजनेस में कितना प्रॉफिट हुआ की रिपोर्ट बताओ`

Alexa must still recognize the carrier phrase and successfully capture the slot; some spontaneous questions will not match and may reach a fallback instead. No assistant should promise literally unlimited voice recognition.

## Back-end-only future extension rule

The Alexa Lambda now sends unhandled explicit intents and captured `BusinessQueryIntent` requests to `POST /api/voice/query` with the existing private bearer secret and (when applicable) scoped Cloudflare Access service credentials. The Cloudflare handler:

1. Validates HTTP method, JSON content, bounded request length and intent name.
2. Reuses `handleVoiceSummary` security: token comparison, configured fixed business ID, active owner membership, existing D1.
3. Matches only verified, allowlisted D1 aggregate metrics (no arbitrary SQL, external LLM, third-party calls or voice writes).
4. Returns `{readOnly:true,available:boolean,spokenText:string}` to the Alexa handler.
5. If data is unknown, unavailable or its access is not approved, says **इस सवाल का डेटा अभी जीएसटी डेस्क में उपलब्ध नहीं है।** There is a separate appropriate response for a disconnected/failed API and for disallowed sensitive details.

For a future metric **already in a voice topic intent or recognized by the flexible query**, the next AI edits only the Cloudflare dispatcher/data reader, tests, [AGENTS.md](../../AGENTS.md) and [brain.md](../../brain.md), then stages it safely. **Updating the Alexa Developer Console is not required for an ordinary D1 data refresh.** An entirely new Alexa utterance pattern/locale, changes to the Alexa endpoint, or new slot/intent design may still require editing and rebuilding the skill. A future ASK CLI workflow can automate those Alexa releases with secure Amazon authorization; a GitHub commit alone never updates Amazon.

## Manual one-time Alexa synchronization still pending

Once backend tests and a secure accessible staging HTTPS route are ready, install these two GitHub files into the **existing** Amazon skill:
- `integrations/alexa/interaction-models/hi-IN.json`: **Build → JSON Editor → Save Model → Build Model**.
- `integrations/alexa/lambda/index.js`: **Code → lambda/index.js → Save → Deploy**.

Keep the working `lambda/package.json` ASK dependencies. Do not replace the actual server with the sanitized `worker.template.js`, enable a public route before authenticating, or insert the bearer token in any public file. Amazon Alexa-hosted secret configuration, skill ID and account ID still require validation before the first live voice answer.

## Model and production acceptance criteria

- Source checks and unique utterances pass; no two intents use the same sample phrase.
- Amazon Build Model confirms all sample utterances and Hindi search slot are valid.
- Unauthorized `GET /api/voice/summary` and `POST /api/voice/query` return 401; invalid methods return 405; an authorized owner can retrieve aggregate data.
- Unknown intent and unsupported GST/finance topics return unavailable, **never** fake values.
- Alexa cannot write or reveal shipment/customer identities from the generic request.
- Explicit old delivery intents and the new free-form route return consistent backend figures.
- Stage/code deployment, Amazon Lambda/model deployment, physical Echo test and owner acceptance are separately recorded in the append-only ledger.
