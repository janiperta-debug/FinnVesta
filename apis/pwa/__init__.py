from fastapi import APIRouter, Response
from fastapi.responses import JSONResponse

router = APIRouter()

MANIFEST = {
    "name": "FinnVesta - Kiinteistöjen kuntoseuranta",
    "short_name": "FinnVesta",
    "description": "Kiinteistöjen kuntoseuranta ja PTS-suunnittelu",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#ffffff",
    "theme_color": "#ffffff",
    "orientation": "portrait",
    "icons": [
        {
            "src": "https://static.riff.new/public/fiery-pianissimo-accent-iwjq/finnvesta_logo.png",
            "sizes": "192x192",
            "type": "image/png"
        },
        {
            "src": "https://static.riff.new/public/fiery-pianissimo-accent-iwjq/finnvesta_logo.png",
            "sizes": "512x512",
            "type": "image/png"
        },
        {
            "src": "https://static.riff.new/public/fiery-pianissimo-accent-iwjq/finnvesta_logo.png",
            "sizes": "512x512",
            "type": "image/png",
            "purpose": "any maskable"
        }
    ],
    "lang": "fi"
}

SW_CODE = """
const CACHE_NAME = 'finnvesta-v1';
const STATIC_CACHE = 'finnvesta-static-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Cache static assets (images, fonts, scripts, css)
  if (url.pathname.match(/\\.(png|jpg|jpeg|svg|ico|css|js|woff2|json)$/) || 
      url.hostname.includes('static.riff.new') ||
      url.hostname.includes('fonts.googleapis.com') ||
      url.hostname.includes('fonts.gstatic.com')) {
    
    event.respondWith(
      caches.open(STATIC_CACHE).then(cache => {
        return cache.match(event.request).then(response => {
          // Return cached response if found
          if (response) return response;

          // Otherwise fetch from network and cache
          return fetch(event.request).then(networkResponse => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        });
      })
    );
    return;
  }

  // Network First for everything else (HTML, API calls)
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
"""

@router.get("/manifest.json")
def get_manifest():
    return JSONResponse(content=MANIFEST)

@router.get("/sw.js")
def get_sw():
    return Response(content=SW_CODE, media_type="application/javascript", headers={"Service-Worker-Allowed": "/"})
