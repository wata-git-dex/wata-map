# WATA Impact Map — Current State & Handoff (for Codex)

**Status: LIVE.** This is not a build spec — it's a description of a working system so you can make changes without rebuilding. Read this first, change only what's asked, and preserve everything below unless told otherwise.

## What it is
An interactive world map that colors countries by their WATA project **Stage** and shows live filter/people impact numbers, pulled from Notion. Self-contained, no framework, no build step, $0/month. Replaced a paid Atlas.io map.

## Live locations
- **Map (frontend):** `https://wata-git-dex.github.io/wata-map/` — repo `wata-git-dex/wata-map` (public), single file `index.html`. GitHub Pages auto-deploys on every commit to `main` (the built-in "pages build and deployment" Action — there is no custom workflow and none is needed).
- **Worker (data API):** `https://wata-map.cleanwataorg.workers.dev` — Cloudflare Worker named `wata-map`. Source is `worker.js` in the repo (reference copy; the deployed copy lives in Cloudflare and is edited via Cloudflare → Edit code → Deploy).
- **Data source:** Notion database **Country Data** (data source id `638d93f9-19bc-8305-a503-07a0b9eaba93`), under DATA & DOCS.
- **Notion access:** a Notion integration named **WATA MAP** is connected to Country Data. Its token is stored as the Cloudflare secret `NOTION_TOKEN` (encrypted). The token is NOT in the repo or in index.html, and must never be.
- **Wix:** embed via **Embed a Site** (iframe) pointing at the Pages URL. [Update this line once embedded.]

## Data flow
```
Notion "Country Data"  ──(Worker reads, token hidden in Cloudflare)──►  Cloudflare Worker
        ▲                                                                      │ returns JSON keyed by ISO-3
        │ Cyrus edits Stage / Map Narrative / Map Photos / Regions             ▼
   (filter/people numbers roll up from Trips→Events)              index.html on GitHub Pages ──iframe──► Wix
```
The map fetches the Worker on load and on the Refresh button. There is NO 6-hour sync Action and none is needed (the Worker is live). Airtable is NOT read by the map; Notion is the single source. (Filter/people numbers currently come from Notion rollups that Cyrus maintains upstream; a future Airtable→Notion sync is out of scope.)

## Notion "Country Data" — fields the map uses
| Field | Type | Role |
|---|---|---|
| Name | Title | Country name → matched to a map shape via ISO-3 |
| Stage | Status | Map color + legend. Values: Active, Pilot, Lead, Not started, Done, Paused. Blank = not painted. |
| Total Filters (Dropped Off + Distributed) | Rollup | "Filters" number (fetched per-page for its computed value) |
| Total People | Formula | "People reached" number (fetched per-page) |
| Map Narrative | Text | Public story in the popup (internal "Notes" is deliberately NOT read) |
| Map Photos | Text | Comma/newline image URLs (use Wix `static.wixstatic.com` links; NOT Notion uploads — those expire ~1h) |
| Regions | Multi-select | Each option → a pill in the popup |
| ISO3 | Text (optional) | If set, overrides the name→code lookup |

## Worker JSON contract (index.html depends on this shape)
```json
{ "updated": "Aug 21",
  "countries": {
    "GTM": { "status":"Active", "filters":425, "served":2125, "note":"…", "photos":["https://…"], "regions":["San Juan Comalapa"] }
  } }
```
- `status` = the raw Notion Stage name.
- `filters`/`served` = number or null (null → shows "—").
- keys = UPPERCASE ISO-3 matching the `id` on each `<path>` in the SVG.
- Numbers are fetched via Notion's page-property endpoint (bulk query returns rollups/formulas as uncomputed pointers, so they must be fetched per page). Only countries with Trips are fetched; runs in parallel; cached 5 min.

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
- Optional: Airtable→Notion sync so filter numbers self-update (separate project).

## Files
- `index.html` — the map (live copy on Pages).
- `worker.js` — Cloudflare Worker (deployed copy lives in Cloudflare).
- this doc.
