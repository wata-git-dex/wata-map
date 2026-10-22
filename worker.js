// WATA Map Worker — reads Notion Country Data + Events, returns JSON for the map.
// Token lives ONLY as a Cloudflare secret (NOTION_TOKEN). Never in the app or repo.
//
// SETUP (Cloudflare → Workers & Pages → Create Worker → paste → Deploy):
//   1. Settings → Variables and Secrets → add NOTION_TOKEN (encrypted).
//   2. In Notion: connect the integration to both "Country Data" and "Deployments (1)" (Events).
//   3. Visit the Worker URL in a browser — you should see JSON.
//   4. Paste the Worker URL into WORKER_URL at the top of the map's index.html.
//
// Country Data supplies country metadata. Completed Events supply lifecycle totals directly by Country.
// A Trip or formal Deployment is optional context and is never required for an Event to count.
// No new database and no Airtable read.

const DATA_SOURCE_ID = "638d93f9-19bc-8305-a503-07a0b9eaba93"; // Country Data data source (collection UUID)
const EVENT_DATA_SOURCE_ID = "c94d93f9-19bc-83b4-8112-87a824660fb4"; // Deployments (1) / Events
const NOTION_VERSION = "2025-09-03";
const CACHE_VERSION = "2026-10-22-impact-potential-v2";
const METRIC_CONTRACT = "actual-and-potential-impact-v2";
const PEOPLE_PER_FILTER = 5;

// Notion property names (exact). Change only if you rename columns in Notion.
const PROP = {
  name:    "Name",
  stage:   "Stage",
  notes:   "Map Narrative", // PUBLIC story shown in the popup. (Internal "Notes" is intentionally NOT read.)
  iso:     "ISO3",         // OPTIONAL text column. If present it wins over the name lookup.
  photos:  "Map Photos",   // OPTIONAL text column of comma/newline-separated image URLs.
  regions: "Regions",      // multi-select column; each selected option becomes a pill.
  countryUrl: "Country Page URL", // OPTIONAL public country/story page.
  ctaLabel:  "Map CTA Label",     // OPTIONAL public action label, primarily for Lead countries.
  ctaUrl:    "Map CTA URL",       // OPTIONAL public action destination.
  inCountry: "Reported Filters in Country", // Owner-confirmed inventory in country, distributed or awaiting distribution.
};

const EVENT_PROP = {
  country:     "Country",
  status:      "Status",
  total:       "Total Filters",
  distributed: "Distributed Filters",
  droppedOff:  "Dropped-Off",
};

// The map uses your Notion "Stage" names directly (Active, Pilot, Lead, Not started, Done, Paused),
// so the legend labels match Notion exactly. Colors are defined in the map file, not here.
// A row with a blank Stage is skipped (not painted).

