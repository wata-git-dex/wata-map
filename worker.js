// WATA Map Worker — reads the existing "Country Data" Notion DB, returns JSON for the map.
// Token lives ONLY as a Cloudflare secret (NOTION_TOKEN). Never in the app or repo.
//
// SETUP (Cloudflare → Workers & Pages → Create Worker → paste → Deploy):
//   1. Settings → Variables and Secrets → add NOTION_TOKEN (encrypted).
//   2. In Notion: open "Country Data" → ••• → Connections → add your integration.
//   3. Visit the Worker URL in a browser — you should see JSON.
//   4. Paste the Worker URL into WORKER_URL at the top of the map's index.html.
//
// Reads from the "Country Data" data source. Everything the map shows already lives here:
//   Name, Stage (status), Total Filters (rollup), Total People (formula), Map Narrative, Map Photos, Regions.
// No new database, no Airtable read — the map's single source is this one DB.

const DATA_SOURCE_ID = "638d93f9-19bc-8305-a503-07a0b9eaba93"; // Country Data data source (collection UUID)
const NOTION_VERSION = "2025-09-03";

// Notion property names (exact). Change only if you rename columns in Notion.
const PROP = {
  name:    "Name",
  stage:   "Stage",
  filters: "Total Filters (Dropped Off + Distributed)",
  people:  "Total People",
  trips:   "Trips",         // relation used to avoid number lookups for countries with no activity
  notes:   "Map Narrative", // PUBLIC story shown in the popup. (Internal "Notes" is intentionally NOT read.)
  iso:     "ISO3",         // OPTIONAL text column. If present it wins over the name lookup.
  photos:  "Map Photos",   // OPTIONAL text column of comma/newline-separated image URLs.
  regions: "Regions",      // multi-select column; each selected option becomes a pill.
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

    try {
      if (!env.NOTION_TOKEN) throw new Error("NOTION_TOKEN secret is not set");

      // Notion rollups/formulas are expensive to compute. Cache the finished payload at the edge for 5 minutes.
      const cache = request.method === "GET" && typeof caches !== "undefined" ? caches.default : null;
      const cacheKey = cache ? new Request(new URL(request.url).origin + "/__wata-map-data") : null;
      const cached = cache && await cache.match(cacheKey);
      if (cached) return cached;

      const pages = await queryAll(DATA_SOURCE_ID, env.NOTION_TOKEN);

      const countries = {};
      const numberLookups = [];
      for (const p of pages) {
        const name = text(p, PROP.name);
        if (!name) continue;

        // resolve ISO-3: explicit column first, then name lookup
        let iso = text(p, PROP.iso).toUpperCase().trim();
        if (!iso) iso = NAME2ISO[name] || NAME2ISO[name.trim()] || "";
        if (!iso) continue; // country name we can't place on the map — skip quietly

        const stage = status(p, PROP.stage);
        if (!stage) continue; // blank Stage — don't paint

        const country = countries[iso] = {
          status:  stage,           // raw Notion Stage name — legend matches Notion
          filters: rollupNumber(p, PROP.filters),
          served:  anyNumber(p, PROP.people),
          note:    text(p, PROP.notes),
          photos:  urls(text(p, PROP.photos)),
          regions: multiSelect(p, PROP.regions),
        };

        // Data-source queries can return rollup/formula pointers instead of computed numbers.
        // Fetch the individual properties only for countries related to Trips. If the Trips
        // relation is unavailable, impact stages are the conservative fallback.
        const trips = prop(p, PROP.trips)?.relation;
        const hasTrips = Array.isArray(trips)
          ? trips.length > 0
          : ["Active", "Pilot", "Done"].includes(stage);
        if (hasTrips && (country.filters == null || country.served == null)) {
          numberLookups.push((async () => {
            const [filters, served] = await Promise.all([
              country.filters == null ? pagePropertyNumber(p.id, prop(p, PROP.filters), env.NOTION_TOKEN) : country.filters,
              country.served == null ? pagePropertyNumber(p.id, prop(p, PROP.people), env.NOTION_TOKEN) : country.served,
            ]);
            country.filters = filters;
            country.served = served;
          })());
        }
      }
      await Promise.all(numberLookups);

      const payload = {
        updated: new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        countries,
      };
      const response = new Response(JSON.stringify(payload), {
        headers: {
          ...cors,
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=300",
        },
      });
      if (cache) ctx.waitUntil(cache.put(cacheKey, response.clone()));
      return response;
    } catch (err) {
      return new Response(JSON.stringify({ error: String(err.message || err) }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
  },
};

// 2025-09-03: query the data source. (Falls back to the legacy databases endpoint if needed.)
async function queryAll(dsId, token) {
  const out = [];
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
    out.push(...(j.results || []));
    cursor = j.has_more ? j.next_cursor : undefined;
  } while (cursor);
  return out;
}

// Retrieve a computed formula/rollup value from Notion's page-property endpoint.
// Aggregated rollups can paginate; the final page contains the completed value.
async function pagePropertyNumber(pageId, property, token) {
  if (!pageId || !property?.id) return null;
  let cursor;
  let value = null;
  do {
    const url = new URL(`https://api.notion.com/v1/pages/${pageId}/properties/${pathPropertyId(property.id)}`);
    url.searchParams.set("page_size", "100");
    if (cursor) url.searchParams.set("start_cursor", cursor);
    const r = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": NOTION_VERSION,
      },
    });
    if (!r.ok) throw new Error(`Notion property ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const j = await r.json();
    const n = propertyItemNumber(j);
    if (n != null) value = n;
    cursor = j.has_more ? j.next_cursor : undefined;
  } while (cursor);
  return value;
}

function pathPropertyId(id) {
  try { return encodeURIComponent(decodeURIComponent(id)); }
  catch { return encodeURIComponent(id); }
}

function propertyItemNumber(item) {
  if (typeof item?.number === "number") return item.number;
  if (typeof item?.formula?.number === "number") return item.formula.number;
  const rollup = item?.rollup || item?.property_item?.rollup;
  return rollupVal(rollup);
}

function prop(p, n)   { return (p.properties && p.properties[n]) || null; }
function text(p, n)   { const v = prop(p, n); return (v?.title || v?.rich_text || []).map(t => t.plain_text).join("").trim(); }
function status(p, n) { const v = prop(p, n); return v?.status?.name ?? v?.select?.name ?? null; }
function anyNumber(p, n) {  // handles number | formula | rollup
  const v = prop(p, n); if (!v) return null;
  if (typeof v.number === "number") return v.number;
  if (v.formula) return v.formula.number ?? null;
  if (v.rollup)  return rollupVal(v.rollup);
  return null;
}
function rollupNumber(p, n) { const v = prop(p, n); return v?.rollup ? rollupVal(v.rollup) : anyNumber(p, n); }
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
