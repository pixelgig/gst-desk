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

## 7. Data model, lineage and accounting invariants

### 7.1 Existing D1 database vs browser legacy state

**gst-desk-db** is an existing Cloudflare D1 database. In the current production code, historical imported invoices, report rows, tax filings and shipping records are read from D1. Separately, **gstdesk_browser_state** stores selected legacy workspace state as opaque JSON/text values with revision numbers. An opaque saved state object is **not** the same as a normalized cross-workspace business transaction table.

The SQL schema snapshot includes user/business/membership tables and legacy tables named **transactions**, **import_batches** and **return_workings**. Do not assume old browser workspaces have automatically been migrated into those SQL tables just because the tables exist. Determine the actual write path for the intended tool.

### 7.2 Table-by-table contract

| Table | What it represents | Keys / invariants / caveats |
| --- | --- | --- |
| **gstdesk_users** | Identified application users. | Role and status; owner must be active. Do not expose the owner email in publicly committed troubleshooting data. |
| **gstdesk_businesses** | Registered business identity. | Business ID + legal name/GSTIN; owner reference. Never use arbitrary client-supplied business_id as authority. |
| **gstdesk_memberships** | User-to-business permissions. | Composite business/user key, role owner/accountant/viewer. Current production authorize requires **active owner**. |
| **gstdesk_audit_events** | Auditable activities. | Structure exists; do not assume all old UI actions write complete audit records. |
| **gstdesk_invoice_drafts** | Draft invoice payloads and revision metadata. | Business-scoped draft_ref, revision, soft deleted_at; not the same as a PDF tax invoice or filed return. |
| **gstdesk_browser_state** | Cloud-backed compatibility store for old workspace keys. | Composite business_id/storage_key; max **512 KB** text; revision increments; 409 conflict instead of silent overwrite. |
| **gstdesk_filed_return_summaries** | Already-filed GSTR-1/GSTR-3B PDF-derived summary. | Separate monthly return types; filed_on, ARN, taxable and tax component paise. Not a calculation from current UI. |
| **gstdesk_meesho_report_rows** | Original Meesho marketplace GST report rows, sale/return. | Source file SHA + suborder + kind idempotency; source decimals **and** paise retained. Distinct from invoice PDFs. |
| **gstdesk_meesho_invoices** | Parsed original tax invoice / credit note metadata. | Composite business + invoice_no; suborder, order_date, document_date, HSN, PDF SHA, ZIP SHA, source_period, details_json, total paise. Not necessarily delivered. |
| **gstdesk_source_archives** | Imported original ZIP manifests. | Business and SHA are unique; names, period, count and import time stored; **not source archive binaries**. |
| **gstdesk_shipments** | One shipment candidate per original tax invoice and its evidence/status. | Business/suborder primary key, unique business/invoice and business/AWB; delivered timestamps require verified carrier evidence. May start awaiting_awb. |
| **gstdesk_shipping_labels** | Parsed shipping label identifiers and source proofs. | Business/suborder primary key, unique business/AWB, courier, invoice reference, PDF/ZIP hashes, source page, duplicate copies. No buyer details. |
| **transactions** | Earlier generic accounting row schema. | Do not confuse with imported Meesho invoice or settled payout. |
| **import_batches** | Earlier import manifest schema. | Not automatically equivalent to gstdesk_source_archives. |
| **return_workings** | Earlier draft return working records. | Not the authoritative filed-return summaries. |

**Read code and PRAGMA before introducing a new table**. If normalized product/order/settlement tables are missing, propose additive migrations, source-of-truth decisions and a rollback strategy. Do not rename/drop existing D1 tables as part of a dashboard enhancement.

### 7.3 Core tax/accounting facts that must never be merged

- **Meesho order creation timestamp**: when an order was actually placed (if reliably available).
- **Meesho report row**: taxable/tax reported by marketplace export; sale/return type.
- **Tax invoice**: seller-issued invoice number, document date, original taxable/tax/total from PDF; may refer to earlier order date.
- **Credit note**: reversal document, with own issue date and original invoice reference if available. Do not treat as new sale.
- **GST filed return**: immutable reported government filing/ARN data, potentially differing by rounding or corrections from imported marketplace maths.
- **Shipping label**: verifies seller/order/AWB and an invoice printed on a label, not courier status.
- **Shipment status**: can be unknown, awaiting AWB, not checked, verified in transit, out for delivery, delivered, returned, failed or needs review.
- **Owner-confirmed delivery**: owner assertion; separate from carrier delivery evidence, **no invented actual timestamp**.
- **Settlement/payout**: money marketplace actually transferred, net of charges/holds/refunds, requiring a statement or payment evidence. Not implied by invoice total.
- **Cost and profit**: require purchase cost, fees, packaging, shipping charges, refunds, returns and actual cash flows. Cannot derive profit from gross invoice value alone.
- **Inventory**: physical sellable units, reserved stock, returns/damage, sales depletion and movement audit. Not equivalent to number of invoices.
- **Input tax credit**: requires a valid eligible tax invoice/compliance evidence; purchases without GST invoice must not create fake ITC.

