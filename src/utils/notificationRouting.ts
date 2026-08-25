import { Notification } from '../types/notification';
import { User } from '../types/auth';

export interface NotificationActionRoute {
  url: string;
  actionLabel: string;
  icon: string;
  badgeLabel: string;
}

/**
 * Intelligent Deep-Link Router for Notifications
 * Resolves the EXACT decision page for the current user's role.
 */
export const resolveNotificationAction = (
  notification: Notification & { data?: any; target_url?: string },
  user: User | null
): NotificationActionRoute => {
  const roleSlugs = (user?.roles || []).map((role) => (typeof role === 'string' ? role : role.slug));
  const data = notification.data || {};
  const type = notification.type || '';
  const notifiableType = notification.notifiable_type || '';

  const prId = data.purchase_request_id || (notifiableType.includes('PurchaseRequest') ? notification.notifiable_id : null) || data.id;
  const poId = data.purchase_order_id || (notifiableType.includes('PurchaseOrder') ? notification.notifiable_id : null);
  const quoteId = data.quote_id || data.purchase_request_quote_id;
  const receiptId = data.purchase_receipt_id || (notifiableType.includes('PurchaseReceipt') ? notification.notifiable_id : null);
  const parcelId = data.land_parcel_id || data.parcel_id;

  // 1. General Manager (المدير العام)
  if (roleSlugs.includes('general_manager')) {
    if (poId) {
      return {
        url: `/general-manager/purchase-orders/${poId}`,
        actionLabel: 'اعتماد أمر الشراء',
        icon: '📑',
        badgeLabel: 'أمر شراء',
      };
    }
    if (type.includes('quote') || type.includes('recommendation') || quoteId) {
      return {
        url: prId ? `/general-manager/purchase-quotes?open=${prId}` : '/general-manager/purchase-quotes',
        actionLabel: 'البت في عروض الأسعار',
        icon: '⚖️',
        badgeLabel: 'عروض أسعار',
      };
    }
    if (prId) {
      return {
        url: `/general-manager/purchase-requests`,
        actionLabel: 'اتخاذ قرار في الطلب',
        icon: '📋',
        badgeLabel: 'طلب شراء',
      };
    }
    if (parcelId) {
      return {
        url: `/general-manager/land-parcels`,
        actionLabel: 'كشف حساب القطعة',
        icon: '🏗️',
        badgeLabel: 'قطعة أرض',
      };
    }
    return {
      url: '/general-manager',
      actionLabel: 'لوحة المدير العام',
      icon: '👑',
      badgeLabel: 'إدارة عامة',
    };
  }

  // 2. Reviewer / Department Manager (رئيس القسم / المراجع)
  if (roleSlugs.includes('reviewer')) {
    if (type.includes('quote') || type.includes('recommendation')) {
      return {
        url: prId ? `/reviewer/purchase-quotes?open=${prId}` : '/reviewer/purchase-quotes',
        actionLabel: 'ترشيح عرض السعر',
        icon: '⚖️',
        badgeLabel: 'عروض أسعار',
      };
    }
    if (prId) {
      return {
        url: `/reviewer/requests/${prId}`,
        actionLabel: 'مراجعة واعتماد الطلب',
        icon: '📋',
        badgeLabel: 'مراجعة طلب',
      };
    }
    return {
      url: '/reviewer/requests',
      actionLabel: 'قائمة مراجعة الطلبات',
      icon: '📋',
      badgeLabel: 'مراجعة',
    };
  }

  // 3. Procurement Manager (مدير المشتريات)
  if (roleSlugs.includes('procurement_manager')) {
    if (poId) {
      return {
        url: `/procurement/purchase-orders/${poId}`,
        actionLabel: 'عرض وتعديل أمر الشراء',
        icon: '📦',
        badgeLabel: 'أمر شراء',
      };
    }
    if (quoteId && prId) {
      return {
        url: `/procurement/purchase-orders/create?pr=${prId}&quote=${quoteId}`,
        actionLabel: 'إصدار أمر الشراء فوراً',
        icon: '⚡',
        badgeLabel: 'جاهز للإصدار',
      };
    }
    if (type.includes('approved') && prId) {
      return {
        url: `/procurement/purchase-orders/create?pr=${prId}`,
        actionLabel: 'إصدار أمر الشراء',
        icon: '📑',
        badgeLabel: 'طلب معتمد',
      };
    }
    if (prId) {
      return {
        url: `/procurement`,
        actionLabel: 'طلب عروض أسعار / إصدار',
        icon: '📋',
        badgeLabel: 'المشتريات',
      };
    }
    return {
      url: '/procurement',
      actionLabel: 'لوحة إدارة المشتريات',
      icon: '🛒',
      badgeLabel: 'مشتريات',
    };
  }

  // 4. Accountant (المحاسب المالي)
  if (roleSlugs.includes('accountant')) {
    if (poId) {
      return {
        url: `/accounting/purchase-orders/${poId}`,
        actionLabel: 'المراجعة والاعتماد المالي',
        icon: '💳',
        badgeLabel: 'اعتماد مالي',
      };
    }
    if (receiptId) {
      return {
        url: `/accounting/supplier-payments?purchase_receipt_id=${receiptId}`,
        actionLabel: 'سداد فواتير المورد',
        icon: '🧾',
        badgeLabel: 'صرف دفعة',
      };
    }
    if (type.includes('quote') || type.includes('recommendation')) {
      return {
        url: prId ? `/accounting/purchase-quotes?open=${prId}` : '/accounting/purchase-quotes',
        actionLabel: 'الرأي المالي في العروض',
        icon: '⚖️',
        badgeLabel: 'عروض أسعار',
      };
    }
    if (parcelId) {
      return {
        url: `/accounting/land-parcels`,
        actionLabel: 'دفتر قطع الأراضي',
        icon: '🏗️',
        badgeLabel: 'قطع الأراضي',
      };
    }
    if (prId) {
      return {
        url: `/accounting/purchase-requests`,
        actionLabel: 'طلبات الشراء للحسابات',
        icon: '📋',
        badgeLabel: 'حسابات',
      };
    }
    return {
      url: '/accounting',
      actionLabel: 'لوحة الحسابات العامة',
      icon: '💼',
      badgeLabel: 'حسابات',
    };
  }

  // 5. Site Engineer (مهندس الموقع)
  if (roleSlugs.includes('site_engineer')) {
    if (receiptId) {
      return {
        url: `/site-engineer?receipt_id=${receiptId}`,
        actionLabel: 'فحص واستلام الموقع',
        icon: '🚚',
        badgeLabel: 'استلام موقع',
      };
    }
    if (prId) {
      return {
        url: `/requests/${prId}`,
        actionLabel: 'تفاصيل طلب الموقع',
        icon: '📋',
        badgeLabel: 'طلب موقع',
      };
    }
    return {
      url: '/site-engineer',
      actionLabel: 'استلامات الموقع',
      icon: '🧰',
      badgeLabel: 'موقع',
    };
  }

  // 6. Warehouse Keeper (أمين المستودع)
  if (roleSlugs.includes('warehouse_keeper')) {
    if (receiptId) {
      return {
        url: `/warehouse?receipt_id=${receiptId}`,
        actionLabel: 'إذن فحص واستلام المستودع',
        icon: '📦',
        badgeLabel: 'استلام مستودع',
      };
    }
    return {
      url: '/warehouse',
      actionLabel: 'إدارة المخزن والمستودع',
      icon: '🏢',
      badgeLabel: 'مستودع',
    };
  }

  // 7. Employee / Requester (الموظف / صاحب الطلب)
  if (prId) {
    return {
      url: `/requests/${prId}`,
      actionLabel: 'عرض ومتابعة الطلب',
      icon: '📋',
      badgeLabel: 'طلبي',
    };
  }

  return {
    url: notification.target_url || '/requests',
    actionLabel: 'عرض التفاصيل',
    icon: '🔔',
    badgeLabel: 'إشعار',
  };
};
