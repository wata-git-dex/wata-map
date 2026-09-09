import assert from "node:assert/strict";
import test from "node:test";

import { createQuickMapBridge, QUICK_MAP_PARENT_ORIGINS } from "./quick-map-bridge.js";

function makeWindow({ embedded = true } = {}) {
  const listeners = new Map();
  const posts = [];
  const parent = { postMessage: (message, targetOrigin) => posts.push({ message, targetOrigin }) };

  function fakeWindow() {}
  fakeWindow.parent = embedded ? parent : fakeWindow;
  fakeWindow.addEventListener = (type, listener) => listeners.set(type, listener);
  fakeWindow.removeEventListener = (type, listener) => {
    if (listeners.get(type) === listener) listeners.delete(type);
  };
  fakeWindow.dispatch = (type, event) => listeners.get(type)?.(event);
  fakeWindow.posts = posts;
  fakeWindow.parentObject = parent;
  return fakeWindow;
}

test("approved quick-map parent can initialize and receive Escape close", () => {
  const windowObject = makeWindow();
  const bridge = createQuickMapBridge({
    windowObject,
    locationObject: { search: "?quick-map=1" },
  });

  windowObject.dispatch("message", {
    source: windowObject.parentObject,
    origin: "https://grants.cleanwata.org",
    data: { type: "wata:quick-map-init" },
  });
  windowObject.dispatch("keydown", { key: "Escape", target: { id: "zin" } });

  assert.equal(bridge.verifiedParentOrigin, "https://grants.cleanwata.org");
  assert.deepEqual(windowObject.posts, [
    {
      message: { type: "wata:quick-map-ready" },
      targetOrigin: "https://grants.cleanwata.org",
    },
    {
      message: { type: "wata:quick-map-close" },
      targetOrigin: "https://grants.cleanwata.org",
    },
  ]);
});

test("allowlist contains only the two approved production origins", () => {
  assert.deepEqual([...QUICK_MAP_PARENT_ORIGINS], [
    "https://grants.cleanwata.org",
    "https://command.cleanwata.org",
  ]);
});

test("disallowed origin cannot initialize the bridge", () => {
  const windowObject = makeWindow();
  const bridge = createQuickMapBridge({
    windowObject,
    locationObject: { search: "?quick-map=1" },
  });

  windowObject.dispatch("message", {
    source: windowObject.parentObject,
    origin: "https://example.com",
    data: { type: "wata:quick-map-init" },
  });
  windowObject.dispatch("keydown", { key: "Escape" });

  assert.equal(bridge.verifiedParentOrigin, null);
  assert.deepEqual(windowObject.posts, []);
});

test("message from a different window cannot initialize the bridge", () => {
  const windowObject = makeWindow();
  const bridge = createQuickMapBridge({
    windowObject,
    locationObject: { search: "?quick-map=1" },
  });

  windowObject.dispatch("message", {
    source: {},
    origin: "https://grants.cleanwata.org",
    data: { type: "wata:quick-map-init" },
  });

  assert.equal(bridge.verifiedParentOrigin, null);
  assert.deepEqual(windowObject.posts, []);
});

test("standalone map never notifies a parent", () => {
  const windowObject = makeWindow({ embedded: false });
  const bridge = createQuickMapBridge({
    windowObject,
    locationObject: { search: "?quick-map=1" },
  });

  windowObject.dispatch("message", {
    source: windowObject,
    origin: "https://grants.cleanwata.org",
    data: { type: "wata:quick-map-init" },
  });
  windowObject.dispatch("keydown", { key: "Escape" });

  assert.equal(bridge.verifiedParentOrigin, null);
  assert.deepEqual(windowObject.posts, []);
});

test("ordinary embeds stay inert without explicit quick-map mode", () => {
  const windowObject = makeWindow();
  const bridge = createQuickMapBridge({
    windowObject,
    locationObject: { search: "" },
  });

  windowObject.dispatch("message", {
    source: windowObject.parentObject,
    origin: "https://grants.cleanwata.org",
    data: { type: "wata:quick-map-init" },
  });
  windowObject.dispatch("keydown", { key: "Escape" });

  assert.equal(bridge.verifiedParentOrigin, null);
  assert.deepEqual(windowObject.posts, []);
});