### 7.4 Currency, dates and rounding

Use integer **paise** for actual monetary amounts. Only convert to rupees in display/export, and preserve original source decimal strings when the source had different precision. Never use JavaScript binary float addition as the final GST reconciliation calculation. Store source printed GST totals and component breakdown separately when they differ.

**Period string:** MMYYYY, exactly six characters. The period parser expects zero-padded month. Example September 2026 = **092026**. Invoice SQL month is derived from ISO **document_date** using month + year. Document source ZIP period remains separate. India timezone is **Asia/Kolkata** for dashboard and carrier confirmed delivery dates. Do not append “IST” twice. For a timezone-free shipping ETA like “Delivery by Sat, 21 Nov”, do not invent the year, the date, or proof of delivery.

**GSTR-1/3B JSON checks** before claiming “prepared and ready for human review” must include correct period, schema, invoice numbers, dates, supply type/place, taxable value, GST components, HSN, cancellations/credit notes, rounding/negative sign and export envelope expected by the current GST portal version. Verify government schemas externally for the actual filing period; never rely solely on old draft logic.

### 7.5 Source evidence, checksum and duplicate strategy

Retain source file/archive **SHA-256**, document names, invoice/suborder identifiers, source page and a human-readable mismatch report. Document hashes identify evidence but are not substitutes for preserving original owner-side files. Repeated import of the same PDF should be a no-op or clearly “already saved”; a different PDF claiming the same AWB/order/invoice must go to **conflict/review**, never overwrite existing verified financial evidence.

Present invoice tax source discrepancies explicitly, e.g., standalone invoice PDF printed GST total versus shipping-label invoice printed GST. Preserve both in audit and require manual reconciliation rather than silently changing filed tax. Do not store a raw shipping PDF, ZIP, receipt containing addresses or full response payload unnecessarily. The source registry and parsed metadata are deliberately narrower than a document vault.

## 8. Protected HTTP API route contracts

### 8.1 Global route ownership

All routes operate on the existing production Worker unless marked **staging-only**. For private APIs, the main Worker calls **authorize(request,env)** first; the business ID comes from validated session configuration and membership, **not** request body or query.

| Method | Route | Ownership | Data/side effects |
| --- | --- | --- | --- |
| GET | / | worker.js | Private HTML with D1 seed and fallback UI. |
| GET | /assets/gst-desk-state.js | worker.js + cloud-state-client | Static browser code only; no customer data in asset response. |
| GET | /assets/gst-desk-overview.js | worker.js + overview-client | Browser overview code; page also embeds inline copy for speed. |
| GET | /assets/gst-desk-shipping.js | worker.js + shipping-client | Browser shipping code; page also embeds inline copy. |
| GET | /api/state | state-api | Business-scoped list of compatibility keys/revisions. |
| PUT, DELETE | /api/state/{key} | state-api | Revision-aware mutation, same-origin header checks and 512 KB bound. |
| GET | /api/meesho/summary?period=MMYYYY | state-api | Historical marketplace row totals vs filed return. No live feed. |
| GET | /api/returns/summary?period=MMYYYY | state-api | Previously filed return rows. |
| GET | /api/overview | overview-api | D1 month totals, counts, recent invoice metadata and filings. |
| GET | /api/invoices?period=MMYYYY&page=N | overview-api | 30-entry paginated invoice and credit note list. |
| GET | /api/invoices/{invoiceNo} | overview-api | One private, normalized invoice + original/label tax metadata. |
| GET | /api/shipping/summary | shipping-api | Combined D1 shipping and label counts. |
| GET | /api/shipping/bootstrap?filter=all | shipping-api | One-response saved counts and up to 50 shipment rows; **no courier check**. |
| GET | /api/shipping/labels/unmatched | shipping-api | Metadata for labels with awaiting_invoice status if such rows exist. |
| GET | /api/shipping/orders?filter=...&page=N | shipping-api | Paginated shipment rows (50) filtered by status. |
| GET | /api/shipping/orders/{suborderId} | shipping-api | One private shipment and evidence, no buyer details. |
| PUT | /api/shipping/orders/{suborderId} | shipping-api | Owner-confirmed manual Valmo AWB from seller label; no carrier query. |
| POST | /api/shipping/labels/import | shipping-api | Validated, deduplicated seller label metadata/audit import; 1–50 rows. |
| POST | /api/shipping/check | shipping-api | Manual on-demand Valmo status checks; up to 10 selected eligible rows per request. |
| GET | /api/valmo/track?tracking_id=VL... | worker.js | Protected direct Valmo proxy with input/payload validation; inspect actual usage and provider reliability before relying on it. |
| GET | /api/catalogue/meesho?store=https://... | worker.js | Public storefront HTML structured-data discovery with strict Meesho host/path allowlist. **Not seller account sync.** |
| GET | /api/voice/summary | staging worker.template.js + voice-summary | **Staging/source-only** Alexa read-only summary; separately secured, not part of the production worker.js routing. |

