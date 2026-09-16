# WATA Impact Map — Current State & Handoff (for Codex)

**Status: LIVE.** This is not a build spec — it's a description of a working system so you can make changes without rebuilding. Read this first, change only what's asked, and preserve everything below unless told otherwise.

## What it is
An interactive world map that colors countries by their WATA project **Stage** and shows live filter/people impact numbers, pulled from Notion. Country metadata comes from Country Data; impact totals come directly from completed Events grouped by Country. Self-contained, no framework, no build step, $0/month. Replaced a paid Atlas.io map.

## Live locations
- **Map (frontend):** `https://map.cleanwata.org/` — custom domain for repo `wata-git-dex/wata-map` (public), with the GitHub URL redirecting to it. `.github/workflows/deploy-pages.yml` explicitly deploys the static site on relevant pushes to `main`.
- **Worker (data API):** `https://wata-map.cleanwataorg.workers.dev` — Cloudflare Worker named `wata-map`. Source is `worker.js`; `.github/workflows/deploy-worker.yml` deploys it on relevant pushes to `main`.
- **Data sources:** Notion **Country Data** (`638d93f9-19bc-8305-a503-07a0b9eaba93`) plus **Deployments (1) / Events** (`c94d93f9-19bc-83b4-8112-87a824660fb4`), under DATA & DOCS.
- **Notion access:** the Notion integration named **WATA MAP** must be connected to both data sources. Its token is stored as the Cloudflare secret `NOTION_TOKEN` (encrypted). The token is NOT in the repo or in index.html, and must never be.
- **Wix:** embed via **Embed a Site** (iframe) pointing at `https://map.cleanwata.org/`.

## Data flow
```
Notion "Country Data" ── country metadata ────────────────────────► Cloudflare Worker
Notion "Events"       ── separated lifecycle totals by Country ───►        │ returns JSON keyed by ISO-3
        ▲                                                                    ▼
        │ Cyrus records an Event; Trip/Deployment are optional   index.html on GitHub Pages ──iframe──► Wix
```
The map fetches the Worker on load and on the Refresh button. There is NO 6-hour sync Action and none is needed (the Worker is live). Airtable is NOT read by the map; Notion is the map source. Completed Events count through their direct Country relation whether or not they belong to a Trip or formal Deployment. A future Airtable→Notion sync remains a separate project.

## Notion "Country Data" — fields the map uses
| Field | Type | Role |
|---|---|---|
| Name | Title | Country name → matched to a map shape via ISO-3 |
| Stage | Status | Map color + legend. Values: Active, Pilot, Lead, Not started, Done, Paused. Blank = not painted. |
| Total Filters (Dropped Off + Distributed) | Rollup | Legacy field; not a numerical fallback in the prepared reported-distributed contract |
| Total People | Formula | Legacy field; not a numerical fallback in the prepared reported-distributed contract |
| Map Narrative | Text | Public story in the popup (internal "Notes" is deliberately NOT read) |
| Map Photos | Text | Comma/newline image URLs (use Wix `static.wixstatic.com` links; NOT Notion uploads — those expire ~1h) |
| Regions | Multi-select | Each option → a pill in the popup |
| ISO3 | Text (optional) | If set, overrides the name→code lookup |

## Worker JSON contract (index.html depends on this shape)
```json
{ "updated": "Sep 11",
  "generatedAt": "2026-09-11T12:00:00.000Z",
  "sourceFreshness": "2026-09-11T09:30:00.000Z",
  "dataStatus": "current",
  "unresolvedAllocation": { "eventCount":0, "distributedFilters":0, "droppedOffFilters":0 },
  "countries": {
    "GTM": { "status":"Active", "filters":465, "served":2325, "metrics": { "reportedDistributed": { "filters":465 }, "reportedDroppedOff": { "filters":0 } }, "note":"…", "photos":["https://…"], "regions":["San Juan Comalapa"] }
  } }
```
- `status` = the raw Notion Stage name.
- `filters` = reported distributed filters only; `served` = `filters × 5`, clearly estimated. Either may be null when no qualifying distribution is available.
- keys = UPPERCASE ISO-3 matching the `id` on each `<path>` in the SVG.
- Lifecycle-specific Event fields take precedence over computed `Total Filters`. `Dropped-Off` is reported separately and never added to `filters`. `Total Filters` is only a status-scoped compatibility fallback when the matching lifecycle field is absent. Trips and formal Deployments remain optional.
- Event Country relations are normalized to distinct ISO values. Duplicate old/current pages for the same ISO count once; zero or multiple distinct ISOs are excluded and reported under `unresolvedAllocation`, never multiplied across countries. Unresolvable legacy relation IDs are counted in the diagnostic even when one distinct resolved ISO allows the Event to remain allocated.
- `sourceFreshness` is the latest `last_edited_time` among contributing Notion records, not a verification date. `generatedAt` is the Worker response-generation time. A last-known-good fallback is explicitly `dataStatus:"stale"` and retains original source freshness.
- The Colombia150 hard floor and all undocumented static impact fallbacks are removed from the prepared reported-distributed path. Colombia150 remains documented transport/partner allocation, not household distribution.

