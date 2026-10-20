self.addEventListener('message', event => {
  const data = event.data || {};
  if (data.type !== 'nusa-notification') return;
  const rawUrl = String(data.url || 'notifications.html');
  const url = new URL(rawUrl.startsWith('Html/') ? rawUrl : `Html/${rawUrl}`, self.registration.scope).href;
  event.waitUntil(self.registration.showNotification(data.title || 'Nusa Karsa Event', {
    body: data.body || 'Ada pembaruan pembayaran.',
    icon: new URL('assets/logo3.0.png', self.registration.scope).href,
    badge: new URL('assets/logo3.0.png', self.registration.scope).href,
    tag: `nusa-karsa-${data.id}`,
    data: { url },
    silent: false,
    vibrate: [180, 90, 180]
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = event.notification.data && event.notification.data.url;
  if (!target) return;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
    for (const client of clients) {
      if ('focus' in client) { client.navigate(target); return client.focus(); }
    }
    return self.clients.openWindow(target);
  }));
});