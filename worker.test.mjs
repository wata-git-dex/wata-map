import assert from "node:assert/strict";
import test from "node:test";

import worker from "./worker.js";

const COUNTRY_SOURCE = "638d93f9-19bc-8305-a503-07a0b9eaba93";
const EVENT_SOURCE = "c94d93f9-19bc-83b4-8112-87a824660fb4";
const guatemalaId = "a37d93f9-19bc-82d2-9146-81bc4152afcb";

function country({
  id = guatemalaId,
  name = "Guatemala",
  edited = "2026-09-10T08:00:00.000Z",
  countryUrl = null,
  ctaLabel = "",
  ctaUrl = null,
  inCountry,
} = {}) {
  return {
    id,
    last_edited_time: edited,
    properties: {
      Name: { title: [{ plain_text: name }] },
      Stage: { status: { name: "Active" } },
      "Map Narrative": { rich_text: [] },
      "Map Photos": { rich_text: [] },
      "Country Page URL": { url: countryUrl },
      "Map CTA Label": { rich_text: ctaLabel ? [{ plain_text: ctaLabel }] : [] },
      "Map CTA URL": { url: ctaUrl },
      ...(inCountry === undefined ? {} : { "Reported Filters in Country": { number: inCountry } }),
      Regions: { multi_select: [] },
    },
  };
}

test("publishes valid country and CTA links from Country Data", async (t) => {
  installFetch(t, {
    countries: [country({
      countryUrl: "https://cleanwata.org/guatemala",
      ctaLabel: "Help bring this program to Guatemala",
      ctaUrl: "https://cleanwata.org/help",
    })],
    events: [],
  });
  const { payload } = await readPayload();
  assert.equal(payload.countries.GTM.countryUrl, "https://cleanwata.org/guatemala");
  assert.equal(payload.countries.GTM.ctaLabel, "Help bring this program to Guatemala");
  assert.equal(payload.countries.GTM.ctaUrl, "https://cleanwata.org/help");
});

test("does not publish unsafe URL schemes", async (t) => {
  installFetch(t, {
    countries: [country({ countryUrl: "javascript:alert(1)", ctaUrl: "data:text/html,bad" })],
    events: [],
  });
  const { payload } = await readPayload();
  assert.equal(payload.countries.GTM.countryUrl, null);
  assert.equal(payload.countries.GTM.ctaUrl, null);
});

function event({
  id = "event-1",
  status = "Distributed",
  countries = [guatemalaId],
  total,
  distributed,
  droppedOff,
  edited = "2026-09-11T09:30:00.000Z",
} = {}) {
  const properties = {
    Status: { status: { name: status } },
    Country: { relation: countries.map((countryId) => ({ id: countryId })) },
  };
  if (total !== undefined) properties["Total Filters"] = { formula: { number: total } };
  if (distributed !== undefined) properties["Distributed Filters"] = { number: distributed };
  if (droppedOff !== undefined) properties["Dropped-Off"] = { number: droppedOff };
  return { id, last_edited_time: edited, properties };
}

function installFetch(t, { countries, events, failEvents = false }) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes(`${COUNTRY_SOURCE}/query`)) {
      return Response.json({ results: countries, has_more: false });
    }
    if (url.includes(`${EVENT_SOURCE}/query`)) {
      if (failEvents) return new Response("source unavailable", { status: 503 });
      return Response.json({ results: events, has_more: false });
    }
    return new Response("not found", { status: 404 });
  };
  t.after(() => { globalThis.fetch = originalFetch; });
}

async function readPayload() {
  const response = await worker.fetch(
    new Request("https://map.test/"),
    { NOTION_TOKEN: "test" },
    { waitUntil() {} },
  );
  return { response, payload: await response.json() };
}