### 8.2 API safety rules

**Authorization** is necessary on every private path even if the request is same-origin. The write request convention uses **Origin** matching the request origin and **X-GST-Desk-Write: 1**; this is extra CSRF resistance, not a substitute for identity validation. Avoid permissive CORS and arbitrary business IDs.

JSON APIs should return no-store, narrow fields, stable errors and HTTP 400/403/404/405/409/413/503 as appropriate. Do not echo secrets or raw SQL errors. Query D1 with bound parameters and business_id predicates everywhere. Avoid GET mutations. A new route should have schema validation, auth, explicit side-effect tests, idempotency where appropriate and an audit strategy.

### 8.3 State write conflict flow

The frontend starts with D1 key/value plus revision. On user edits, it queues a PUT or DELETE with expectedRevision. The D1 SQL only changes a row with the matching revision. A second browser whose revision is stale gets **409 revision_conflict**; it must refresh and reconcile before overwrite. Preserve failed local pending changes via emergency backup and user-visible warnings. Avoid async racing that overwrites a user's second edit with an earlier response.

### 8.4 Valmo status semantics

A Validated Valmo carrier result has an expected tracking ID, recognized success contract and interpretable events. **ORDER_DELIVERED** or a trusted delivered headline still requires a corresponding **explicit dated event** before setting status delivered/actual date. A returned event or “delivery failed” must not be treated as success. Nested current events may refine “On the way” into out-for-delivery. Returned-to-seller wins over generic transit. An invalid response maps to **needs_review** or a per-request error; do not overwrite previously trusted status.

The carrier website endpoint may change or block requests. A timeout and 502/503 are operational conditions, not permission to fake a positive status. Carrier retry belongs behind owner action, not default page load.

### 8.5 Shipping-label import security and limits

Current client performs the following locally:
1. Owner selects up to **30** input PDF/ZIP files; each selected input max **25 MB**.
2. Expand ZIP using JSZip; cap PDF entries at **50** per batch.
3. Reject a single PDF page document over **15 MB**, and a PDF with more than **100 pages**.
4. Extract page text with PDF.js and call **parsePrintedInvoice** for each page.
5. Require exact NIVIDHI seller identity, supported courier, one AWB/suborder/invoice, issue date, printed GST and invoice total.
6. Compute PDF SHA-256; deduplicate identical labels, flag conflicting copies and preview rows/exclusions.
7. Ask owner to confirm before a **JSON-only** private import request; original file bytes stay in the browser.
8. Backend verifies seller and invoice data against D1 and rejects unsupported order/AWB/date/amount combinations before mutation.
9. Preserve existing delivered data, refuse conflicting AWBs and record source GST differences without mutating original filed returns.
10. Show precise per-row result: saved, already saved, invoice_not_found, mismatch, conflict, or failed. Do not call Valmo during import.

These limits are from **shipping-client.mjs** and **shipping-api.mjs**, not generic browser or PDF.js limits. Keep them aligned in UI wording and tests if increased. There is a security boundary between **local extraction** and **D1 factual validation**; never replace it with “trust the photo/LLM text” for financial records.

## 9. Legacy workspaces: implementation notes and responsibilities

This section is intentionally careful. The embedded HTML/JavaScript provides many usable screens and calculators, but **not all are enterprise-grade end-to-end D1 systems**. Treat manual features, previews and browser-state persistence according to their actual code.

### 9.1 Sales & purchases, Dashboard, GST worksheets and Backup

