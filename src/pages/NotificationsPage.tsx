import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getNotificationsApi,
  getUnreadNotificationCountApi,
  markAllNotificationsAsReadApi,
  markNotificationAsReadApi,
} from '../api/notifications';
import { Notification } from '../types/notification';
import ErrorMessage from '../components/ErrorMessage';
import { TableSkeleton } from '../components/ui/StateFeedback';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { parseApiError } from '../utils/apiError';
import { PushNotificationPrompt } from '../components/notifications/PushNotificationPrompt';
import { getPrimaryRoleSlug, AppRoleSlug } from '../routes/roleRouting';
import { resolveNotificationAction } from '../utils/notificationRouting';

export type NotificationActionStatus = 'needs_action' | 'opened' | 'resolved' | 'archived';

interface StoredActionState {
  status: NotificationActionStatus;
  updatedAt: string;
}

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const primaryRole = getPrimaryRoleSlug(user);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState<'NEEDS_ACTION' | 'OPENED' | 'RESOLVED' | 'ALL'>('NEEDS_ACTION');
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState<boolean>(false);
  const [actionStates, setActionStates] = useState<Record<number, StoredActionState>>({});

  const storageKey = `ashbiliya_notif_states_${user?.id || 'guest'}`;

  // Load action states from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setActionStates(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, [storageKey]);

  const saveActionState = (id: number, status: NotificationActionStatus) => {
    setActionStates((prev) => {
      const updated = {
        ...prev,
        [id]: { status, updatedAt: new Date().toISOString() },
      };
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  // Helper to determine item action status
  const getItemStatus = (notification: Notification): NotificationActionStatus => {
    if (actionStates[notification.id]) {
      return actionStates[notification.id].status;
    }

    // Default determination
    const action = resolveNotificationAction(notification, user);
    const isActionableType =
      notification.type?.includes('submitted') ||
      notification.type?.includes('pending') ||
      notification.type?.includes('review') ||
      notification.type?.includes('quote') ||
      notification.type?.includes('approval');

    if (isActionableType) {
      return notification.read_at ? 'opened' : 'needs_action';
    }

    return notification.read_at ? 'archived' : 'opened';
  };

  const loadNotificationsData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, count] = await Promise.all([
        getNotificationsApi(),
        getUnreadNotificationCountApi().catch(() => undefined),
      ]);
      const list = data || [];
      setNotifications(list);
      const calculatedUnread = list.filter((n) => !n.read_at).length;
      setUnreadCount(count !== undefined ? count : calculatedUnread);
    } catch (err: any) {
      const parsed = parseApiError(err);
      setError(parsed.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadNotificationsData();

    const handleRealtimeNotification = (event: Event) => {
      const notification = (event as CustomEvent<Notification>).detail;
      if (!notification) return;
      setNotifications((current) => [notification, ...current.filter((n) => n.id !== notification.id)]);
      if (!notification.read_at) setUnreadCount((current) => current + 1);
    };

    const handleNotificationsUpdated = () => {
      void loadNotificationsData();
    };

    window.addEventListener('notification-received', handleRealtimeNotification as EventListener);
    window.addEventListener('notifications-updated', handleNotificationsUpdated);
    return () => {
      window.removeEventListener('notification-received', handleRealtimeNotification as EventListener);
      window.removeEventListener('notifications-updated', handleNotificationsUpdated);
    };
  }, []);

  const handleNotificationClick = async (notification: Notification) => {
    const { url } = resolveNotificationAction(notification, user);

    // Mark read
    if (!notification.read_at) {
      try {
        await markNotificationAsReadApi(notification.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        window.dispatchEvent(new CustomEvent('notifications-updated'));
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
      }
    }

    // Set opened status if was needs_action
    if (getItemStatus(notification) === 'needs_action') {
      saveActionState(notification.id, 'opened');
    }

    navigate(url);
  };

  const handleMarkResolved = (e: React.MouseEvent, notification: Notification) => {
    e.stopPropagation();
    saveActionState(notification.id, 'resolved');
    if (!notification.read_at) {
      void markNotificationAsReadApi(notification.id).catch(() => {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  const handleArchive = (e: React.MouseEvent, notification: Notification) => {
    e.stopPropagation();
    saveActionState(notification.id, 'archived');
    if (!notification.read_at) {
      void markNotificationAsReadApi(notification.id).catch(() => {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    setMarkingAll(true);
    try {
      await markAllNotificationsAsReadApi();
      const readAt = new Date().toISOString();
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || readAt })));
      setUnreadCount(0);
      window.dispatchEvent(new CustomEvent('notifications-updated'));
    } catch (err: any) {
      const parsed = parseApiError(err);
      setError(parsed.message);
    } finally {
      setMarkingAll(false);
    }
  };

  // Group notifications by action status
  const groupedNotifications = useMemo(() => {
    const needsAction: Notification[] = [];
    const opened: Notification[] = [];
    const resolved: Notification[] = [];
    const all: Notification[] = notifications;

    notifications.forEach((n) => {
      const status = getItemStatus(n);
      if (status === 'needs_action') needsAction.push(n);
      else if (status === 'opened') opened.push(n);
      else if (status === 'resolved') resolved.push(n);
    });

    return { needsAction, opened, resolved, all };
  }, [notifications, actionStates]);

  const displayedList = useMemo(() => {
    switch (activeTab) {
      case 'NEEDS_ACTION':
        return groupedNotifications.needsAction;
      case 'OPENED':
        return groupedNotifications.opened;
      case 'RESOLVED':
        return groupedNotifications.resolved;
      case 'ALL':
      default:
        return groupedNotifications.all;
    }
  }, [activeTab, groupedNotifications]);

  if (loading) {
    return (
      <div className="space-y-6" dir="rtl">
        <div className="border-b border-slate-800 pb-4">
          <div className="h-7 w-48 animate-pulse rounded-lg bg-slate-800" />
          <div className="mt-3 h-4 w-72 animate-pulse rounded-lg bg-slate-800/70" />
        </div>
        <TableSkeleton rows={6} columns={3} />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-100 flex items-center gap-2">
            <span>🔔</span>
            <span>مركز الإشعارات والقرارات التنفيذية</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            متابعة حالة الإجراءات والقرارات المطلوبة مع الفصل التام بين الاطلاع وإنجاز الإجراء.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
              isLoading={markingAll}
              className="text-xs"
            >
              تحديد الكل كمقروء ({unreadCount})
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={loadNotificationsData}
            className="text-xs"
          >
            🔄 تحديث
          </Button>
        </div>
      </div>

      {error && <ErrorMessage error={error} />}

      {/* Push Notification Device Settings Prompt */}
      <PushNotificationPrompt variant="card" />

      {/* Status Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('NEEDS_ACTION')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
            activeTab === 'NEEDS_ACTION'
              ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/40'
              : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <span>⚡ مطلوب إجراء منك</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === 'NEEDS_ACTION'
                ? 'bg-slate-950/80 text-cyan-300'
                : groupedNotifications.needsAction.length > 0
                ? 'bg-rose-500 text-white animate-pulse'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {groupedNotifications.needsAction.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('OPENED')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'OPENED'
              ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/40'
              : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <span>👁️ قيد المتابعة والاطلاع</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300">
            {groupedNotifications.opened.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('RESOLVED')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'RESOLVED'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
              : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <span>✅ تم اتخاذ الإجراء (منجزة)</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800/60">
            {groupedNotifications.resolved.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ALL')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'ALL'
              ? 'bg-slate-700 text-white shadow-lg'
              : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <span>🗄️ الأرشيف والسجل الكامل</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-400">
            {groupedNotifications.all.length}
          </span>
        </button>
      </div>

      {/* Notifications List */}
      {displayedList.length > 0 ? (
        <div className="space-y-3">
          {displayedList.map((notification) => {
            const action = resolveNotificationAction(notification, user);
            const status = getItemStatus(notification);
            const isUnread = !notification.read_at;

            return (
              <Card
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all border ${
                  status === 'needs_action'
                    ? 'border-cyan-500/70 bg-gradient-to-r from-slate-900 via-slate-900/95 to-cyan-950/20 shadow-lg shadow-cyan-950/30'
                    : status === 'resolved'
                    ? 'border-emerald-800/60 bg-slate-900/70'
                    : 'border-slate-800 bg-slate-900/80'
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl border shadow-inner ${
                      status === 'needs_action'
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40'
                        : status === 'resolved'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {action.icon}
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-slate-100">{notification.title}</h3>
                      {status === 'needs_action' && (
                        <span className="rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 text-[10px] font-black">
                          ⚡ يتطلب قرارك
                        </span>
                      )}
                      {status === 'resolved' && (
                        <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold">
                          ✅ تم إنجاز الإجراء
                        </span>
                      )}
                      {isUnread && (
                        <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                      )}
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">{notification.message}</p>

                    <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400 flex-wrap font-mono">
                      <span>{notification.created_at ? notification.created_at.slice(0, 16).replace('T', ' ') : ''}</span>
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-400 border border-slate-700 font-sans">
                        {action.badgeLabel}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Direct Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
                  <Button
                    variant={status === 'needs_action' ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleNotificationClick(notification);
                    }}
                    className="text-xs font-bold"
                  >
                    <span>{action.actionLabel}</span>
                    <span className="mr-1">←</span>
                  </Button>

                  {status !== 'resolved' && (
                    <button
                      type="button"
                      onClick={(e) => handleMarkResolved(e, notification)}
                      className="rounded-xl border border-emerald-800/60 bg-emerald-950/40 px-2.5 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-900/60 transition-colors cursor-pointer"
                      title="تعليم هذا الإشعار كمنجز ومكتمل"
                    >
                      ✓ تم البت
                    </button>
                  )}

                  {status !== 'archived' && (
                    <button
                      type="button"
                      onClick={(e) => handleArchive(e, notification)}
                      className="rounded-xl border border-slate-700 bg-slate-800/80 p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer"
                      title="أرشفة الإشعار"
                    >
                      🗄️
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-12 text-center text-slate-400 space-y-3 border border-slate-800 bg-slate-900/60">
          <span className="text-4xl block">
            {activeTab === 'NEEDS_ACTION' ? '🎉' : activeTab === 'RESOLVED' ? '📋' : '📭'}
          </span>
          <p className="text-base font-bold text-slate-200">
            {activeTab === 'NEEDS_ACTION'
              ? 'لا توجد إشعارات تتطلب إجراءً منك حالياً!'
              : activeTab === 'RESOLVED'
              ? 'لا توجد إشعارات منجزة في هذا التبويب'
              : 'لا توجد إشعارات في هذا السجل'}
          </p>
          <p className="text-xs text-slate-500">
            {activeTab === 'NEEDS_ACTION'
              ? 'كافة المعاملات والموافقات السابقة تم البت فيها بنجاح.'
              : 'يمكنك التبديل بين التبويبات أعلاه للاطلاع على الأرشيف أو الإجراءات السابقة.'}
          </p>
        </Card>
      )}
    </div>
  );
};

export default NotificationsPage;