test("counts a country-linked distribution without a Trip or Deployment", async (t) => {
  installFetch(t, { countries: [country({ inCountry: 53 })], events: [event({ distributed: 39, droppedOff: 14 })] });
  const { response, payload } = await readPayload();
  assert.equal(response.status, 200);
  assert.equal(payload.countries.GTM.filters, 39);
  assert.equal(payload.countries.GTM.potentialFilters, 53);
  assert.equal(payload.countries.GTM.served, 195);
  assert.equal(payload.countries.GTM.metrics.reportedDistributed.filters, 39);
  assert.equal(payload.countries.GTM.metrics.reportedInCountry.filters, 53);
  assert.equal(payload.countries.GTM.metrics.reportedInCountry.peoplePotentialEstimate, 265);
  assert.equal(payload.countries.GTM.metrics.reportedDroppedOff.filters, 14);
});

test("keeps actual impact separate from total filters in country", async (t) => {
  installFetch(t, {
    countries: [country({ inCountry: 478 })],
    events: [event({ distributed: 464, droppedOff: 14 })],
  });
  const { payload } = await readPayload();
  assert.equal(payload.countries.GTM.filters, 464);
  assert.equal(payload.countries.GTM.served, 2320);
  assert.equal(payload.countries.GTM.potentialFilters, 478);
  assert.equal(payload.countries.GTM.metrics.reportedInCountry.peoplePotentialEstimate, 2390);
});

test("does not use static or Country Data totals when no qualifying distribution exists", async (t) => {
  installFetch(t, { countries: [country()], events: [event({ status: "Planning", distributed: 999 })] });
  const { payload } = await readPayload();
  assert.equal(payload.countries.GTM.filters, null);
  assert.equal(payload.countries.GTM.served, null);
  assert.equal(payload.countries.GTM.metrics.reportedDistributed.filters, null);
});

test("explicit distributed value wins when computed Total Filters is zero", async (t) => {
  installFetch(t, {
    countries: [country({ name: "Vietnam" })],
    events: [event({ total: 0, distributed: 25, droppedOff: 0 })],
  });
  const { payload } = await readPayload();
  assert.equal(payload.countries.VNM.filters, 25);
  assert.equal(payload.countries.VNM.served, 125);
});

test("keeps dropped-off filters separate from distributed impact", async (t) => {
  installFetch(t, {
    countries: [country({ name: "Colombia" })],
    events: [event({ status: "Dropped Off", total: 38, droppedOff: 38 })],
  });
  const { payload } = await readPayload();
  assert.equal(payload.countries.COL.filters, 0);
  assert.equal(payload.countries.COL.served, 0);
  assert.equal(payload.countries.COL.metrics.reportedDroppedOff.filters, 38);
});

test("uses Total Filters only as a status-scoped compatibility fallback", async (t) => {
  installFetch(t, { countries: [country()], events: [event({ total: 40 })] });
  const { payload } = await readPayload();
  assert.equal(payload.countries.GTM.filters, 40);
  assert.equal(payload.countries.GTM.metrics.reportedDroppedOff.filters, 0);
});

test("deduplicates old and current country relations that resolve to the same ISO", async (t) => {
  const oldId = "old-guatemala-page";
  const currentId = "current-guatemala-page";
  installFetch(t, {
    countries: [
      country({ id: oldId, name: "Guatemala", edited: "2026-09-09T08:00:00.000Z" }),
      country({ id: currentId, name: "Guatemala", edited: "2026-09-10T08:00:00.000Z" }),
    ],
    events: [event({ countries: [oldId, currentId], distributed: 25 })],
  });
  const { payload } = await readPayload();
  assert.equal(payload.countries.GTM.filters, 25);
  assert.equal(payload.unresolvedAllocation.eventCount, 0);
});

test("does not multiply an event across distinct countries", async (t) => {
  const colombiaId = "colombia-page";
  installFetch(t, {
    countries: [country(), country({ id: colombiaId, name: "Colombia" })],
    events: [event({ countries: [guatemalaId, colombiaId], distributed: 25, droppedOff: 5 })],
  });
  const { payload } = await readPayload();
  assert.equal(payload.countries.GTM.filters, null);
  assert.equal(payload.countries.COL.filters, null);
  assert.deepEqual(payload.unresolvedAllocation, {
    eventCount: 1,
    distributedFilters: 25,
    droppedOffFilters: 5,
    reasons: { noCountry: 0, multipleCountries: 1 },
    unresolvedRelationEventCount: 0,
    unresolvedRelationCount: 0,
  });
});

