import { initializeApp, getApps, FirebaseApp, FirebaseOptions } from 'firebase/app';
import { getMessaging, Messaging, isSupported } from 'firebase/messaging';

const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const requiredConfigKeys: Array<keyof FirebaseOptions> = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
];

const isPlaceholder = (value: unknown): boolean => {
  if (typeof value !== 'string') return true;
  return /dummy|placeholder|your_|000000000000/i.test(value) || value.trim().length === 0;
};

export const isFirebaseConfigured = (): boolean => {
  return requiredConfigKeys.every((key) => !isPlaceholder(firebaseConfig[key]));
};

export const getFirebaseConfig = (): FirebaseOptions => firebaseConfig;

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

export const getFirebaseApp = (): FirebaseApp => {
  if (!isFirebaseConfigured()) {
    throw new Error('FIREBASE_NOT_CONFIGURED');
  }

  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  return app;
};

export const getFirebaseMessaging = async (): Promise<Messaging | null> => {
  if (typeof window === 'undefined' || !isFirebaseConfigured()) return null;

  try {
    const supported = await isSupported();
    if (!supported) return null;

    if (!messaging) {
      const fbApp = getFirebaseApp();
      messaging = getMessaging(fbApp);
    }
    return messaging;
  } catch {
    return null;
  }
};
