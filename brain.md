# GST Desk / NIVIDHI — Project Brain and AI Handover Manual

## Contents / fast navigation

| Foundation and code | Operations and workflows | Governance and future |
| --- | --- | --- |
| [0. Read-first rules](#0-how-an-ai-must-use-this-document) | [7. D1 schema and source truth](#7-data-model-lineage-and-accounting-invariants) | [14. Incident runbooks](#14-troubleshooting-and-incident-runbooks) |
| [1. NIVIDHI business](#1-business-identity-business-model-and-objectives) | [8. HTTP API routes](#8-protected-http-api-route-contracts) | [15. Roadmap](#15-product-roadmap-with-explicit-delivery-gates) |
| [2. Project history](#2-historical-evolution-and-decisions) | [9. Legacy workflows](#9-legacy-workspaces-implementation-notes-and-responsibilities) | [16. Test fixtures](#16-regression-fixture-catalogue--what-tests-should-assert) |
| [3. Technologies and architecture](#3-current-stack-boundaries-and-architecture) | [10. Listing AI, Alexa and automation](#10-planned-integrations-boundaries-and-automation-agenda) | [17. Decisions and source provenance](#17-project-decision-log-and-source-provenance) |
| [4. Workspaces](#4-the-16-legacy-workspaces-plus-the-modern-homepage) | [11. Feature-to-file map](#11-change-impact-matrix--which-file-to-inspect-first) | [18. Threat and trust model](#18-security-privacy-and-trust-model) |
| [5. Source files](#5-complete-source-file-directory-and-ownership-map) | [12. Safe tests and deployments](#12-development-testing-and-deployment-protocol) | [19. Target business graph](#19-unified-business-object-graph--target-architecture-not-shipped-database-schema) |
| [6. Critical code symbols/lines](#6-code-navigation-critical-symbols-selectors-and-fragile-line-locations) | [13. Known gaps](#13-known-limitations-technical-debt-and-important-open-questions) | [20. AI handover prompt](#20-final-ai-handover-contract--prompt) / [21. Maintenance](#21-maintenance-notes-for-future-authors) |

---

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

## 10. Planned integrations, boundaries and automation agenda

### 10.1 NiviList AI — highest-priority new automation

**Status on 19 November 2026: product plan / design, not built into main.** It is a direct extension of NIVIDHI’s small e-commerce catalogue and would serve the user's stated goal of reducing repetitive work.

**Desired end-user flow:**

1. Owner photographs jewelry/accessories (earrings, necklace, hair claw/clutcher, etc.) using phone.
2. Sends one or several product images to an **owner-controlled Telegram bot**.
3. Backend receives authenticated Telegram update/photo IDs; retains only the minimum necessary image/source metadata with explicit user consent and a short retention policy.
4. **Gemini** performs initial visual product characterization: product type, materials only if actually inferable, colors, design, dimensions only if supplied/verified, quantity/pack size, suggested searchable title, features and description. Never invent purity, brand, size, manufacturing origin, HSN, GST rate or cost from photo alone.
5. Validate/normalize the model’s proposal against a canonical structured **ProductDraft** and the saved catalogue. Ask the owner for missing mandatory fields (e.g. price, purchase cost, actual measurements, stock, SKU).
6. Owner previews/edits/approves the product record; assign a stable NIVIDHI internal SKU and preserve images/evidence.
7. Generate **separate** marketplace-specific, category-appropriate **Meesho, Flipkart and Amazon** bulk Excel listing files, using the actual current platform category templates and mandatory field rules. One universal Excel file is **not** enough.
8. Allow a batch of many approved ProductDrafts; produce validation report for incomplete rows, platform-specific rejections and template version/date.
9. Download the files; owner manually uploads them on seller portals unless the platform has an authorized integration. Store export mapping, version, approvals and errors to prevent duplicates.

**Chosen model fallback ordering:**

1. Gemini (the user's available Gemini plan / eligible API allowance) as primary.
2. Cloudflare Workers AI as optional secondary subject to actual model capability, quota and the account’s free allocation.
3. Compatible genuinely free external LLM providers as third fallback, only after checking privacy, uptime, data handling, real pricing and legitimacy.

A consumer Gemini app subscription does **not** automatically grant free unlimited Gemini API requests. Workers AI “free” is conditional on current model usage limits. A third-party “free model aggregator” may fail, log uploaded business imagery, change limits or demand a card. Never silently switch model providers for sensitive product data without permission. For small catalogue volume, start with manual submissions, local transforms and very modest inference calls.

**Low-cost implementation design (proposed):**

- One **Telegram webhook** endpoint within the existing GST Desk Worker or a narrowly-scoped sibling Worker within the same repo/account, with Telegram secret-token verification and replay/idempotency.
- An owner-only per-product intake state machine: received → interpreted → needs_owner_review → approved → exported → published_confirmed. Do not call “published” just because an Excel file was generated.
- Canonical D1 **products / product_drafts / listing_exports / marketplace_field_mapping** tables via additive migrations. Prefer D1 metadata and small records; do not dump raw image bytes into SQL.
- Browser-side or owner-supplied temporary image hosting; examine privacy, direct upload and free storage carefully. **Do not activate paid R2 merely to satisfy the design.** If durable image storage cannot be free/authorized, keep images with user or Telegram and store only permitted references with expiry.
- Category templates should be **owner-provided/versioned inputs**, with exact header matching and robust XLSX export. Never fabricate current Meesho/Flipkart/Amazon bulk upload formats.
- AI output must be schema-validated and human-reviewed; deterministic marketplace format generation should not itself use an LLM where code suffices.
- Integrate approved products with current Catalogue and eventually Inventory, not a disconnected product silo.
- Audit prompt/model/version and owner corrections without storing credentials or sensitive buyer data.

**Acceptance criteria:** a single sample accessory and batch of multiple photos produce three downloadable platform templates where the owner-supplied templates permit; required missing values are flagged; duplicate images/SKUs do not silently create duplicate products; every generated claim is traceable to image or confirmed field; no paid call occurs without opt-in and cost check; existing GST Desk modules still work.

### 10.2 Meesho order notifications and intake

The user asked for immediate order notifications, potentially WhatsApp, without current access to Meesho-linked Gmail. **No trusted live Meesho webhook, official order API key, current Gmail integration or WhatsApp messaging arrangement has been established in this repository.**

Before promising a new-order alert, obtain a **legitimate source of events**: official seller API/webhook subject to eligibility, an exported seller report imported on a known schedule, or another opt-in channel supported by the marketplace. A public GitHub repository documenting Meesho endpoints is **not proof that private seller APIs are publicly licensed or stable**. Do not harvest tokens, bypass anti-bot or CAPTCHA, scrape private accounts without permission or pass credentials into a proxy. Differentiate “new since last import” from true real-time push.

**Possible future pipeline, only after authorization exists:** marketplace event/import → normalized unique order ID → D1 order + provenance → deduplicated event/outbox → optional owner Telegram alert, Dashboard pending counts and inventory reservation. WhatsApp automation must be judged against official API pricing/terms and the zero-recurring-cost rule; Telegram may be a lower-cost owner notification channel if acceptable.

**Order Intake & Document Vault** is a requested future workspace. It must support verified owner documents and explicit review while protecting PII. Cloudflare R2 may have a free allowance but activation, billing details and usage limits require fresh confirmation; no R2 bucket is proven to exist here. Consider private on-device source retention if durable cloud storage conflicts with zero-cost constraints.

### 10.3 Hindi Amazon Alexa voice

**Status: source-level integration prepared, live Echo and full real-time API connection not verified.** All Alexa code is **within the same GST Desk repo**; voice is only a read-only client, never a second source of financial truth.

The **hi-IN** interaction model uses the invocation “जीएसटी डेस्क” and defines these custom intents:
- **DraftCountIntent**
- **StatusIntent**
- **TodayMeeshoOrdersIntent**
- **PendingDeliveriesIntent**
- **VerifiedDeliveredIntent**
- **VerifiedTransitIntent**
- **LastDeliveryDateIntent**
- **UpdateDeliveryStatusIntent** (handler explicitly does **not** write to cloud)

It also contains Amazon help, stop, cancel and fallback intents.

The Lambda handler (**integrations/alexa/lambda/index.js**) uses Alexa ASK SDK. Runtime must validate exact skill ID and authorized account user ID, and call a fixed HTTPS **/api/voice/summary** endpoint using bearer secret; optional Cloudflare Access service credentials must be both set and scoped appropriately. A household Alexa account ID does **not** prove which human is speaking. A valid draft count should not cause the skill to announce customer names or private tax amounts.

The staging **voice-summary.mjs** checks fixed business/owner membership, returns availableMetrics, aggregate draft and verified shipment summaries. **orders.today and pendingDeliveries stay null/unavailable until a trusted Meesho order feed exists.** Never transform null into zero or estimate today’s orders from historical invoices. The voice response must explicitly say sync is not connected.

An Alexa **Custom Skill** normally requires invoking its name. The owner wanted to speak natural Hindi business questions without “open GST Desk”; investigate supported Alexa Routines/voice shortcuts for their locale and account, but do not promise Alexa will intercept arbitrary utterances. Amazon console interaction model and Lambda code are not automatically updated by GitHub commits. Check on-device behavior separately.

**To implement safely:** authenticate owner-controlled Alexa staging endpoint; enforce minimal disclosed data, backend bearer token, Access service token if needed, active owner membership, correct D1; update Amazon skill source/model; test simulator and actual Echo; validate no name-free impersonation risk. No voice-triggered carrier POST or writes until an additional authorization design exists.

**19 November 2026 Alexa shipping-source handoff (ALEXA-002, branch-only until release):** Owner tested an authenticated `GET /api/voice/summary` on `gst-desk-api-staging` and received a read-only JSON response. The deployed endpoint still follows the earlier carrier-only delivery counting logic unless a newer staging deployment is verified. Read-only D1 audit of the existing business found 24 shipment candidates: **9 carrier-delivered**, **4 owner-confirmed Delhivery**, **2 in transit/out for delivery**, **8 awaiting AWB**, **1 returned**. These are snapshot counts, not live Meesho order totals. The matching Valmo dashboard counts 13 combined delivered; the Alexa API previously returned 9. A separately reviewed source patch changes the summary contract to report `verifiedDelivered`, `ownerConfirmedDelivered`, `totalDelivered`, `verifiedInTransit`, `awaitingAwb`, and `returned`, and adds Hindi summary/return/AWB intents. An AWB-less record has unknown courier status, not automatically pending or in transit. Returned shipments are their own category. Dates for owner-only confirmations remain unknown. Avoid disclosing individual order references or customer details on a shared speaker until additional authentication is introduced. Alexa-hosted Node.js 16 compatibility requires an HTTPS request implementation rather than relying on global `fetch`. **Do not equate PR/source completion with staged Cloudflare deployment or Amazon skill synchronization.** See [docs/integrations/alexa-hindi.md](./integrations/alexa-hindi.md) for route and verification checklist.

### 10.4 Other extensions under consideration

- Marketplace channel adapters for Flipkart, Amazon and eventually own website, built only on permitted APIs or verified owner-provided reports.
- Standard product catalogue with variant SKU, HSN/tax evidence, price/stock/photo provenance and mapping to each marketplace’s listing ID.
- Reliable order ledger (placed, cancelled, shipped, returned), shipment/carrier state and returns settlement lifecycle.
- Purchase costing including no-GST-invoice supply, packaging, fees and other overhead without invented ITC.
- Payment settlement reconciliation: bank credits, platform statement rows, deductions, pending payouts, refund recovery and net profit. Avoid claims based solely on orders.
- GST Returns production-quality importer with portal-compatible GSTR-1 schema fixtures; GSTR-3B, GSTR-2B and filing calendar supported by verifiable filed evidence.
- Controlled document intake with privacy and storage policies, audit, backups and recovery.
- Optional generated management summaries and alerts, only after underlying metrics are reliable.
- A premium, responsive dashboard whose look and speed remain consistent across the 16 legacy workspaces and new features.

## 11. Change impact matrix — which file to inspect first

This is the fastest operational index for a future AI. It does **not** authorize changing a single file without reading its consumers and tests.

| User asks for... | Inspect/change first | Also inspect/test |
| --- | --- | --- |
| Homepage old 4-card UI instead of eight D1 KPIs | overview-client.mjs, server-snapshot.mjs, worker.js | overview-api.mjs, premium-theme.mjs, tests/overview, snapshot-cache, premium-label-parser; check browser JS errors. |
| Homepage statistics wrong | overview-api.mjs / D1 SQL | migrated records, document_date, overview-client, server-snapshot, overview tests; avoid changing database merely to fit UI. |
| Homepage logo not clickable | premium-theme.mjs, worker.js embedded header | theme tests, legacy navigation and click handler. |
| New homepage tile | overview-api.mjs, overview-client.mjs, server-snapshot.mjs | shipping-client renderDashboard, responsive CSS and click/drilldown tests. |
| Wrong invoice month | overview-api.mjs, overview-client.mjs | document_date/source_period separation, September/October regression fixtures, server fallback. |
| Invoice drill-down/tax discrepancy | overview-api.mjs normalizeInvoice, overview-client.mjs detail | gstdesk_meesho_invoices details_json, label parser and GST tests. |
| Valmo uploader missing | shipping-client.mjs mountValmo, worker.js section CSS, premium-theme.mjs | server-snapshot, shipping-browser.test, snapshot-cache.test, compiled browser scripts. |
| PDF cannot parse or field missing | label-invoice-parser.mjs, shipping-client.mjs extractLabelPdf | server validation in shipping-api.mjs, fixtures, pdfjs dependency/CSP, tests. |
| Duplicate AWB or wrong seller | shipping-api.mjs label import, label-invoice-parser.mjs | D1 constraints/migrations, shipping-label-import tests; never overwrite delivered evidence. |
| “Delivered” count mismatch | shipping-api.mjs counts/view, shipping-client.mjs categoryCount | owner-confirmed Delhivery semantics, server-snapshot, shipping.test. |
| Add Delhivery live tracking | shipping-api.mjs adapter (new), shipping-client.mjs | official authentication/terms, API tests, provenance and no-autocheck policy; currently not implemented. |
| Valmo Check slow / old status | shipping-api.mjs checkValmo and /check, shipping-client.mjs checkStatus | timeout, on-demand only, carrier schema changes, shipping.test. |
| First load slow | worker.js seed, server-snapshot.mjs, overview-client/shipping-client caches, premium-theme | legacy react/jsdelivr dependencies, network waterfall, no extra D1 reads, mobile test. |
| D1 records not saving | cloud-state-client.mjs, state-api.mjs | expectedRevision, errors banner, Access JWT, DB env, cloud-state tests. |
| Can’t open in second device | Access policy, D1 business membership, cloud-state-client, state-api | private session, migrated localStorage keys, 409 conflicts and no data loss. |
| Private access/authentication | state-api.mjs claims/authorize, Cloudflare Access policies | Worker routing, fail-closed tests; **never** turn off Access for convenience. |
| Meesho GSTR-1 exporter | worker.js embedded Meesho/GSTR handlers | file parsers, GST current schema, September fixtures, returned/cross-month rows, API write path. |
| GSTR-3B/ITC logic | worker.js GSTR3B, itcrecon and taxlab UI | purchase evidence, GSTN rules, filed source, tests and accountant review. |
| Profit incorrect | worker.js profit/orders UI and normalized future settlement layer | fee/payout/cost source records, refunds and no-invoice-purchase caveats. |
| Product/stock counts wrong | worker.js Inventory and modern React root | GSTDeskState, normalized catalogue/products, no false stock from invoices. |
| Marketplace public catalogue discovery | worker.js /api/catalogue/meesho + catalogue tab | host allowlist, redirect/network safety, seller API vs public data distinction. |
| Telegram photo Listing AI | new owner-authenticated webhook/intake modules; canonical catalogue | Gemini/Cloudflare AI quotas, Excel template validation, approved product mapping and tests. |
| Amazon/Flipkart Excel generator | new template parser/exporter plus shared product schema | owner-supplied current Excel templates, category-specific validation, manual confirmation. |
| Alexa Hindi intent/voice summary | hi-IN.json, lambda/index.js, voice-summary.mjs | staging worker, docs/integrations/alexa-hindi.md and Alexa CI/device test. |
| New D1 table/column | additive migration, SQL snapshots/operations docs | every SQL query and test fixture using column, backup, deployment order and rollback plan. |
| New external integration/notification | source contract, consent/ToS, secrets and worker route | quotas, privacy, event dedupe, failed/retry states, costs and Access. |
| New icon/theme/performance changes | premium-theme.mjs and related client | no external fonts, safe SVG DOM, desktop/mobile and snapshot fallback. |
| Site suddenly looks older after deployment | production deployed Worker version, HTML fallback, script helper/CSP, browser Console, cache | worker.js inject order, overview/shipping JS, global CSS; test real signed-in device. |

## 12. Development, testing and deployment protocol

### 12.1 Pre-change inspection

Before changing code:
- Verify **git HEAD**, latest commits and status of any concurrent agent edits. Never overwrite another agent’s newer code with an old fetched SHA.
- Read this brain.md and relevant operational notes, then open exact current implementation files.
- Inspect D1 current schema version with **read-only** SQL; know if migration 0008 was already applied.
- Confirm whether the task is source-only or requires Cloudflare deployment, data migration, Amazon console changes, seller-platform actions, Telegram setup, etc.
- Describe affected business records and how they survive a rollback.
- Identify acceptance tests and representative source fixtures before coding.

### 12.2 Local/CI tests already represented in repo

The existing **cloud-state.yml** uses Node **22** and installs **jsdom 24.1.3** for DOM tests. It checks JavaScript syntax and runs the seven GST Desk source test files. The separate Alexa workflow checks staging and Lambda JS syntax and runs voice-summary tests.

Representative commands to use in a checked-out copy (run from repo root):

    node --check cloudflare/workers/gst-desk-preview/worker.js
    node --check cloudflare/workers/gst-desk-preview/state-api.mjs
    node --check cloudflare/workers/gst-desk-preview/overview-api.mjs
    node --check cloudflare/workers/gst-desk-preview/overview-client.mjs
    node --check cloudflare/workers/gst-desk-preview/shipping-api.mjs
    node --check cloudflare/workers/gst-desk-preview/shipping-client.mjs
    node --check cloudflare/workers/gst-desk-preview/label-invoice-parser.mjs
    node --check cloudflare/workers/gst-desk-preview/server-snapshot.mjs
    node --check cloudflare/workers/gst-desk-preview/premium-theme.mjs
    npm install --no-save --no-package-lock jsdom@24.1.3
    node --test tests/cloud-state.test.mjs tests/overview.test.mjs tests/shipping.test.mjs tests/shipping-browser.test.mjs tests/shipping-label-import.test.mjs tests/snapshot-cache.test.mjs tests/premium-label-parser.test.mjs
    node --test integrations/alexa/test/*.test.mjs

These are representative of tracked CI, not a claim they have *just passed in the current AI session*. If adding new dependencies, pin versions, audit license/limits and avoid needing a paid build platform.

For the embedded Worker, add a **production-bundled HTML execution test** when possible. Source-level module tests can pass while inline function.toString() output references a bundler helper not present in browser. Test actual Worker build output in a realistic DOM/browser.

### 12.3 Minimal release checklist

1. Run targeted and complete tests; confirm proper D1 tenant isolation, strict input validation and zero unauthorized data exposure.
2. Verify **wrangler.jsonc** still points to **gst-desk-preview**, the existing DB binding and production compatibility date.
3. Check Cloudflare Access app for custom domain, issuer/audience, owner membership and secret **presence** without dumping secret values.
4. Keep **keep_vars** semantics; avoid accidentally dropping Cloudflare configuration on redeployment.
5. Back up D1 privately before migrations, with schema and row-count verification. **Never commit backup into this public repo.**
6. Run read-only migrations check before any ALTER/INSERT; apply additive migration only after reviewing actual schema and data.
7. Deploy the tested main source using the verified project Wrangler toolchain and account; **do not blindly run a deployment against the wrong account**. Root config is for production, not staging.
8. Query Cloudflare deployment history to confirm the **new version is receiving 100% production traffic**; ensure custom domain points at the same Worker.
9. Open **gst.nividhi.in in an authenticated mobile Chrome session**. Inspect actual homepage, eight D1 cards, Valmo two categories, visible importer, no duplicate IST, meaningful status, unchanged invoices and healthy import preview.
10. Test a safe, user-approved label import fixture and an actual invoice drilldown. Check Console/network errors and 403 on unauthenticated private API. Do not test destructive operations against live business data.
11. On failure, roll back to last known good Worker version **without modifying D1 history** and investigate why deployment/HTML/fallback diverged.
12. Tell owner: code commit, deployed Worker version, tests run, manual tests not possible, D1 changes, open issues and exact rollback route.

**Important:** Source workflow files currently define **tests**, not an unconditional GitHub push → production deploy pipeline. Historical Cloudflare versions were deployed with Wrangler. Never say “GitHub commit means deployed” unless Cloudflare history confirms an actual new version.

### 12.4 Backups and restoration

- Source code: Git branches/commits with trustworthy history.
- D1: private real row-level backup/export, schema fingerprint and counts; schema.snapshot.sql alone is **not** a backup.
- Browser legacy state: opt-in download and explicit migration with revisions; keep until confirmed visible in D1 on another authorized device.
- Imported source Meesho ZIPs/PDFs: owner-controlled originals needed for audit; D1 only stores checksums and selected data.
- Alexa: Amazon console model/Lambda/config version separate from GitHub source.
- Telegram/Gemini: keep bot tokens and AI credentials in secret bindings; do not store them in chat or repo.

A Cloudflare **Worker rollback changes code only**; it does not revert D1 migrations or row writes. Restoring financial records requires a separate, controlled, verified business-data procedure.

### 12.5 Performance budget and mobile quality

User encountered mobile loads lasting several minutes. Maintain these improvements:
- Authenticated HTML ships private server D1 snapshot before JS; avoid blank loading screens.
- Inline overview/shipping JS reduces additional fetch dependency; the cloud-state asset still exists.
- Use local snapshot scoped per business with fetchedAt; render saved data promptly, then require explicit Refresh Data for newer D1.
- Zero courier tracking on initial render; avoid high-latency Valmo endpoint until owner selects Check.
- Load ZIP/PDF/XLSX libraries only for relevant actions or defer them, not as first-paint blockers.
- Abort stalled reads around 12 seconds and retain old snapshot visibly instead of freezing.
- Avoid unnecessary visual assets, web fonts, icon-CDNs, external chart packages and expensive animations.
- Test mobile navigation, small-screen KPI grid, 2-category cards, always-visible upload input and logo home link.
- Performance wins must not sacrifice accurate state, accessibility, security or validation.

---

## 13. Known limitations, technical debt and important open questions

**Do not “fix” these by deleting data or changing counts until the business evidence and current code have been checked.**

### 13.1 Technical state verified in source

| Area | Present state / issue | Correct next move |
| --- | --- | --- |
| Historical invoices versus live orders | Historical Meesho imported invoices and source report rows exist; no established live marketplace order feed. | Define an authorized source/adapter with event freshness and deduplication before calling any metric “today”. |
| Profit | Shipping/dashboard code deliberately renders “Profit: Not calculated” without all costs/fees. | Build source-backed purchase/settlement data model; do not treat invoice total as profit. |
| Inventory dashboard | Old React/legacy state can display zero units and products although D1 invoices exist. | Build explicit catalogue/stock migration/reconciliation; distinguish unknown from zero. |
| Cloud-backed legacy tools | Compatibility key/value state is revisioned, but not equivalent to normalized cross-workspace SQL tables. | Inventory data flows and progressively normalize with safe dual-read/backfill. |
| Shipping labels awaiting invoice | Schema supports unmatched labels; current import implementation short-circuits if original shipment/invoice absent. | Clarify whether unmatched retention is desired; test and implement a safe staging/reconciliation queue, without weak invoice validation. |
| Delhivery | Label IDs and owner-confirmed completed delivery are supported; **live carrier API not connected**. | Investigate a permitted, reliable integration and preserve owner-vs-carrier evidence. |
| Valmo | Manual website carrier endpoint with strict validation and timeout. | Watch provider schema/terms and handle unavailability without guessing. |
| PDF text extraction | Uses browser PDF.js; scanned image-only PDFs may yield no readable text. | Provide clear review/manual correction; optional OCR only after accuracy, privacy and free-limit audit. |
| Product catalogue discovery | Extracts public Meesho structured data when provided; may return no products if markup lacks JSON-LD. | Do not interpret no extracted records as empty seller catalogue. |
| Document storage | D1 stores metadata/hashes, not original PDFs/ZIPs. | Keep owner-side originals; only explore private object storage with verified free terms. |
| Large embedded Worker | worker.js has a giant HTML/CSS/JS string and a React directory; source-level changes are fragile. | Extract incrementally behind tests and preserve exact markup/IDs while refactoring. |
| Server snapshot / inline scripts | Previous production build broke due to nested CSS and missing esbuild helper. | Test bundled runtime and signed-in DOM, not only source scripts. |
| Alexa | Hindi intent/Lambda/staging code exists, but live Echo sync and endpoint secrets require manual setup/verification. | Connect and test securely with fixed owner and read-only metrics. |
| Listing AI | Telegram + Gemini + Excel design, no production bot/template generator proven. | Build only after canonical product schema and genuine category templates. |
| “Free forever” | Cloudflare/Gemini/provider limits are subject to account/plan changes. | Query current official documentation, account quota, cost controls and billing status; no silent paid fallback. |
| GitHub/Cloudflare parity | GitHub is source, but deployment is a separate process and README has old snapshot language. | Compare main HEAD with deployed Worker version/hash and deployment history on each release. |
| Browser testing | Automated jsdom tests verify many paths, but do not log into the actual private website. | Owner-authenticated mobile E2E smoke test on every meaningful UI release. |
| GST legal/fiscal accuracy | Export preparation is not government filing; financial schemas and regulatory rules evolve. | Refresh portal/schema requirements, preserve filed evidence and obtain human/accountant review. |

### 13.2 Data numbers are not timeless constants

Historical records discussed during development included:
- **12 sales report rows and 1 return** for the September 2026 Meesho report fixture.
- **14 invoice/credit-note documents** from the original September archive, **13 issued in September and one on October 1**.
- **Two September filed return summary records** (GSTR-1/GSTR-3B).
- By a later November review, approximately **24 known invoiced orders**, **16 unique verified shipping labels/AWBs** from about **22 pages**, and two credit notes were discussed in the development history.
- In the mobile screenshot taken at approximately **2:36 a.m. IST on November 19, 2026**, Valmo showed **13 Total Delivered** and **2 Total In Transit**, while the legacy home still showed zero inventory/stock and “16 available tools” because the new D1 overview was not appearing.

Treat these as **point-in-time troubleshooting/fixture references**, not permanent business KPIs. Do not hardcode them in dashboard, tests for arbitrary production data, database migrations or Alexa replies. The current authoritative count comes from the appropriate D1 query and evidence classification. Some historical conversation summaries used different intermediate AWB counts as imports progressed; that is expected and not license to select whichever number is most convenient.

### 13.3 Specific known-risk implementation patterns

1. **Broad CSS visibility**: hide only direct main workspace sections. Nested section cards such as PDF importer and server-rendered summary must be visible.
2. **Build-generated functions**: Wrangler/esbuild can inject the **__name** helper inside function bodies stringified by **toString()**; test the compiled inlined client, not only plain exported strings in Node.
3. **DOM initialization timing**: overview and Valmo scripts must boot once their mount elements exist. Waiting for CDN library load allows old UI to persist or new UI never to mount.
4. **React and D1 overlap**: #nv-overview is a sibling of #gstdesk-react-root. React re-rendering its own mount should not remove D1 overview, and D1 logic should not destroy the 16-workspace directory.
5. **Source archive and document period**: source_period belongs to provenance; document_date controls invoice month; order_date controls actual order timing when valid.
6. **Rounding**: printed GST total and tax component sums may differ by paise; both are valid distinct representations of the source. Prefer printed total, expose difference.
7. **Shipment vs order**: a tax invoice may exist for an unshipped order; a label does not prove delivered; an owner assertion does not prove carrier timestamp; a last carrier check is not a live feed.
8. **Immutability**: original delivered shipments, filed-return values and original invoice metadata must not be overwritten by a conflicting later import.
9. **Public GitHub + private business**: code can be public, but no genuine buyer data, business raw exports, secrets, tokens or downloaded private document binaries may be added to commits or logs.
10. **Unmatched label branch**: review live API branch reachability, not schema support alone. A database table name or test label does not prove a case is handled.
11. **Pending legacy saves**: if a cloud save fails, do not force navigation or clear browser storage before the user downloads an emergency backup/reconciles.
12. **Cross-device access**: two authorized devices can race through optimistic versions; conflicts must be surfaced, not ignored.
13. **Public URL proxy**: /api/catalogue/meesho has narrow allowed hosts/paths and a bounded fetch; keep strict SSRF and redirect prevention, timeout and content-size checks.
14. **Zero-cost drift**: no infrastructure change that can generate unexpected charges without reviewing free plan and obtaining owner approval.

## 14. Troubleshooting and incident runbooks

### 14.1 “Homepage went back to old design; summary missing”

**Symptoms:** After a successful-looking deploy the owner sees “Good to have you here”, inventory 0/stock 0/tools 16 but not eight D1 KPI cards or issue-month invoice list. The problem may be client startup/render visibility, **not lost D1 data**.

**Triage order:**
1. Confirm production custom domain and Worker deployment version; compare main HEAD. Do not rewrite source yet.
2. Test GET protected HTML with an authenticated owner session and verify it contains **nv-server-summary**, **__GST_DESK_OVERVIEW_SEED__**, source script and **nv-overview** insertion logic.
3. Inspect generated JavaScript in page/Console; verify no **ReferenceError: __name is not defined**, no parser syntax error, no CSP block, no missing overview mount or runtime uncaught exception.
4. Inspect CSS computed display for **#nv-server-summary** and nested sections. A global **section{display:none}** hides both fallback and uploader.
5. Check **#modern**, **#gstdesk-react-root**, **#nv-overview** and which section has class **on**. Verify client script boot happens before unrelated legacy CDN dependency.
6. Verify owner-authorized **GET /api/overview** returns JSON and D1 counts. A 403/503 should surface as auth/config error and never become fabricated zeros.
7. Clear only a safe transient page cache/reload after preserving pending browser state, if truly necessary. Avoid clearing all localStorage.
8. Add a test that reproduces actual compiled HTML/runtime, deploy, then recheck real mobile authenticated session.

**Relevant files:** worker.js, overview-client.mjs, server-snapshot.mjs, premium-theme.mjs, snapshot-cache.test.mjs. Known source fix: **226b7c0**; regression test **f23fa552**. No D1 mass-delete needed.

### 14.2 “Valmo shows Delivered/In Transit but no PDF Importer”

**Symptoms:** The two summary categories render (perhaps from server snapshot), but the independent upload panel is gone.

**Triage order:**
1. Check **#nv-shipping-tracker .nv-upload-card** exists in DOM. If absent, shippingClientJS may have failed or was not initialized.
2. If present but hidden, inspect section selector cascade and any hidden attribute; uploader must be outside **.nv-category-detail**.
3. Look for JS Console errors, including compiled browser helper failure.
4. Verify **mountValmo** builds file input and “Parse, Validate & Save to D1” button.
5. Verify shipping fallback and JS both serve same signed-in version, then click category closed/open.
6. Test a benign local PDF parse and validation preview; do not send unvalidated PDF bytes to server.

**Relevant files:** shipping-client.mjs **L297–L356**, worker.js, premium-theme.mjs, shipping-browser.test.mjs, snapshot-cache.test.mjs.

### 14.3 “Refresh takes five minutes or spins forever”

- Distinguish **Refresh Data** (private D1 GET) from **Check Pending Valmo Status** (carrier network calls).
- A normal initial render should use server seed/local saved snapshot and avoid waiting for carrier API or PDF/XLSX ZIP CDN.
- Check whether bootstrap GET is one request, response includes items/counts, and AbortController timer clears on success.
- Check Cloudflare Access redirect/expiry, D1 availability, large record payload, JS errors and mobile connection.
- If D1 refresh fails, show last saved snapshot and clear disabled/loading state; provide Retry.
- Avoid indiscriminate caching of private GET responses at shared edges. Worker HTML/API are no-store; local snapshot is scoped by business and timestamped.
- Do not “speed up” by removing validation, leaking private records, hiding errors or faking a successful refresh.

### 14.4 “The tracking count or delivery date is wrong”

1. Compare D1 **gstdesk_shipments** raw status, **owner_confirmed_delivered**, **carrier_name**, delivered_date_ist, last_event and AWB. Read-only first.
2. Compare dashboard total_delivered versus verified_delivered and owner_confirmed_delivered; combined definition must match UI.
3. Inspect source label and carrier event; invoice exists does **not** mean shipped.
4. Actual delivery date must come from verified dated carrier event, not owner confirmation or carrier ETA.
5. Returned and failed orders must never inflate delivered totals; unknown must not count as transit.
6. If an old cached snapshot differs from D1, label its fetchedAt and use user-initiated Refresh Data, not automatic carrier polling.
7. Fix state classifier/read model with fixtures and audit; never mutate status merely to match a headline count.

### 14.5 “Import says wrong invoice/date/tax or skips a PDF”

1. Identify ZIP/PDF name, page, SHA, seller printed on label, GSTIN, carrier, AWB, suborder and invoice number.
2. Determine whether PDF contains searchable text or only an image; PDF.js text extraction may be empty.
3. Compare PDF issue date (not order date), printed GST and total against the original stored D1 tax invoice. Examine source XML/text layout but do not infer unprinted fields.
4. Conflicting labels or non-NIDHI seller pages must be excluded with reason, never force-imported.
5. Repeated identical label should be idempotent. Original matching invoice data and already verified deliveries should remain immutable.
6. If genuine source GST differs from another document, preserve both and show discrepancy for owner review, not silent auto-correction.
7. Add a small redacted regression fixture preserving real layout features and test deterministic extraction.

### 14.6 “A new code commit did not change the website”

- A GitHub commit alone does not prove production deployment. This repo's Actions workflows chiefly **test**.
- Inspect Cloudflare Worker latest deployments, deployed source bundle, route/hostname mapping and active version percentage.
- Verify project root **wrangler.jsonc** and actual selected account; no confusion with staging template or old Worker.
- Production may serve server fallback even if client fails; verify actual mobile DOM and Console before calling it “stale CDN”.
- Never redeploy an earlier worker.d1-pending snapshot because it looks shorter or newer by filename.
- Preserve D1 and Cloudflare Access settings; rolling back Worker code is safer than overwriting private records.

### 14.7 “GST data differs from filed return”

- Compare original Meesho GST report exact decimals, invoice PDF printed totals, credit-note direction and filed return ARN data.
- Use document issue date grouping and correctly assign cross-month invoice 87whi2713.
- Show difference in paise with provenance. Source rounding can be a legitimate reason; do not erase difference.
- Confirm the filing period/return type and whether historical filed GSTR-1/GSTR-3B is immutable.
- Give a human accountant a reconciliation worksheet; do not silently revise a filed return or claim it is automatically reconciled.

## 15. Product roadmap with explicit delivery gates

This order reflects both the user's **core GST compliance requirement** and their **latest priority of time-saving Listing AI**. Workstreams can progress incrementally; the next AI should let the owner reprioritize without discarding either objective.

### P0 — Stabilize and document production (always mandatory)

**Goal:** preserve verified D1-backed homepage, Valmo importer, private Access and zero-cost hosting.

Deliver: tracked source matching live Worker; private D1 backups; regression tests covering compiled scripts and CSS; mobile visual smoke checks; error and free-quota monitoring; documentation updates. Never intentionally regress eight KPIs or importer visibility to add a cosmetic feature.

**Done when:** signed-in mobile homepage shows D1 cards and month links; Valmo two cards + visible PDF upload; manual refresh succeeds; backend D1 metadata and Access checks remain intact; no default carrier requests.

### P1 — GST Returns production-quality import/reconciliation

**Goal:** owner can upload Meesho GST ZIP + Tax Invoice ZIP, reconcile deterministically, review exceptions and export a schema-compliant GSTR-1 JSON with evidence.

Subfeatures: source parser versions, safe ZIP handling, invoice type/order linkage, date/place/HSN/credit-note rules, printed tax rounding, UI preview, validation report, double-import idempotency, period lock, export and regression fixtures. GSTR-3B and ITC tools only use legitimate eligible purchase evidence.

**Done when:** September historical benchmarks match with documented rounding delta; cross-period case behaves; a credit note correctly reverses totals; test files produce expected JSON; invalid files block export or mark it draft; a human can review before portal submission.

### P2 — Normalize business data and settlement truth

**Goal:** current-day useful order/profit/inventory/payout reporting.

Build additive common Product, Variant, PurchaseCost, InventoryMovement, MarketplaceOrder, OrderLine, InvoiceLink, ShipmentLink, Return, Fee, Settlement, Payout and SourceImport records as justified by actual inputs. Start by normalizing existing stored legacy state without losing old records. Add source-ledger/idempotent import and dashboard distinctions between known/unknown.

**Done when:** each dashboard number traces to a user-provided or verified source; cross-device editing works with conflicts; product stock and realized profit can be reproduced from transactions.

### P3 — NiviList AI photo-to-bulk listing workflow

**Goal:** minimal owner typing for product listings on Meesho, Flipkart, Amazon.

Start with 1 product/manual image input and **actual owner-supplied** category templates. Add canonical ProductDraft and approval. Then Telegram webhook, Gemini with free-usage controls, fallback providers, multi-item batches, and export preview. Integrate Catalogue and Inventory. No marketplace auto-publish until official authorizations exist.

**Done when:** at least one jewelry and one hair-accessory fixture pass each valid template's required columns; owner can edit generated text, cost, size and tax classification; output is repeatable; no hallucinated mandatory fields or unexpected charges.

### P4 — Order intake and notifications

**Goal:** real new-order signal with trusted source; optional Telegram/WhatsApp owner notifications.

Investigate official seller export/API/webhook rights. Store fresh event time, source and unique marketplace IDs; distinguish true live signals from polling/import. Never count a daily order from historical invoice date. Add deliberate retries, dedupe, dead-letter/review states and data retention controls. Add Document Vault only with genuinely viable free private storage.

**Done when:** duplicate events send one alert, only owner sees it, absent feed reports “not connected”, and source lag/freshness is visible.

### P5 — Alexa Hindi and cross-channel controls

**Goal:** accurate owner read-only voice summaries from existing D1, no second backend of business truth.

Connect staging voice endpoint securely, test eight intents / fallback, verify actual Echo behaviour and private-account limitations. Later extend to new order metrics only after P4 source exists. Explore routine shortcuts but do not promise invocation-free custom skill.

**Done when:** authorized owner Echo request returns correct source-backed aggregate; unauthorized account gets no data; unsupported current-day order questions explicitly say sync unavailable; voice writes remain disabled unless separately secured.

### P6 — Experience, resilience and long-term maintenance

- Incrementally modularize giant embedded Worker without changing DOM/API contracts.
- Add browser E2E and deploy-time smoke tests with safe nonproduction fixtures.
- Use accessible iconography, responsiveness, lazy libraries and consistent navigation.
- Add restore rehearsal, usage alerts, import audit and low-volume free-tier observability.
- Consider first-party NIVIDHI storefront, more marketplaces, finance exports, richer notifications or other tools **only after** they demonstrably save work.

## 16. Regression fixture catalogue — what tests should assert

Use synthetic/redacted fixtures for GitHub tests; real unredacted invoices/labels stay private.

| Fixture | Must verify |
| --- | --- |
| September Meesho GST source | 12 original sale rows, 1 return, correct signed net; filed GSTR-1 benchmark preserved separately; no silent rounding reconciliation. |
| Cross-month document 87whi2713 | Order September 30; PDF issue October 1; counted in October document month, source archive period still September. |
| November invoice 87whi2723 | Exact paise from ₹121.66 taxable + ₹3.65 IGST = ₹125.31 total, original GST printed source priority and HSN/SKU linkage. |
| Matching NIVIDHI shipping label | Seller/GSTIN, one AWB, suborder, invoice/date/total, source checksum; saves verified metadata without document upload. |
| Label from another seller | Rejected before any D1 write, even when AWB format looks legitimate. |
| Reprinted duplicate label | No duplicate shipment/invoice, no status change, clearly idempotent audit result. |
| Conflicting AWB/invoice | Rejected with conflict; original shipment and filed totals unchanged. |
| Missing/ambiguous PDF date or total | Reject rather than infer; show page in review. |
| Verified Valmo delivered event | Only set delivered + date with matching tracking ID and explicit date/time evidence. |
| “On the way” with nested out for delivery | Correct current stage, not falsely delivered. |
| Returned/failed event | Never counted as successful delivery. |
| Undated carrier “Delivery by” | ETA text only; delivered_date_ist stays null. |
| Delhivery owner assertion | Included in combined delivered count but no carrier delivered_at fabricated. |
| Unknown AWB/invoice | Awaiting AWB/not checked, not transit and not delivered. |
| Browser D1 saved snapshot | First paint without carrier calls; correct IST timestamp; explicit refresh fetch; graceful timeout/error state. |
| JS-disabled or errored homepage | Server fallback shows eight KPI overview and collapsible categories; no hidden nested section. |
| Bundled inline JS | No missing __name / syntax errors after Wrangler bundle; overview and uploader mount. |
| Legacy 16 tools | All navigation routes/screens remain reachable; main React root still exists. |
| State revision conflict | Stale device gets 409 and offers safe reconciliation/export. |
| Unauthorized user | 403/Access block; private D1 and invoice data never leak. |
| Empty/new business database | Real zero/unknown states rather than hardcoded user fixture counts; no uncontrolled SQL error. |
| Alexa unconfigured/no trusted feed | Fails closed, readOnly true, ordersToday false/null, no writes or leaked details. |
| Listing AI photo | Fields only from image/owner confirmation; missing price/size/GST rate flagged; correct current template headers; no duplicate SKU. |

### Test fixture safety

Use invented customer identities and addresses; avoid committing identifiable original source PDF, seller credentials or private seller portal screenshots. The seller GSTIN used as a parser verification literal may be visible in current code; **do not copy it into new fixtures or documentation without a need-to-know and repository privacy review**. Public tests can inject test-configured seller identity rather than duplicate a real identifier. Date tests should set explicit time and timezone and avoid depending on “today”.

---

## 17. Project decision log and source provenance

These are concise *reconstructed decisions*, not transcripts. Exact raw conversation exports are not available in this document's source inspection. When a decision conflicts with a more recent direct user instruction, the direct instruction takes priority.

| Approximate date / conversation area | Decision or request | Current interpretation |
| --- | --- | --- |
| 15–16 Nov 2026, initial GST filing plan | Keep a completely free, private online GST tool for wife's registered NIVIDHI resale business; Meesho primary; user handles finance/GST. | Existing GST Desk, not a general accounting startup; ₹0 recurring budget and privacy. |
| 15–16 Nov, GST logic | Two Meesho source ZIPs (GST report and tax-invoice ZIP) are the priority for correct matching and GSTR-1 JSON. | Source documents, invoice dates, credit notes, HSN/POS, rounding and human-reviewed export are core, not optional. |
| 15–16 Nov, input purchases | Almost all resale products are bought without GST invoices. | Track true costs; no fake ITC or purchased-invoice fabrication. |
| 16–17 Nov, cloud and platform | Use existing GitHub pixelgig/gst-desk and Cloudflare gst.nividhi.in; preserve all 16 tools, make online and cross-device; new feature work is in same app. | Main branch source and existing Worker/D1; additive changes only. |
| 16–17 Nov, enterprise Codex plan | Upgrade 16 existing workspaces and propose an additional Order Intake & Document Vault. | Scope/roadmap request, not proof every enterprise acceptance criterion shipped. |
| 17–18 Nov, GST/Meesho evidence | Persist September filed summaries and Meesho parsed original data; preserve cross-period invoice, PDF printed tax and archive source. | D1 historical dataset and file/provenance rules, never live order interpretation. |
| 18 Nov, Alexa | Integrate Hindi Alexa skill with existing GST Desk and D1, not a new standalone app; user wants natural business questions. | Eight Hindi custom intents in repo, API source prepared; no legitimate “today’s Meesho orders” answer without live feed; no always-listening arbitrary command interception guarantee. |
| 18 Nov, Valmo | Saved orders must load quickly; no automatic carrier requests; show two categories Delivered/In Transit and hide individual rows until tapped. | Snapshot/bootstrap first paint; only explicit Check triggers Valmo network. |
| 18 Nov, Delhivery | Treat supplied owner-confirmed Delhivery completions as delivered in headline without inventing carrier dates. | Distinct owner_confirmation fields, combined delivered count, date provenance. |
| 18 Nov, importer | Restore a visible, independent manual Meesho shipping-label PDF/ZIP parser within Valmo workspace and validate parsed evidence before D1 save. | Client extraction + server validation; no original PDF upload; always visible uploader. |
| 18 Nov, homepage/theme | Preserve original full business D1 summary, clickable logo, modern premium UI, icons and performance. | Eight KPIs + original workspace directory, safe DOM/SVG and no heavyweight first-paint dependencies. |
| 18 Nov, recurring automation conversation | Primary future automation is photo-based AI listing for Meesho/Flipkart/Amazon bulk templates via Telegram. | Product plan; Gemini first, Cloudflare AI second, genuinely free LLM option third; small business quota-conscious approach. |
| 18–19 Nov, regression incident | Old homepage reappeared, Valmo importer vanished despite latest commits. | Global section CSS and compiled inlined JS helper; fixed in source and new production deployment confirmed during prior repair. |
| 19 Nov, current handover request | Create comprehensive brain.md on main so any future AI can learn the project before editing. | This document, maintained with future architectural/business changes. |

### 17.1 Useful historical commits (not deployment promises)

- **226b7c0** — correct compiled client helper in HTML and scope global section visibility so uploader/summary render.
- **f23fa552** — regression test of those issues.
- **97063dc0** — remove duplicate “IST” in server shipping snapshot.
- **51e58bb3** — eight interactive KPI cards and lightweight SVG icons.
- **f0987346** — defer unnecessary legacy ZIP/Excel/PDF libraries at first paint.
- **1b90ef70** — restore visible Valmo manual PDF/ZIP import flow and deterministic preview.
- **32bbb506** — validate seller, invoice date, total and tax source evidence at D1 label-import boundary.
- **dcd95724 / 32fcef7f** — clickable NIVIDHI header and premium lightweight design.
- **75ca6f6d / bfb8bfe4** — wide refresh, two category cards and server fallback.
- **a789f4f3** — server-rendered private summary first paint.
- **83fd3598** — invoice grouping by document issue month rather than source ZIP month.
- **9801484c** — verified delivery counts for read-only Hindi voice integration.

GitHub browse format: **https://github.com/pixelgig/gst-desk/commit/COMMIT_SHA**. Inspect the actual diff before relying on a commit title; several rapid interim commits implemented and then adjusted the same feature.

### 17.2 What earlier documents cannot prove

- A saved Alexa interaction model is not a deployed Amazon Skill or an Echo-tested experience.
- A migrated SQL schema is not proof all legacy tools store normalized D1 data.
- A passing unit suite is not proof the production mobile DOM is correct.
- A GitHub commit is not proof the corresponding Worker version is active at gst.nividhi.in.
- A PDF checksum and parsed invoice are not a stored copy of the PDF binary.
- A “seller storefront scan” is not an authenticated private Meesho catalogue API.
- An expected delivery ETA is not actual delivery.
- A generated GSTR-1 JSON is not filed or GSTN accepted.
- A “free tier” marketing claim is not a binding guarantee of zero cost at current quota.
- An automated listing draft is not a live marketplace listing.

## 18. Security, privacy and trust model

### 18.1 Threats to consider

1. **Unauthorized access to private GST, invoice or shipment records.** Require Cloudflare Access JWT validation and business membership for every private API, including new dashboards and bots.
2. **Cross-tenant/owner data leakage.** Bind fixed authenticated business identity server-side, not client-supplied business_id.
3. **CSRF / unintended writes.** Keep same-origin and dedicated write header plus actual authorization; use safe methods and revision/idempotency protection.
4. **Script injection from imported PDFs/JSON/Meesho HTML.** Treat all external text as untrusted; use textContent, escaped HTML and safe JSON embedding. No dynamic innerHTML for source values.
5. **SSRF through storefront URLs.** Strict HTTPS hostname/path allowlist, redirect control, response bounds and fetch timeout.
6. **Malicious ZIP/PDF/Excel payloads.** File limits, entry count, decompression safety, parser isolation and conservative error handling; never indiscriminately upload unvalidated binaries.
7. **Invented financial or AI facts.** Audit source, use deterministic calculations, schema validation, reference original figures and require owner confirmation for sensitive writes.
8. **Credentials in public code.** All tokens, account IDs that grant power, secrets, customer data and private exports live outside repo; rotate any exposed values.
9. **Unsafe agent autonomy.** A coding AI must not run live GST filings, overwrite returns, publish marketplace products, spend money or delete D1 without explicit business approval.
10. **Mobile shared-device leakage.** Saved browser snapshots must be scoped to business and free of unnecessary customer PII; sign-out and recovery behavior needs design without destroying unsaved records.
11. **Notification privacy.** Telegram/WhatsApp alerts should share minimal order metadata, not full buyer addresses or attached GST documents.
12. **Voice ambiguity.** A household Echo does not know which family member is speaking; restrict financial disclosure and all voice writes without stronger identity.

### 18.2 Trust tiers for facts

**Tier A — verified external/source evidence:** original PDF tax invoice or filed return with checksum/source link, explicit carrier dated event, official authorized marketplace feed or user-confirmed product fact. **Tier B — derived deterministic calculations:** sums, paise conversion, import deduplication, stock/profit on complete source. **Tier C — contextual owner assertions:** Delhivery “delivered” without carrier event, reported purchase cost without supplier GST invoice. **Tier D — AI predictions/guesses:** photo description suggestions, forecasted cost/ETA, marketing copy. Persist provenance with any meaningful assertion; never silently upgrade C/D into A.

### 18.3 Privacy-preserving AI listing guidance

Prompt images might unintentionally contain identifying items. Minimize third-party API data, verify vendor retention policy, strip EXIF/location metadata where possible, mask private paper labels/addresses in frames, avoid embedding API keys in Telegram update logs, and delete stale drafts/images when no longer needed. AI copy must not imply guaranteed product material, purity or trademarks unsupported by the seller.

## 19. Unified business object graph — target architecture, not shipped database schema

The most useful conceptual model for future integration is:

    NIVIDHI Business
      ├─ MarketplaceAccount [Meesho | Flipkart | Amazon | own store]
      ├─ Product / Variant / Internal SKU / StockMovement
      ├─ Purchase / SupplierCost / InvoiceEvidence (may have NO eligible GST invoice)
      ├─ ListingExport / PlatformCatalogueID / ApprovalRecord
      └─ MarketplaceOrder / OrderLine (actual event + provenance)
           ├─ TaxInvoice / CreditNote / GSTReportRow
           ├─ Shipment / CarrierAWB / LabelEvidence / CarrierEvent
           ├─ Return / RTO / Refund
           ├─ SettlementRow / Fee / Deduction / BankPayout
           └─ InventoryReservation / Depletion / Restock

The above is a **normalization target**, not a claim each node exists as a D1 table in November 2026. Current D1 accurately implements parts of the tax invoice + Meesho report + shipments graph, while legacy workspaces implement other parts in browser state. Avoid using invoice_no as the global order ID: an order/suborder can map to invoices, credit notes and multiple event records. Define stable marketplace-scoped IDs and enforce business-specific uniqueness.

**Cross-workspace contract ideas (future):** typed import payloads with source_hash and import_version, immutable source facts, idempotent event ingestion, outbound projections for summary read models, optimistic concurrency, append-only audit events, normalized money/date, explicit provenance and owner review. These concepts were requested in enterprise design discussions; implement incrementally, not as a risky rewrite.

## 20. Final AI handover contract / prompt

A future AI receiving **only this file** should be able to identify the real app and where to begin. However **do not treat the file as a substitute for current code access**. Use the following instructions at the start of each new AI coding session:

> You are working on the **existing, public GitHub repository pixelgig/gst-desk, main**, for the private NIVIDHI/Chaudhary Enterprises e-commerce business. Production is **gst.nividhi.in** on the existing **gst-desk-preview** Cloudflare Worker and existing **gst-desk-db** D1. Read the complete **brain.md** first. Then verify latest main source, actual production deployment, D1 schema and relevant tests. Preserve every existing workspace, seller data, owner Cloudflare Access, no-cost constraints, private records, accurate financial provenance, mobile responsiveness and fast performance. Never spin up a replacement app or database, never claim historical invoices are live Meesho orders, never fabricate GST credit or carrier dates, and never turn a successful commit into a claim that production is deployed. For each task, identify file owners, propose a minimal change, create regression tests, validate compiled production HTML/JS and mobile behavior, and report verified versus incomplete work. If new platform/AI integrations are proposed, check actual quotas, terms, authenticated sources and owner approval before paid or irreversible actions.

### Suggested feature implementation template

For every feature or bug, record in the PR/commit or issue:

**Business problem:** What tedious work or incorrect decision does this solve for NIVIDHI?  
**Before behaviour:** Repro steps on existing website; reliable screenshot/source.  
**Source of truth:** Exact import/evidence/API/table; not guessed.  
**Touched files:** Paths and symbols from Section 11, with upstream/downstream dependencies.  
**Privacy & auth:** Owner access, tenant scope, data retention and redaction.  
**Financial proof:** Rupees/paise, tax date, return status, source and mismatch policy.  
**API/data migration:** Additive versioned changes, idempotency, conflict strategy and rollback.  
**Zero-cost proof:** Which free tier/API is used, current limits, how unexpected billing is prevented.  
**Performance & mobile:** Initial requests, scripts, caching, responsiveness, accessibility.  
**Tests:** Relevant unit/DOM/fixture tests, plus actual compiled Worker + browser smoke.  
**Deployment:** Git SHA, Worker version, date and percentage, domain verified or source-only.  
**Remaining gaps:** What remains manual, incomplete, blocked or unverified.  
**Brain update:** Edit this handbook if behavior, architecture, routes, schema, source policy or roadmap changed.

### “Never do” checklist

- Never ask to rebuild everything from scratch merely because the Worker source is large.
- Never overwrite one business's actual data with generic sample rows or fake tests.
- Never change a delivery/return/date so a counter looks nicer.
- Never count credit notes as sale invoices or count unverified products as stock.
- Never call gross invoice value settlement or profit.
- Never claim GST filing submitted after downloading JSON.
- Never make the PDF importer dependent on opening a hidden tracking category.
- Never make page render depend on unneeded CDN requests or live carrier calls.
- Never disable Access, relax seller validation or expose PII to cure an importer error.
- Never interpret a missing optional API field as zero if it means “not connected”.
- Never add a paid platform/service or require a credit card without explicit instruction and free-limit verification.
- Never announce “production fixed” solely from a main commit without checking actual deployment and UI.
- Never proceed with a D1 migration just because its SQL file exists.
- Never assume the Alexa simulator and Echo have been connected without evidence.
- Never use GitHub as raw storage for private invoices, buyer labels, photo archives or database exports.

### Definition of “complete” for the business

A feature is complete only when it solves the owner's workflow **in the existing GST Desk**, correct source records persist securely across devices, mobile UX is visible and responsive, calculations and statuses are defensible, current tests pass, actual deployment is verified if requested, recurring spend remains ₹0, and the user is told plainly what still requires manual action.

## 21. Maintenance notes for future authors

- Update **brain.md** whenever a migration, route, significant UI architecture, marketplace adapter, model provider, security control, new workspace, or important user decision changes.
- Correct out-of-date status statements instead of appending contradictions indefinitely. Dated history should remain, but the “current state” must be current.
- Keep source maps aligned with file moves; if worker.js gets modularized, rewrite the navigation section.
- Keep this handbook **PUBLIC-safe**. Real customer/invoice archives, secrets, tokens, private database IDs that are not already safely public, Access assertions, and raw personal documents never belong here.
- Use GitHub blame/history and actual deployment checks when two agents disagree. Document conflict with source rather than inventing a resolution.
- Promote proposed integrations to “implemented” only after code, operational configuration, tests, and real acceptance are verified.
- Maintain a separate owner-private runbook for credential names/rotation, detailed account identifiers, data backup locations and real invoices if needed. Do not mix that with this public repository.
- The repository’s operational notes were authored at different times; cross-check them against code and this brain file rather than treating all older wording as up to date.
- Provide small, truthful progress updates during long implementation tasks, but never leave the owner with only an unverified promise of background work.

**End of initial comprehensive handover snapshot — 19 November 2026.**
