import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getNotificationsApi,
  getUnreadNotificationCountApi,
  markAllNotificationsAsReadApi,
  markNotificationAsReadApi,
  startNotificationsRealtime,
  stopNotificationsRealtime,
} from '../../api/notifications';
import { Notification } from '../../types/notification';
import { useAuth } from '../../context/AuthContext';
import { resolveNotificationAction } from '../../utils/notificationRouting';

export const NotificationBell: React.FC = () => {
  const { user } = useAuth();
  const [count, setCount] = useState<number>(0);
  const [recentNotifications, setRecentNotifications] = useState<Notification[]>([]);
  const [latestToast, setLatestToast] = useState<Notification | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const fetchUnreadData = async () => {
    try {
      const [unreadCount, list] = await Promise.all([
        getUnreadNotificationCountApi().catch(() => 0),
        getNotificationsApi().catch(() => []),
      ]);
      setCount(unreadCount);
      setRecentNotifications((list || []).slice(0, 6));
    } catch {
      // Keep silent on transient connection issues
    }
  };

  useEffect(() => {
    let mounted = true;
    void fetchUnreadData();

    const handleReceived = (event: Event) => {
      const notification = (event as CustomEvent<Notification>).detail;
      if (!notification || !mounted) return;

      setLatestToast(notification);
      setRecentNotifications((prev) => [notification, ...prev.filter((n) => n.id !== notification.id)].slice(0, 6));
      setCount((current) => current + (notification.read_at ? 0 : 1));

      window.setTimeout(() => {
        if (mounted) setLatestToast(null);
      }, 7000);
    };

    const handleUpdated = () => {
      void fetchUnreadData();
    };

    startNotificationsRealtime();
    window.addEventListener('notification-received', handleReceived as EventListener);
    window.addEventListener('notifications-updated', handleUpdated);
    window.addEventListener('app-data-updated', handleUpdated);

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      mounted = false;
      stopNotificationsRealtime();
      window.removeEventListener('notification-received', handleReceived as EventListener);
      window.removeEventListener('notifications-updated', handleUpdated);
      window.removeEventListener('app-data-updated', handleUpdated);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleNotificationClick = async (notification: Notification) => {
    setLatestToast(null);
    setDropdownOpen(false);

    // Resolve target route
    const { url } = resolveNotificationAction(notification, user);

    // Mark as read in background
    if (!notification.read_at) {
      try {
        await markNotificationAsReadApi(notification.id);
        setCount((prev) => Math.max(0, prev - 1));
        setRecentNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n))
        );
        window.dispatchEvent(new CustomEvent('notifications-updated'));
      } catch (err) {
        console.error('Error marking notification as read:', err);
      }
    }

    navigate(url);
  };

  const handleMarkAllRead = async () => {
    if (count === 0) return;
    setLoading(true);
    try {
      await markAllNotificationsAsReadApi();
      setCount(0);
      setRecentNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: new Date().toISOString() }))
      );
      window.dispatchEvent(new CustomEvent('notifications-updated'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setDropdownOpen((prev) => !prev)}
        className="relative flex min-h-11 min-w-11 items-center justify-center rounded-xl p-2 text-slate-400 hover:bg-slate-800/80 hover:text-cyan-300 transition-colors"
        aria-label="الإشعارات والتنبيهات"
        title="الإشعارات والتنبيهات"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center animate-pulse shadow-lg shadow-rose-600/40">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {/* Realtime Toast Popover */}
      {latestToast && !dropdownOpen && (
        <div
          className="absolute left-0 top-12 z-50 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border-2 border-cyan-500/80 bg-slate-950 p-4 text-right shadow-2xl animate-fade-in backdrop-blur-md"
          dir="rtl"
        >
          <div className="flex items-center justify-between border-b border-cyan-900/50 pb-2">
            <span className="flex items-center gap-1.5 text-xs font-black text-cyan-300">
              <span>⚡</span> إشعار عاجل جديد
            </span>
            <button
              type="button"
              onClick={() => setLatestToast(null)}
              className="text-slate-400 hover:text-white text-xs font-bold"
            >
              ×
            </button>
          </div>
          <p className="mt-2 text-sm font-bold text-slate-100">{latestToast.title}</p>
          <p className="mt-1 text-xs leading-5 text-slate-300 line-clamp-2">{latestToast.message}</p>
          <div className="mt-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => handleNotificationClick(latestToast)}
              className="flex-1 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-black text-white hover:bg-cyan-500 transition-colors shadow-md shadow-cyan-900/30 text-center"
            >
              {resolveNotificationAction(latestToast, user).actionLabel} ←
            </button>
          </div>
        </div>
      )}

      {/* Interactive Notifications Dropdown */}
      {dropdownOpen && (
        <div
          className="absolute left-0 top-12 z-50 w-[min(24rem,calc(100vw-1.5rem))] rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden animate-fade-in text-right"
          dir="rtl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/90 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-slate-100">الإشعارات والتنبيهات</span>
              {count > 0 && (
                <span className="rounded-full bg-rose-500/20 text-rose-300 border border-rose-600/40 px-2 py-0.5 text-[10px] font-bold">
                  {count} جديد
                </span>
              )}
            </div>
            {count > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={loading}
                className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 disabled:opacity-50"
              >
                تحديد الكل كمقروء
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-800/60">
            {recentNotifications.length > 0 ? (
              recentNotifications.map((n) => {
                const action = resolveNotificationAction(n, user);
                const isUnread = !n.read_at;

                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`p-3.5 hover:bg-slate-800/70 transition-colors cursor-pointer space-y-2 ${
                      isUnread ? 'bg-cyan-950/20 border-r-4 border-cyan-400' : 'bg-slate-900/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{action.icon}</span>
                        <span className="text-xs font-bold text-slate-100">{n.title}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 shrink-0">
                        {n.created_at ? n.created_at.slice(11, 16) : ''}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-5 line-clamp-2">{n.message}</p>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                        {action.badgeLabel}
                      </span>
                      <span className="text-xs font-bold text-cyan-400 flex items-center gap-1 group-hover:underline">
                        <span>{action.actionLabel}</span>
                        <span>←</span>
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-xs text-slate-500">
                <span className="text-2xl block mb-2">📭</span>
                لا توجد إشعارات حالياً
              </div>
            )}
          </div>

          {/* Footer Link */}
          <div className="border-t border-slate-800 bg-slate-950/80 p-2.5 text-center">
            <button
              type="button"
              onClick={() => {
                setDropdownOpen(false);
                navigate('/notifications');
              }}
              className="w-full text-xs font-bold text-slate-300 hover:text-cyan-400 transition-colors py-1"
            >
              عرض مركز الإشعارات الكامل ←
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
