// Firebase Cloud Messaging Service Worker for Background Push Notifications
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

// The app passes the public Firebase Web config in the service-worker URL.
// No fallback or dummy API key is used. Background push stays disabled until
// a valid Firebase configuration is supplied at build time.
const params = new URL(self.location.href).searchParams;
const firebaseConfig = {
  apiKey: params.get('apiKey') || '',
  authDomain: params.get('authDomain') || '',
  projectId: params.get('projectId') || '',
  storageBucket: params.get('storageBucket') || '',
  messagingSenderId: params.get('messagingSenderId') || '',
  appId: params.get('appId') || '',
};

const isConfigured = Object.values(firebaseConfig).every((value) => (
  value && !/dummy|placeholder|your_|000000000000/i.test(value)
));

try {
  if (isConfigured && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  if (isConfigured) {
    const messaging = firebase.messaging();
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
  }
} catch (error) {
  // Keep the internal Laravel/SSE notifications available when Firebase is absent.
  console.warn('Firebase background messaging is unavailable.', error);
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
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});
