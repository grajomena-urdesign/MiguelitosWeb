import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";

const clientDir = join(process.cwd(), "dist", "client");
const manifestPath = join(clientDir, ".vite", "manifest.json");
const outputPath = join(clientDir, "sw.js");

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

const assets = new Set([
  "/offline.html",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/logo.png",
]);

for (const entry of Object.values(manifest)) {
  if (entry.file) assets.add("/" + entry.file);

  for (const css of entry.css || []) {
    assets.add("/" + css);
  }
}

async function addStaticFiles(dir) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, item.name);

    if (item.isDirectory()) {
      await addStaticFiles(full);
      continue;
    }

    const rel = relative(clientDir, full).split(sep).join("/");

    if (
      rel.startsWith("_next/static/css/") ||
      rel === "icecream.jpg"
    ) {
      assets.add("/" + rel);
    }
  }
}

await addStaticFiles(clientDir);

const cacheName = "miguelitos-offline-v2";

const sw = `
const CACHE = ${JSON.stringify(cacheName)};
const ASSETS = ${JSON.stringify([...assets], null, 2)};

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key.startsWith("miguelitos-offline-") && key !== CACHE)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") return;

  // Never cache API responses, authentication, sales, or customer data.
  if (
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/")
  ) {
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request))
    );
  }
});
`;

await writeFile(outputPath, sw.trimStart(), "utf8");

console.log(`Generated offline service worker with ${assets.size} cached assets.`);