test("surfaces unresolved legacy relation IDs without duplicating a single resolved ISO", async (t) => {
  installFetch(t, {
    countries: [country()],
    events: [event({ countries: [guatemalaId, "unresolved-legacy-country-page"], distributed: 25 })],
  });
  const { payload } = await readPayload();
  assert.equal(payload.countries.GTM.filters, 25);
  assert.equal(payload.unresolvedAllocation.eventCount, 0);
  assert.equal(payload.unresolvedAllocation.unresolvedRelationEventCount, 1);
  assert.equal(payload.unresolvedAllocation.unresolvedRelationCount, 1);
});

test("produces the reconciled raw per-country diagnostic without mixing lifecycle stages", async (t) => {
  const ids = {
    GTM: "gt-page", COL: "co-page", THA: "th-page", MMR: "mm-page",
    VNM: "vn-page", SLV: "sv-page", NIC: "ni-page",
  };
  installFetch(t, {
    countries: [
      country({ id: ids.GTM, name: "Guatemala" }),
      country({ id: ids.COL, name: "Colombia" }),
      country({ id: ids.THA, name: "Thailand" }),
      country({ id: ids.MMR, name: "Myanmar" }),
      country({ id: ids.VNM, name: "Vietnam" }),
      country({ id: ids.SLV, name: "El Salvador" }),
      country({ id: ids.NIC, name: "Nicaragua" }),
    ],
    events: [
      event({ id: "gt", countries: [ids.GTM], distributed: 423, droppedOff: 42 }),
      event({ id: "co", countries: [ids.COL], distributed: 105, droppedOff: 38 }),
      event({ id: "th", countries: [ids.THA], distributed: 2, droppedOff: 9 }),
      event({ id: "mm", countries: [ids.MMR], distributed: 122, droppedOff: 10 }),
      event({ id: "vn-main", countries: [ids.VNM], distributed: 184, droppedOff: 0 }),
      event({ id: "vn-school", countries: [ids.VNM], total: 0, distributed: 25, droppedOff: 0 }),
      event({ id: "sv", countries: [ids.SLV], distributed: 72, droppedOff: 0 }),
      event({ id: "ni", countries: [ids.NIC], distributed: 3, droppedOff: 0 }),
    ],
  });

  const { payload } = await readPayload();
  assert.deepEqual(
    Object.fromEntries(Object.entries(ids).map(([iso]) => [iso, payload.countries[iso].filters])),
    { GTM: 423, COL: 105, THA: 2, MMR: 122, VNM: 209, SLV: 72, NIC: 3 },
  );
  assert.equal(Object.values(payload.countries).reduce((sum, item) => sum + (item.filters || 0), 0), 936);
  assert.equal(
    Object.values(payload.countries).reduce((sum, item) => sum + (item.metrics.reportedDroppedOff.filters || 0), 0),
    99,
  );
});

test("reports source freshness from contributing Notion records, separately from generation", async (t) => {
  installFetch(t, {
    countries: [country({ edited: "2026-09-10T08:00:00.000Z" })],
    events: [event({ distributed: 40, edited: "2026-09-11T09:30:00.000Z" })],
  });
  const { payload } = await readPayload();
  assert.equal(payload.dataStatus, "current");
  assert.equal(payload.metricContract, "actual-and-potential-impact-v2");
  assert.equal(payload.sourceFreshness, "2026-09-11T09:30:00.000Z");
  assert.equal(payload.countries.GTM.metadataFreshness, "2026-09-10T08:00:00.000Z");
  assert.equal(payload.countries.GTM.metrics.reportedDistributed.sourceFreshness, "2026-09-11T09:30:00.000Z");
  assert.match(payload.sourceFreshnessSemantics, /not a verification date/i);
  assert.ok(Date.parse(payload.generatedAt));
});

