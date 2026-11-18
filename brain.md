# GST Desk / NIVIDHI — Project Brain and AI Handover Manual

> **Mandatory reading for every future AI developer.** This is the canonical *project knowledge and change-safety guide* for the existing NIVIDHI GST Desk project. Read this file **before** proposing an architecture change or editing code. Then inspect the **actual latest source and deployed runtime**; this manual is not executable truth and may lag future commits.
>
> **Repository:** https://github.com/pixelgig/gst-desk  
> **Primary branch:** main  
> **Production:** https://gst.nividhi.in  
> **Product:** GST Desk 2.0, a private NIVIDHI / Chaudhary Enterprises e-commerce business operating system  
> **Snapshot assembled:** 19 November 2026 (Asia/Kolkata).  
> **Scope:** Only GST Desk, its GST/accounting/shipping/marketplace features, related Alexa integration, and the NIVIDHI e-commerce business. Unrelated hardware, personal finance and agent experiments are not part of this handbook.

## 0. How an AI must use this document

1. Read the entire brain.md and the current README; identify the precise feature or bug.
2. Read the **current main branch files and tests** listed in the feature ownership map below, not just this guide. Check for commits more recent than the date above.
3. Verify existing production Worker, Cloudflare Access, D1 binding, custom domain, secrets *presence* (never disclose secret values), deployment history, and relevant data constraints before suggesting deployment.
4. State which behavior is **currently implemented**, **source-only / unverified**, **historical**, **partially implemented**, or **planned**. Do not describe a mock, an old ZIP, an invoice, or a planned API as live marketplace integration.
5. Prefer the smallest incremental patch and regression test. Preserve all 16 legacy modules, the extra modern homepage, Cloudflare D1 data, and custom domain.
6. Do not replace the app with an unrelated SaaS, Windows installer, new repo, new paid service, or fresh D1 database.
7. Make a private backup before any production schema/data mutation. Never put unredacted records into this **PUBLIC** repository.
8. Run existing tests and perform real authenticated browser/mobile checks where possible. Unit tests alone are not proof that the phone sees the feature.
9. Report exactly what changed, what was actually deployed, which tests passed, remaining risks, and how to roll back code without falsely claiming D1 rollback.
10. For changes to filings, taxes, money, invoice dates or carrier events, preserve source evidence and human review. Never infer missing facts.

### Source coverage and confidence

This manual derives from an inspection of the repository's current tracked files and tree, migration/operations documents, commit history through the November 19 fixes, and retrievable GST Desk conversation context from the project's prior chats. Project discussions included **Build GST Filing App**, **Create Alexa Skills**, **Recall Memories Automation**, **OpenClaw Explained**, and discussions of homepage/Valmo debugging and new AI capabilities. **Complete raw transcripts of all five conversations were not available as an independently exportable archive in this audit.** Retained project conversation excerpts, project summaries, and available requirements were used; unverifiable wording or unobserved chat steps are not presented as exact transcript quotations. The large source files were inspected using the GitHub connector. Exact line numbers below are *as of this snapshot*, and may shift; identify symbols and DOM IDs as well.

**Ground-truth priority:** current source + actual D1 schema and deployment + real browser behavior > tests and operational notes > this document > old conversation ideas. Existing documentation occasionally describes early migration state and may have become stale.

## 1. Business identity, business model and objectives

### 1.1 NIVIDHI / Chaudhary Enterprises

The family operates a small, **part-time, GST-registered Indian e-commerce resale business**, with the seller identity **NIDHI** used in current invoice and label verification. **Meesho** is the primary marketplace and current source of order-related exports. **Amazon** and **Flipkart** are intended expansion channels; a first-party storefront may be added later. Products include fashion accessories such as earrings, necklaces, hair clutchers and comparable low-cost resale stock. Catalogue size is modest: automation should reduce repetitive effort without assuming enterprise volumes or expensive infrastructure.

The user manages business finance, tax records, settlement understanding, product/data workflows and software. Many resale purchases (approximately 99% reported) have **no supplier GST tax invoice**. Record true purchase costs separately; **do not fabricate input tax credit or GST invoices**. GST registration exists; avoid assuming purchases are ITC eligible. Confirm seller eligibility, invoice format and filing rules with authentic GST sources/accountant before submitting real returns.

### 1.2 Mission

Build **one online, private, mobile-friendly Business Management OS** that reduces paperwork and manual labour, consolidating:

- GST return preparation, Meesho reconciliations and valid JSON exports.
- Historical sales/invoices/credit notes, costs, purchase records and return entries.
- Marketplace order management, shipping labels, Valmo/Delhivery status and evidence.
- Stock, catalogue, profitability, settlements and payment reconciliation.
- Owner-facing dashboards, import/export/backup, filing calendar and AI-assisted workflows.
- Future Alexa Hindi read-only commands and photo-to-listing AI automation.

**The core goal is to free the owner’s time**, not to build technology for its own sake. Automate safe, repeatable administrative tasks, but require approval for uncertain or irreversible financial actions.

### 1.3 Non-negotiable product constraints

