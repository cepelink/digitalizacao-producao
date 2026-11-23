/* Service worker — Controle de Produção CEPE
   Ao publicar uma nova versão do app, troque o número em VERSAO para os aparelhos atualizarem. */
const VERSAO = 'cepe-producao-v12';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];
const HOSTS_FONTES = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(VERSAO).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSAO).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});
self.addEventListener('fetch', e=>{
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);

  // Fontes do Google: usa cache e atualiza em segundo plano
  if(HOSTS_FONTES.includes(url.hostname)){
    e.respondWith(caches.open(VERSAO).then(async c=>{
      const guardado = await c.match(req);
      const rede = fetch(req).then(r=>{ if(r.ok) c.put(req, r.clone()); return r; }).catch(()=>guardado);
      return guardado || rede;
    }));
    return;
  }
  // Só o próprio app. Banco de dados (Firebase) nunca passa pelo cache.
  if(url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(req).then(r=>{
      if(r.ok){ const copia = r.clone(); caches.open(VERSAO).then(c=>c.put(req, copia)); }
      return r;
    }).catch(()=>caches.match(req).then(r=> r || (req.mode==='navigate' ? caches.match('./index.html') : undefined)))
  );
});
