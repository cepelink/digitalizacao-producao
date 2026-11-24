/* Service worker do app de PRODUÇÃO CEPE.
   - Cache com prefixo próprio ("producao-cepe-"): não mexe nos caches de outros apps do mesmo domínio (ex.: GRD).
   - Só atende requisições deste app (mesma origem, dentro da pasta do app). Firebase, fontes etc. passam direto. */
const PREFIXO = 'producao-cepe-';
const CACHE = PREFIXO + 'v1';
const ESCOPO = self.registration.scope;          // ex.: https://usuario.github.io/nome-do-repo/
const ARQUIVOS = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(ARQUIVOS.map(a => c.add(a).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(nomes => Promise.all(
        nomes.filter(n => n.startsWith(PREFIXO) && n !== CACHE).map(n => caches.delete(n))   // só apaga os do próprio app
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith(ESCOPO)) return;   // outros apps/domínios: não interceptar

  // Páginas: tenta a rede primeiro (sempre a versão mais nova) e usa o cache se estiver sem internet
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(req, c)); return r; })
                .catch(() => caches.match(req).then(r => r || caches.match('index.html')))
    );
    return;
  }
  // Demais arquivos do app: cache primeiro, atualizando em segundo plano
  e.respondWith(
    caches.match(req).then(emCache => {
      const rede = fetch(req).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(req, c)); return r; }).catch(() => emCache);
      return emCache || rede;
    })
  );
});