- **₹0 recurring operational cost** is a first-class design rule. Do not silently add paid R2, OCR, Gemini API usage, payment cards, subscriptions, paid queues, or proprietary automation tools.
- Prefer always-free / free-quota Cloudflare services only if actually verified under the user's account and free-plan limits. Verify Cloudflare prices and limits afresh before relying on them.
- Preserve **pixelgig/gst-desk** and **main** as the source of truth. Do not fork the project into another app, new database, alternate deployment or disconnected bot backend.
- Preserve the domain **gst.nividhi.in**, production access control, current data and existing module links.
- The owner uses the application across devices: durable data should live in authenticated cloud storage rather than only one browser's localStorage. However several old workspaces still use legacy storage patterns; treat migration as incomplete until verified.
- Never claim the user has real-time Meesho/Amazon/Flipkart API access. Marketplace screenshots, downloaded reports and invoices are not the same as authorized live order synchronization.
- Do not automate GSTN logins, OTPs, CAPTCHAs or submission without a supported official workflow and explicit human approval. “Prepared JSON” is **not** “filed return”.
- Keep customer addresses, buyer personal data, uploaded source PDFs/ZIPs, tax credentials, Access secrets and finance exports out of the public repo and out of unnecessary cloud payloads.
- Money is represented in **integer paise** in validated D1 datasets; source rounding and tax discrepancies remain visible.
- No fake “delivered”, “in transit”, order count, ETA, GST payable, settlement or profit.
- Responsive, premium, lightweight UI with visible actions, smooth operation on mobile and minimal requests. Icons must not make first paint slower.
- Keep both a credible source trail and an easy way for the owner to correct errors.

## 2. Historical evolution and decisions

### Phase A: browser-local GST Desk MVP

A starting GST Desk HTML application supported basic business transactions, returns worksheets, invoices, backups and later many workspaces. Browser localStorage persisted key portions of state; it was **not connected to GSTN**. The UI was designed for manual GST preparation rather than actual return filing. Original feature growth collected numerous tools in one embedded Worker HTML/JS source.

### Phase B: cloud migration and private production identity (November 16–17, 2026)

The user selected an **online application**, not a portable/Windows app. The existing Worker was imported to GitHub under pixelgig/gst-desk. The existing Cloudflare Worker, custom domain and D1 database were retained. The D1 source snapshot and migration SQL were committed, with no original customer records or document binaries. Cloudflare Access was configured for a private owner session. Owner JWT signatures, issuer, audience, expiry, email and active D1 owner membership are checked server-side.

An initial master enterprise prompt envisaged 16 existing workspaces plus a 17th **Order Intake & Document Vault** as an additional future capability; note that a dedicated production module with that exact name is **not in the present Worker navigation**. “17th workspace requested” is distinct from “17th distinct implementation delivered”.

### Phase C: historical GST and invoice data (November 17–18)

Source Meesho GST ZIPs, tax invoice registers/PDFs and filed returns were examined and converted to authenticated D1 metadata. The repository documents initial September 2026: 12 sales report rows, one return row, 14 invoice/credit-note metadata documents from the source archive with 13 documents dated September and one dated October 1. **Invoice issue date**, not source archive month or order date, determines document-month display.

The September filed-return benchmark preserved independently from parsed transaction math was:
- Taxable outward value: **₹1,695.85**.
- IGST: **₹46.64**.
- CGST: **₹3.52**.
- SGST: **₹3.52**.
- Differences due to rounding on source records must be *reported*, never silently rewritten to match filing.

The cross-month fixture **87whi2713** has order date 30 September 2026 and document issue date 1 October 2026; its issue-month is October even if it appeared inside a September ZIP.

The more recent documented invoice/label fixture **87whi2723**, dated 15 November 2026, has taxable value ₹121.66, IGST ₹3.65 and grand total ₹125.31, SKU vZe4Uraz, HSN 7117 and a separately examined product/other-charges breakdown. Do not mistake one fixture for universal amounts or live orders. Test re-imports for exact duplicate detection.

### Phase D: D1 invoice overview, shipment tracking and imports (November 18)

The private D1 overview added eight headline KPIs, issue-month tiles, recent invoices, filed-return information and invoice drilldown, as a sibling before the old React workspace. Shipment candidates derive from original tax invoices, **not** credit notes; invoices alone cannot establish dispatched/delivered status. The Valmo feature gained authenticated manual on-demand carrier checks, verified dated events, two summary categories and a saved snapshot. Shipping labels were parsed **locally** (PDF/ZIP) with no binary upload; only seller-verified identifiers, invoice/GST audit data, hashes and source references go to D1.

Owner-confirmed Delhivery deliveries are tracked **separately** from carrier-verified dates. Count them as delivered under the agreed combined summary without fabricating a delivery timestamp. Delhivery *live* tracking remains unintegrated. Valmo “Delivery by …” remains an estimate, not actual delivery date.

### Phase E: UI and startup regression fixes (late November 18 / local November 19)

