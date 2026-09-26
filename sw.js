/* ============================== service worker (offline) ============================== */
/* Network-first: online always gets fresh files, offline falls back to cache.
   Bump VERSION when ASSETS changes (new/renamed file) to drop the old cache. */
const VERSION='td-v1';
const ASSETS=[
  './','index.html','manifest.webmanifest',
  'icon-192.png','icon-512.png','apple-touch-icon.png',
  'js/main.js','js/state.js','js/config.js','js/board.js','js/mapgen.js','js/mapsel.js',
  'js/render.js','js/update.js','js/combat.js','js/towers.js','js/waves.js',
  'js/fx.js','js/audio.js','js/dom.js','js/input.js','js/util.js'
];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(VERSION).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==VERSION).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET'||new URL(req.url).origin!==location.origin) return;
  e.respondWith(
    fetch(req).then(res=>{
      if(res.ok){ const copy=res.clone(); caches.open(VERSION).then(c=>c.put(req,copy)); }
      return res;
    }).catch(()=>caches.match(req,{ignoreSearch:true})
      .then(hit=>hit||(req.mode==='navigate'?caches.match('index.html'):Response.error())))
  );
});
