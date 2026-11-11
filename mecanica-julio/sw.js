/* Service worker: deixa o app abrir sem internet e atualiza em segundo plano */
const VERSAO = 'mj-v1';
const ARQUIVOS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/util.js',
  './js/store.js',
  './js/ui.js',
  './js/view-painel.js',
  './js/view-agenda.js',
  './js/view-notas.js',
  './js/view-clientes.js',
  './js/view-catalogo.js',
  './js/view-config.js',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== VERSAO && k !== 'mj-fontes').map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // fontes do Google: guarda na primeira vez e usa do cache depois
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open('mj-fontes').then((c) =>
        c.match(req).then(
          (hit) =>
            hit ||
            fetch(req).then((res) => {
              if (res.ok || res.type === 'opaque') c.put(req, res.clone());
              return res;
            })
        )
      )
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // arquivos do app: responde do cache na hora e busca a versão nova em segundo plano
  e.respondWith(
    caches.open(VERSAO).then((c) =>
      c.match(req, { ignoreSearch: req.mode === 'navigate' }).then((hit) => {
        const rede = fetch(req)
          .then((res) => {
            if (res.ok) c.put(req, res.clone());
            return res;
          })
          .catch(() => hit || (req.mode === 'navigate' ? c.match('./index.html') : undefined));
        return hit || rede;
      })
    )
  );
});
