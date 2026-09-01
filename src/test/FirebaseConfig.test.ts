import { describe, expect, it } from 'vitest';
import { getFirebaseApp, isFirebaseConfigured, getFirebaseConfig } from '../config/firebase';

describe('Firebase Web Push configuration', () => {
  it('correctly detects configured firebase credentials', () => {
    expect(isFirebaseConfigured()).toBe(true);
    const config = getFirebaseConfig();
    expect(config.projectId).toBe('aghbilia');
    expect(getFirebaseApp()).toBeDefined();
  });
});