// Country name -> ISO-3 (built from the same map geometry so names line up with the shapes).
const NAME2ISO = {"Afghanistan": "AFG", "Albania": "ALB", "Algeria": "DZA", "Angola": "AGO", "Antarctica": "ATA", "Argentina": "ARG", "Armenia": "ARM", "Australia": "AUS", "Austria": "AUT", "Azerbaijan": "AZE", "Bahamas": "BHS", "Bahamas, The": "BHS", "Bangladesh": "BGD", "Belarus": "BLR", "Belgium": "BEL", "Belize": "BLZ", "Benin": "BEN", "Bhutan": "BTN", "Bolivia": "BOL", "Bosnia and Herz.": "BIH", "Bosnia and Herzegovina": "BIH", "Botswana": "BWA", "Brazil": "BRA", "Brunei": "BRN", "Brunei Darussalam": "BRN", "Bulgaria": "BGR", "Burkina Faso": "BFA", "Burma": "MMR", "Burundi": "BDI", "Cambodia": "KHM", "Cameroon": "CMR", "Canada": "CAN", "Cape Verde": "CPV", "Central African Rep.": "CAF", "Central African Republic": "CAF", "Chad": "TCD", "Chile": "CHL", "China": "CHN", "Colombia": "COL", "Congo": "COD", "Congo (Brazzaville)": "COG", "Congo (Kinshasa)": "COD", "Congo, Dem. Rep.": "COD", "Congo, Rep.": "COG", "Costa Rica": "CRI", "Croatia": "HRV", "Cuba": "CUB", "Cyprus": "CYP", "Czech Republic": "CZE", "Czechia": "CZE", "Côte d'Ivoire": "CIV", "DRC": "COD", "Dem. Rep. Congo": "COD", "Dem. Rep. Korea": "PRK", "Democratic Republic of the Congo": "COD", "Denmark": "DNK", "Djibouti": "DJI", "Dominican Rep.": "DOM", "Dominican Republic": "DOM", "East Timor": "TLS", "Ecuador": "ECU", "Egypt": "EGY", "Egypt, Arab Rep.": "EGY", "El Salvador": "SLV", "Eq. Guinea": "GNQ", "Equatorial Guinea": "GNQ", "Eritrea": "ERI", "Estonia": "EST", "Eswatini": "SWZ", "Ethiopia": "ETH", "Falkland Is.": "FLK", "Falkland Islands": "FLK", "Falkland Islands / Malvinas": "FLK", "Fiji": "FJI", "Finland": "FIN", "Fr. S. Antarctic Lands": "ATF", "Fr. S. and Antarctic Lands": "ATF", "France": "FRA", "French Southern and Antarctic Lands": "ATF", "Gabon": "GAB", "Gambia": "GMB", "Gambia, The": "GMB", "Georgia": "GEO", "Germany": "DEU", "Ghana": "GHA", "Greece": "GRC", "Greenland": "GRL", "Guatemala": "GTM", "Guinea": "GIN", "Guinea-Bissau": "GNB", "Guyana": "GUY", "Haiti": "HTI", "Honduras": "HND", "Hungary": "HUN", "Iceland": "ISL", "India": "IND", "Indonesia": "IDN", "Iran": "IRN", "Iran, Islamic Rep.": "IRN", "Iraq": "IRQ", "Ireland": "IRL", "Israel": "ISR", "Italy": "ITA", "Ivory Coast": "CIV", "Jamaica": "JAM", "Japan": "JPN", "Jordan": "JOR", "Kazakhstan": "KAZ", "Kenya": "KEN", "Kingdom of eSwatini": "SWZ", "Korea, Dem. Rep.": "PRK", "Korea, Rep.": "KOR", "Kuwait": "KWT", "Kyrgyz Republic": "KGZ", "Kyrgyzstan": "KGZ", "Lao PDR": "LAO", "Laos": "LAO", "Latvia": "LVA", "Lebanon": "LBN", "Lesotho": "LSO", "Liberia": "LBR", "Libya": "LBY", "Lithuania": "LTU", "Luxembourg": "LUX", "Madagascar": "MDG", "Malawi": "MWI", "Malaysia": "MYS", "Mali": "MLI", "Mauritania": "MRT", "Mexico": "MEX", "Moldova": "MDA", "Mongolia": "MNG", "Montenegro": "MNE", "Morocco": "MAR", "Mozambique": "MOZ", "Myanmar": "MMR", "Namibia": "NAM", "Nepal": "NPL", "Netherlands": "NLD", "New Caledonia": "NCL", "New Zealand": "NZL", "Nicaragua": "NIC", "Niger": "NER", "Nigeria": "NGA", "North Korea": "PRK", "North Macedonia": "MKD", "Norway": "NOR", "Oman": "OMN", "Pakistan": "PAK", "Palestine": "PSE", "Palestine (West Bank and Gaza)": "PSE", "Panama": "PAN", "Papua New Guinea": "PNG", "Paraguay": "PRY", "Peru": "PER", "Philippines": "PHL", "Poland": "POL", "Portugal": "PRT", "Puerto Rico": "PRI", "Qatar": "QAT", "Republic of Korea": "KOR", "Republic of Serbia": "SRB", "Republic of the Congo": "COG", "Romania": "ROU", "Russia": "RUS", "Russian Federation": "RUS", "Rwanda": "RWA", "S. Sudan": "SSD", "Saudi Arabia": "SAU", "Senegal": "SEN", "Serbia": "SRB", "Sierra Leone": "SLE", "Slovak Republic": "SVK", "Slovakia": "SVK", "Slovenia": "SVN", "Solomon Is.": "SLB", "Solomon Islands": "SLB", "Somalia": "SOM", "South Africa": "ZAF", "South Korea": "KOR", "South Sudan": "SSD", "Spain": "ESP", "Sri Lanka": "LKA", "Sudan": "SDN", "Suriname": "SUR", "Swaziland": "SWZ", "Sweden": "SWE", "Switzerland": "CHE", "Syria": "SYR", "Syrian Arab Republic": "SYR", "Taiwan": "TWN", "Tajikistan": "TJK", "Tanzania": "TZA", "Thailand": "THA", "The Bahamas": "BHS", "The Gambia": "GMB", "Timor-Leste": "TLS", "Togo": "TGO", "Trinidad and Tobago": "TTO", "Tunisia": "TUN", "Turkey": "TUR", "Turkmenistan": "TKM", "UK": "GBR", "USA": "USA", "Uganda": "UGA", "Ukraine": "UKR", "United Arab Emirates": "ARE", "United Kingdom": "GBR", "United Republic of Tanzania": "TZA", "United States": "USA", "United States of America": "USA", "Uruguay": "URY", "Uzbekistan": "UZB", "Vanuatu": "VUT", "Venezuela": "VEN", "Venezuela, RB": "VEN", "Viet Nam": "VNM", "Vietnam": "VNM", "W. Sahara": "ESH", "Western Sahara": "ESH", "Yemen": "YEM", "Yemen, Rep.": "YEM", "Zambia": "ZMB", "Zimbabwe": "ZWE", "eSwatini": "SWZ"};

