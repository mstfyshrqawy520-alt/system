// Firebase Cloud Messaging Service Worker for Background Push Notifications
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

// Initialize Firebase inside the Service Worker
// In production, these can be set via environment or default to project config
const firebaseConfig = {
  apiKey: "AIzaSyDummyKeyForSwFallbackOnly",
  projectId: "al-ashbiliya-procurement",
  messagingSenderId: "100000000000",
  appId: "1:100000000000:web:dummy"
};

try {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  const messaging = firebase.messaging();

  // Background message handler
  messaging.onBackgroundMessage((payload) => {
    const notificationTitle = payload.notification?.title || payload.data?.title || 'إشعار جديد في نظام المشتريات';
    const notificationOptions = {
      body: payload.notification?.body || payload.data?.body || 'لديك تحديث جديد على أحد طلبات الشراء أو الفواتير.',
      icon: payload.notification?.icon || '/favicon.svg',
      badge: '/favicon.svg',
      dir: 'rtl',
      lang: 'ar',
      vibrate: [200, 100, 200],
      data: {
        url: payload.data?.url || payload.notification?.click_action || '/notifications',
        ...payload.data,
      },
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (e) {
  // Graceful fallback for non-firebase push events
}

// Push notification click handler - opens the window or focuses open tab
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/notifications';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});
