const CACHE = 'world-birthday-v2';
const CORE = [
	'./',
	'./index.html',
	'./styles.css',
	'./app.js',
	'./manifest.webmanifest',
	'./data/countries.json',
	'./data/world.geojson',
	'./icons/icon.svg',
	'./icons/icon-192.png',
	'./icons/icon-512.png',
	'./icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
	event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)));
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then((keys) =>
			Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
		)
	);
	self.clients.claim();
});

self.addEventListener('fetch', (event) => {
	const request = event.request;

	if (request.method !== 'GET') {
		return;
	}

	const isNavigation = request.mode === 'navigate';

	event.respondWith(
		caches.match(request).then((cached) => {
			if (cached) {
				return cached;
			}

			return fetch(request)
				.then((response) => {
					if (!response || response.status !== 200 || response.type === 'error') {
						return response;
					}

					const copy = response.clone();
					caches.open(CACHE).then((cache) => cache.put(request, copy));
					return response;
				})
				.catch(() => {
					if (isNavigation) {
						return caches.match('./index.html');
					}
					return new Response('', { status: 503, statusText: 'Offline' });
				});
		})
	);
});