export default {
  async fetch(request, env, ctx) {
    const cors = {
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "GET") {
      return new Response(null, { status: 405, headers: { ...cors, Allow: "GET, OPTIONS" } });
    }

    try {
      if (!env.NOTION_TOKEN) throw new Error("NOTION_TOKEN secret is not set");

      // Notion rollups/formulas are expensive to compute. Cache the finished payload at the edge for 5 minutes.
      const cache = request.method === "GET" && typeof caches !== "undefined" ? caches.default : null;
      const origin = new URL(request.url).origin;
      const cacheKey = cache ? new Request(origin + `/__wata-map-data-${CACHE_VERSION}`) : null;
      const lastGoodKey = cache ? new Request(origin + `/__wata-map-last-good-${CACHE_VERSION}`) : null;
      const cached = cache && await cache.match(cacheKey);
      if (cached) return cached;

      const pages = await queryAll(DATA_SOURCE_ID, env.NOTION_TOKEN);

      const countries = {};
      const countryPageToIso = new Map();
      let sourceFreshness = null;
      for (const p of pages) {
        const name = text(p, PROP.name);
        if (!name) continue;

        // resolve ISO-3: explicit column first, then name lookup
        let iso = text(p, PROP.iso).toUpperCase().trim();
        if (!iso) iso = NAME2ISO[name] || NAME2ISO[name.trim()] || "";
        if (!iso) continue; // country name we can't place on the map — skip quietly

        countryPageToIso.set(normalizeNotionId(p.id), iso);

        const stage = status(p, PROP.stage);
        if (!stage) continue; // blank Stage — don't paint

        const metadataFreshness = validTimestamp(p.last_edited_time);
        sourceFreshness = newestTimestamp(sourceFreshness, metadataFreshness);

        const country = countries[iso] = {
          status:  stage,           // raw Notion Stage name — legend matches Notion
          filters: null,            // compatibility alias: reported distributed filters only
          potentialFilters: anyNumber(p, PROP.inCountry), // filters physically in country; potential reach, not actual distribution
          served:  null,            // compatibility alias: filters × PEOPLE_PER_FILTER estimate
          note:    text(p, PROP.notes),
          photos:  urls(text(p, PROP.photos)),
          regions: multiSelect(p, PROP.regions),
          countryUrl: publicUrl(p, PROP.countryUrl),
          ctaLabel: text(p, PROP.ctaLabel),
          ctaUrl: publicUrl(p, PROP.ctaUrl),
          metadataFreshness,
          metrics: emptyImpactMetrics(),
        };
        country.metrics.reportedInCountry = {
          filters: country.potentialFilters,
          peoplePotentialEstimate: country.potentialFilters == null ? null : country.potentialFilters * PEOPLE_PER_FILTER,
          definition: "Owner-confirmed filters physically in country, including distributed filters and filters awaiting distribution; shown as potential impact.",
          source: "notion-country-data",
          sourceFreshness: metadataFreshness,
        };
      }

      // Events are the impact ledger. Distribution and drop-off are separate measures.
      // Trip and Deployment relations are optional. A country allocation must resolve to
      // exactly one distinct ISO after duplicate old/current country pages are normalized.
      const events = await queryAll(EVENT_DATA_SOURCE_ID, env.NOTION_TOKEN);
      const eventResult = applyEventTotals(countries, countryPageToIso, events);
      sourceFreshness = newestTimestamp(sourceFreshness, eventResult.sourceFreshness);

      const generatedAt = new Date().toISOString();
      const payload = {
        updated: displayDate(sourceFreshness),
        generatedAt,
        metricContract: METRIC_CONTRACT,
        sourceFreshness,
        sourceFreshnessSemantics: "Latest Notion last_edited_time among records contributing metadata or counted metrics; not a verification date.",
        dataStatus: "current",
        unresolvedAllocation: eventResult.unresolvedAllocation,
        countries,
      };
      const response = new Response(JSON.stringify(payload), {
        headers: {
          ...cors,
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=300",
        },
      });
      if (cache) {
        const lastGoodResponse = new Response(JSON.stringify(payload), {
          headers: {
            ...cors,
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=604800",
          },
        });
        ctx.waitUntil(Promise.all([
          cache.put(cacheKey, response.clone()),
          cache.put(lastGoodKey, lastGoodResponse),
        ]));
      }
      return response;
    } catch (err) {
      const cache = request.method === "GET" && typeof caches !== "undefined" ? caches.default : null;
      if (cache) {
        const origin = new URL(request.url).origin;
        const lastGoodKey = new Request(origin + `/__wata-map-last-good-${CACHE_VERSION}`);
        const lastGood = await cache.match(lastGoodKey);
        if (lastGood) {
          const stalePayload = await lastGood.json();
          stalePayload.lastSuccessfulGeneratedAt = stalePayload.generatedAt || null;
          stalePayload.generatedAt = new Date().toISOString();
          stalePayload.dataStatus = "stale";
          stalePayload.dataError = "Live source temporarily unavailable; showing the last successful payload.";
          return new Response(JSON.stringify(stalePayload), {
            headers: {
              ...cors,
              "Content-Type": "application/json",
              "Cache-Control": "public, max-age=60",
              Warning: '110 - "Response is stale"',
            },
          });
        }
      }
      return new Response(JSON.stringify({
        error: String(err.message || err),
        generatedAt: new Date().toISOString(),
        sourceFreshness: null,
        dataStatus: "unavailable",
      }), {
        status: 503,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
  },
};

function applyEventTotals(countries, countryPageToIso, events) {
  const totals = new Map();
  const unresolvedAllocation = {
    eventCount: 0,
    distributedFilters: 0,
    droppedOffFilters: 0,
    reasons: { noCountry: 0, multipleCountries: 0 },
    unresolvedRelationEventCount: 0,
    unresolvedRelationCount: 0,
  };
  let sourceFreshness = null;

  for (const event of events) {
    const eventStatus = status(event, EVENT_PROP.status);
    if (!["Distributed", "Dropped Off"].includes(eventStatus)) continue;

    const lifecycle = eventLifecycleCounts(event, eventStatus);
    if (lifecycle.distributed == null && lifecycle.droppedOff == null) continue;

    const countryRelations = prop(event, EVENT_PROP.country)?.relation;
    const distinctIsos = new Set();
    let unresolvedRelations = 0;
    for (const relation of Array.isArray(countryRelations) ? countryRelations : []) {
      const iso = countryPageToIso.get(normalizeNotionId(relation?.id));
      if (iso && countries[iso]) distinctIsos.add(iso);
      else unresolvedRelations += 1;
    }
    if (unresolvedRelations > 0) {
      unresolvedAllocation.unresolvedRelationEventCount += 1;
      unresolvedAllocation.unresolvedRelationCount += unresolvedRelations;
    }

    if (distinctIsos.size !== 1) {
      unresolvedAllocation.eventCount += 1;
      unresolvedAllocation.distributedFilters += lifecycle.distributed || 0;
      unresolvedAllocation.droppedOffFilters += lifecycle.droppedOff || 0;
      const reason = distinctIsos.size === 0 ? "noCountry" : "multipleCountries";
      unresolvedAllocation.reasons[reason] += 1;
      continue;
    }

    const [iso] = distinctIsos;
    const total = totals.get(iso) || { distributed: 0, droppedOff: 0, distributedFreshness: null, droppedOffFreshness: null };
    const eventFreshness = validTimestamp(event.last_edited_time);
    if (lifecycle.distributed != null) {
      total.distributed += lifecycle.distributed;
      total.distributedFreshness = newestTimestamp(total.distributedFreshness, eventFreshness);
    }
    if (lifecycle.droppedOff != null) {
      total.droppedOff += lifecycle.droppedOff;
      total.droppedOffFreshness = newestTimestamp(total.droppedOffFreshness, eventFreshness);
    }
    totals.set(iso, total);
    sourceFreshness = newestTimestamp(sourceFreshness, eventFreshness);
  }

  for (const [iso, total] of totals) {
    const country = countries[iso];
    country.filters = total.distributed;
    country.served = total.distributed * PEOPLE_PER_FILTER;
    country.metrics.reportedDistributed = {
      filters: total.distributed,
      peopleEstimate: total.distributed * PEOPLE_PER_FILTER,
      definition: "Owner-maintained Notion Events reported as distributed; survey coverage is separate.",
      source: "notion-events",
      sourceFreshness: total.distributedFreshness,
    };
    country.metrics.reportedDroppedOff = {
      filters: total.droppedOff,
      definition: "Owner-maintained Notion Events reported as dropped off or transferred; not included in distributed impact.",
      source: "notion-events",
      sourceFreshness: total.droppedOffFreshness,
    };
  }

  return { sourceFreshness, unresolvedAllocation };
}

function eventLifecycleCounts(event, eventStatus) {
  const total = anyNumber(event, EVENT_PROP.total);
  let distributed = anyNumber(event, EVENT_PROP.distributed);
  let droppedOff = anyNumber(event, EVENT_PROP.droppedOff);

  // Lifecycle-specific fields are authoritative. Total Filters is only a compatibility
  // fallback for the lifecycle named by Status, net of the other explicit lifecycle.
  if (distributed == null && eventStatus === "Distributed" && total != null) {
    distributed = Math.max(0, total - (droppedOff || 0));
  }
  if (droppedOff == null && eventStatus === "Dropped Off" && total != null) {
    droppedOff = Math.max(0, total - (distributed || 0));
  }

  return { distributed, droppedOff };
}

function emptyImpactMetrics() {
  return {
    reportedInCountry: {
      filters: null,
      peoplePotentialEstimate: null,
      definition: "Owner-confirmed filters physically in country, including distributed filters and filters awaiting distribution; shown as potential impact.",
      source: "notion-country-data",
      sourceFreshness: null,
    },
    reportedDistributed: {
      filters: null,
      peopleEstimate: null,
      definition: "Owner-maintained Notion Events reported as distributed; survey coverage is separate.",
      source: "notion-events",
      sourceFreshness: null,
    },
    reportedDroppedOff: {
      filters: null,
      definition: "Owner-maintained Notion Events reported as dropped off or transferred; not included in distributed impact.",
      source: "notion-events",
      sourceFreshness: null,
    },
  };
}

function validTimestamp(value) {
  if (!value || Number.isNaN(Date.parse(value))) return null;
  return new Date(value).toISOString();
}

function newestTimestamp(left, right) {
  if (!left) return right || null;
  if (!right) return left;
  return Date.parse(left) >= Date.parse(right) ? left : right;
}

function displayDate(timestamp) {
  if (!timestamp) return "Unknown";
  return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function normalizeNotionId(id) {
  return String(id || "").replace(/-/g, "").toLowerCase();
}

// 2025-09-03: query the data source. (Falls back to the legacy databases endpoint if needed.)
async function queryAll(dsId, token) {
  const out = [];
  const seenCursors = new Set();
  let cursor;
  do {
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    let r = await fetch(`https://api.notion.com/v1/data_sources/${dsId}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (r.status === 404) {
      // legacy fallback for older API behavior
      r = await fetch(`https://api.notion.com/v1/databases/${dsId}/query`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Notion-Version": NOTION_VERSION,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    }
    if (!r.ok) throw new Error(`Notion ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const j = await r.json();
    if (!Array.isArray(j.results)) throw new Error("Invalid Notion results");
    out.push(...j.results);
    cursor = undefined;
    if (j.has_more) {
      if (typeof j.next_cursor !== "string" || !j.next_cursor.trim() || seenCursors.has(j.next_cursor)) {
        throw new Error("Invalid or repeated Notion pagination cursor");
      }
      cursor = j.next_cursor;
      seenCursors.add(cursor);
    }
  } while (cursor);
  return out;
}

function prop(p, n)   { return (p.properties && p.properties[n]) || null; }
function text(p, n)   { const v = prop(p, n); return (v?.title || v?.rich_text || []).map(t => t.plain_text).join("").trim(); }
function status(p, n) { const v = prop(p, n); return v?.status?.name ?? v?.select?.name ?? null; }
function publicUrl(p, n) {
  const raw = prop(p, n)?.url;
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const parsed = new URL(raw.trim());
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : null;
  } catch {
    return null;
  }
}
function anyNumber(p, n) {  // handles number | formula | rollup
  const v = prop(p, n); if (!v) return null;
  if (typeof v.number === "number") return v.number;
  if (v.formula) return v.formula.number ?? null;
  if (v.rollup)  return rollupVal(v.rollup);
  return null;
}
function rollupVal(r) {
  if (r == null) return null;
  if (typeof r.number === "number") return r.number;
  if (Array.isArray(r.array)) {           // sum array of numbers/formulas if aggregation returns a list
    let s = 0, any = false;
    for (const it of r.array) {
      const n = it?.number ?? it?.formula?.number;
      if (typeof n === "number") { s += n; any = true; }
    }
    return any ? s : null;
  }
  return null;
}
function urls(s) { return s ? s.split(/[\n,]+/).map(x => x.trim()).filter(Boolean) : []; }
function multiSelect(p, n) { const v = prop(p, n); return v?.multi_select?.map(o => o.name) ?? []; }
