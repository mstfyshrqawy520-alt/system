import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getNotificationsApi,
  getUnreadNotificationCountApi,
  markAllNotificationsAsReadApi,
  markNotificationAsReadApi,
} from '../api/notifications';
import { Notification, NotificationCategory } from '../types/notification';
import ErrorMessage from '../components/ErrorMessage';
import { TableSkeleton } from '../components/ui/StateFeedback';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { parseApiError } from '../utils/apiError';
import { PushNotificationPrompt } from '../components/notifications/PushNotificationPrompt';
import {
  resolveNotificationAction,
  isActionRequiredForUser,
  isAllowedNotificationForUser,
  extractDocumentInfo,
  NotificationActionRoute,
} from '../utils/notificationRouting';

export type QuickFilterKey = 'ALL' | 'UNREAD' | 'READ' | 'TODAY' | 'LAST_10_DAYS' | 'NEEDS_ACTION' | 'COMPLETED' | 'RETURNED';

interface StoredActionState {
  status: 'needs_action' | 'executing' | 'resolved' | 'failed' | 'archived';
  updatedAt: string;
  errorMessage?: string;
  successMessage?: string;
}

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState<NotificationCategory>('ACTION_REQUIRED');
  const [quickFilter, setQuickFilter] = useState<QuickFilterKey>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState<boolean>(false);
  const [actionStates, setActionStates] = useState<Record<number, StoredActionState>>({});
  const [executingId, setExecutingId] = useState<number | null>(null);

  const storageKey = `ashbiliya_notif_states_${user?.id || 'guest'}`;
  const prefsStorageKey = `ashbiliya_notif_prefs_${user?.id || 'guest'}`;

  // Load action states and preferences from localStorage
  useEffect(() => {
    try {
      const savedStates = localStorage.getItem(storageKey);
      if (savedStates) {
        setActionStates(JSON.parse(savedStates));
      }
      const savedPrefs = localStorage.getItem(prefsStorageKey);
      if (savedPrefs) {
        const parsed = JSON.parse(savedPrefs);
        if (parsed.activeTab) setActiveTab(parsed.activeTab);
        if (parsed.quickFilter) setQuickFilter(parsed.quickFilter);
      }
    } catch {
      // ignore
    }
  }, [storageKey, prefsStorageKey]);

  // Save filter preferences whenever changed
  const updateTab = (tab: NotificationCategory) => {
    setActiveTab(tab);
    try {
      localStorage.setItem(
        prefsStorageKey,
        JSON.stringify({ activeTab: tab, quickFilter })
      );
    } catch {
      // ignore
    }
  };

  const updateQuickFilter = (filter: QuickFilterKey) => {
    setQuickFilter(filter);
    try {
      localStorage.setItem(
        prefsStorageKey,
        JSON.stringify({ activeTab, quickFilter: filter })
      );
    } catch {
      // ignore
    }
  };

  const saveActionState = useCallback(
    (id: number, status: StoredActionState['status'], extra?: { errorMessage?: string; successMessage?: string }) => {
      setActionStates((prev) => {
        const updated = {
          ...prev,
          [id]: {
            status,
            updatedAt: new Date().toISOString(),
            ...extra,
          },
        };
        try {
          localStorage.setItem(storageKey, JSON.stringify(updated));
        } catch {
          // ignore
        }
        return updated;
      });
    },
    [storageKey]
  );

  // Helper to determine notification action status
  const getItemStatus = useCallback(
    (notification: Notification): 'needs_action' | 'resolved' | 'failed' | 'archived' | 'info' => {
      const state = actionStates[notification.id];
      if (state) {
        if (state.status === 'resolved' || state.status === 'archived' || state.status === 'failed') {
          return state.status;
        }
      }

      const isAction = isActionRequiredForUser(notification, user);
      if (isAction) {
        return 'needs_action';
      }
      return 'info';
    },
    [actionStates, user]
  );

  const loadNotificationsData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, count] = await Promise.all([
        getNotificationsApi(),
        getUnreadNotificationCountApi().catch(() => undefined),
      ]);
      const list = (data || []).filter((n) => isAllowedNotificationForUser(n, user));
      setNotifications(list);
      const calculatedUnread = list.filter((n) => !n.read_at).length;
      setUnreadCount(count !== undefined ? Math.min(count, calculatedUnread) : calculatedUnread);
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
      if (!isAllowedNotificationForUser(notification, user)) return;
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

  const handleNotificationAction = async (notification: Notification) => {
    const action = resolveNotificationAction(notification, user);
    const docInfo = extractDocumentInfo(notification);
    const docLabel = docInfo.docNumber || notification.title;

    setExecutingId(notification.id);

    // Mark as read in background if unread
    if (!notification.read_at) {
      void markNotificationAsReadApi(notification.id)
        .then(() => {
          setNotifications((prev) =>
            prev.map((n) => (n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n))
          );
          setUnreadCount((prev) => Math.max(0, prev - 1));
          window.dispatchEvent(new CustomEvent('notifications-updated'));
        })
        .catch(() => {});
    }

    try {
      // Simulate/Trigger immediate navigation to the exact action screen
      saveActionState(notification.id, 'needs_action', {
        errorMessage: undefined,
        successMessage: `جارٍ الانتقال لتنفيذ الإجراء على ${docLabel}...`,
      });

      // Small delay for clean feedback transition
      await new Promise((r) => setTimeout(r, 200));

      navigate(action.url);
    } catch (err: any) {
      const parsed = parseApiError(err);
      saveActionState(notification.id, 'failed', {
        errorMessage: parsed.message || 'تعذر استكمال الإجراء. يرجى المحاولة مرة أخرى.',
      });
    } finally {
      setExecutingId(null);
    }
  };

  const handleMarkResolved = (e: React.MouseEvent, notification: Notification) => {
    e.stopPropagation();
    const docInfo = extractDocumentInfo(notification);
    const docLabel = docInfo.docNumber || notification.title;

    saveActionState(notification.id, 'resolved', {
      successMessage: `✓ تم إنجاز وحفظ الإجراء على ${docLabel} بنجاح`,
      errorMessage: undefined,
    });

    if (!notification.read_at) {
      void markNotificationAsReadApi(notification.id).catch(() => {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  const handleRetryAction = (e: React.MouseEvent, notification: Notification) => {
    e.stopPropagation();
    saveActionState(notification.id, 'needs_action', { errorMessage: undefined });
    void handleNotificationAction(notification);
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

  const handleResetFilters = () => {
    setActiveTab('ACTION_REQUIRED');
    setQuickFilter('ALL');
    setSearchQuery('');
    try {
      localStorage.removeItem(prefsStorageKey);
    } catch {
      // ignore
    }
  };

  // Group notifications into the 3 fundamental tabs
  const tabLists = useMemo(() => {
    const actionRequired: Notification[] = [];
    const informational: Notification[] = [];
    const archive: Notification[] = [];

    notifications.forEach((n) => {
      const status = getItemStatus(n);

      if (status === 'resolved' || status === 'archived') {
        archive.push(n);
      } else if (status === 'needs_action' || status === 'failed') {
        actionRequired.push(n);
      } else {
        informational.push(n);
      }
    });

    return {
      ACTION_REQUIRED: actionRequired,
      INFORMATIONAL: informational,
      ARCHIVE: archive,
    };
  }, [notifications, getItemStatus]);

  // Current active tab list before quick filtering & search
  const currentTabBaseList = useMemo(() => {
    return tabLists[activeTab] || [];
  }, [tabLists, activeTab]);

  // Filter helper
  const now = new Date();
  const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const applyQuickFilter = useCallback(
    (item: Notification, filter: QuickFilterKey): boolean => {
      const itemDate = item.created_at ? new Date(item.created_at) : null;
      const status = getItemStatus(item);
      const isReturned = (item.type || '').includes('returned') || (item.type || '').includes('rejected') || (item.title || '').includes('إرجاع') || (item.title || '').includes('مرفوض');

      switch (filter) {
        case 'UNREAD':
          return !item.read_at;
        case 'READ':
          return !!item.read_at;
        case 'TODAY':
          return !!itemDate && itemDate >= startOfToday;
        case 'LAST_10_DAYS':
          return !!itemDate && itemDate >= tenDaysAgo;
        case 'NEEDS_ACTION':
          return status === 'needs_action' || status === 'failed';
        case 'COMPLETED':
          return status === 'resolved';
        case 'RETURNED':
          return isReturned;
        case 'ALL':
        default:
          return true;
      }
    },
    [getItemStatus, startOfToday, tenDaysAgo]
  );

  // Quick filter counts calculated relative to current tab
  const filterCounts = useMemo(() => {
    const counts: Record<QuickFilterKey, number> = {
      ALL: currentTabBaseList.length,
      UNREAD: 0,
      READ: 0,
      TODAY: 0,
      LAST_10_DAYS: 0,
      NEEDS_ACTION: 0,
      COMPLETED: 0,
      RETURNED: 0,
    };

    currentTabBaseList.forEach((item) => {
      if (applyQuickFilter(item, 'UNREAD')) counts.UNREAD++;
      if (applyQuickFilter(item, 'READ')) counts.READ++;
      if (applyQuickFilter(item, 'TODAY')) counts.TODAY++;
      if (applyQuickFilter(item, 'LAST_10_DAYS')) counts.LAST_10_DAYS++;
      if (applyQuickFilter(item, 'NEEDS_ACTION')) counts.NEEDS_ACTION++;
      if (applyQuickFilter(item, 'COMPLETED')) counts.COMPLETED++;
      if (applyQuickFilter(item, 'RETURNED')) counts.RETURNED++;
    });

    return counts;
  }, [currentTabBaseList, applyQuickFilter]);

  // Apply Quick Filter and Search Query
  const displayedNotifications = useMemo(() => {
    let list = currentTabBaseList.filter((item) => applyQuickFilter(item, quickFilter));

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((item) => {
        const info = extractDocumentInfo(item);
        const data = item.data || {};
        const titleMatch = (item.title || '').toLowerCase().includes(q);
        const messageMatch = (item.message || '').toLowerCase().includes(q);
        const docNumberMatch = info.docNumber ? info.docNumber.toLowerCase().includes(q) : false;
        const deptMatch = (data.department_name || '').toLowerCase().includes(q);
        const requesterMatch = (data.requester_name || '').toLowerCase().includes(q);
        const supplierMatch = (data.supplier_name || '').toLowerCase().includes(q);
        const statusMatch = (data.status || '').toLowerCase().includes(q);
        const dateMatch = item.created_at ? item.created_at.includes(q) : false;

        return titleMatch || messageMatch || docNumberMatch || deptMatch || requesterMatch || supplierMatch || statusMatch || dateMatch;
      });
    }

    return list;
  }, [currentTabBaseList, quickFilter, searchQuery, applyQuickFilter]);

  const hasActiveFilters = quickFilter !== 'ALL' || searchQuery.trim().length > 0;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-100 flex items-center gap-2">
              <span>🔔</span>
              <span>مركز الإشعارات والقرارات التنفيذية</span>
            </h1>
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            إدارة مباشرة وفورية لجميع الإجراءات والتحديثات التشغيلية والمالية مع حفظ كامل لسجل الإجراءات.
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
            🔄 تحديث فوري
          </Button>
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={6} columns={3} />
      ) : (
        <>
          {error && <ErrorMessage error={error} />}

          {/* Push Notification Device Settings Prompt */}
          <PushNotificationPrompt variant="card" />

          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => updateTab('ACTION_REQUIRED')}
          className={`p-4 rounded-2xl border text-right transition-all cursor-pointer ${
            activeTab === 'ACTION_REQUIRED'
              ? 'border-amber-500/80 bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900 shadow-lg shadow-amber-950/30'
              : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-300">⚡ مطلوب إجراء مني</span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
              tabLists.ACTION_REQUIRED.length > 0
                ? 'bg-amber-500 text-slate-950 animate-pulse font-black'
                : 'bg-slate-800 text-slate-400'
            }`}>
              {tabLists.ACTION_REQUIRED.length}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">معاملات تقف على قرارك أو اعتمادك المباشر</p>
        </button>

        <button
          type="button"
          onClick={() => updateTab('INFORMATIONAL')}
          className={`p-4 rounded-2xl border text-right transition-all cursor-pointer ${
            activeTab === 'INFORMATIONAL'
              ? 'border-cyan-500/80 bg-gradient-to-br from-cyan-950/40 via-slate-900 to-slate-900 shadow-lg shadow-cyan-950/30'
              : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-cyan-300">ℹ️ إشعارات للعلم</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-cyan-950 text-cyan-300 border border-cyan-800/60">
              {tabLists.INFORMATIONAL.length}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">تحديثات المتابعة والإحاطة بحالة المعاملات</p>
        </button>

        <button
          type="button"
          onClick={() => updateTab('ARCHIVE')}
          className={`p-4 rounded-2xl border text-right transition-all cursor-pointer ${
            activeTab === 'ARCHIVE'
              ? 'border-emerald-500/80 bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 shadow-lg shadow-emerald-950/30'
              : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-300">📦 الأرشيف وسجل الإجراءات</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-950 text-emerald-300 border border-emerald-800/60">
              {tabLists.ARCHIVE.length}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">كافة المعاملات المنجزة والقرارات السابقة</p>
        </button>
      </div>

      {/* Control Bar: Search & Quick Filters */}
      <div className="space-y-3 bg-slate-900/90 p-4 rounded-2xl border border-slate-800/80">
        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث برقم الطلب (PR/PO/GRN)، الحالة، القسم، المورد، أو التاريخ..."
            className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 pl-10"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs px-1"
            >
              ✕
            </button>
          ) : (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔍</span>
          )}
        </div>

        {/* Quick Filter Chips & Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-slate-400 font-bold ml-1">تصفية سريعة:</span>

            <button
              type="button"
              onClick={() => updateQuickFilter('ALL')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                quickFilter === 'ALL'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              الكل ({filterCounts.ALL})
            </button>

            <button
              type="button"
              onClick={() => updateQuickFilter('UNREAD')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                quickFilter === 'UNREAD'
                  ? 'bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/30'
                  : 'bg-slate-950 text-cyan-400 hover:text-cyan-300 border border-cyan-800/60'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>غير مقروء ({filterCounts.UNREAD})</span>
            </button>

            <button
              type="button"
              onClick={() => updateQuickFilter('READ')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                quickFilter === 'READ'
                  ? 'bg-slate-600 text-white shadow-sm font-black'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <span>✓ مقروء ({filterCounts.READ})</span>
            </button>

            <button
              type="button"
              onClick={() => updateQuickFilter('TODAY')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                quickFilter === 'TODAY'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              اليوم ({filterCounts.TODAY})
            </button>

            <button
              type="button"
              onClick={() => updateQuickFilter('LAST_10_DAYS')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                quickFilter === 'LAST_10_DAYS'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              آخر 10 أيام ({filterCounts.LAST_10_DAYS})
            </button>

            <button
              type="button"
              onClick={() => updateQuickFilter('NEEDS_ACTION')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                quickFilter === 'NEEDS_ACTION'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              يحتاج إجراء ({filterCounts.NEEDS_ACTION})
            </button>

            <button
              type="button"
              onClick={() => updateQuickFilter('COMPLETED')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                quickFilter === 'COMPLETED'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              مكتمل ({filterCounts.COMPLETED})
            </button>

            <button
              type="button"
              onClick={() => updateQuickFilter('RETURNED')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                quickFilter === 'RETURNED'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              معاد للتعديل ({filterCounts.RETURNED})
            </button>
          </div>

          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setQuickFilter('ALL');
                  setSearchQuery('');
                }}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold underline cursor-pointer"
              >
                مسح الفلاتر ✕
              </button>
            )}
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[11px] text-slate-500 hover:text-slate-400 cursor-pointer"
              title="إعادة ضبط الفلاتر والتبويبات للوضع الافتراضي"
            >
              إعادة الافتراضي ↺
            </button>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      {displayedNotifications.length > 0 ? (
        <div className="space-y-3">
          {displayedNotifications.map((notification) => {
            const action: NotificationActionRoute = resolveNotificationAction(notification, user);
            const docInfo = extractDocumentInfo(notification);
            const status = getItemStatus(notification);
            const isUnread = !notification.read_at;
            const actionState = actionStates[notification.id];
            const isThisExecuting = executingId === notification.id;

            return (
              <Card
                key={notification.id}
                className={`p-4 sm:p-5 flex flex-col gap-3 transition-all border ${
                  isUnread
                    ? status === 'needs_action'
                      ? 'border-amber-500/90 bg-gradient-to-r from-amber-950/30 via-slate-900 to-amber-950/15 shadow-xl shadow-amber-950/30 ring-1 ring-amber-500/40'
                      : status === 'failed'
                      ? 'border-rose-500/90 bg-gradient-to-r from-rose-950/30 via-slate-900 to-rose-950/15 shadow-xl shadow-rose-950/30 ring-1 ring-rose-500/40'
                      : 'border-cyan-500/80 bg-gradient-to-r from-cyan-950/35 via-slate-900 to-cyan-950/15 shadow-xl shadow-cyan-950/40 ring-1 ring-cyan-500/35'
                    : 'border-slate-800/80 bg-slate-950/70 opacity-80 hover:opacity-100 hover:border-slate-700 hover:bg-slate-900/80'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  {/* Icon & Details */}
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl border shadow-inner ${
                        isUnread
                          ? status === 'needs_action'
                            ? 'bg-amber-500/25 text-amber-200 border-amber-400/60 shadow-amber-500/20'
                            : status === 'failed'
                            ? 'bg-rose-500/25 text-rose-200 border-rose-400/60 shadow-rose-500/20'
                            : 'bg-cyan-500/20 text-cyan-200 border-cyan-400/50 shadow-cyan-500/20'
                          : 'bg-slate-800/90 text-slate-400 border-slate-700/60'
                      }`}
                    >
                      {action.icon}
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`text-sm ${isUnread ? 'font-black text-slate-50' : 'font-bold text-slate-300'}`}>
                          {notification.title}
                        </h3>

                        {docInfo.docNumber && (
                          <span className={`font-mono text-xs px-2 py-0.5 rounded-lg border font-black ${
                            isUnread
                              ? 'bg-cyan-950/80 border-cyan-700/80 text-cyan-300'
                              : 'bg-slate-800 border-slate-700 text-slate-400'
                          }`}>
                            {docInfo.docNumber}
                          </span>
                        )}

                        {isUnread ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 px-2.5 py-0.5 text-[10px] font-black shadow-xs">
                            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                            غير مقروء
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-800/90 text-slate-400 border border-slate-700/50 px-2 py-0.5 text-[10px] font-medium">
                            ✓ مقروء
                          </span>
                        )}

                        {status === 'needs_action' && (
                          <span className="rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 text-[10px] font-black">
                            ⚡ مطلوب إجراء
                          </span>
                        )}

                        {status === 'failed' && (
                          <span className="rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 text-[10px] font-black">
                            ⚠️ فشل الإجراء
                          </span>
                        )}

                        {status === 'resolved' && (
                          <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold">
                            ✅ منجز ومكتمل
                          </span>
                        )}
                      </div>

                      <p className={`text-xs leading-relaxed ${isUnread ? 'text-slate-100 font-medium' : 'text-slate-400'}`}>
                        {notification.message}
                      </p>

                      {/* Metadata row */}
                      <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400 flex-wrap font-mono">
                        <span>{notification.created_at ? notification.created_at.slice(0, 16).replace('T', ' ') : ''}</span>
                        <span className={`rounded px-1.5 py-0.5 border font-sans ${
                          isUnread
                            ? 'bg-slate-800/90 text-slate-300 border-slate-700'
                            : 'bg-slate-900 text-slate-500 border-slate-800'
                        }`}>
                          {action.badgeLabel}
                        </span>
                        {actionState?.updatedAt && status === 'resolved' && (
                          <span className="text-emerald-400/80 font-sans text-[10px]">
                            تاريخ الإنجاز: {actionState.updatedAt.slice(0, 16).replace('T', ' ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Buttons */}
                  <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 sm:self-center">
                    {status === 'failed' ? (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={(e) => handleRetryAction(e, notification)}
                        isLoading={isThisExecuting}
                        disabled={isThisExecuting}
                        className="text-xs font-bold"
                      >
                        <span>إعادة المحاولة 🔄</span>
                      </Button>
                    ) : (
                      <Button
                        variant={status === 'needs_action' ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => void handleNotificationAction(notification)}
                        isLoading={isThisExecuting}
                        disabled={isThisExecuting}
                        className="text-xs font-bold"
                      >
                        <span>{isThisExecuting ? 'جارٍ التنفيذ...' : action.actionLabel}</span>
                        <span className="mr-1">←</span>
                      </Button>
                    )}

                    {status === 'needs_action' && (
                      <button
                        type="button"
                        onClick={(e) => handleMarkResolved(e, notification)}
                        disabled={isThisExecuting}
                        className="rounded-xl border border-emerald-800/60 bg-emerald-950/40 px-2.5 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-900/60 transition-colors cursor-pointer disabled:opacity-50"
                        title="تعليم المعاملة كمنجزة ونقلها للأرشيف"
                      >
                        ✓ تم الإنجاز
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline Failure Message with Retry */}
                {status === 'failed' && actionState?.errorMessage && (
                  <div className="rounded-xl border border-rose-800/60 bg-rose-950/40 p-2.5 text-xs text-rose-200 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span>⚠️</span>
                      <span><strong>سبب التعذر:</strong> {actionState.errorMessage}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleRetryAction(e, notification)}
                      className="text-rose-300 underline text-[11px] font-bold hover:text-white"
                    >
                      إعادة المحاولة الآن
                    </button>
                  </div>
                )}

                {/* Inline Success Banner */}
                {actionState?.successMessage && (
                  <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/40 p-2 text-xs text-emerald-300">
                    {actionState.successMessage}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 px-4 bg-slate-900/40 rounded-2xl border border-slate-800/60">
          <div className="text-4xl mb-3">
            {activeTab === 'ACTION_REQUIRED' ? '✨' : activeTab === 'INFORMATIONAL' ? '📭' : '📦'}
          </div>
          <h3 className="text-sm font-bold text-slate-200">
            {hasActiveFilters
              ? 'لا توجد نتائج مطابقة لشروط البحث والتصفية المحددة.'
              : activeTab === 'ACTION_REQUIRED'
              ? 'رائع! لا توجد معاملات معلقة تتطلب إجراء منك حالياً.'
              : activeTab === 'INFORMATIONAL'
              ? 'لا توجد إشعارات إعلامية جديدة.'
              : 'الأرشيف وسجل الإجراءات فارغ حالياً.'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            {hasActiveFilters
              ? 'جرب تعديل كلمات البحث أو اضغط على «مسح الفلاتر» لعرض كافة الإشعارات.'
              : 'سيتم تنبيهك فور ورود أي طلب جديد أو مستند يحتاج إلى اعتمادك.'}
          </p>
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              className="mt-4 text-xs"
            >
              مسح جميع الفلاتر ✕
            </Button>
          )}
        </div>
      )}
        </>
      )}
    </div>
  );
};

export default NotificationsPage;
