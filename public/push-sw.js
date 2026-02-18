self.addEventListener('install', (event) => {
  // Activate immediately to ensure push works right after subscription
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (err) {
    data = {};
  }

  const title = data.title || 'Nueva notificación';
  const body = data.body || '';
  const url = data.url || '/';

  const options = {
    body,
    data: { url },
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    renotify: false,
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || '/';

  event.waitUntil(
    (async () => {
      const clientsArr = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const matchingClient = clientsArr.find((client) => client.url.includes(targetUrl));

      if (matchingClient) {
        matchingClient.focus();
        matchingClient.navigate(targetUrl);
      } else {
        await self.clients.openWindow(targetUrl);
      }
    })()
  );
});
