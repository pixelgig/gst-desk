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
