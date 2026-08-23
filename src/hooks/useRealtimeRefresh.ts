import { useEffect, useRef } from 'react';

/**
 * Triggers a global app event informing all open components that data has been mutated.
 */
export const emitAppDataUpdated = (scope?: string) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('app-data-updated', { detail: { scope } }));
};

/**
 * Custom hook that automatically triggers a silent refresh callback when:
 * 1. A realtime notification is received (`notification-received` event).
 * 2. An in-app data mutation occurs (`app-data-updated` event).
 * 3. The browser tab regains focus or visibility (`visibilitychange` / `focus`).
 * 4. Every `intervalMs` (default 10s) as a gentle background heartbeat.
 */
export const useRealtimeRefresh = (
  refreshFn: () => void | Promise<void>,
  options: {
    intervalMs?: number;
    enabled?: boolean;
  } = {}
) => {
  const { intervalMs = 10000, enabled = true } = options;
  const refreshRef = useRef(refreshFn);
  refreshRef.current = refreshFn;

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const triggerRefresh = () => {
      try {
        void refreshRef.current();
      } catch (err) {
        console.warn('Realtime refresh error:', err);
      }
    };

    // 1. Realtime notification received
    const onNotification = () => triggerRefresh();
    window.addEventListener('notification-received', onNotification);

    // 2. Custom in-app mutation event
    const onDataUpdated = () => triggerRefresh();
    window.addEventListener('app-data-updated', onDataUpdated);

    // 3. Tab visibility & focus
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        triggerRefresh();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', triggerRefresh);

    // 4. Background heartbeat timer while tab is active
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        triggerRefresh();
      }
    }, intervalMs);

    return () => {
      window.removeEventListener('notification-received', onNotification);
      window.removeEventListener('app-data-updated', onDataUpdated);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', triggerRefresh);
      window.clearInterval(timer);
    };
  }, [enabled, intervalMs]);
};

export default useRealtimeRefresh;