## Reported-distributed correction — prepared, not deployed (2026-09-11)
- Reviewable local changes implement the contract above and update the visible labels to **Distributed**, **Est. people**, **Reported distributed**, **Estimated people**, and **Last source edit**. Frontend and Worker exchange `metricContract:"reported-distributed-v1"`; an older/mismatched Worker is rejected so mixed data cannot be relabeled during deployment ordering.
- Worker syntax and 12 focused tests pass, covering explicit-field precedence (including Vietnam's 25 when computed total is zero), drop-off separation, same-ISO relation deduplication, unresolved legacy relation surfacing, cross-country unresolved allocation, the raw 936/99 diagnostic fixture, freshness semantics, unavailable-source behavior and stale last-known-good behavior.
- Production still serves the prior mixed 1,017 / 5,085 calculation. Do not publish raw 936 or any replacement grand total yet.
- Release gates: preserve/audit the bounded Guatemala 42 and Thailand 9 source reclassifications; reconcile Colombia 105 Notion distributed versus 114 Airtable deployed / 113 explicitly linked Distribution-event assets; retain Myanmar 10 as drop-off pending placement evidence; then produce final per-country before/after and deploy through the normal Worker workflow.

## How to make common changes (edit points)
All in `index.html` unless noted:
- **Stage colors / legend labels:** the `STAGE` object near the top of `<script>`. Keys must match Notion Stage names exactly. Legend auto-shows only stages in use, in this object's order.
- **Which stages count in the headline "Countries" KPI:** `IMPACT_STAGES` (currently `['Active','Pilot','Done']`).
- **Title / eyebrow:** the `.title` block in the HTML (currently "The Impact Map").
- **Worker URL:** `WORKER_URL` constant (currently the live workers.dev URL).
- **Baked fallback** (shown if the Worker is unreachable): the block between `/*DATA_START*/` and `/*DATA_END*/`. Keep those markers.
- **Country geometry:** the `<path>` elements — do NOT edit (176 countries, equirectangular projection, Antarctica removed).
- **Add a country to the map:** just add a row in Notion with a Name the lookup recognizes (or set ISO3). No code change.
- **Worker field names / stage handling / number logic:** `worker.js` `PROP` object and the readers. After editing, redeploy in Cloudflare (Edit code → paste → Deploy).

## Gotchas (do not repeat)
- Never put `NOTION_TOKEN` in the repo or index.html.
- Notion bulk query returns rollup/formula values as pointers, not numbers — must fetch per page (already handled; keep it).
- Notion file URLs expire ~1h → photos must be hosted links.
- "Congo" in Notion = DR Congo → mapped to ISO `COD` in `worker.js` NAME2ISO.
- Editing the ~147KB index.html in the GitHub web editor can corrupt it — edit locally / via git, or re-upload the whole file.
- Cloudflare free tier: ~50 subrequests per request. Per-page number fetches are 2× active-with-trips countries; fine now, watch it past ~24 active countries.

## Known follow-ups (not yet done)
- Embed on Wix (Embed a Site iframe; full width; height ~600 desktop / ~520 mobile).
- Optional `?only=ISO,ISO` URL filter so the Partner Portal can reuse this file for scoped per-partner maps.
- Fill Map Narrative + Map Photos for each country.
- Optional: Airtable→Notion Event sync so surveyed filter numbers self-update without making mWater, a Trip, or a formal Deployment mandatory for historical/manual Events.

## Appearance toggle — live (2026-09-09)
- The standalone map has one 44 px rounded-square sun/moon control beside its KPIs. It switches the complete map surface between purpose-designed dark and light palettes; there is no menu or language control.
- The current theme is stored under the suite-compatible local key `wata-theme`. The browser theme color, accessible action label and icon update with the selection.
- Light mode has separate ocean, land, border, text, panel, control and hover-contrast values so map geometry and impact colors remain distinct.
- Version `1.1.0` is live from frontend release revision `95b57162f3a125ff9399273429f6b0eac506b99e`. The release was verified directly at the custom domain in both themes and inside an iframe. The pre-release rollback baseline is `336b312e735c56e378d4831ec48b75063fb6c775`.

## Quick-map modal bridge — v1.1.1
- Ordinary standalone and public iframe embeds remain inert. The bridge activates only when the iframe URL includes `?quick-map=1` and an embedded approved parent completes the handshake.
- Approved parent origins are exactly `https://grants.cleanwata.org` and `https://command.cleanwata.org`, with no paths or wildcards.
- After iframe load, the parent sends `{type: "wata:quick-map-init"}` to target origin `https://map.cleanwata.org`. The child requires both `event.source === window.parent` and an approved exact `event.origin`, then replies `{type: "wata:quick-map-ready"}` to that exact origin.
- After a successful handshake, Escape inside the iframe sends `{type: "wata:quick-map-close"}` to the stored exact parent origin. Messages contain no private data. The parent must independently require `event.origin === "https://map.cleanwata.org"` and `event.source === iframe.contentWindow` before closing its modal.
- Map release `fc85e4b3ca1d940038af5534f4e81456af92a09b` is live. Independent production acceptance against Grant Hub v0.3.0 (`ef263c3`) passed with focus inside the iframe's Zoom in button: Escape closed the host dialog, removed the iframe `src`, and returned focus to `quick-map-header`.

## iPhone safe areas — v1.1.2 (2026-09-10)
- Live release `93b2d9d2d65b26516ec0e146fe08a8d5a18f7b91` adds `viewport-fit=cover` and four-direction `env(safe-area-inset-*)` handling for the header/KPIs/theme toggle, legend/refresh, zoom/reset controls, country drawer, lightbox and toast.
- The initial head script marks every iframe as `data-embedded="true"` before layout. Embedded mode explicitly zeroes the map's safe-area variables so the Grant/Wix host owns outer insets and padding is not doubled. The quick-map origin/source handshake is unchanged.
- Browser viewport acceptance passed at 390×844 portrait and 844×390 landscape in dark/light modes. The document matched the viewport in both directions after containing the off-screen country drawer; the landscape Colombia drawer was also inspected.
- Live production checks confirmed v1.1.2, 7 countries / 1,017 filters / 5,085 people, embedded zero insets, and the Grant quick-map Zoom in → Escape close/unload/focus-return flow.
- Actual iPhone Safari and Home Screen/installed-mode acceptance remain pending. Browser dimension simulation is not physical-device evidence; this repository has no dedicated PWA manifest or service worker.

## Country-detail polish — local, not deployed (2026-09-15)
- The country drawer now reuses each country’s existing SVG silhouette and plots small approximate public-region dots from the `Regions` names. These are intentionally country-relative regional anchors, never household coordinates; the drawer says so directly and falls back safely when detailed area data is unavailable.
- The two impact-stat cards remain above that inset for every mapped country. A missing verified value is shown as `—` rather than removing the cards or inventing a number.
- Country clicks animate to a modest focus view instead of jumping aggressively. Mouse-wheel zoom is capped to a much gentler step, and any new pan/zoom input cancels the focus animation. Reduced-motion preferences skip the animation.
- Dark and light palettes have stronger land, border, panel, text and control separation while preserving the existing teal/blue/yellow stage system and the standalone sun/moon toggle.
- On phone-width viewports the detail drawer becomes a full-width sheet so the inset map, metrics, area pills and close control remain readable.
- Visual acceptance completed at 1440×900 and 390×844 in both themes using a temporary local Vietnam fixture; that fixture was removed after review. The structural/theme tests cover the inset, mobile sheet, contrast tokens, gentle wheel zoom and click focus. No production deployment is claimed by this section.

## Live country information restoration — prepared 2026-09-16
- The visual frontend again accepts the currently deployed Worker response so the country cards and inset maps receive the real Notion-backed totals and `Regions` values instead of remaining blank behind the unreleased `reported-distributed-v1` gate.
- Until the lifecycle-specific Worker is separately reconciled and released, the UI calls these values **Reported filters** rather than claiming every number is survey-verified or lifecycle-verified distribution. Estimated people remains the reported filter count multiplied by five in the live Worker.
- Read-only Notion verification on September 16 found seven impact countries and current region metadata for Colombia, El Salvador, Guatemala, Myanmar, Thailand and Vietnam. The deployed Worker returned 1,017 reported filters / 5,085 estimated people with Colombia 150, Guatemala 465, Thailand 11, Myanmar 132, Vietnam 184, El Salvador 72 and Nicaragua 3.
- This frontend restoration does not modify Notion, Airtable, mWater, Events, Registry assets or the prepared local Worker reconciliation. Production status must be recorded only after the frontend commit is pushed and the Pages workflow and custom domain are verified.
- Screenshot review found the initial Colombia and Vietnam pin centers too close to the silhouette edges. The follow-up enlarges the inset from 170 px to 190 px, reduces framing padding, moves those public-region anchors inward, shrinks the dot footprint and gives the silhouette/pins a higher-contrast cyan-white treatment in both themes. This remains local until a later explicitly approved production push.

## Files
- `index.html` — the map (live copy on Pages).
- `worker.js` — Cloudflare Worker (deployed copy lives in Cloudflare).
- `theme.test.mjs` — theme-control, persistence and inline-script tests.
- `quick-map-bridge.js` — explicit-origin quick-map iframe handshake and Escape bridge.
- `quick-map-bridge.test.mjs` — allowed/disallowed origin, source, standalone and Escape tests.
- `.github/workflows/deploy-pages.yml` — explicit GitHub Pages release workflow.
- this doc.