The owner repeatedly reported the homepage reverting to an old 4-tile inventory/tools interface and the Valmo importer disappearing. Commits restored eight D1 KPI cards, the premium design, clickable NIVIDHI header home link, light inline SVG icons, cached first paint, visible PDF importer, wide refresh and the two categories only (**Total Delivered** and **Total In Transit**).

The critical regression had **two interacting defects**: a legacy broad CSS selector **section { display:none }** hid nested invoice overview fallback and nested Valmo uploader; and generated JavaScript stringification in a Wrangler/esbuild output could reference a build-only **__name** helper missing inside the browser script. Commit **226b7c0** scoped the CSS to **main > section** and inserted the function-name helper before inline client scripts. Commit **f23fa552** added a regression assertion. Commit **97063dc0** removed a duplicate IST suffix from the server snapshot. Cloudflare Worker deployments for the changes were checked in the earlier fix conversation, but any AI must verify the **current** deployment rather than relying on this historic statement.

### Phase F: current planned automation

The user prioritized a **Listing AI** workflow: send accessory photos to a Telegram bot, extract and confirm attributes, build a single structured product record, then generate **marketplace-specific Meesho, Flipkart and Amazon bulk Excel templates** with required-field validation. The chosen model order is **Gemini primary → Cloudflare AI secondary → free LLM API providers tertiary**, favoring no recurring cost and small volume. **This is a plan, not a deployed Telegram bot or working Excel listing pipeline.** Keep this automation connected conceptually to GST Desk catalogue/inventory, with safe approval before publication.

An Alexa Hindi skill source and staging read-only API source exist; a live Echo integration / today’s Meesho live feed is not proven. See the Alexa chapter below.

## 3. Current stack, boundaries and architecture

### 3.1 Technologies in the tracked repository

| Layer | Current technology | Practical meaning |
| --- | --- | --- |
| Version control | GitHub, pixelgig/gst-desk, main | All tracked source, tests, migrations and documentation. Repo is **public**. |
| Production web/API | Cloudflare Workers; Worker **gst-desk-preview** | Serves protected HTML and authenticated JSON API. Primary entrypoint is **cloudflare/workers/gst-desk-preview/worker.js**. |
| Production domain | gst.nividhi.in | Mapped to the above Worker; verify domain mapping before deploy. |
| SQL database | Cloudflare D1, existing **gst-desk-db** | D1 binding is **DB**. Do not create a replacement DB. |
| Identity | Cloudflare Access + signed RS256 JWT; business membership in D1 | App checks issuer, audience, email and active role owner. Access dashboard policy and server validation are distinct layers. |
| Frontend | Embedded HTML/CSS/plain JS + a legacy React/ReactDOM homepage; modular browser JS injected into HTML | Not a typical standalone React/Vite project. Browser scripts and the large Worker must be treated carefully. |
| PDF | PDF.js (pinned **3.11.174**) | Text extraction of seller labels happens on demand in the browser; external library loads can fail offline. |
| ZIP | JSZip (pinned **3.10.1**) | Unpack user-supplied ZIPs in browser; avoid uploading raw archives. |
| Excel | SheetJS/XLSX (pinned **0.18.5**) | Existing spreadsheet imports; templates/format changes need fixture tests. |
| State adapter | Cloud state client + D1 browser-state API | Mirrors selected old localStorage-like keys to authenticated D1 with revision protection. Not all legacy state is automatically normalized business data. |
| Tests | Node.js 22, node:test, jsdom for DOM tests | Two GitHub Actions workflows check source/voice behavior; see tests map. |
| Alexa prototype | Amazon ASK SDK Node.js, hi-IN interaction model, read-only staging Worker module | **Source prepared, not proof of live device activation.** |
| Observability | Cloudflare Worker observability/traces configured | Inspect failures without logging tax PII or credentials. |

Do **not** assume a package.json at the repository root, R2 bucket, Queues worker, scheduled bot, Turso database, PostgreSQL, OCR service, or marketplace OAuth is configured. A preference for Turso was discussed when avoiding possible D1 costs, but **the actual working production database remains D1**. Any proposed change needs explicit feasibility, preservation and cost analysis first.

