import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUnreadNotificationCountApi, markAllNotificationsAsReadApi, startNotificationsRealtime, stopNotificationsRealtime } from '../../api/notifications';
import { Notification } from '../../types/notification';

export const NotificationBell: React.FC = () => {
  const [count, setCount] = useState<number>(0);
  const [latest, setLatest] = useState<Notification | null>(null);
  const [opening, setOpening] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    const fetchUnreadCount = async () => {
      try {
        const unread = await getUnreadNotificationCountApi();
        if (mounted) setCount(unread);
      } catch {
        // The bell remains usable while the API reconnects.
      }
    };

    const handleReceived = (event: Event) => {
      const notification = (event as CustomEvent<Notification>).detail;
      if (!notification || !mounted) return;
      setLatest(notification);
      setCount((current) => current + (notification.read_at ? 0 : 1));
      window.setTimeout(() => mounted && setLatest(null), 6000);
    };

    const handleUpdated = () => { void fetchUnreadCount(); };
    void fetchUnreadCount();
    startNotificationsRealtime();
    window.addEventListener('notification-received', handleReceived as EventListener);
    window.addEventListener('notifications-updated', handleUpdated);
    return () => {
      mounted = false;
      stopNotificationsRealtime();
      window.removeEventListener('notification-received', handleReceived as EventListener);
      window.removeEventListener('notifications-updated', handleUpdated);
    };
  }, []);

  const handleOpenNotifications = async () => {
    setOpening(true);
    // Optimistic UI: the badge must clear immediately when the menu is opened.
    setCount(0);
    setLatest(null);
    window.dispatchEvent(new CustomEvent('notifications-marked-all'));
    // Navigate immediately; the server synchronization must not delay opening the page.
    navigate('/notifications');
    try {
      await markAllNotificationsAsReadApi();
      window.dispatchEvent(new CustomEvent('notifications-updated'));
    } catch {
      // Keep the optimistic zero while the API reconnects.
    } finally {
      setOpening(false);
    }
  };

  return (
    <div className="relative">
      <button type="button" onClick={handleOpenNotifications} disabled={opening} className="relative flex min-h-11 min-w-11 items-center justify-center rounded-xl p-2 text-slate-400 hover:bg-slate-800/60 hover:text-cyan-400 transition-colors disabled:cursor-wait disabled:opacity-70" aria-label="الإشعارات" aria-busy={opening}>
        {opening ? <span className="text-[10px] font-bold text-cyan-300">...</span> : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>}
        {count > 0 && <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">{count > 99 ? '99+' : count}</span>}
      </button>
      {latest && (
        <button type="button" onClick={handleOpenNotifications} disabled={opening} className="absolute left-0 top-12 z-50 w-[min(18rem,calc(100vw-2rem))] rounded-xl border border-cyan-700/70 bg-slate-900 p-3 text-right shadow-2xl disabled:cursor-wait" aria-live="polite">
          <p className="text-xs font-black text-cyan-300">إشعار جديد</p>
          <p className="mt-1 text-sm font-bold text-slate-100">{latest.title}</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">{latest.message}</p>
          <span className="mt-2 inline-block text-[10px] text-cyan-400">فتح الإشعارات ←</span>
        </button>
      )}
    </div>
  );
};

export default NotificationBell;
