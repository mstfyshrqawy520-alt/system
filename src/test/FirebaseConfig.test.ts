import { describe, expect, it } from 'vitest';
import { getFirebaseApp, isFirebaseConfigured } from '../config/firebase';

describe('Firebase Web Push configuration', () => {
  it('validates active Firebase configuration for Ishbilia project', () => {
    expect(isFirebaseConfigured()).toBe(true);
    expect(getFirebaseApp()).toBeDefined();
  });
});