test("returns unavailable instead of mixed fallback totals when Events fail", async (t) => {
  installFetch(t, { countries: [country()], events: [], failEvents: true });
  const { response, payload } = await readPayload();
  assert.equal(response.status, 503);
  assert.match(payload.error, /Notion 503/);
});

test("marks a last-known-good response stale and preserves its source freshness", async (t) => {
  const originalCaches = globalThis.caches;
  const stored = new Map();
  globalThis.caches = {
    default: {
      async match(request) {
        const response = stored.get(String(request.url || request));
        return response ? response.clone() : undefined;
      },
      async put(request, response) {
        stored.set(String(request.url || request), response.clone());
      },
    },
  };
  t.after(() => {
    if (originalCaches === undefined) delete globalThis.caches;
    else globalThis.caches = originalCaches;
  });

  let failEvents = false;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes(`${COUNTRY_SOURCE}/query`)) {
      return Response.json({ results: [country()], has_more: false });
    }
    if (url.includes(`${EVENT_SOURCE}/query`)) {
      if (failEvents) return new Response("source unavailable", { status: 503 });
      return Response.json({ results: [event({ distributed: 40 })], has_more: false });
    }
    return new Response("not found", { status: 404 });
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  const pending = [];
  const firstResponse = await worker.fetch(
    new Request("https://map.test/"),
    { NOTION_TOKEN: "test" },
    { waitUntil(promise) { pending.push(promise); } },
  );
  const firstPayload = await firstResponse.json();
  await Promise.all(pending);
  for (const key of stored.keys()) {
    if (key.includes("/__wata-map-data-")) stored.delete(key);
  }

  failEvents = true;
  const staleResponse = await worker.fetch(
    new Request("https://map.test/"),
    { NOTION_TOKEN: "test" },
    { waitUntil() {} },
  );
  const stalePayload = await staleResponse.json();
  assert.equal(staleResponse.status, 200);
  assert.equal(stalePayload.dataStatus, "stale");
  assert.equal(stalePayload.sourceFreshness, firstPayload.sourceFreshness);
  assert.equal(stalePayload.lastSuccessfulGeneratedAt, firstPayload.generatedAt);
  assert.equal(stalePayload.countries.GTM.filters, 40);
  assert.match(staleResponse.headers.get("Warning"), /stale/i);
});

test("unsupported methods and preflight make no upstream requests", async (t) => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error("unexpected upstream call"); };
  t.after(() => { globalThis.fetch = original; });
  for (const method of ["POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]) {
    const response = await worker.fetch(new Request("https://map.test/", { method }), {}, {});
    assert.equal(response.status, method === "OPTIONS" ? 200 : 405);
    if (method !== "OPTIONS") assert.equal(response.headers.get("Allow"), "GET, OPTIONS");
  }
  assert.equal(calls, 0);
});

test("pagination rejects repeated or missing cursors without publishing partial totals", async (t) => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  for (const cursor of ["same-cursor", null, ""]) {
    let calls = 0;
    globalThis.fetch = async () => {
      calls++;
      if (calls > 2) throw new Error("pagination guard failed");
      return Response.json({ results: [country()], has_more: true, next_cursor: cursor });
    };
    const { response, payload } = await readPayload();
    assert.equal(response.status, 503);
    assert.equal(payload.dataStatus, "unavailable");
    assert.equal(payload.countries, undefined);
    assert.match(payload.error, /pagination cursor/);
    assert.equal(calls, cursor ? 2 : 1);
  }
});

test("rate limits are not immediately retried", async (t) => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; return new Response("rate limited", { status: 429 }); };
  t.after(() => { globalThis.fetch = original; });
  const { response, payload } = await readPayload();
  assert.equal(response.status, 503);
  assert.equal(payload.dataStatus, "unavailable");
  assert.equal(calls, 1);
});
