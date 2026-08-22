import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getMessaging, Messaging, isSupported } from 'firebase/messaging';

// Firebase configuration using Vite environment variables with safe defaults
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDummyKeyForDevelopmentConfig',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'al-ashbiliya-procurement.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'al-ashbiliya-procurement',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'al-ashbiliya-procurement.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '100000000000',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:100000000000:web:dummy',
};

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

export const getFirebaseApp = (): FirebaseApp => {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  return app;
};

export const getFirebaseMessaging = async (): Promise<Messaging | null> => {
  if (typeof window === 'undefined') return null;

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
