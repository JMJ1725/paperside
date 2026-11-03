/* PaperSide service worker: app shell cache + share target */
const VERSION = "ps-0.5";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== "share").map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method === "POST" && url.pathname.endsWith("/share-target")) {
    e.respondWith((async () => {
      try { const fd = await e.request.formData(); const f = fd.get("pdf") || [...fd.values()].find((v) => v && typeof v === "object" && "arrayBuffer" in v); if (f) { const c = await caches.open("share"); await c.put("shared-pdf", new Response(f, { headers: { "content-type": "application/pdf", "x-name": encodeURIComponent(f.name || "shared.pdf") } })); } } catch (err) { console.warn(err); }
      return Response.redirect("./?share=1", 303);
    })());
    return;
  }
  if (e.request.method !== "GET" || url.hostname === "api.anthropic.com") return;
  const own = url.origin === location.origin, cdn = url.hostname === "cdnjs.cloudflare.com";
  if (!own && !cdn) return;
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const cached = await cache.match(e.request, { ignoreSearch: own });
    if (cached) { if (own) fetch(e.request).then((r) => { if (r.ok) cache.put(e.request, r.clone()); }).catch(() => {}); return cached; }
    const r = await fetch(e.request);
    if (r.ok && (r.type === "basic" || r.type === "cors")) cache.put(e.request, r.clone());
    return r;
  })());
});
