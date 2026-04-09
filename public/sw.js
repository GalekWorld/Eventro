self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      const subscription = await self.registration.pushManager.getSubscription();
      if (!subscription) {
        return;
      }

      const response = await fetch(`/api/push/pending?endpoint=${encodeURIComponent(subscription.endpoint)}`, {
        credentials: "include",
        cache: "no-store",
      }).catch(() => null);

      if (!response || response.status === 204 || !response.ok) {
        return;
      }

      const notification = await response.json().catch(() => null);
      if (!notification?.title) {
        return;
      }

      await self.registration.showNotification(notification.title, {
        body: notification.body || "",
        tag: notification.id,
        data: {
          link: notification.link || "/notifications",
        },
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.link || "/notifications";

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const absoluteUrl = new URL(targetUrl, self.location.origin).toString();

      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(absoluteUrl);
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(absoluteUrl);
      }
    })(),
  );
});
