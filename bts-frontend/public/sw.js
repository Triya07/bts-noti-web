

self.addEventListener("push", (event) => {
  const data = event.data?.json() || {};

  const title = data.title || "BTS is LIVE!";
  const options = {
    body: data.body || "Someone just reported BTS is live on Weverse!",
    icon: "/purple-heart1.png",
    badge: "/purple-heart1.png",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});



// ==== sw.js ====
// Place this in /public/sw.js
self.addEventListener("push", (event) => {
  const data = event.data.json();
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: data.icon,
  });
});

