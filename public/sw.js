/*
  Some notes on this:
  - Offline functionality doesn't work in dev, it can only be tested by running `pnpm run preview:web`.
    This is because:
    - PWAs require HTTPS, but HTTP is used in dev
    - Vite ignores service workers entirely due to it conflicting with HMR
  - The scope when registered must be the root. If you register it at a subpath,
    it will hang on 'trying to install'.
  - The static resources are read from `dist-web` and injected by the build script
  - This file may be stale in preview, as we don't use `self.skipWaiting()` inside the install handler.
    `skipWaiting` can be triggered manually from 'Application' -> 'Service workers'.
*/

const CACHE_NAME = 'note-boi-v1';

const APP_STATIC_RESOURCES = [/* <INJECTED> */];

self.addEventListener('install', (ev) => {
  ev.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      await cache.addAll(APP_STATIC_RESOURCES);
    })()
  );
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    (async () => {
      const names = await caches.keys();

      await Promise.all(
        names.map((name) => {
          return name !== CACHE_NAME ? caches.delete(name) : Promise.resolve();
        })
      );

      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (ev) => {
  if (ev.request.method !== 'GET') return;

  ev.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(ev.request, {
        // Ignore Vary header to avoid cache misses
        ignoreVary: true,
      });

      if (cachedResponse) {
        // Stale-while-revalidate to avoid blocking requests
        cache.add(ev.request).catch(() => {
          // noop
        });

        return cachedResponse;
      }

      return fetch(ev.request);
    })()
  );
});