### 3.2 Request/data flow

    Browser → gst.nividhi.in → Cloudflare Access → gst-desk-preview Worker
                                                  ├── GET protected app HTML
                                                  ├── /assets/gst-desk-state.js
                                                  ├── /assets/gst-desk-overview.js
                                                  ├── /assets/gst-desk-shipping.js
                                                  ├── /api/state* (authenticated D1 legacy state)
                                                  ├── /api/overview and /api/invoices*
                                                  ├── /api/returns/summary and /api/meesho/summary
                                                  └── /api/shipping/* (manual evidence/track)
                                                     ↓
                                             EXISTING gst-desk-db (D1)

    User-owned Meesho GST/Tax-Invoice ZIPs → browser parse/reconcile → manual review
    Shipping labels PDF/ZIP → browser PDF.js + JSZip → validated facts/hashes → D1
    Valmo AWB already evidenced in D1 → user clicks Check → Valmo API → verified event → D1
    Delhivery owner confirmation → separately flagged owner assertion (NOT carrier time)
    D1 aggregates → server HTML fallback + browser snapshots → homepage and shipment cards

**Important:** Some legacy workspace operations are still localStorage-style rather than fully normalized D1 CRUD. The legacy React inventory summary may show **0 inventory items / 0 stock / 16 tools** even when D1 has historical invoices; these are different data models. Never “fix” this by inventing inventory. Migrate and reconcile real stock sources separately.

### 3.3 Secure response construction

- Main Worker authenticates before fetching D1 data or returning the private application HTML.
- Worker creates escaped seed variables **__GST_DESK_BOOTSTRAP__**, **__GST_DESK_CACHE_SCOPE__**, **__GST_DESK_SHIPPING_SEED__**, **__GST_DESK_OVERVIEW_SEED__**.
- It embeds server snapshot HTML so a meaningful dashboard can exist before heavy JavaScript, and inlines overview/shipping client source to avoid extra requests.
- Responses set **no-store** and a restrictive CSP; do not weaken auth, CSP or privacy to “make the importer work”.
- Frontend builds dynamic elements with document.createElement, textContent and SVG createElementNS rather than trusting database strings as raw HTML.
- Local cached snapshots improve perceived speed; they are not authority for freshly changed or live carrier status.

## 4. The 16 legacy workspaces plus the modern homepage

The Worker nav contains the following **16 legacy business workspaces** and an additional **modern/GST Desk 2.0 homepage**. They are distinct from the proposed future Document Vault:

| Legacy tab ID | Label | Current conceptual role / caution |
| --- | --- | --- |
| dashboard | Dashboard | Select accounting period, working totals. Early browser-local model. |
| records | Sales & purchases | Manual transactions; distinguish non-invoiced purchases from ITC-eligible invoices. |
| returns | GST worksheets | Working tax summaries and transaction CSV; preparation-only. |
| backup | Backup | JSON browser-data backups; do not silently overwrite D1 records. |
| meesho | Meesho Importer | Two-ZIP GSTR-1 generation, source analysis and reconciliation. Priority core workflow. |
| gstr3b | GSTR-3B Studio | Preparation, GSTR-2B review, tax/ITC calculator; never equate with filed GSTR-3B. |
| filing | Filing Calendar | Filing status tracker, periods and export; check genuine government due dates externally. |
| itcrecon | ITC Reconciliation | Purchase register versus GSTR-2B comparison; no unsupported ITC. |
| profit | Meesho Profit | Settlement/margin calculator; only as accurate as supplied fees, refunds, costs and payouts. |
| orders | Order Management | Manually imported/merged order reports; not live Meesho orders feed. |
| inventory | Inventory | Products, movements, stock alerts, data backup. Legacy figures may not be D1 aggregates. |
| migration | Migration Center | Export/import precautions and whole-app state migration UI. |
| taxlab | GST Calculation Lab | Tax-engine preview and regression checks. Never rely on it alone for filing. |
| invoice-studio | Invoice Studio | Multi-line draft, calculation preview, print view, draft register/export/import. |
| valmo | Valmo Tracking | D1 shipment summary, manual tracking and independent shipping-label PDF/ZIP importer. |
| catalogue | Product Catalogue | Meesho public structured-data discovery plus manual records/JSON import-export. Not an authorized product sync. |

**Additional section:** **modern** contains **gstdesk-react-root** and the GST Desk 2.0 workspaces directory. The D1 overview panel is inserted as **nv-overview** **before** the legacy React root. The old React UI is retained for the directory/workspace features; do not replace the D1 overview with its four legacy inventory tiles.

**Future, not implemented:** “Order Intake & Document Vault” as the requested new workspace and NiviList photo-based bulk-listing generator. They must not be counted as fully shipped features just because a prior prompt specified them.

### 4.1 Ideal homepage acceptance criteria

1. Clickable NIVIDHI header/logo always returns to the homepage.
2. Full **eight** original D1 overview cards: tax invoices; credit notes; net imported invoice value; filed GST returns; Meesho GST report rows; saved cloud workspaces; invoice drafts; source ZIP imports.
3. Period-specific month tiles, recent invoices, filed return details and drill-down links.
4. Shipment summary can add its own cards without replacing or hiding the overview.
5. Historical tax invoice values clearly labeled *not current sales, profit, cash received, tax payable or deliveries*.
6. Render on mobile; accessible keyboard focus; zero default carrier checks; fast first paint; no duplicate/skeleton summary that persists incorrectly.

### 4.2 Ideal Valmo acceptance criteria

1. Show **only two top summary categories** by default: **Total Delivered** and **Total In Transit**, each with a useful icon and exact D1-derived count.
2. One prominent full-width **Refresh Data** button retrieves saved D1 records, **not carrier statuses**; saved snapshot time shows Asia/Kolkata exactly once.
3. Individual shipments/details remain hidden until clicking a category; clicking again closes them.
4. **Import shipping labels & invoice data** (PDF/ZIP picker + Parse, Validate & Save to D1) is visible **outside** collapsed detail areas at all times. PDF parse errors and excluded pages are disclosed.
5. “Check Pending Valmo Status” must only call carrier when deliberately requested; no background, startup or cron requests.
6. Owner-confirmed Delhivery deliveries are in the combined delivered total with provenance, but actual carrier delivery date remains unknown.
7. No raw label binaries or buyer addresses stored; GST comparisons remain auditable; reimport is idempotent.

---

## 5. Complete source-file directory and ownership map

**All paths below are relative to the repository root.** This is a *map of the code actually tracked*, not a list of proposed files. Read each relevant file fully, including imported modules and tests, before changing it.

### 5.1 Root/build and operational files

| File | Purpose | What breaks if changed incorrectly |
| --- | --- | --- |
| **README.md** | Original migration description, running app URL and basic safety warnings. | Can mislead agents: early text still calls the repo a source snapshot and says deploy isn't automatic. Verify actual workflow/deploy state. |
| **brain.md** | This AI handover contract; keep accurate after meaningful architecture, schema, workflow or policy changes. | Stale guidance causes future agents to undo working features. |
| **wrangler.jsonc** | Actual production Worker name, entrypoint, compatibility date, DB binding, keep_vars and observability. | Wrong binding/Worker name/domain can take production offline, leave private environment vars behind, or target the wrong D1. |
| **wrangler.d1-pending.jsonc** | Historical intermediate config snapshot. | **Not the primary production config**; do not deploy merely because its name includes D1. |
| **.gitignore** | Prevents selected local outputs from being committed. | Insufficient to protect data accidentally staged under another filename; verify staged files. |
| **.github/workflows/cloud-state.yml** | Node 22 syntax and D1/browser/shipping tests for relevant source paths. | Removing tests or path triggers hides regressions; this is a **test workflow, not guaranteed continuous deployment**. |
| **.github/workflows/alexa-hindi.yml** | Alexa source syntax and read-only contract/security tests. | Not equivalent to publishing a skill in Amazon console. |
| **docs/MIGRATION.md** | Historical migration from Cloudflare deployed script to GitHub and division of responsibilities. | Some statements date from initial snapshot; use history, not current operational truth. |
| **docs/operations/d1-cutover.md** | Verified November D1 cutover, September numbers, privacy, auth, manual browser checks and backup cautions. | Do not reinterpret initial historical data as today’s live order totals. |
| **docs/operations/invoice-dashboard.md** | D1 source import, cross-month rules, invoice endpoints, desktop/mobile placement and schema constraints. | Must remain consistent with actual API month grouping and invoice provenance. |
| **docs/integrations/alexa-hindi.md** | Hindi Alexa integration prerequisites, owner restrictions, install steps and incomplete-status warnings. | Misleading live setup could leak private information or give fabricated orders. |

**Important build nuance:** The root config points to **worker.js**, but that file imports modular files. Its main HTML is still a huge embedded string. A deploy via Wrangler/bundler transforms imported functions; concatenating **function.toString()** into the returned HTML may expose build-generated helpers to browser scope. This caused the actual November 19 regression.

### 5.2 Current production Worker modules

| File | Exports / responsibility | Read or edit when... |
| --- | --- | --- |
| **cloudflare/workers/gst-desk-preview/worker.js** | Default fetch/route; massive legacy HTML+CSS+scripts, 16 tab definitions, React directory, main route dispatch, D1 seed construction, CSP and inline injection. | Routing, old workspace UI, startup, script ordering, brand/header, CSP, homepage, legacy import flows. **High regression risk.** |
| **cloudflare/workers/gst-desk-preview/worker.d1-pending.mjs** | Early large Worker before current modular D1 integration. | Historical comparison only; do not quietly replace current worker.js. |
| **cloudflare/workers/gst-desk-preview/state-api.mjs** | authorize, listState, stateApi; Access JWT, tenant membership, D1 browser-state CRUD and filed/Meesho summaries. | Identity, security, tenant isolation, saved workspace data, optimistic revisions, historical September summary. |
| **cloudflare/workers/gst-desk-preview/cloud-state-client.mjs** | cloudClientJS; client-side GSTDeskState compatibility adapter, queued saves, emergency export, old localStorage migration. | Lost saves, cross-device records, legacy state, browser migration, retry banners. |
| **cloudflare/workers/gst-desk-preview/overview-api.mjs** | handleOverviewApi; D1 overview, month totals, invoice pagination and invoice detail normalization. | Invoice/credit-note facts, monthly totals, new KPI metadata, source-GST breakdown. |
| **cloudflare/workers/gst-desk-preview/overview-client.mjs** | overviewClientJS; interactive eight KPIs, month drill-down, filed-return details, cached first paint, DOM-safe SVG icons. | Homepage missing summary, KPI design, clicks, invoice drilldown, D1 refresh and caching. |
| **cloudflare/workers/gst-desk-preview/server-snapshot.mjs** | embedJson, shippingFallbackHTML, overviewFallbackHTML; private server-rendered fallback before client JS. | Mobile page shows older/sparse interface if JS fails; fallback counts/time/visibility, HTML escaping. |
| **cloudflare/workers/gst-desk-preview/premium-theme.mjs** | premiumCSS, decoratePremiumHTML; unified NIVIDHI design, header link, SVG nav and deferred old helper libraries. | Styling, logo, responsive layout, CSS section visibility, icon security, first paint. |
| **cloudflare/workers/gst-desk-preview/shipping-api.mjs** | shippingApi, parseValmoCarrierResult; D1 shipment counts/details, label evidence import, manual carrier queries and state classification. | Saved orders, Valmo status, AWB validation, Delhivery owner confirmation, label persistence, delivery dates. |
| **cloudflare/workers/gst-desk-preview/shipping-client.mjs** | shippingClientJS; two cards, manual refresh, details, PDF/ZIP parser UI, local snapshots, D1 imports. | Valmo importer missing, tracking UI, mobile layout, PDF extraction, speed/cache, carrier-check interactions. |
| **cloudflare/workers/gst-desk-preview/label-invoice-parser.mjs** | parsePrintedInvoice, labelParserBrowserJS; deterministic seller/AWB/invoice/tax/total parser. | Shipping-label PDF field extraction, courier format changes, seller matching, rejected pages. |

### 5.3 Database/schema files

| File | Purpose |
| --- | --- |
| **database/schema.snapshot.sql** | Initial D1 table structure snapshot; reference **only**, not a production restore script. |
| **database/migrations/0002_cloud_state_and_filed_returns.sql** | Adds revisioned browser-state key/value and filed-return summaries. |
| **database/migrations/0003_meesho_import.sql** | Historical Meesho report rows, invoice/credit-note metadata and ZIP archive SHA manifests. |
| **database/migrations/0004_valmo_tracking.sql** | Shipment candidates, event/status state and strict delivered-date constraints. |
| **database/migrations/0005_valmo_awb_source_fingerprint.sql** | Adds AWB label source SHA-256 evidence to shipments. |
| **database/migrations/0006_shipping_labels_inventory.sql** | Derived label inventory and carrier name; no PDF/buyer address storage. |
| **database/migrations/0007_valmo_eta_text.sql** | Separate carrier ETA text from actual delivery dates. |
| **database/migrations/0008_owner_delhivery_confirmation.sql** | Separate owner delivery assertion and assertion timestamp from carrier-verified delivered_at. |

Migration files are sequential history; some **ALTER TABLE** statements are not safely repeatable. Inspect **PRAGMA table_info** and maintain a migration ledger before applying. Do not replay against production because a new developer sees the SQL. Snapshot is *not* a row-level backup.

### 5.4 Tests and test intent

| Test file | Coverage / regression it protects |
| --- | --- |
| **tests/cloud-state.test.mjs** | JWT/config fail-closed behavior, D1 tenant scope, same-origin state writes, revision collisions, valid periods, legacy embedded JS syntax. |
| **tests/overview.test.mjs** | Business-scoped monthly summary, invoice details, correct tax amount, period pagination, read-only validation, safe DOM, tax-rounding source differences. |
| **tests/shipping.test.mjs** | No invented courier status, batch tracking, origin/headers, dated delivery verification, return/failed statuses, ETA and owner Delhivery logic. |
| **tests/shipping-browser.test.mjs** | jsdom Valmo first paint, only two categories, hidden details, always-present upload, legacy form removal and no auto-checks. |
| **tests/shipping-label-import.test.mjs** | Evidence import, same-origin, matching, duplicates, conflict protection, no document upload, rejection of other sellers. |
| **tests/snapshot-cache.test.mjs** | Server HTML fallback, XSS escaping, saved snapshots, instant first paint, manual refresh, inline scripts; **November 19 added regression for __name and nested section CSS**. |
| **tests/premium-label-parser.test.mjs** | Seller-specific Valmo/Delhivery text extraction, exact paise, missing date/total rejection, eight homepage cards, theme icon/no-network rule. |
| **integrations/alexa/test/voice-summary.test.mjs** | Read-only voice endpoint, token/auth failures, safe response contract, model and handler syntax. |

### 5.5 Alexa and staging source (do not confuse with production)

| File | Role |
| --- | --- |
| **cloudflare/workers/gst-desk-api-staging/worker.template.js** | Sanitized read-only staging API template; contains placeholders. Not the production Worker entrypoint. |
| **cloudflare/workers/gst-desk-api-staging/voice-summary.mjs** | Fixed-owner D1 summary gated by bearer token and active owner membership. |
| **integrations/alexa/interaction-models/hi-IN.json** | Hindi India intent model and utterance samples. |
| **integrations/alexa/lambda/index.js** | Amazon ASK SDK intent handlers and secure read-only API client. |
| **integrations/alexa/lambda/package.json** | Node 18+ ASK SDK dependencies. |

## 6. Code navigation: critical symbols, selectors and fragile line locations

Line numbers are for the **19 November 2026 source snapshot**. The Worker’s giant embedded UI has very few *physical lines*; edits inside its giant line shift offsets without changing GitHub line number. For it, search exact selectors/functions, not only L44. Never split the enormous embedded string into an untested rewrite merely to simplify a small change.

### 6.1 Main request router and HTML

**cloudflare/workers/gst-desk-preview/worker.js:**

- Approximately **L1–L8**: imports all functional modules and exports Worker fetch.
- **L9–L22**: route dispatch; public static script endpoints, protected /api/shipping, /api/overview, /api/state, /api/catalogue/meesho and /api/valmo/track. Security boundary: avoid accidentally routing a private endpoint **before authorize**.
- **L22–L40**: authorize main HTML, read D1 browser-state keys, build authenticated shipping and overview seeds. These are private data and must be safely JSON escaped.
- Search **stateInjection=** and **var __name=function(target,value)**: browser helper installed to support Wrangler-generated function.toString() output. Removing it can break homepage and Valmo JS even though source-level tests still compile.
- Search **<div id=\"gstdesk-react-root\">** and **overviewFallbackHTML(overviewSeed)**: places the fallback summary before React root.
- Search **<p>Loading your predefined shipments from Cloudflare D1…</p>** and **shippingFallbackHTML(shippingSeed)**: server shipping summary replacement.
- Search **.replace('</main><script>'**: crucial insertion point for seed/script initialization relative to legacy HTML; if no longer matched, D1 clients may silently disappear.
- Search **main>section{display:none}main>section.on{display:block}**: corrected *top-level* visibility rule. Reverting to global section selector hides nested importer and fallback summaries.
- Search **ReactDOM.createRoot(mount).render**: legacy modern workspace directory; do not erase/duplicate its root.
- Search **<section id=\"valmo\">** and **<section class=\"on\" id=\"modern\">**: server shells for tracking and modern homepage.
- Search **window.addEventListener('load'**: older React app starts on load; the newer D1 overview and shipping modules intentionally initialize as soon as DOM elements exist, without waiting for unrelated CDN imports.
- Search **data-tab** and **nav.tabs**: 16 legacy workspaces + modern navigation. Navigation styling may hide other tabs outside homepage, while directory button clicks invoke underlying tab selection.
- Search **content-security-policy**, **cache-control**, **x-content-type-options** and **referrer-policy** near response: security/privacy headers. Audit any new external library against CSP.

### 6.2 Overview source, line anchors

**overview-api.mjs:**
- **L10–L43**, normalizeInvoice: prepares invoice details; preserves original PDF tax breakdown, label-derived SKU/charge metadata, source sha, actual issue date, credit-note link. Tax total from the PDF takes priority over summed rounded components.
- **L45–L64**, handleOverviewApi /api/overview: month grouping by **substr(document_date,6,2)||substr(document_date,1,4)**; returns monthly documents, credit notes, net figures, filedReturns, taxReports, D1 counts and recentInvoices. Changing grouping to source_period or order_date will corrupt issue-month logic.
- **L65–L77**, /api/invoices?period=MMYYYY&page=N: 30-per-page invoice list, capped page.
- **L78–L86**, /api/invoices/{invoiceNo}: one private invoice detail, business filter and 404/503 handling.

**overview-client.mjs:**
- **L31–L38**: styles, local dashboard cache key **gstdesk-ui:overview:v2:** plus business scope, IST timestamp and cache handling.
- **L46–L50**: month invoice listing and incremental pagination.
- **L51–L80**: invoice detail including source GST mismatch and linked shipment data.
- **L81–L84**: filed-return drill-down.
- **L85–L97**: **paint** interactive eight KPIs; safely removes the server fallback only when interactive data is ready; emits **gstdesk:overview-loaded** event for shipping summary.
- **L98–L112**: refresh; D1 GET with 12-second timeout and fallback to last saved data if refresh fails.
- **L113–L131**: **boot**; inserts **#nv-overview** before **#gstdesk-react-root**. Must not be gated on a slow external React/CDN library. The exported overviewClientJS string is injected into Worker HTML.

**server-snapshot.mjs:**
- **L2–L6**, escaping, IST formatting, integer paise formatting and **embedJson**. Escaping private database text into HTML and script data is security critical.
- **L7–L35**, **shippingFallbackHTML**: native category details, saved shipping snapshot and wide refresh.
- **L36–L92**, **overviewFallbackHTML**: eight initial business overview tiles, month details, recent documents and filings even if browser JS fails.

**premium-theme.mjs:**
- **L3**: large CSS token string for the whole application; includes visible importer, responsive layout and modern premium aesthetics.
- **L16–L31**, **decoratePremiumHTML**: clickable logo/header, CSS and SVG navigation icon injection, deferral of JSZip/XLSX/PDF.js third-party scripts.
- CSS uses **#nv-server-summary**, **#nv-overview**, **#nv-shipping-tracker**, **.nv-upload-card**, and main section rules. Avoid a broad CSS reset that hides nested sections.
- SVG elements use **createElementNS** for script-created overview icons. Avoid innerHTML of dynamic content.

### 6.3 Shipping and label source, line anchors

**shipping-api.mjs:**
- **L1–L27**: origin + custom write header, AWB patterns, India timezone, strict dated-event validation.
- **L28–L77**, **parseValmoCarrierResult**: status classification from Valmo main_status plus nested tracking events, returned vs delivered precedence, explicit delivered timestamp required; ETA is stored separately.
- **L78–L88**, **checkValmo**: only carrier-request function; uses documented-in-code Valmo website endpoint, timeout and validation. This is a website integration **not a guaranteed official partner API**; check reliability and ToS before expanding it.
- **L89–L113**, shipment projection **view** and **counts**: separate raw carrier status, owner confirmation, verified delivery date and combined delivered totals. Do not conflate them.
- **L115–L148**: /api/shipping/summary and one-request /bootstrap data for first paint; list limited to 50.
- **L149–L177**: unmatched-label summary, paginated orders and order detail.
- **L178–L193**: manual Valmo AWB PUT; same-origin checks, no overwrite of delivered/conflicting shipments.
- **L194–L286**: /api/shipping/labels/import; server verifies seller, business GSTIN, invoice number, date and total against D1, checks AWB collisions, saves only derived evidence/metadata and source tax discrepancy audit.
- **L287–L322**: /api/shipping/check; only explicit POST, max 10 selected Valmo shipments each click; unknown/corrupt carrier result does not overwrite previously verified data.

**Important implementation nuance:** The shipping-label schema supports **awaiting_invoice** rows and an unmatched-label endpoint, but the present POST label import path checks for an existing original shipment/invoice first and returns **invoice_not_found_in_nividhi** on missing shipments. The “unmatched save” code branch below that check appears unreachable in the current implementation. Do not promise persistence of unmatched labels until tested and repaired.

**shipping-client.mjs:**
- **L4–L30**: safe DOM construction, fetch helper, write wrapper, CSS, snapshot cache key **gstdesk-ui:shipping:v3:**.
- **L31–L60**: shipping overview cards inserted near the D1 overview, including known invoices, imported labels and profit “not calculated”.
- **L61–L79**: category state and filtered visibility.
- **L80–L99**: click-only status updates and manual AWB save.
- **L100–L138**: row-detail rendering (actual dates vs owner statements, ETA, events).
- **L139–L186**: snapshot-first UI; local/server seed comparison, 12-second bootstrap timeout, retained old data after fetch errors. “Refresh Data” does **not** track carriers.
- **L188–L218**: on-demand PDF.js loading, per-page PDF text extraction, parser invocation. PDF content stays in browser.
- **L219–L277**: multi-PDF/ZIP scan, file/size/page limits, SHA-256, deduplication and preview/review.
- **L278–L296**: owner confirmation followed by **POST /api/shipping/labels/import** and outcomes.
- **L297–L356**, **mountValmo** and init: wide refresh + two cards + independent visible uploader **before** hidden category details; listens for the overview event, never calls carrier on mount.

**label-invoice-parser.mjs:**
- **L4–L15**: decimal money to exact paise and strict day/month/year parsing.
- **L16–L40**: deterministic **parsePrintedInvoice(rawText)**. Requires seller **NIDHI**, exact configured seller GSTIN, one supported carrier, unambiguous Valmo or Delhivery AWB, suborder, invoice number, date, printed GST and rupee total. Rejects other sellers such as Keshav Kripa, invalid dates and ambiguous identifiers.
- **L43–L44**: embeds parser functions in browser script without another HTTP request.
- **Danger:** shipping-parser GSTIN and seller constants are *business identity checks*, not generic sample strings. Alter only after validating a real change in legal seller identity, original documents and server verification; update fixtures and API together. Do not duplicate the private identifier in public documentation.

### 6.4 Security/state source, line anchors

**state-api.mjs:**
- **L8–L30**, **claims**: accepts signed RS256 Cloudflare Access JWT; validates issuer, audience, exp, iat, email, RSA certs, D1 active owner membership. Not merely trusting a header string.
- **L31–L37**, **authorize**: fail-closed if any required binding or JWT validation is missing; 403 or 503 rather than public data.
- **L39–L43**, **listState**: business-filtered D1 state keys and revisions, maximum 100 returned.
- **L44–L48**: GET /api/state.
- **L49–L64**: GET /api/meesho/summary?period=MMYYYY, historical row counts and rounding delta versus filed GSTR-1.
- **L65–L68**: GET /api/returns/summary?period=MMYYYY.
- **L69–L96**: PUT/DELETE /api/state/{key}, same-origin and custom write header, 512 KB bound, revision conflict 409 and business-scoped SQL. Prevent silent overwrites across devices.

**cloud-state-client.mjs:**
- **L3–L20**: initialized from authenticated D1 seed, tracks key revisions and errors.
- **L27–L62**: asynchronous pending write queue, optimistic revision, retry/error state and emergency download when sync fails. A UI state “saved locally” is not necessarily “committed to cloud” before sync resolves.
- **L67–L77**: **window.GSTDeskState** getItem/setItem/removeItem/key/length; bulk clear deliberately forbidden.
- **L79–L82**: beforeunload warning on unsaved changes.
- **L83–L112**: private September import card in Meesho workspace; historical only.
- **L113–L135**: opt-in migration of older localStorage keys that are not already in the D1 seed, without overwriting cloud values.
- Do not replace revision control with last-write-wins; recover failed saves before asking owner to clear browser data.

---