Legacy transaction objects use a generic accounting model, selected accounting period and manually entered figures. The legacy dashboard totals, profit workbook and tax worksheet may be entirely independent from the D1 historical invoice/Meesho tables. A purchase cost can be useful for profit while still **not** qualifying for ITC. Before connecting a transaction to GSTR returns, establish origin, date, seller invoice, tax eligibility and reversal semantics.

Use the compatibility adapter (**GSTDeskState**) rather than native localStorage for tracked business keys where the existing code expects it. Do not delete browser records before confirming their D1 revisions and second-device visibility. Backups must carry schema version, source, timestamp and a clear **merge vs replace** choice; never one-click restore over live finance records.

### 9.2 Meesho Importer and required two-ZIP return builder

**User-defined core workflow:** Open GST Returns/Meesho Importer → choose Meesho GST ZIP **and** Tax Invoice ZIP → extract both locally → match by correct invoice/suborder/document type/date → reconcile reported GST against original PDFs → show exceptions → produce validated **GSTR-1 JSON** for user-reviewed portal upload.

Existing HTML exposes:
- “Generate GSTR-1 JSON from two Meesho ZIPs”
- Meesho ZIP/Excel/PDF Analyzer (Beta)
- Invoice-level GST / GSTR-1 JSON reconciliation
- ZIP tax extraction and comparisons

**Do not assert every possible ZIP variant is already supported.** Inspect HTML event handlers, parser error states and current GSTN schema. Regressions must cover the September 12 sales + 1 return fixture, cross-month invoice 87whi2713 and exact line-level GST, rather than simply checking that a JSON file downloads.

A future automated importer should have an **Import Session** object (sources, checksum, importer version, warnings, preview, explicit commit, audit), capable of idempotent re-run. Validate fields from actual source files, not inferred marketplace totals. Never turn a GSTR-1 JSON builder into direct live GSTN filing without official permission and human approval.

### 9.3 GSTR-3B Studio, ITC and Filing Calendar

These prepare worksheets and show estimated tax utilisation, imported GSTR-2B comparisons and filing reminders. They must not mark a return “filed” unless the owner supplies genuine filed evidence such as ARN/date and the return is matched. QRMP filing cadence was discussed for the Oct–Dec 2026 quarter; do not hard-code all businesses/periods to that cadence. Verify applicable return periods, due dates, reversals, RCM, composition/regular status and ITC eligibility independently.

The project’s September filed totals are independently sourced and are useful **benchmark data**, not a template for future quarterly filings. Expenses without valid GST invoices can still appear as cost; don't claim credit.

### 9.4 Settlement & Profit, Orders and Inventory

Profit requires per-product purchase cost, marketplace selling price, discounts, marketplace charges, shipping/logistics fees, packaging, returns/refunds, TCS/TDS (where applicable), actual paid settlements and remaining receivables. **Invoice =/= payment =/= profit.** Keep planned profit estimates distinct from realized settlement.

Order Management can ingest owner-provided reports; it must deduplicate by stable marketplace order/suborder ID and preserve original status timestamps. **Not live Meesho order sync** without authorized data source. Inventory must model stock transactions (buy, reserve, sell, return, damage, correction) rather than extrapolating from invoice count. Untracked stock should be unknown, never assumed zero or sold.

### 9.5 Invoice Studio, GST Lab and Migration Center

Invoice Studio has multi-line invoice drafting, source amounts, preview/print and a draft register with backup validation. Do not confuse browser draft register with **gstdesk_invoice_drafts** unless an API write path is verified. For a new editable document schema, use revision IDs, deterministic lines, total reconciliation, audit record and privacy validation. Never allow duplicate invoice numbers to overwrite an issued invoice.

GST Calculation Lab is a preview/test surface; do not reuse its output as final authority without running tax schema fixtures. Migration Center must make backup scope, owner ID, schema version and irreversible changes obvious. User explicitly wants complete data safety: never auto-replace existing records.

### 9.6 Product Catalogue

Existing catalogue can inspect **public** Meesho storefront HTML structured data from an explicitly provided URL, with an allowlist of permitted Meesho hostnames and constrained public path. It can also support manually entered/imported/exported JSON products. It does **not** authenticate as the seller, list all private catalogue products, create listings in marketplaces or obtain actual procurement costs.

Future Listing AI should use a shared canonical product schema and feed **this catalogue and Inventory**, not create disconnected products and duplicates in an unrelated bot database. Marketplace listing templates differ by current platform category and should be generated from templates supplied/downloaded by the owner, not invented column layouts.

---
