import { getToken, onMessage, MessagePayload } from 'firebase/messaging';
import { getFirebaseConfig, getFirebaseMessaging, isFirebaseConfigured } from '../config/firebase';
import { apiClient } from '../api/client';

export type PushPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

/**
 * Check if the current browser/OS supports Web Push Notifications
 */
export const getPushSupportStatus = (): boolean => {
  return typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window;
};

/**
 * Get current browser notification permission status
 */
export const getPushPermissionState = (): PushPermissionState => {
  if (!getPushSupportStatus()) return 'unsupported';
  return Notification.permission;
};

/**
 * Register Service Worker for PWA and FCM
 */
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const config = getFirebaseConfig();
    const params = new URLSearchParams({
      apiKey: config.apiKey || '',
      authDomain: config.authDomain || '',
      projectId: config.projectId || '',
      storageBucket: config.storageBucket || '',
      messagingSenderId: config.messagingSenderId || '',
      appId: config.appId || '',
    });
    const registration = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${params.toString()}`, {
      scope: '/',
    });
    return registration;
  } catch (err) {
    console.warn('Service worker registration failed:', err);
    return null;
  }
};

/**
 * Request Push Notification Permission and Register FCM Device Token with backend
 */
export const requestAndRegisterPushToken = async (): Promise<{ success: boolean; token?: string; error?: string }> => {
  if (!getPushSupportStatus()) {
    return { success: false, error: 'المتصفح الحالي لا يدعم الإشعارات الفورية (Web Push).' };
  }

  if (!isFirebaseConfigured()) {
    return {
      success: false,
      error: 'الإشعارات الفورية غير مهيأة لهذه النسخة. استخدم إشعارات النظام الداخلية أو تواصل مع مسؤول النظام لتفعيل Firebase.',
    };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, error: 'تم رفض إذن الإشعارات من قبل المستخدم.' };
    }

    const swRegistration = await registerServiceWorker();
    const messaging = await getFirebaseMessaging();

    if (!messaging) {
      return { success: false, error: 'تعذر تشغيل خدمة Firebase Messaging في هذا المتصفح.' };
    }

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || 'BICSsZm8NiS8LQ1cCzaXTIby3b6fXoGYTGHt7h-CfdbBnm0cXJxSA2-GUFr91CgVnnzA-anvwKdMFE3XKYdVmlA';

    const token = await getToken(messaging, {
      serviceWorkerRegistration: swRegistration || undefined,
      vapidKey,
    });

    if (!token) {
      return { success: false, error: 'تعذر الحصول على رمز الجهاز (FCM Token).' };
    }

    // Determine device type
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const deviceType = isMobile ? 'mobile' : 'web';

    // Register token with backend
    await apiClient.post('/api/v1/notifications/device-token', {
      token,
      device_type: deviceType,
    });

    // Save locally
    localStorage.setItem('fcm_device_token', token);

    return { success: true, token };
  } catch (err: unknown) {
    const rawMessage = err instanceof Error ? err.message : '';
    const message = /api key|invalid_argument|installations\/request-failed/i.test(rawMessage)
      ? 'تعذر تفعيل الإشعارات الفورية لأن إعداد Firebase غير صالح أو غير مكتمل. تواصل مع مسؤول النظام.'
      : (rawMessage || 'حدث خطأ أثناء تفعيل الإشعارات الفورية.');
    return { success: false, error: message };
  }
};

/**
 * Unregister Push Token from backend on logout or disable
 */
export const unregisterPushToken = async (): Promise<void> => {
  const token = localStorage.getItem('fcm_device_token');
  if (!token) return;

  try {
    await apiClient.delete('/api/v1/notifications/device-token', {
      data: { token },
    });
    localStorage.removeItem('fcm_device_token');
  } catch {
    // Ignore network errors on logout cleanup
  }
};

/**
 * Listen for foreground push messages while the user has the app open
 */
export const onForegroundMessage = (callback: (payload: MessagePayload) => void): (() => void) => {
  let unsubscribe: (() => void) | null = null;

  getFirebaseMessaging().then((messaging) => {
    if (messaging) {
      unsubscribe = onMessage(messaging, (payload) => {
        callback(payload);
      });
    }
  });

  return () => {
    if (unsubscribe) unsubscribe();
  };
};
