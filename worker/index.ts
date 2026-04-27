/// <reference lib="webworker" />
// worker/index.ts — Custom service worker additions for @ducanh2912/next-pwa

self.addEventListener("push", (event) => {
  const pushEvent = event as PushEvent;
  const data = pushEvent.data?.json() as { title?: string; body?: string; url?: string } ?? {};
  pushEvent.waitUntil(
    self.registration.showNotification(data.title ?? "Streaks", {
      body: data.body ?? "",
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-72x72.png",
      data: { url: data.url ?? "/today" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  const clickEvent = event as NotificationEvent;
  clickEvent.notification.close();
  const url: string = (clickEvent.notification.data as { url?: string })?.url ?? "/today";
  clickEvent.waitUntil(clients.openWindow(url));
});
