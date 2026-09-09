const QUICK_MAP_PARAM = "quick-map";
const QUICK_MAP_VALUE = "1";
const INIT_TYPE = "wata:quick-map-init";
const READY_TYPE = "wata:quick-map-ready";
const CLOSE_TYPE = "wata:quick-map-close";

export const QUICK_MAP_PARENT_ORIGINS = new Set([
  "https://grants.cleanwata.org",
  "https://command.cleanwata.org",
]);

export function createQuickMapBridge({
  windowObject = window,
  locationObject = window.location,
  allowedOrigins = QUICK_MAP_PARENT_ORIGINS,
} = {}) {
  const quickMapMode = new URLSearchParams(locationObject.search).get(QUICK_MAP_PARAM) === QUICK_MAP_VALUE;
  const embedded = windowObject.parent && windowObject.parent !== windowObject;
  let verifiedParentOrigin = null;

  const onMessage = (event) => {
    if (!quickMapMode || !embedded) return;
    if (event.source !== windowObject.parent) return;
    if (!allowedOrigins.has(event.origin)) return;
    if (event.data?.type !== INIT_TYPE) return;

    verifiedParentOrigin = event.origin;
    windowObject.parent.postMessage({ type: READY_TYPE }, verifiedParentOrigin);
  };

  const onKeydown = (event) => {
    if (event.key !== "Escape" || !verifiedParentOrigin) return;
    windowObject.parent.postMessage({ type: CLOSE_TYPE }, verifiedParentOrigin);
  };

  windowObject.addEventListener("message", onMessage);
  windowObject.addEventListener("keydown", onKeydown);

  return {
    get verifiedParentOrigin() { return verifiedParentOrigin; },
    dispose() {
      windowObject.removeEventListener("message", onMessage);
      windowObject.removeEventListener("keydown", onKeydown);
    },
  };
}

if (typeof window !== "undefined") createQuickMapBridge();
