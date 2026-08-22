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
import { useAuth } from "../context/AuthContext";
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

import { parseApiError } from '../utils/apiError';

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
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
      setUnreadCount(count !== undefined ? count : nextNotifications.filter((n) => !n.read_at).length);

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
      setNotifications((current) => current.map((notification) => ({ ...notification, read_at: notification.read_at || readAt })));
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
    const roleSlugs = (user?.roles || []).map((role) => typeof role === 'string' ? role : role.slug);
    const notifiableId = notification.notifiable_id || notification.data?.purchase_request_id || notification.data?.purchase_order_id || notification.data?.id;
    const type = notification.type || '';
    const notifiableType = notification.notifiable_type || '';
    const isPurchaseRequest = type.includes('purchase_request') || notifiableType.includes('PurchaseRequest');
    const isPurchaseOrder = type.includes('purchase_order') || notifiableType.includes('PurchaseOrder');
    const isCombinedAccountingDocuments = type === 'purchase_order_and_receipt_ready_accounting'
      || Boolean(notification.data?.purchase_order_id && notification.data?.purchase_receipt_id);

    // Build the destination from the current user's role first. This prevents a
    // procurement/accounting/GM user from being sent to the employee route and
    // receiving a false 403 page.
    if (type.includes('purchase_quote') || type.includes('quote_recommendation')) {
      if (roleSlugs.includes('general_manager')) return notifiableId ? `/general-manager/purchase-quotes?open=${notifiableId}` : '/general-manager/purchase-quotes';
      if (roleSlugs.includes('procurement_manager')) return notifiableId ? `/procurement?open=${notifiableId}` : '/procurement';
      if (roleSlugs.includes('accountant')) return notifiableId ? `/accounting/purchase-quotes?open=${notifiableId}` : '/accounting/purchase-quotes';
      if (roleSlugs.includes('reviewer')) return notifiableId ? `/reviewer/purchase-quotes?open=${notifiableId}` : '/reviewer/purchase-quotes';
    }

    if (isCombinedAccountingDocuments && roleSlugs.includes('accountant')) {
      const purchaseOrderId = notification.data?.purchase_order_id || notification.notifiable_id;
      const purchaseReceiptId = notification.data?.purchase_receipt_id;
      if (purchaseOrderId && purchaseReceiptId) {
        return `/accounting/supplier-payments?purchase_order_id=${purchaseOrderId}&purchase_receipt_id=${purchaseReceiptId}`;
      }
      return '/accounting/supplier-payments';
    }

    if (isPurchaseRequest) {
      if (roleSlugs.includes('accountant')) {
        const accountingApprovalType = type.includes('pending_accounting') || type.includes('direct_sent_accounting') || type === 'purchase_request_pending_accounting_approval';
        return accountingApprovalType
          ? (notifiableId ? `/accounting/purchase-requests?open=${notifiableId}` : '/accounting/purchase-requests')
          : (notifiableId ? `/requests/${notifiableId}` : '/requests');
      }
      if (roleSlugs.includes('reviewer')) return notifiableId ? `/reviewer/requests/${notifiableId}` : '/reviewer/requests';
      if (roleSlugs.includes('procurement_manager')) return notifiableId ? `/procurement?open=${notifiableId}` : '/procurement';
      if (roleSlugs.includes('general_manager')) return notifiableId ? `/general-manager/purchase-requests?open=${notifiableId}` : '/general-manager/purchase-requests';
      if (roleSlugs.includes('employee')) return notifiableId ? `/employee/requests/${notifiableId}` : '/employee/requests';
    }

    if (isPurchaseOrder) {
      if (roleSlugs.includes('procurement_manager')) return notifiableId ? `/procurement/purchase-orders/${notifiableId}` : '/procurement/purchase-orders';
      if (roleSlugs.includes('accountant')) return notifiableId ? `/accounting/purchase-orders/${notifiableId}` : '/accounting/purchase-orders';
      if (roleSlugs.includes('general_manager')) return notifiableId ? `/general-manager/purchase-orders/${notifiableId}` : '/general-manager/purchase-orders';
    }

    // target_url is accepted only for a route that belongs to the current role.
    // Unknown or legacy links fall back to the notifications page instead of a 403.
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
          setNotifications((prev) =>
            prev.map((n) => (n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n))
          );
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
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n))
      );
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
      setNotifications((prev) =>

        prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
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
      return new Intl.DateTimeFormat('ar-SA', {
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
    if (notification.type.includes('quote') || notification.type.includes('recommendation')) return 'فتح عروض الأسعار';
    if (notification.type.includes('purchase_order')) return 'فتح أمر الشراء';
    if (notification.type.includes('purchase_request')) return 'فتح طلب الشراء';
    return 'فتح الإجراء';
  };

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
            <h1 className="text-2xl font-black text-slate-100 tracking-tight">الإشعارات</h1>
            {unreadCount > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-950 text-cyan-400 border border-cyan-800/60 shadow-sm">
                {`${unreadCount} غير مقروء`}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-400 font-medium">
            سجل التنبيهات والإشعارات الخاصة بطلبات الشراء وأوامر العمل
          </p>
        </div>

        <div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0 || markingAll}
            isLoading={markingAll}
          >
            تحديد الكل كمقروء
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="space-y-3">
          <ErrorMessage error={error} />
          <Button variant="primary" size="sm" onClick={loadNotificationsData}>
            إعادة المحاولة
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!error && notifications.length === 0 && (
        <EmptyState
          title="لا توجد إشعارات حالياً"
          description="ستظهر هنا أي تنبيهات وإشعارات جديدة فور ورودها"
          icon="🔔"
        />
      )}

      {/* الإشعارات List */}
      {!error && notifications.length > 0 && (
        <div className="space-y-3">
          {notifications.map((notif) => {
            const isUnread = !notif.read_at;
            const route = getTargetRoute(notif);
            const hasRoute = !!route;
            const actionLabel = getNotificationActionLabel(notif);

            return (
              <Card
                key={notif.id}
                onClick={() => { if (route) void handleNotificationClick(notif); }}
                className={`p-4 transition-all duration-200 ${
                  hasRoute ? 'cursor-pointer hover:border-slate-700' : 'cursor-default'
                } ${
                  isUnread
                    ? 'bg-slate-800/90 border-slate-700/90 shadow-md shadow-cyan-500/5'
                    : 'bg-slate-900/50 border-slate-800/80 opacity-90'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start space-x-3 space-x-reverse">
                    <span
                      className={`mt-1.5 h-2.5 w-2.5 rounded-full shrink-0 ${
                        isUnread ? 'bg-cyan-400 shadow-sm shadow-cyan-400/50 animate-pulse' : 'bg-slate-700'
                      }`}
                    />

                    <div>
                      <h4
                        className={`text-xs ${
                          isUnread ? 'font-bold text-slate-100' : 'font-normal text-slate-300'
                        }`}
                      >
                        {notif.title}
                      </h4>
                      <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                        {notif.message}
                      </p>
                      {notif.data?.purchase_order_id && notif.data?.purchase_receipt_id && (
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-bold">
                          <span className="rounded-md border border-cyan-800/70 bg-cyan-950/40 px-2 py-1 text-cyan-200">أمر الشراء رقم {notif.data.purchase_order_id}</span>
                          <span className="rounded-md border border-amber-800/70 bg-amber-950/40 px-2 py-1 text-amber-200">إذن الاستلام رقم {notif.data.purchase_receipt_id}</span>
                          <span className="text-slate-500">اضغط لعرض أمر الشراء وإذن الاستلام معًا</span>
                        </div>
                      )}
                      <div className="mt-2 text-[10px] text-slate-500 font-mono">
                        {formatDate(notif.created_at)}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
                    {actionLabel && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); void handleNotificationClick(notif); }}
                        isLoading={openingId === notif.id}
                        disabled={openingId !== null && openingId !== notif.id}
                        className="text-[11px]"
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
                        className="text-[11px] hover:bg-slate-800 border border-slate-700/60"
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
