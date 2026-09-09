import assert from "node:assert/strict";
import test from "node:test";

import worker from "./worker.js";

const countryId = "a37d93f9-19bc-82d2-9146-81bc4152afcb";

test("counts a completed country-linked Event without a Trip or Deployment", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes("638d93f9-19bc-8305-a503-07a0b9eaba93/query")) {
      return Response.json({ results: [{
        id: countryId,
        properties: {
          Name: { title: [{ plain_text: "Guatemala" }] },
          Stage: { status: { name: "Active" } },
          Trips: { relation: [] },
          "Total Filters (Dropped Off + Distributed)": { id: "filters", rollup: { number: null } },
          "Total People": { id: "people", formula: { number: null } },
          "Map Narrative": { rich_text: [] },
          "Map Photos": { rich_text: [] },
          Regions: { multi_select: [] },
        },
      }], has_more: false });
    }
    if (url.includes("c94d93f9-19bc-83b4-8112-87a824660fb4/query")) {
      return Response.json({ results: [{
        id: "event-without-trip",
        properties: {
          Status: { status: { name: "Distributed" } },
          Country: { relation: [{ id: countryId }] },
          "Total Filters": { formula: { number: null } },
          "Distributed Filters": { number: 40 },
          "Dropped-Off": { number: 0 },
          Trip: { relation: [] },
          Deployment: { relation: [] },
        },
      }], has_more: false });
    }
    if (url.includes("/properties/")) return Response.json({ rollup: { number: null }, has_more: false });
    return new Response("not found", { status: 404 });
  };

  const response = await worker.fetch(new Request("https://map.test/"), { NOTION_TOKEN: "test" }, { waitUntil() {} });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.countries.GTM.filters, 40);
  assert.equal(payload.countries.GTM.served, 200);
});

test("excludes planning Events from impact totals", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes("638d93f9-19bc-8305-a503-07a0b9eaba93/query")) {
      return Response.json({ results: [{
        id: countryId,
        properties: {
          Name: { title: [{ plain_text: "Guatemala" }] },
          Stage: { status: { name: "Active" } },
          Trips: { relation: [] },
          "Total Filters (Dropped Off + Distributed)": { id: "filters", rollup: { number: null } },
          "Total People": { id: "people", formula: { number: null } },
          "Map Narrative": { rich_text: [] },
          "Map Photos": { rich_text: [] },
          Regions: { multi_select: [] },
        },
      }], has_more: false });
    }
    if (url.includes("c94d93f9-19bc-83b4-8112-87a824660fb4/query")) {
      return Response.json({ results: [{
        properties: {
          Status: { status: { name: "Planning" } },
          Country: { relation: [{ id: countryId }] },
          "Distributed Filters": { number: 999 },
        },
      }], has_more: false });
    }
    if (url.includes("/properties/")) return Response.json({ rollup: { number: null }, has_more: false });
    return new Response("not found", { status: 404 });
  };

  const response = await worker.fetch(new Request("https://map.test/"), { NOTION_TOKEN: "test" }, { waitUntil() {} });
  const payload = await response.json();
  assert.equal(payload.countries.GTM.filters, 465);
  assert.equal(payload.countries.GTM.served, 2325);
});

test("applies Colombia's owner-confirmed reported minimum without fabricating events", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes("638d93f9-19bc-8305-a503-07a0b9eaba93/query")) {
      return Response.json({ results: [{
        id: countryId,
        properties: {
          Name: { title: [{ plain_text: "Colombia" }] },
          Stage: { status: { name: "Active" } },
          Trips: { relation: [] },
          "Total Filters (Dropped Off + Distributed)": { id: "filters", rollup: { number: null } },
          "Total People": { id: "people", formula: { number: null } },
          "Map Narrative": { rich_text: [] },
          "Map Photos": { rich_text: [] },
          Regions: { multi_select: [] },
        },
      }], has_more: false });
    }
    if (url.includes("c94d93f9-19bc-83b4-8112-87a824660fb4/query")) {
      return Response.json({ results: [{
        properties: {
          Status: { status: { name: "Dropped Off" } },
          Country: { relation: [{ id: countryId }] },
          "Total Filters": { formula: { number: 143 } },
        },
      }], has_more: false });
    }
    if (url.includes("/properties/")) return Response.json({ rollup: { number: null }, has_more: false });
    return new Response("not found", { status: 404 });
  };

  const response = await worker.fetch(new Request("https://map.test/"), { NOTION_TOKEN: "test" }, { waitUntil() {} });
  const payload = await response.json();
  assert.equal(payload.countries.COL.filters, 150);
  assert.equal(payload.countries.COL.served, 750);
});

test("allows later Colombia Event totals above the reported minimum to win", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes("638d93f9-19bc-8305-a503-07a0b9eaba93/query")) {
      return Response.json({ results: [{
        id: countryId,
        properties: {
          Name: { title: [{ plain_text: "Colombia" }] },
          Stage: { status: { name: "Active" } },
          Trips: { relation: [] },
          "Total Filters (Dropped Off + Distributed)": { id: "filters", rollup: { number: null } },
          "Total People": { id: "people", formula: { number: null } },
          "Map Narrative": { rich_text: [] },
          "Map Photos": { rich_text: [] },
          Regions: { multi_select: [] },
        },
      }], has_more: false });
    }
    if (url.includes("c94d93f9-19bc-83b4-8112-87a824660fb4/query")) {
      return Response.json({ results: [{
        properties: {
          Status: { status: { name: "Distributed" } },
          Country: { relation: [{ id: countryId }] },
          "Total Filters": { formula: { number: 160 } },
        },
      }], has_more: false });
    }
    if (url.includes("/properties/")) return Response.json({ rollup: { number: null }, has_more: false });
    return new Response("not found", { status: 404 });
  };

  const response = await worker.fetch(new Request("https://map.test/"), { NOTION_TOKEN: "test" }, { waitUntil() {} });
  const payload = await response.json();
  assert.equal(payload.countries.COL.filters, 160);
  assert.equal(payload.countries.COL.served, 800);
});
