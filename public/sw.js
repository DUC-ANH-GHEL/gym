self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  const data = event.data?.json?.() || {};
  const title = data.title || "T\u1edbi gi\u1edd t\u1eadp";
  const body = data.body || "Ngh\u1ec9 xong r\u1ed3i. V\u00e0o t\u1eadp ti\u1ebfp nh\u00e9.";
  const url = data.url || "/today";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url },
      tag: "workout-rest",
      renotify: true,
      requireInteraction: true,
      vibrate: [220, 90, 220, 90, 320],
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/today";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }

      return self.clients.openWindow(url);
    }),
  );
});
