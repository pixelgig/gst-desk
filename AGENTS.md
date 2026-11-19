# GST Desk / NIVIDHI — AI Mission Control & Change Ledger

> **ROOT-LEVEL AI WORKING INSTRUCTIONS — READ BEFORE ANY CODE CHANGE.**  
> This file is the **living mission, task board, AI handover and append-only change journal** for the existing GST Desk / NIVIDHI e-commerce project.  
> **Knowledge counterpart:** [brain.md](./brain.md) — comprehensive product, business, architecture, file/function map, schema, risks and roadmap.  
> **Repository:** [pixelgig/gst-desk](https://github.com/pixelgig/gst-desk) · canonical branch: **main**  
> **Production:** https://gst.nividhi.in · **Cloudflare Worker:** gst-desk-preview · **D1:** existing gst-desk-db  
> **Owner's overriding direction:** Keep GST Desk private, accurate, fast, mobile-friendly, integrated and **₹0 recurring cost**.
>
> **Date of first ledger version:** 2026-11-19 (Asia/Kolkata). All "current" claims below are snapshots, not eternal guarantees.

## 0. Mandatory startup instructions for EVERY AI

**Do this at the beginning of every GST Desk task, regardless of whether the request seems small:**

1. **Read this entire `AGENTS.md`**; especially the current mission, live task board, latest entries, hard rules and handover notes.
2. **Read `brain.md` in full**, or at minimum the relevant sections before proposing anything. When implementing, inspect the current actual code and tests too; neither document substitutes for source.
3. Read the **latest main branch**, current README, relevant files from [brain.md §5–6](./brain.md#5-complete-source-file-directory-and-ownership-map), and affected tests. Verify more recent commits and other agents' changes. Never assume this file has the newest facts.
4. Determine whether you are **researching, modifying source, testing, committing, deploying, migrating D1, or validating a real mobile browser**. Those are distinct stages with distinct evidence.
5. Select/create a **TASK-ID** in the task board or ledger. Clearly identify the request, user expectation, feature owner, current behavior and intended outcome.
6. State **the exact AI identity supported by your session**: provider/product, model name/version *if actually exposed*, and mode/agent if known. Do **not** invent a brand, nickname, variant, runtime or provider. If unavailable, write `model: not exposed`.
7. Before modifying code, inspect the impact map and define a **reversible smallest change**, test plan, privacy/finance implications and rollback path. Preserve all existing tools and data.
8. During changes, note what you actually changed, why, and what succeeded or failed. Do not claim to run a tool or test that was not run.
9. **After every meaningful task, including failed/blocked/reverted tasks, update this file**: task board/current state and an append-only change event. Update [brain.md](./brain.md) as well if architecture, routes, schema, meaning of a metric or long-term decisions changed.
10. Confirm the ledger update is committed or included in the PR, check final GitHub state, and report the task ID, AI identity, outcome, commit, verification/deployment status and remaining work to the owner.

**No agent can technically force every other AI platform to load this document.** GitHub/Codex-compatible agents often recognize root `AGENTS.md`, but Gemini/other tools may require the user to say: **"Read AGENTS.md and brain.md before editing, and update AGENTS.md when finished."** The instructions take effect only when the chosen AI has actually read and follows them.

### Ground-truth order

**Actual current code and production/D1 read-only evidence > tests > deployed browser observations > dated change events > brain.md > planning discussions.** Never alter production to make an outdated document look correct. If sources disagree, log the discrepancy as a new issue and investigate.

## 1. Our permanent mission

**NIVIDHI is a small, GST-registered Indian resale e-commerce business.** Meesho is its current primary marketplace; Amazon and Flipkart listings and eventually an own website are expansion goals. Products include earrings, necklaces and hair accessories/clutchers. The business is part-time; the owner's time is valuable and catalogue volumes are modest.

**Build one trusted Business Operating System that eliminates repetitive seller administration without introducing recurring bills or losing business data.**

The system should progressively handle:
- **GST & accounting:** Meesho GST reports + original invoice ZIP reconciliation, credit notes, correct HSN/tax/period, valid GSTR-1 JSON export, GSTR-3B/ITC preparation, filing records, purchases without eligible GST invoices and auditable rounding.
- **Orders & shipping:** imported invoices/real order sources, label PDF/ZIP parser, verified AWBs, Valmo manual tracking, Delhivery owner-confirmed evidence and honest delivered/transit counts.
- **Products & commerce:** shared catalogue/SKUs, stock movements, acquisition costs, profit/fees/refunds, marketplace settlements and payout reconciliation.
- **AI time savers:** photo → Gemini-assisted product proposal → owner approval → correct Meesho/Flipkart/Amazon bulk listing Excel templates; Telegram bot intake eventually.
- **Owner workflows:** premium mobile dashboard, read-only Hindi Alexa, reliable multi-device D1 persistence, backups, notifications from an authorized order feed.
- **Future opportunities:** new business tools only when they genuinely save work and reuse this existing GST Desk data model.

### Success is measured by

1. Fewer minutes spent on repetitive imports, listings, tracking and reconciliation.
2. Accurate, traceable, source-backed tax, inventory, payout and courier numbers; **unknown is not zero**.
3. All relevant saved data visible on authorized devices with no silent overwrites.
4. No recurring fees, unexpected bills, unapproved marketplace posting or accidental GST filing.
5. A fast, smooth, consistently premium mobile-first experience.
6. A clear, verifiable history of **what each AI changed, added, removed, tested, deployed and left unfinished**.

### Invariants that take priority over convenience

- **Same repository and business:** `pixelgig/gst-desk`, branch `main`, existing Worker/domain/D1; no replacement stack without explicit approval.
- **Private:** Cloudflare Access + active D1 owner membership; this repo is public, so **never commit** secrets, API tokens, buyer details, actual invoice PDFs/ZIPs, unredacted exports or database backups.
- **₹0 recurring:** verify current free limits and whether an external service will require billing; no silent paid activation.
- **Truthful states:** invoice ≠ live order ≠ settlement ≠ profit ≠ carrier delivery; an owner confirmation ≠ carrier-verified timestamp; downloaded GSTR JSON ≠ filed GST return.
- **Financial precision:** exact paise, original evidence, source SHA, credit note signs, issue-month vs archive-month, filed-return independence; **no fabricated ITC** for purchases without valid tax invoices.
- **No destructive shortcuts:** D1 migrations require backup/approval; never reset data, drop tables or overwrite source facts for a UI fix.
- **Manual carrier only:** Valmo tracking requests occur only through explicit owner action; refreshing D1 saved records does not call carriers.
- **Preserve existing user experience:** all 16 legacy business tools, the modern homepage, eight D1 business overview cards, two Valmo summary categories and independent visible PDF/ZIP label importer.
- **Test real behavior:** source commit ≠ deployed Worker ≠ functioning authenticated phone UI.

## 2. Division of responsibility: AGENTS vs brain

| Topic | This file (`AGENTS.md`) | [brain.md](./brain.md) |
| --- | --- | --- |
| What are we trying to achieve today? | Current mission, work queue, acceptance criteria | Full business strategy/background |
| What is already live / planned? | Dated status snapshot, task status with evidence | Deeper architecture and prior decisions |
| Who worked on what? | **AI-identifiable append-only change events** | Important architectural and business history |
| Which files should be edited? | Brief feature ownership and links | **Detailed per-file, symbol and approximate line reference**, dependency map |
| Why was a change made? | Before/after, reason, verification and linked commit | Long-lived design rationale |
| What happens next? | Owner-ordered priorities, blockers and next actions | Strategic roadmap and detailed solution design |
| How do we build safely? | Mandatory execution/ledger protocol | Security, schemas, endpoint contracts, test fixtures and incident playbooks |

**Link rather than duplicate:** Link relevant brain sections in task records (e.g. [overview code map](./brain.md#62-overview-source-line-anchors), [Valmo code map](./brain.md#63-shipping-and-label-source-line-anchors), [feature impact matrix](./brain.md#11-change-impact-matrix--which-file-to-inspect-first), [safe release process](./brain.md#12-development-testing-and-deployment-protocol)). If these anchors change, repair links when updating documentation.

## 3. State definitions (DO NOT blend them)

Every task has **three independent statuses**:

**Work state:** `IDEA` · `QUEUED` · `ACTIVE` · `BLOCKED` · `SOURCE_DONE` · `CANCELLED` · `SUPERSEDED` · `REVERTED`.

**Delivery state:** `NOT_APPLICABLE` · `NOT_COMMITTED` · `COMMITTED_ONLY` · `PR_OPEN` · `DEPLOY_REQUESTED` · `DEPLOYED_VERIFIED_VERSION` · `DEPLOY_FAILED` · `ROLLBACK_DEPLOYED`.

**Verification state:** `NOT_RUN` · `SOURCE_TESTED` · `BUNDLED_TESTED` · `AUTHENTICATED_BROWSER_TESTED` · `OWNER_ACCEPTED` · `FAILED` · `UNKNOWN`.

For documentation-only changes, `work=SOURCE_DONE`, `delivery=COMMITTED_ONLY`, `verification=SOURCE_TESTED` (document-content review) is appropriate; deployment is **NOT_APPLICABLE** because no application Worker change was intended. Never label an untested UI as `OWNER_ACCEPTED`.

**Task completion:** Code changes must be committed with tests where possible, ledger updated, and exact remaining deployment/owner acceptance stated. A task may be `SOURCE_DONE` while not production-ready. For actual production work, completion requires tested deployment and authenticated browser acceptance; if unavailable, explicitly leave a follow-up task.

## 4. Snapshot of the project at ledger creation

**Snapshot date:** 2026-11-19 IST; derived from repository source and prior verified deployment discussion. **Not a live audit of the logged-in phone UI at this instant.**

| Area | Baseline state | Evidence / next check |
| --- | --- | --- |
| App/repository | Existing production Worker `gst-desk-preview` on `gst.nividhi.in`, source under `pixelgig/gst-desk` | [brain.md §3](./brain.md#3-current-stack-boundaries-and-architecture); verify Cloudflare latest deployment per task. |
| Source of truth | Cloudflare Access and existing D1 `gst-desk-db`; some legacy workspace data remains compatibility-key based | [brain.md §7](./brain.md#7-data-model-lineage-and-accounting-invariants). |
| Core workspaces | 16 legacy tabs plus modern homepage; current code contains GST worksheets, importer, inventory, profit, order and invoice tools | [brain.md §4](./brain.md#4-the-16-legacy-workspaces-plus-the-modern-homepage). |
| Homepage | Eight D1 invoice/return/archive cards and monthly breakdown implemented in source; old four-tile React directory also exists | Overview modules; source/UI fixes [226b7c0](https://github.com/pixelgig/gst-desk/commit/226b7c0b271b83d573efeb75e0d05ead39f80a2b). |
| Valmo | Two saved status categories, full-width D1 refresh, collapsed order details, independent PDF/ZIP importer, manual carrier checks | Shipping modules, [brain.md §6.3](./brain.md#63-shipping-and-label-source-line-anchors). |
| Recent UI regression | Global `section{display:none}` and compiled browser `__name` reference caused disappearing panels; source fix and regression test committed | [226b7c0](https://github.com/pixelgig/gst-desk/commit/226b7c0b271b83d573efeb75e0d05ead39f80a2b), [f23fa552](https://github.com/pixelgig/gst-desk/commit/f23fa552ff504cc05179a0ce38212c7649697a0d). Deployment was separately confirmed in a prior session; recheck for future tasks. |
| GST financial imports | Source-backed historical Meesho invoices, credit notes, filed return summaries, hashes, issue-date month logic | Historical, **not live Meesho sync**. |
| Live Meesho order API | **Not established** | Must use official/authorized data source before real-time claims. |
| Alexa Hindi | Source for read-only intents/staging API, not proved active on Echo | [brain.md §10.3](./brain.md#103-hindi-amazon-alexa-voice), integration docs. |
| Photo Listing AI | High-priority design: Telegram photo → Gemini/Cloudflare AI → owner approved product draft → 3 platform XLSX templates | **Planned; not implemented.** [brain.md §10.1](./brain.md#101-nivilist-ai--highest-priority-new-automation). |
| Production deployment mechanism | GitHub workflows currently emphasize **testing**; GitHub commit does not automatically prove Worker deploy | Cloudflare deployment/version check required. |

This table can be corrected as new source evidence emerges. Record any correction as a ledger event; do not silently rewrite history.

## 5. Priorities and working plan

**The owner may override priority at any time.** These are product-level priorities, not an instruction to run unattended automation or alter production without the requested task.

| Priority | Workstream | Desired result | Current state |
| --- | --- | --- | --- |
| P0 | **Reliability & no regressions** | Authenticated mobile UI always shows eight D1 overview KPIs and Valmo label importer, fast, accurate and private | Existing source; real-device acceptance must be verified whenever touched |
| P1 | **NiviList / Listing AI** | Owner sends accessory photos and receives high-quality, editable Meesho/Flipkart/Amazon bulk listing templates | Requested design / not yet shipped |
| P1 | **Accurate GST preparation** | Meesho GST ZIP + Tax Invoice ZIP ⇒ matched documents, exception report, valid GSTR-1 JSON; appropriate GSTR-3B and ITC evidence | Partial tooling/source, ongoing validation |
| P2 | **Inventory, purchases, profit and settlements** | One normalized owner-visible ledger with real costs, stock and payouts; handle buys without GST invoices without fabricated ITC | Partial legacy tools |
| P2 | **Order intake + notifications** | Trusted current order feed, duplicates suppressed and optional owner alerts | Blocked by authorized feed/configuration |
| P3 | **Document Vault** | Private source evidence/recovery if viable with zero-cost storage and privacy | Not established |
| P3 | **Hindi Alexa** | Read-only verified D1 business summaries on actual Echo, no invented current orders | Source-only integration, device setup unverified |
| Continuous | **Maintain brain + ledger** | Every agent can resume and understand exact source/deploy/validation state | This file starts the process |

### Working principles for all future features

**Research → model source data → design simplest flow → test a fixture → add a safe implementation → verify → update ledger.** A new tool should make business work easier instead of simply creating another complicated screen. Favor one coherent product catalogue and data graph over disconnected mini-apps. If a step has a credible free deterministic solution, do not spend AI inference calls on it.

**Gemini primary, Cloudflare AI secondary, free LLM provider tertiary** is the owner's *desired Listing AI inference routing*, not an already configured integration. Verify live quotas, terms and privacy before adding any provider.

## 6. Active work and task board

This is the **editable summary** of current tasks. Append-only event history lives in §9 and must never be erased. When making a change, update a row **and** add the relevant event. Work on the owner's latest explicit request first.

**Currently assigned task:** ALEXA-002 source review in draft PR #3. No autonomous or unattended background work is implied.

| TASK-ID | Priority | Work item / acceptance target | Work | Delivery | Verification | Last owner / next step |
| --- | --- | --- | --- | --- | --- | --- |
| **DOC-001** | P0 | Create AI mission control and change-ledger file linked to brain.md | SOURCE_DONE | COMMITTED_ONLY | SOURCE_TESTED | ChatGPT / GPT-6; root file and GitHub commit review |
| **UI-001** | P0 | Re-validate 8-KPI homepage + Valmo importer end-to-end on signed-in mobile after UI fix | QUEUED | NOT_APPLICABLE | NOT_RUN | Next AI + owner-accessible authenticated browser |
| **QA-001** | P0 | Add robust bundled Worker HTML/JS startup regression and first-paint/performance checks | QUEUED | NOT_APPLICABLE | NOT_RUN | Test after confirming build toolchain |
| **GST-001** | P1 | Audit real two-ZIP GST + invoice match, returns, rounding, GSTR-1 JSON format and human review | QUEUED | NOT_APPLICABLE | NOT_RUN | Source fixtures and current official portal schema |
| **LIST-001** | P1 | Canonical ProductDraft schema, owner review UI, current category-specific Excel-template validation | QUEUED | NOT_APPLICABLE | NOT_RUN | Collect owner-supplied templates; connect Catalogue |
| **LIST-002** | P1 | Telegram owner intake + Gemini-first photo suggestions, optional free fallbacks | QUEUED | NOT_APPLICABLE | NOT_RUN | Depends on LIST-001; permissions/free limits |
| **DATA-001** | P2 | Normalize legacy catalogue/inventory/purchases into durable D1 with safe migration | QUEUED | NOT_APPLICABLE | NOT_RUN | No overwrite; compare existing source |
| **SETTLE-001** | P2 | Real marketplace fees/refunds/settlement and paid-versus-invoiced reconciliation | QUEUED | NOT_APPLICABLE | NOT_RUN | Depends on actual statements and costs |
| **ORDER-001** | P2 | Determine legitimate Meesho order source; design notification intake | BLOCKED | NOT_APPLICABLE | NOT_RUN | No confirmed seller webhook/API yet |
| **ALEXA-001** | P3 | Configure and test Hindi read-only skill with authorized owner Echo | QUEUED | NOT_APPLICABLE | NOT_RUN | Requires Alexa/Amazon configuration; no fake live metrics |
| **ALEXA-002** | P3 | Match Alexa saved shipment breakdown to Valmo, add Hindi delivery/returned/AWB commands | SOURCE_DONE | PR_OPEN | NOT_RUN | ChatGPT / GPT-6; [draft PR #3](https://github.com/pixelgig/gst-desk/pull/3); CI and staging/Amazon deployment pending |

**Task IDs are stable, not counters to overwrite.** New tasks use a concise category prefix (e.g. `UI-002`, `LIST-003`, `BUG-001`, `DEPLOY-001`). Do not recycle an ID after completion or cancellation. A major task can have child IDs (`LIST-001A`, `LIST-001B`) with a clear parent. Multiple agents must check latest file before reserving an ID.

### How to start and pause a task

When starting, set `Work=ACTIVE` and record agent identity, scope and start date in the **Current session handoff** below. If task is interrupted, mark `BLOCKED` with why, files/commits staged, data risks, and exact next action. Leave safe unfinished code in a branch/PR if appropriate; do not claim it is live.

## 7. Current session handoff — update whenever agent changes

The table below is mutable latest-state guidance; details must also appear in the append-only journal.

| Field | Current value |
| --- | --- |
| Active owner task | ALEXA-002: Voice shipment breakdown source complete; draft PR #3 awaiting CI/review |
| Current agent | OpenAI / ChatGPT, GPT-6, Alexa shipment voice work (source / PR only) |
| Branch / expected base | `feature/alexa-shipment-breakdown-20261119` off `main`; re-fetch HEAD before further edits |
| Work-in-progress PRs/branches | [Draft PR #3](https://github.com/pixelgig/gst-desk/pull/3) Alexa shipment breakdown |
| Uncommitted edits | Unknown outside current GitHub connector session |
| Last completed task | DOC-001; ALEXA-002 source commit(s) in PR #3, deployment/acceptance pending |
| Last verified prod browser | Not verified during this documentation-only task |
| Open risks/blockers | Alexa-hosted credentials not configured, staging module not redeployed from PR #3, Echo unverified, user voice can't safely disclose individual private order identifiers, Meesho live feed absent |
| Next recommended action | Validate PR #3 CI; merge after review; deploy staging with bindings and Access preserved; sync Alexa handler/model and configure private token; test on real Echo |
| Latest ledger checkpoint | EVT-20261119-003 (ALEXA-002), draft PR #3 |

**Do not forge locks:** this table is not a distributed lock. On concurrent work, prefer one branch/PR per agent/task; check open PRs and main before merge. Explicitly identify any shared source file edits and resolve them, not overwrite each other. The current agent value is historical once another starts.

## 8. Required workflow for future AI developers

### Before any edit

- Confirm repo, branch, exact user request and agent/model identity.
- Read this document and relevant [brain.md](./brain.md) sections.
- Inspect current source, tests, newer commits, deployments and any concurrent agent work.
- Capture a **before** state (what currently happens, where, evidence, screenshot when appropriate).
- Decide code/UI/data migration/AI inference/auth implications, source and unit tests.
- Do **not** invent progress, use paid services, or modify D1/filings without approval.

### During development

- Make minimal backwards-compatible changes using existing modules and conventions.
- Add/update tests for regression. For UI fixes, test compiled Worker/browser behavior, not solely source syntax.
- If altering data model, ensure additive migration, verification, private backup, idempotency and rollback plan.
- Keep future AI collaborators informed via task board if committing/merging.
- Record unexpected errors, temporary workarounds and remaining unknowns. Never hide defects to produce a success report.

### After **each** task (MANDATORY)

1. **Update the task board** (§6): work, delivery and verification states independently; update handoff (§7).
2. **Append one or more events** to §9: the actual before→after, added/removed/changed files, exact agent/model, reasons, tests, actual commit/PR links, D1 changes, deployment version if any, limitations and next step.
3. For a significant behavior or architecture change, also edit [brain.md](./brain.md) in the same change/PR.
4. Commit both code and relevant documentation or explicitly create a follow-up documentation commit. **The task is not properly handed over until the ledger change is saved in GitHub.**
5. Validate the final GitHub file and branch; if production deployment was requested, verify Cloudflare actual version and then separately record acceptance test outcome.
6. Return concise human-readable summary with links, tested/untested distinctions and what another AI should do next.
7. For failed/blocked tasks, log failure evidence and partial changes. **Not being successful is not a reason to skip the ledger.**

### Practical safety if editing this file

- This repo is **public**. Never paste customer information, invoice contents, private Cloudflare Access identities, API credentials, secret environment values or sensitive screenshot URLs into the ledger.
- Re-fetch `AGENTS.md` immediately before writing and use current blob SHA/merge conflict checks. Never reset or truncate another agent's newly appended events.
- Prefer appending the new event to the end of §9 and updating the concise summary tables; retain all old history. Corrections get a new **CORRECTION** event pointing to the inaccurate event rather than silently erasing it.
- Never rewrite existing logs to give a different AI credit.
- Avoid large generated diffs that accidentally reformat the entire file.
- If disconnected/no GitHub write permission, produce a proposed patch and state **"ledger not committed"**; never pretend the on-repo update succeeded.

### Model attribution requirements

Every event records:
- **Provider/product:** e.g. `OpenAI / ChatGPT`, `OpenAI / Codex`, `Google / Gemini` (only if actually known).
- **Exact model:** only the verified model label actually presented by the current environment. Example: `GPT-6`; if hidden, `not exposed`. Names mentioned in a prompt (e.g. "Gemini Hydrogen", "Argon", "Sol") do not establish the agent's actual identity.
- **Execution context:** ChatGPT tool session, Codex agent, Gemini CLI, IDE or manual work if known; otherwise `unspecified`.
- **Human operator:** owner-approved or owner-requested change when the user requested it; don't imply they signed off on a result they didn't inspect.
- **Co-authors:** separate individual contributions under one task, with distinct events if needed. Git commit author is a separate fact from AI author and is never inferred from tool access.

**Do not invent Git commit authorship or model attribution for historical commits.** If unproven, mark `AI agent unknown` while linking the real commit.

## 9. Immutable change journal (append events at END)

**Rules:** Newest entries go **at the bottom** so the timeline is natural and append operations conflict less. Entries are append-only; event identifiers are unique (`EVT-YYYYMMDD-NNN`). Time in **Asia/Kolkata** with actual local clock where verified; otherwise date only. Do not backdate. Change entries do not prove deployed/accepted status; write what was observed.

### Event structure — copy and complete for every task

```markdown
### EVT-YYYYMMDD-NNN — TASK-ID — concise title
- Date/time: YYYY-MM-DD HH:mm Asia/Kolkata (or "date only; exact time unavailable")
- AI identity: Provider / product; model: exact-known-label or not exposed; context: ...
- Trigger: owner's request / bug evidence / specific issue/PR link
- Work: IDEA | QUEUED | ACTIVE | BLOCKED | SOURCE_DONE | CANCELLED | SUPERSEDED | REVERTED
- Delivery: NOT_COMMITTED | COMMITTED_ONLY | PR_OPEN | DEPLOYED_VERIFIED_VERSION | ...
- Verification: NOT_RUN | SOURCE_TESTED | BUNDLED_TESTED | AUTHENTICATED_BROWSER_TESTED | OWNER_ACCEPTED | ...
- Before: specific observed behavior and supporting link/source/screenshot description
- Intended result: short acceptance contract
- After (actual): exactly what was added, changed, removed or retained
- Affected files + symbols: path — symbol/function/selector/route
- Design rationale / brain reference: [relevant section](./brain.md#anchor)
- Evidence: commit SHA and GitHub URL; PR/issue ID; test names, exact results; links to safe build/deployment logs
- Deployment: Worker name/version, % traffic and date, or "not deployed / not checked / not applicable"
- Data changes: D1 migrations/writes and backup ID reference (PRIVATE only) or "none"; never put private backup contents here
- Cost / security / performance: findings and any unverified risks
- Known defects / remaining work: explicit next action and owner-dependent steps
- Rollback: how to return to last good code; DB rollback separately if relevant
- Next handoff: next TASK-ID, what to inspect first, precise acceptance test
```

#### Event-level evidence examples

- **UI change:** "Before: generic legacy 4-tile homepage, eight D1 cards hidden; After: restored eight D1 cards, click-through, original directory preserved." Include CSS/DOM selectors and test results. Never claim phone validation unless tested.
- **Parser feature:** "Before: only manual AWB entry; After: PDF/ZIP selected locally, seller/date/total validated, JSON metadata saved, no raw PDF." Include matched/rejected fixture outcomes and collision tests.
- **Removed feature:** Record exactly what was removed, why, where its data moved, expected user impact and reversal path.
- **Failed attempt:** "Tried X; test Y failed; no deploy; branch commit Z retained; needs review." No shame or fake green check.
- **Correction:** Record prior event ID, which field was inaccurate, verified replacement evidence and whether the task status changed.

### Pre-ledger historical reference (NOT invented AI events)

The following **already occurred before the ledger existed**. These are links to GitHub code history and verified source, **not claims about which AI built them**:
- [Homepage/Valmo runtime visibility fix 226b7c0](https://github.com/pixelgig/gst-desk/commit/226b7c0b271b83d573efeb75e0d05ead39f80a2b)
- [Regression assertions f23fa552](https://github.com/pixelgig/gst-desk/commit/f23fa552ff504cc05179a0ce38212c7649697a0d)
- [Timestamp suffix correction 97063dc0](https://github.com/pixelgig/gst-desk/commit/97063dc074f220121c1eb0a5b37b81caa4b0f03c)
- [Comprehensive architectural brain.md — current file](./brain.md)

To investigate older additions/removals, use the GitHub commit history and [brain.md §17](./brain.md#17-project-decision-log-and-source-provenance). **Do not assign a model to them without evidence.**

### EVT-20261119-001 — DOC-001 — Initialize mission control and AI change ledger

- **Date/time:** 2026-11-19 IST; exact clock time not independently captured for this GitHub commit.
- **AI identity:** OpenAI / ChatGPT; **model: GPT-6**; context: user-requested repository documentation task.
- **Trigger:** Owner requested a reusable read-first AI file that tracks our GST Desk agenda and what Gemini, ChatGPT/Codex or other agents add, change and remove, with exact model attribution and references to `brain.md`.
- **Work:** `SOURCE_DONE`; **Delivery:** `COMMITTED_ONLY`; **Verification:** `SOURCE_TESTED` (document structure and repository presence; no runtime execution required).
- **Before:** GitHub already contained the extensive [brain.md](./brain.md) but had no root `AGENTS.md` to maintain a task board, cross-agent handoff and append-only change journal.
- **Intended result:** A small enough read-first operational guide plus durable, structured history, statuses, owner priorities, task IDs, model attribution, exact before/after descriptions and per-task deployment/acceptance evidence.
- **After:** Created this **AGENTS.md** with a persistent mission, source-of-truth rules, cross-AI identity convention, independent task/deploy/verification states, priority queue, safe development workflow, example event contract and this initial entry. **No GST Desk application code or database data was changed by DOC-001.**
- **Affected files:** `AGENTS.md` (new). Optional discovery pointer may be added to `README.md`; if done, log that action and its commit truthfully.
- **Design rationale:** [brain.md §0](./brain.md#0-how-an-ai-must-use-this-document), [§11](./brain.md#11-change-impact-matrix--which-file-to-inspect-first), [§12](./brain.md#12-development-testing-and-deployment-protocol), [§20](./brain.md#20-final-ai-handover-contract--prompt).
- **Git evidence:** Initial file creation commit [`d1e2d50dd6c0ce36e12af012eb528b20a32c2ae3`](https://github.com/pixelgig/gst-desk/commit/d1e2d50dd6c0ce36e12af012eb528b20a32c2ae3); inspect subsequent `git log -- AGENTS.md` for formatting and discovery updates.
- **Deployment:** Not applicable; documentation-only task, no Cloudflare deployment requested or performed.
- **Data/cost/privacy:** No D1 mutation, no new service, no recurring cost, no private business records added.
- **Outstanding:** This protocol requires participating AIs to read/update the file; GitHub cannot guarantee that every external model follows it. Future assistants must state actual model identity honestly.
- **Rollback:** Revert the documentation-only commit if explicitly requested; no production/data rollback is involved.
- **Next handoff:** Owner's next request; consult task board §6 and latest source, particularly **UI-001**, **GST-001**, **LIST-001**.

---

**Append subsequent EVT entries directly after this point. Do not erase older entries.**

### EVT-20261119-002 — DOC-001 — Format ledger and advertise AI startup instructions

- **Date/time:** 2026-11-19 IST; exact clock time not independently recorded.
- **AI identity:** OpenAI / ChatGPT; **model: GPT-6**; context: same owner-requested documentation task.
- **Trigger:** Complete DOC-001 with correctly rendered Markdown and improve discovery for AI tools that first inspect README.
- **Work:** SOURCE_DONE; **Delivery:** COMMITTED_ONLY; **Verification:** SOURCE_TESTED (retrieved and checked repository text).
- **Before:** New AGENTS.md existed; escaped code fences/backticks needed Markdown correction. README linked neither mission control nor project brain.
- **After:** Repaired Markdown formatting in AGENTS.md; included the initial creation commit; added the AI onboarding, active mission and change history section near the top of README instructing future assistants to read AGENTS.md and brain.md and log every task. Application code, Cloudflare runtime and D1 were not changed.
- **Files:** `AGENTS.md` (formatting/link), `README.md` (discoverability only).
- **Git evidence:** [AGENTS.md formatting commit 1dc9257c](https://github.com/pixelgig/gst-desk/commit/1dc9257c77b84554c1a1ea0adde239f6a0a90e1c); [README pointer commit fefbc33a](https://github.com/pixelgig/gst-desk/commit/fefbc33a279f7014dbed71a8a6ef13c9eeb7049b).
- **Deployment:** NOT_APPLICABLE (documentation only); no Cloudflare deploy.
- **D1/cost/security:** No database change, no paid resources, no private business data.
- **Limitations:** Agents still need to actually read and obey these instructions; README discoverability is not technical enforcement.
- **Next handoff:** Owner's next request; read the complete ledger and [brain.md](./brain.md) before touching source.

### EVT-20261119-003 — ALEXA-002 — Read-only Hindi shipment breakdown alignment
- **Date/time:** 2026-11-19 IST (date only; exact time not independently captured).
- **AI identity:** OpenAI / ChatGPT; **model: GPT-6**; context: owner-requested GitHub/Cloudflare connector workflow.
- **Trigger:** Owner requested continuing Alexa GST Desk integration with available shipment statuses, including which are delivered and to be delivered; prior API counted only carrier-confirmed deliveries.
- **Work:** SOURCE_DONE (source changes); **Delivery:** PR_OPEN (draft [#3](https://github.com/pixelgig/gst-desk/pull/3)); **Verification:** NOT_RUN (automated CI pending at initial ledger entry). Separate read-only production D1 SQL contract query succeeded.
- **Before:** Saved D1 contained 24 shipment candidates; 9 carrier-confirmed delivered; 4 owner-confirmed Delhivery delivered; 2 in transit/out for delivery; 8 without AWB; 1 returned. Previous voice endpoint counted 9 delivered while Valmo dashboard counted 13. Amazon skill worked in simulator but spoke "connection not configured".
- **Intended result:** A private, read-only Hindi voice summary that reports honest combined delivered counts, preserves evidence provenance, distinguishes moving vs unknown status vs returns, and never claims live Meesho sync.
- **After (source only):** Updated voice-summary SQL to report verifiedDelivered, ownerConfirmedDelivered, totalDelivered, verifiedInTransit, awaitingAwb, and returned with shipmentBreakdown availability flag. Updated Alexa Lambda Hindi answers and added DeliveryOverviewIntent, AwaitingAwbIntent and ReturnedOrdersIntent to the model. Replaced global fetch with Node.js 16-compatible HTTPS request. Updated regression tests, integration documentation and brain.md.
- **Affected files:** `cloudflare/workers/gst-desk-api-staging/voice-summary.mjs` — `handleVoiceSummary`; `integrations/alexa/lambda/index.js` — `getSummary` and intent handlers; `integrations/alexa/interaction-models/hi-IN.json`; `integrations/alexa/test/voice-summary.test.mjs`; `docs/integrations/alexa-hindi.md`; `brain.md`; `AGENTS.md`.
- **Design rationale:** [brain.md Alexa chapter](./brain.md#103-hindi-amazon-alexa-voice), [source/security model](./brain.md#7-data-model-lineage-and-accounting-invariants). Owner-confirmed delivery is not carrier proof and must never receive a fabricated delivered timestamp. Order references are private and not yet spoken on a shared Echo.
- **Evidence:** [draft PR #3](https://github.com/pixelgig/gst-desk/pull/3). Read-only D1 query with exact proposed SQL returned `known_orders=24`, `verified_delivered=9`, `owner_confirmed_delivered=4`, `total_delivered=13`, `verified_in_transit=2`, `awaiting_awb=8`, `returned=1`. This is not a claim that automated tests or Echo tests passed.
- **Deployment:** Not deployed from this branch to Cloudflare or Amazon. Existing staging endpoint was previously deployed and verified separately; do not confuse that version with this source patch. Existing `gst-desk-preview` production site not modified.
- **Data changes:** None; no D1 writes or migrations, no added service or billing.
- **Cost / security / performance:** Reuses D1; bearer-protected owner-scoped, aggregate-only API. User partially showed real token in screenshot; rotate before final Alexa connection as precaution. No source files include secret values.
- **Known defects / remaining work:** GitHub CI pending; Alexa-hosted application still lacks verified private configuration, suitable HTTPS route must be enabled under scoped protections, and actual device not tested. Source cannot access up-to-the-minute Meesho orders. Per-order spoken identifiers need separate authorization/privacy decisions.
- **Rollback:** Revert PR changes for code-only rollback; for any later Cloudflare staging deployment use previously verified staging Worker version; no D1 rollback involved.
- **Next handoff:** ALEXA-001 / ALEXA-002 — review CI, merge after validation, then stage updated voice code preserving active D1, secrets and Access; sync Amazon skill model and handler; verify no-token 401, owner 200, actual Hindi commands.

