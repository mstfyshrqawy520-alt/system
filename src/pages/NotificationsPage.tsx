import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getNotificationsApi,
  getUnreadNotificationCountApi,
  markAllNotificationsAsReadApi,
  markNotificationAsReadApi,
} from '../api/notifications';
import { Notification } from '../types/notification';
import ErrorMessage from '../components/ErrorMessage';
import { TableSkeleton, EmptyState } from '../components/ui/StateFeedback';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { parseApiError } from '../utils/apiError';
import { PushNotificationPrompt } from '../components/notifications/PushNotificationPrompt';
import { getPrimaryRoleSlug, AppRoleSlug } from '../routes/roleRouting';

interface RoleTabConfig {
  key: string;
  label: string;
  match: (n: Notification) => boolean;
}

const getRoleTabs = (role: AppRoleSlug | null): RoleTabConfig[] => {
  const commonUnread: RoleTabConfig = {
    key: 'UNREAD',
    label: '📬 غير المقروءة',
    match: (n) => !n.read_at,
  };

  const commonAll: RoleTabConfig = {
    key: 'ALL',
    label: '📁 كل الإشعارات',
    match: () => true,
  };

  switch (role) {
    case 'general_manager':
      return [
        commonUnread,
        {
          key: 'GM_QUOTES',
          label: '⚖️ قرارات عروض الأسعار',
          match: (n) => Boolean(n.type?.includes('quote') || n.type?.includes('recommendation')),
        },
        {
          key: 'GM_APPROVALS',
          label: '✅ طلبات القرار التنفيذي',
          match: (n) => Boolean(n.type?.includes('purchase_request') || n.type?.includes('executive')),
        },
        {
          key: 'GM_ORDERS',
          label: '📋 أوامر الشراء الصادرة',
          match: (n) => Boolean(n.type?.includes('purchase_order') || n.type?.includes('po_')),
        },
        {
          key: 'GM_PARCELS',
          label: '🏗️ مشاريع وقطع الأراضي',
          match: (n) => Boolean(n.type?.includes('parcel') || (n.data as any)?.item_reference || (n.data as any)?.region),
        },
        commonAll,
      ];

    case 'accountant':
      return [
        commonUnread,
        {
          key: 'ACC_INVOICES',
          label: '💳 فواتير ودفعات الموردين',
          match: (n) => Boolean(n.type?.includes('invoice') || n.type?.includes('payment') || n.type?.includes('receipt')),
        },
        {
          key: 'ACC_ORDERS',
          label: '📋 أوامر الشراء للحسابات',
          match: (n) => Boolean(n.type?.includes('purchase_order') || n.type?.includes('po_')),
        },
        {
          key: 'ACC_PRS',
          label: '✅ موافقات الطلبات المالية',
          match: (n) => Boolean(n.type?.includes('purchase_request') || n.type?.includes('accounting')),
        },
        {
          key: 'ACC_PARCELS',
          label: '🏗️ قطع الأراضي والتمويل',
          match: (n) => Boolean(n.type?.includes('parcel') || n.type?.includes('fund')),
        },
        commonAll,
      ];

    case 'procurement_manager':
      return [
        commonUnread,
        {
          key: 'PROC_PRS',
          label: '📋 طلبات الشراء المعتمدة',
          match: (n) => Boolean(n.type?.includes('purchase_request') || n.type?.includes('pr_')),
        },
        {
          key: 'PROC_QUOTES',
          label: '📑 عروض الأسعار',
          match: (n) => Boolean(n.type?.includes('quote') || n.type?.includes('recommendation')),
        },
        {
          key: 'PROC_ORDERS',
          label: '📦 أوامر الشراء الصادرة',
          match: (n) => Boolean(n.type?.includes('purchase_order') || n.type?.includes('po_')),
        },
        {
          key: 'PROC_RECEIPTS',
          label: '🚚 أذونات الاستلام والتوريد',
          match: (n) => Boolean(n.type?.includes('receipt') || n.type?.includes('warehouse')),
        },
        commonAll,
      ];

    case 'reviewer':
      return [
        commonUnread,
        {
          key: 'REV_PENDING',
          label: '📋 طلبات بانتظار مراجعتي',
          match: (n) => Boolean(n.type?.includes('purchase_request') || n.type?.includes('submitted')),
        },
        {
          key: 'REV_QUOTES',
          label: '💰 ترشيح عروض الأسعار',
          match: (n) => Boolean(n.type?.includes('quote') || n.type?.includes('recommendation')),
        },
        {
          key: 'REV_APPROVED',
          label: '✅ طلبات قسمي المعتمدة',
          match: (n) => Boolean(n.type?.includes('approved') || n.type?.includes('reviewer')),
        },
        commonAll,
      ];

    case 'site_engineer':
      return [
        commonUnread,
        {
          key: 'SITE_RECEIPTS',
          label: '🧰 اعتمادات استلام الموقع',
          match: (n) => Boolean(n.type?.includes('receipt') || n.type?.includes('site') || n.type?.includes('warehouse')),
        },
        {
          key: 'SITE_PRS',
          label: '📋 طلبات مشروعي وموقعي',
          match: (n) => Boolean(n.type?.includes('purchase_request') || n.type?.includes('pr_')),
        },
        {
          key: 'SITE_MATERIALS',
          label: '📦 المواد الواردة للموقع',
          match: (n) => Boolean(n.type?.includes('purchase_order') || n.type?.includes('receipt')),
        },
        commonAll,
      ];

    case 'warehouse_keeper':
      return [
        commonUnread,
        {
          key: 'WH_RECEIPTS',
          label: '📦 أذونات فحص واستلام المواد',
          match: (n) => Boolean(n.type?.includes('receipt') || n.type?.includes('warehouse')),
        },
        {
          key: 'WH_INCOMING',
          label: '🚚 أوامر الشراء المتوقعة',
          match: (n) => Boolean(n.type?.includes('purchase_order') || n.type?.includes('po_')),
        },
        commonAll,
      ];

    case 'employee':
    default:
      return [
        commonUnread,
        {
          key: 'EMP_UNDER_REVIEW',
          label: '📋 طلباتي قيد المراجعة',
          match: (n) => Boolean(n.type?.includes('purchase_request') || n.type?.includes('submitted') || n.type?.includes('review')),
        },
        {
          key: 'EMP_APPROVED',
          label: '✅ طلباتي المعتمدة',
          match: (n) => Boolean(n.type?.includes('approved') || n.type?.includes('reviewer')),
        },
        {
          key: 'EMP_ORDERS',
          label: '📦 أوامر الشراء الصادرة لطلباتي',
          match: (n) => Boolean(n.type?.includes('purchase_order') || n.type?.includes('po_') || n.type?.includes('receipt')),
        },
        commonAll,
      ];
  }
};

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const primaryRole = getPrimaryRoleSlug(user);
  const roleTabs = React.useMemo(() => getRoleTabs(primaryRole), [primaryRole]);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState<string>('UNREAD');
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState<boolean>(false);
  const [markingId, setMarkingId] = useState<number | null>(null);
  const [openingId, setOpeningId] = useState<number | null>(null);
  const requestVersion = useRef(0);
  const realtimeNotificationIds = useRef(new Set<number>());

  const loadNotificationsData = async () => {
    const currentVersion = ++requestVersion.current;
    setLoading(true);
    setError(null);
    try {
      const [data, count] = await Promise.all([
        getNotificationsApi(),
        getUnreadNotificationCountApi().catch(() => undefined),
      ]);
      if (currentVersion !== requestVersion.current) return;
      const nextNotifications = data || [];
      nextNotifications.forEach((notification) => realtimeNotificationIds.current.add(notification.id));
      setNotifications(nextNotifications);
      const calculatedUnread = nextNotifications.filter((n) => !n.read_at).length;
      setUnreadCount(count !== undefined ? count : calculatedUnread);
    } catch (err: any) {
      if (currentVersion !== requestVersion.current) return;
      const parsed = parseApiError(err);
      setError(parsed.message);
    } finally {
      if (currentVersion === requestVersion.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadNotificationsData();

    const handleRealtimeNotification = (event: Event) => {
      const notification = (event as CustomEvent<Notification>).detail;
      if (!notification || realtimeNotificationIds.current.has(notification.id)) return;
      realtimeNotificationIds.current.add(notification.id);
      setNotifications((current) => [notification, ...current]);
      if (!notification.read_at) setUnreadCount((current) => current + 1);
    };

    const handleNotificationsMarkedAll = () => {
      const readAt = new Date().toISOString();
      setNotifications((current) =>
        current.map((notification) => ({ ...notification, read_at: notification.read_at || readAt })),
      );
      setUnreadCount(0);
    };

    window.addEventListener('notification-received', handleRealtimeNotification as EventListener);
    window.addEventListener('notifications-marked-all', handleNotificationsMarkedAll);
    return () => {
      window.removeEventListener('notification-received', handleRealtimeNotification as EventListener);
      window.removeEventListener('notifications-marked-all', handleNotificationsMarkedAll);
    };
  }, []);

  const getTargetRoute = (notification: Notification & { data?: any; target_url?: string }): string | null => {
    const roleSlugs = (user?.roles || []).map((role) => (typeof role === 'string' ? role : role.slug));
    const notifiableId =
      notification.notifiable_id ||
      notification.data?.purchase_request_id ||
      notification.data?.purchase_order_id ||
      notification.data?.id;
    const type = notification.type || '';
    const notifiableType = notification.notifiable_type || '';
    const isPurchaseRequest = type.includes('purchase_request') || notifiableType.includes('PurchaseRequest');
    const isPurchaseOrder = type.includes('purchase_order') || notifiableType.includes('PurchaseOrder');
    const isPurchaseReceipt = type.includes('purchase_receipt') || notifiableType.includes('PurchaseReceipt');
    const isCombinedAccountingDocuments =
      type === 'purchase_order_and_receipt_ready_accounting' ||
      Boolean(notification.data?.purchase_order_id && notification.data?.purchase_receipt_id);

    if (type.includes('purchase_quote') || type.includes('quote_recommendation')) {
      if (roleSlugs.includes('general_manager')) return notifiableId ? `/general-manager/purchase-quotes?open=${notifiableId}` : '/general-manager/purchase-quotes';
      if (roleSlugs.includes('procurement_manager')) return notifiableId ? `/procurement?open=${notifiableId}` : '/procurement';
      if (roleSlugs.includes('accountant')) return notifiableId ? `/accounting/purchase-quotes?open=${notifiableId}` : '/accounting/purchase-quotes';
      if (roleSlugs.includes('reviewer')) return notifiableId ? `/reviewer/purchase-quotes?open=${notifiableId}` : '/reviewer/purchase-quotes';
    }

    if (isCombinedAccountingDocuments && roleSlugs.includes('accountant')) {
      return `/accounting/supplier-payments?purchase_receipt_id=${notification.data?.purchase_receipt_id}&purchase_order_id=${notification.data?.purchase_order_id}`;
    }

    if (isPurchaseReceipt) {
      if (roleSlugs.includes('accountant')) return notifiableId ? `/accounting/supplier-payments?purchase_receipt_id=${notifiableId}` : '/accounting/supplier-payments';
      if (roleSlugs.includes('warehouse_keeper')) return notifiableId ? `/warehouse?receipt_id=${notifiableId}` : '/warehouse';
      if (roleSlugs.includes('site_engineer')) return notifiableId ? `/site-engineer?receipt_id=${notifiableId}` : '/site-engineer';
    }

    if (isPurchaseRequest) {
      if (roleSlugs.includes('reviewer')) return notifiableId ? `/reviewer/requests/${notifiableId}` : '/reviewer/requests';
      if (roleSlugs.includes('general_manager')) return notifiableId ? `/general-manager/purchase-requests?open=${notifiableId}` : '/general-manager/purchase-requests';
      if (roleSlugs.includes('procurement_manager')) return notifiableId ? `/procurement/purchase-requests?open=${notifiableId}` : '/procurement/purchase-requests';
      if (roleSlugs.includes('accountant')) return notifiableId ? `/accounting/purchase-requests?open=${notifiableId}` : '/accounting/purchase-requests';
      if (roleSlugs.includes('employee')) return notifiableId ? `/employee/requests/${notifiableId}` : '/employee/requests';
      return notifiableId ? `/requests/${notifiableId}` : '/requests';
    }

    if (isPurchaseOrder) {
      if (roleSlugs.includes('procurement_manager')) return notifiableId ? `/procurement/purchase-orders/${notifiableId}` : '/procurement/purchase-orders';
      if (roleSlugs.includes('accountant')) return notifiableId ? `/accounting/purchase-orders/${notifiableId}` : '/accounting/purchase-orders';
      if (roleSlugs.includes('general_manager')) return notifiableId ? `/general-manager/purchase-orders/${notifiableId}` : '/general-manager/purchase-orders';
    }

    if (notification.target_url) {
      const allowedPrefixes = roleSlugs.includes('reviewer')
        ? ['/reviewer/']
        : roleSlugs.includes('procurement_manager')
          ? ['/procurement/']
          : roleSlugs.includes('accountant')
            ? ['/accounting/']
            : roleSlugs.includes('general_manager')
              ? ['/general-manager/']
              : roleSlugs.includes('employee')
                ? ['/employee/']
                : [];
      if (allowedPrefixes.some((prefix) => notification.target_url!.startsWith(prefix))) {
        return notification.target_url;
      }
    }

    return null;
  };

  const handleNotificationClick = async (notification: Notification) => {
    const route = getTargetRoute(notification);
    if (!route || openingId === notification.id) return;
    setOpeningId(notification.id);
    try {
      if (!notification.read_at) {
        try {
          await markNotificationAsReadApi(notification.id);
          // Permanently remove the opened notification from the active list
          setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
          setUnreadCount((prev) => Math.max(0, prev - 1));
          window.dispatchEvent(new CustomEvent('notifications-updated'));
        } catch (err) {
          console.error('Failed to mark notification as read:', err);
        }
      }
      navigate(route);
    } finally {
      setOpeningId(null);
    }
  };

  const handleMarkAsRead = async (e: React.MouseEvent, notification: Notification) => {
    e.stopPropagation();
    if (notification.read_at) return;

    setMarkingId(notification.id);
    try {
      await markNotificationAsReadApi(notification.id);
      // Remove immediately from active view
      setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      window.dispatchEvent(new CustomEvent('notifications-updated'));
    } catch (err: any) {
      const parsed = parseApiError(err);
      setError(parsed.message);
    } finally {
      setMarkingId(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    setMarkingAll(true);
    setError(null);
    try {
      await markAllNotificationsAsReadApi();
      window.dispatchEvent(new CustomEvent('notifications-marked-all'));
      // Clear all active notifications immediately
      setNotifications([]);
      setUnreadCount(0);
      window.dispatchEvent(new CustomEvent('notifications-updated'));
    } catch (err: any) {
      const parsed = parseApiError(err);
      setError(parsed.message);
    } finally {
      setMarkingAll(false);
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('ar-EG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch {
      return dateString;
    }
  };

  const getNotificationActionLabel = (notification: Notification): string | null => {
    if (!getTargetRoute(notification)) return null;
    if (notification.data?.purchase_order_id && notification.data?.purchase_receipt_id) return 'فتح أمر الشراء وإذن الاستلام';
    if (notification.type?.includes('quote') || notification.type?.includes('recommendation')) return 'فتح عروض الأسعار';
    if (notification.type?.includes('purchase_order')) return 'فتح أمر الشراء';
    if (notification.type?.includes('purchase_request')) return 'فتح طلب الشراء';
    return 'فتح الإجراء';
  };

  const currentTabConfig = roleTabs.find((t) => t.key === activeTab) || roleTabs[0];

  const unreadNotifications = notifications.filter((n) => !n.read_at);
  const displayedNotifications = notifications.filter((n) => currentTabConfig.match(n));

  if (loading) {
    return (
      <div className="space-y-6" dir="rtl">
        <div className="border-b border-slate-800 pb-4">
          <div className="h-7 w-40 animate-pulse rounded bg-slate-800" />
          <div className="mt-3 h-4 w-72 animate-pulse rounded bg-slate-800/70" />
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
          <div className="flex items-center space-x-3 space-x-reverse">
            <h1 className="text-2xl font-black text-slate-100 tracking-tight">الإشعارات والتنبيهات</h1>
            {unreadCount > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-950 text-cyan-400 border border-cyan-800/60 shadow-sm">
                {`${unreadCount} غير مقروء`}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-400 font-medium">
            تنبيهات وإشعارات دورة المشتريات والاعتمادات المالية والتشغيلية المباشرة المخصصة لدورك.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {unreadCount > 0 && (
            <Button
              variant="secondary"
              size="sm"
              disabled={markingAll}
              onClick={handleMarkAllAsRead}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 text-xs font-bold"
            >
              <span>✓✓</span>
              <span>{markingAll ? 'جاري التحديد...' : 'تحديد الكل كمقروء'}</span>
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={loadNotificationsData}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 text-xs font-bold"
          >
            <span>🔄</span>
            <span>تحديث</span>
          </Button>
        </div>
      </div>

      {/* Smart Role-tailored Category Tabs Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto rounded-xl bg-slate-950 p-1.5 border border-slate-800/80">
        {roleTabs.map((tab) => {
          const tabCount = notifications.filter((n) => tab.match(n)).length;
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                isActive
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <span>{tab.label}</span>
              {tab.key === 'UNREAD' ? (
                unreadNotifications.length > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      isActive ? 'bg-white/20 text-white' : 'bg-cyan-950 text-cyan-400 border border-cyan-800/60'
                    }`}
                  >
                    {unreadNotifications.length}
                  </span>
                )
              ) : (
                <span className="text-[10px] opacity-70 font-mono">({tabCount})</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Push Notification PWA Activation Prompt */}
      <PushNotificationPrompt variant="banner" />

      {/* Error State */}
      {error && (
        <div className="space-y-3">
          <ErrorMessage error={error} onDismiss={() => setError(null)} />
          <Button variant="primary" size="sm" onClick={loadNotificationsData} className="w-full sm:w-auto min-h-10">
            إعادة المحاولة
          </Button>
        </div>
      )}

      {/* Empty State when no notifications exist at all */}
      {!error && notifications.length === 0 && (
        <EmptyState
          title="لا توجد إشعارات حالياً"
          description="ستظهر هنا أي تنبيهات وإشعارات جديدة فور ورودها"
          icon="🔔"
        />
      )}

      {/* Empty State for Unread when there are notifications in archive */}
      {!error && notifications.length > 0 && activeTab === 'UNREAD' && unreadNotifications.length === 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center space-y-4">
          <span className="text-4xl block">🎉</span>
          <h3 className="text-base font-bold text-slate-100">تم الاطلاع على جميع الإشعارات!</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-6">
            لا توجد إشعارات غير مقروءة حالياً. يمكنك التبديل إلى تبويب «كل الإشعارات» لمراجعة السجل السابق في أي وقت.
          </p>
          <Button variant="secondary" size="sm" onClick={() => setActiveTab('ALL')}>
            📁 عرض أرشيف كافة الإشعارات ({notifications.length})
          </Button>
        </div>
      )}

      {/* Notifications List */}
      {!error && displayedNotifications.length > 0 && (
        <div className="space-y-3">
          {displayedNotifications.map((notif) => {
            const isUnread = !notif.read_at;
            const route = getTargetRoute(notif);
            const hasRoute = !!route;
            const actionLabel = getNotificationActionLabel(notif);

            return (
              <Card
                key={notif.id}
                onClick={() => {
                  if (route) void handleNotificationClick(notif);
                }}
                className={`p-4 transition-all duration-200 ${
                  hasRoute ? 'cursor-pointer hover:border-cyan-700/80 hover:bg-slate-800/80' : 'cursor-default'
                } ${
                  isUnread
                    ? 'bg-slate-800/90 border-slate-700/90 shadow-md shadow-cyan-500/5'
                    : 'bg-slate-900/50 border-slate-800/80 opacity-80'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start space-x-3 space-x-reverse min-w-0">
                    <span
                      className={`mt-1.5 h-2.5 w-2.5 rounded-full shrink-0 ${
                        isUnread ? 'bg-cyan-400 shadow-sm shadow-cyan-400/50 animate-pulse' : 'bg-slate-700'
                      }`}
                    />

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4
                          className={`text-xs ${
                            isUnread ? 'font-bold text-slate-100' : 'font-medium text-slate-300'
                          }`}
                        >
                          {notif.title}
                        </h4>
                        {isUnread ? (
                          <span className="rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 px-2 py-0.5 text-[10px] font-bold">
                            جديد
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-800 text-slate-400 px-2 py-0.5 text-[10px]">
                            تمت القراءة
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-400 leading-relaxed break-normal">
                        {notif.message}
                      </p>
                      {notif.data?.purchase_order_id && notif.data?.purchase_receipt_id && (
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-bold">
                          <span className="rounded-md border border-cyan-800/70 bg-cyan-950/40 px-2 py-1 text-cyan-200">
                            أمر الشراء رقم {notif.data.purchase_order_id}
                          </span>
                          <span className="rounded-md border border-amber-800/70 bg-amber-950/40 px-2 py-1 text-amber-200">
                            إذن الاستلام رقم {notif.data.purchase_receipt_id}
                          </span>
                          <span className="text-slate-500">اضغط لعرض أمر الشراء وإذن الاستلام معًا</span>
                        </div>
                      )}
                      <div className="mt-2 text-[10px] text-slate-500 font-mono">
                        {formatDate(notif.created_at)}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-stretch sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
                    {actionLabel && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleNotificationClick(notif);
                        }}
                        isLoading={openingId === notif.id}
                        disabled={openingId !== null && openingId !== notif.id}
                        className="text-xs min-h-10 flex-1 sm:flex-initial whitespace-nowrap"
                      >
                        {actionLabel}
                      </Button>
                    )}
                    {isUnread && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleMarkAsRead(e, notif)}
                        isLoading={markingId === notif.id}
                        className="text-xs min-h-10 flex-1 sm:flex-initial hover:bg-slate-800 border border-slate-700/60 whitespace-nowrap"
                      >
                        تحديد كمقروء
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
