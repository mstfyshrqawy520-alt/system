import { describe, expect, it } from 'vitest';
import { getFirebaseApp, isFirebaseConfigured } from '../config/firebase';

describe('Firebase Web Push configuration', () => {
  it('does not use dummy configuration when environment values are missing', () => {
    expect(isFirebaseConfigured()).toBe(false);
    expect(() => getFirebaseApp()).toThrow('FIREBASE_NOT_CONFIGURED');
  });
});
