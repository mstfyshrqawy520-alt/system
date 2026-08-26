import { Notification } from '../types/notification';
import { User } from '../types/auth';

export interface NotificationActionRoute {
  url: string;
  actionLabel: string;
  icon: string;
  badgeLabel: string;
  docType: 'PR' | 'PO' | 'QUOTE' | 'RECEIPT' | 'INVOICE' | 'PAYMENT' | 'PARCEL' | 'GENERAL';
  docNumber?: string;
  isActionable: boolean;
  priority: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
}

/**
 * Intelligent Document Extractor
 */
export const extractDocumentInfo = (notification: Notification & { data?: any }) => {
  const data = notification.data || {};
  const notifiableType = notification.notifiable_type || '';
  const type = notification.type || '';

  const prId = data.purchase_request_id || (notifiableType.includes('PurchaseRequest') ? notification.notifiable_id : null) || data.id;
  const poId = data.purchase_order_id || (notifiableType.includes('PurchaseOrder') ? notification.notifiable_id : null);
  const receiptId = data.purchase_receipt_id || (notifiableType.includes('PurchaseReceipt') ? notification.notifiable_id : null);
  const invoiceId = data.invoice_id || (notifiableType.includes('SupplierInvoice') ? notification.notifiable_id : null);
  const supplierId = data.supplier_id;
  const quoteId = data.quote_id || data.purchase_request_quote_id;

  let docNumber = data.pr_number || data.po_number || data.receipt_number || data.invoice_number;
  let docType: NotificationActionRoute['docType'] = 'GENERAL';

  if (quoteId || type.includes('quote')) {
    docType = 'QUOTE';
    docNumber = docNumber || (prId ? `PR-${prId}` : undefined);
  } else if (invoiceId || type.includes('invoice')) {
    docType = 'INVOICE';
    docNumber = docNumber || (invoiceId ? `INV-${invoiceId}` : undefined);
  } else if (receiptId || type.includes('receipt') || type.includes('grn')) {
    docType = 'RECEIPT';
    docNumber = docNumber || (receiptId ? `GRN-${receiptId}` : undefined);
  } else if (poId || type.includes('purchase_order') || type.includes('po_')) {
    docType = 'PO';
    docNumber = docNumber || (poId ? `PO-${poId}` : undefined);
  } else if (prId || type.includes('purchase_request') || type.includes('pr_')) {
    docType = 'PR';
    docNumber = docNumber || (prId ? `PR-${prId}` : undefined);
  } else if (supplierId || type.includes('payment')) {
    docType = 'PAYMENT';
  }

  return {
    prId,
    poId,
    receiptId,
    invoiceId,
    supplierId,
    quoteId,
    docType,
    docNumber,
  };
};

/**
 * Determines if a notification should be visible to a user.
 * Specifically, the Admin role must NOT receive ANY operational messages unless a system error or alert occurs.
 */
export const isAllowedNotificationForUser = (
  notification: Notification & { data?: any; target_url?: string },
  user: User | null
): boolean => {
  const roleSlugs = (user?.roles || []).map((r) => (typeof r === 'string' ? r : r.slug));
  const isAdmin = roleSlugs.includes('admin') && !roleSlugs.some((r) => ['employee', 'reviewer', 'procurement_manager', 'accountant', 'general_manager', 'site_engineer', 'warehouse_keeper'].includes(r));

  if (isAdmin) {
    const type = (notification.type || '').toLowerCase();
    const title = (notification.title || '').toLowerCase();
    const message = (notification.message || '').toLowerCase();
    return (
      type.startsWith('system_error') ||
      type.startsWith('system_alert') ||
      type.startsWith('system_issue') ||
      type.includes('error') ||
      type.includes('exception') ||
      title.includes('خطأ') ||
      title.includes('عطل') ||
      title.includes('مشكلة') ||
      title.includes('تنبيه النظام') ||
      message.includes('خادم') ||
      message.includes('استثناء')
    );
  }

  return true;
};

/**
 * Determines whether a notification strictly requires action from the current user
 * based on role and workflow status.
 */
export const isActionRequiredForUser = (
  notification: Notification & { data?: any; target_url?: string },
  user: User | null
): boolean => {
  if (!isAllowedNotificationForUser(notification, user)) {
    return false;
  }

  const roleSlugs = (user?.roles || []).map((r) => (typeof r === 'string' ? r : r.slug));
  const type = (notification.type || '').toLowerCase();
  const title = (notification.title || '').toLowerCase();
  const message = (notification.message || '').toLowerCase();

  // General Manager actions
  if (roleSlugs.includes('general_manager')) {
    if (type.includes('quote') || type.includes('recommendation') || title.includes('عروض') || message.includes('عروض')) return true;
    if (type.includes('po_submitted') || type.includes('po_pending') || title.includes('أمر شراء') || message.includes('أمر شراء')) return true;
    if (type.includes('gm_review') || type.includes('pending_gm') || title.includes('اعتماد') || message.includes('بانتظار موافقة المدير')) return true;
  }

  // Reviewer / Department Manager actions
  if (roleSlugs.includes('reviewer')) {
    if (type.includes('submitted') || type.includes('pending_review') || title.includes('مراجعة') || message.includes('جديد للمراجعة')) return true;
    if (type.includes('quote') || type.includes('recommendation') || title.includes('ترشيح') || message.includes('ترشيح')) return true;
  }

  // Procurement Manager actions
  if (roleSlugs.includes('procurement_manager')) {
    if (type.includes('approved') && !type.includes('po_issued') && (title.includes('معتمد') || message.includes('معتمد'))) return true;
    if (type.includes('quote_selected') || title.includes('تم اختيار عرض') || message.includes('إصدار أمر الشراء')) return true;
    if (type.includes('returned') || type.includes('rejected') || title.includes('إعادة') || message.includes('إرجاع')) return true;
  }

  // Accountant actions
  if (roleSlugs.includes('accountant')) {
    if (type.includes('receipt') || type.includes('grn') || type.includes('delivered') || title.includes('استلام') || message.includes('استلام')) return true;
    if (type.includes('invoice') || title.includes('فاتورة') || message.includes('فاتورة')) return true;
    if (type.includes('quote_recommendation') || title.includes('عروض أسعار') || message.includes('الرأي المالي')) return true;
  }

  // Site Engineer / Warehouse actions
  if (roleSlugs.includes('site_engineer') || roleSlugs.includes('warehouse_keeper')) {
    if (type.includes('po_issued') || type.includes('delivery') || title.includes('توريد') || message.includes('توريد') || title.includes('استلام')) return true;
  }

  // Requester action if explicitly returned for amendment (Rejected is final and cannot be edited)
  if (type.includes('returned') || title.includes('إعادة للتعديل') || message.includes('إعادة للتعديل')) {
    return true;
  }

  // Fallback explicit check on action keywords
  return (
    type.includes('action_required') ||
    type.includes('pending') ||
    type.includes('submitted') ||
    title.includes('مطلوب') ||
    title.includes('بانتظار')
  );
};

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
  const type = (notification.type || '').toLowerCase();
  const title = (notification.title || '').toLowerCase();
  const message = (notification.message || '').toLowerCase();
  const info = extractDocumentInfo(notification);
  const isActionable = isActionRequiredForUser(notification, user);

  // Determine Priority
  let priority: NotificationActionRoute['priority'] = 'NORMAL';
  if (data.priority === 'URGENT' || type.includes('urgent') || type.includes('returned') || type.includes('rejected')) {
    priority = 'URGENT';
  } else if (data.priority === 'HIGH' || isActionable) {
    priority = 'HIGH';
  }

  // 1. General Manager (المدير العام)
  if (roleSlugs.includes('general_manager')) {
    if (info.poId) {
      return {
        url: `/general-manager/purchase-orders/${info.poId}`,
        actionLabel: 'اعتماد أمر الشراء',
        icon: '📑',
        badgeLabel: 'أمر شراء',
        docType: 'PO',
        docNumber: info.docNumber,
        isActionable,
        priority,
      };
    }
    if (type.includes('quote') || type.includes('recommendation') || info.quoteId) {
      return {
        url: info.prId ? `/general-manager/purchase-quotes?open=${info.prId}` : '/general-manager/purchase-quotes',
        actionLabel: 'البت في عروض الأسعار',
        icon: '⚖️',
        badgeLabel: 'عروض أسعار',
        docType: 'QUOTE',
        docNumber: info.docNumber,
        isActionable,
        priority,
      };
    }
    if (info.prId) {
      return {
        url: `/general-manager/purchase-requests`,
        actionLabel: 'اتخاذ قرار في الطلب',
        icon: '📋',
        badgeLabel: 'طلب شراء',
        docType: 'PR',
        docNumber: info.docNumber,
        isActionable,
        priority,
      };
    }
    return {
      url: '/general-manager',
      actionLabel: 'لوحة المدير العام',
      icon: '👑',
      badgeLabel: 'إدارة عامة',
      docType: 'GENERAL',
      isActionable,
      priority,
    };
  }

  // 2. Reviewer / Department Manager (رئيس القسم / المراجع)
  if (roleSlugs.includes('reviewer')) {
    if (type.includes('quote') || type.includes('recommendation')) {
      return {
        url: info.prId ? `/reviewer/purchase-quotes?open=${info.prId}` : '/reviewer/purchase-quotes',
        actionLabel: 'ترشيح عرض السعر',
        icon: '⚖️',
        badgeLabel: 'عروض أسعار',
        docType: 'QUOTE',
        docNumber: info.docNumber,
        isActionable,
        priority,
      };
    }
    if (info.prId) {
      return {
        url: `/reviewer/requests/${info.prId}`,
        actionLabel: 'مراجعة واعتماد الطلب',
        icon: '📋',
        badgeLabel: 'مراجعة طلب',
        docType: 'PR',
        docNumber: info.docNumber,
        isActionable,
        priority,
      };
    }
    return {
      url: '/reviewer/requests',
      actionLabel: 'قائمة مراجعة الطلبات',
      icon: '📋',
      badgeLabel: 'مراجعة',
      docType: 'PR',
      isActionable,
      priority,
    };
  }

  // 3. Procurement Manager (مدير المشتريات)
  if (roleSlugs.includes('procurement_manager')) {
    if (info.poId) {
      const isReturned = type.includes('returned') || type.includes('rejected');
      return {
        url: isReturned ? `/procurement/purchase-orders/${info.poId}/edit` : `/procurement/purchase-orders/${info.poId}`,
        actionLabel: isReturned ? 'تعديل أمر الشراء المعاد' : 'عرض وتعديل أمر الشراء',
        icon: '📦',
        badgeLabel: 'أمر شراء',
        docType: 'PO',
        docNumber: info.docNumber,
        isActionable,
        priority,
      };
    }
    if (info.quoteId && info.prId) {
      return {
        url: `/procurement/purchase-orders/create?pr=${info.prId}&quote=${info.quoteId}`,
        actionLabel: 'إصدار أمر الشراء فوراً',
        icon: '⚡',
        badgeLabel: 'جاهز للإصدار',
        docType: 'PO',
        docNumber: info.docNumber,
        isActionable,
        priority,
      };
    }
    if (type.includes('approved') && info.prId) {
      return {
        url: `/procurement/purchase-orders/create?pr=${info.prId}`,
        actionLabel: 'إصدار أمر الشراء',
        icon: '📑',
        badgeLabel: 'طلب معتمد',
        docType: 'PR',
        docNumber: info.docNumber,
        isActionable,
        priority,
      };
    }
    if (info.prId) {
      return {
        url: `/procurement`,
        actionLabel: 'طلب عروض أسعار / إصدار',
        icon: '📋',
        badgeLabel: 'المشتريات',
        docType: 'PR',
        docNumber: info.docNumber,
        isActionable,
        priority,
      };
    }
    return {
      url: '/procurement',
      actionLabel: 'لوحة إدارة المشتريات',
      icon: '🛒',
      badgeLabel: 'مشتريات',
      docType: 'GENERAL',
      isActionable,
      priority,
    };
  }

  // 4. Accountant (المحاسب المالي)
  if (roleSlugs.includes('accountant')) {
    if (info.receiptId || type.includes('receipt') || type.includes('grn') || type.includes('goods_received')) {
      const targetParam = info.receiptId ? `purchase_receipt_id=${info.receiptId}` : `purchase_order_id=${info.poId || ''}`;
      return {
        url: `/accounting/supplier-payments?${targetParam}`,
        actionLabel: 'تسجيل الفاتورة وسداد المستحقات',
        icon: '🧾',
        badgeLabel: 'إذن استلام جاهز',
        docType: 'RECEIPT',
        docNumber: info.docNumber,
        isActionable,
        priority,
      };
    }
    if (info.invoiceId || type.includes('invoice')) {
      return {
        url: `/accounting/supplier-payments?invoice_id=${info.invoiceId || ''}`,
        actionLabel: 'تسجيل ومطابقة الفاتورة',
        icon: '💰',
        badgeLabel: 'فاتورة مورد',
        docType: 'INVOICE',
        docNumber: info.docNumber,
        isActionable,
        priority,
      };
    }
    if (info.supplierId || type.includes('payment')) {
      return {
        url: `/accounting/supplier-accounts?supplier_id=${info.supplierId || ''}`,
        actionLabel: 'كشف حساب وسداد الدفعة',
        icon: '🏦',
        badgeLabel: 'سداد دفعة',
        docType: 'PAYMENT',
        isActionable,
        priority,
      };
    }
    if (info.poId) {
      return {
        url: `/accounting/purchase-orders/${info.poId}`,
        actionLabel: 'الاطلاع المالي على أمر الشراء',
        icon: '💳',
        badgeLabel: 'أمر شراء',
        docType: 'PO',
        docNumber: info.docNumber,
        isActionable,
        priority,
      };
    }
    if (type.includes('quote') || type.includes('recommendation')) {
      return {
        url: info.prId ? `/accounting/purchase-quotes?open=${info.prId}` : '/accounting/purchase-quotes',
        actionLabel: 'الرأي المالي في العروض',
        icon: '⚖️',
        badgeLabel: 'عروض أسعار',
        docType: 'QUOTE',
        docNumber: info.docNumber,
        isActionable,
        priority,
      };
    }
    return {
      url: '/accounting',
      actionLabel: 'لوحة الحسابات العامة',
      icon: '💼',
      badgeLabel: 'حسابات',
      docType: 'GENERAL',
      isActionable,
      priority,
    };
  }

  // 5. Site Engineer (مهندس الموقع)
  if (roleSlugs.includes('site_engineer')) {
    if (info.receiptId) {
      return {
        url: `/site-engineer?receipt_id=${info.receiptId}`,
        actionLabel: 'فحص واستلام الموقع',
        icon: '🚚',
        badgeLabel: 'استلام موقع',
        docType: 'RECEIPT',
        docNumber: info.docNumber,
        isActionable,
        priority,
      };
    }
    if (info.prId) {
      const isReturned = type.includes('returned') || title.includes('إعادة للتعديل');
      return {
        url: isReturned ? `/employee/requests/${info.prId}/edit` : `/requests/${info.prId}`,
        actionLabel: isReturned ? 'تعديل الطلب المعاد' : 'تفاصيل طلب الموقع',
        icon: '📋',
        badgeLabel: 'طلب موقع',
        docType: 'PR',
        docNumber: info.docNumber,
        isActionable: isReturned,
        priority,
      };
    }
    return {
      url: '/site-engineer',
      actionLabel: 'استلامات الموقع',
      icon: '🧰',
      badgeLabel: 'موقع',
      docType: 'RECEIPT',
      isActionable,
      priority,
    };
  }

  // 6. Warehouse Keeper (أمين المستودع)
  if (roleSlugs.includes('warehouse_keeper')) {
    if (info.receiptId) {
      return {
        url: `/warehouse?receipt_id=${info.receiptId}`,
        actionLabel: 'إذن فحص واستلام المستودع',
        icon: '📦',
        badgeLabel: 'استلام مستودع',
        docType: 'RECEIPT',
        docNumber: info.docNumber,
        isActionable,
        priority,
      };
    }
    return {
      url: '/warehouse',
      actionLabel: 'إدارة المخزن والمستودع',
      icon: '🏢',
      badgeLabel: 'مستودع',
      docType: 'RECEIPT',
      isActionable,
      priority,
    };
  }

  // 7. Employee / Requester (الموظف / صاحب الطلب)
  if (info.prId) {
    const isReturned = type.includes('returned') || title.includes('إعادة للتعديل');
    const isRejected = type.includes('rejected') || title.includes('مرفوض');
    return {
      url: isReturned ? `/employee/requests/${info.prId}/edit` : `/requests/${info.prId}`,
      actionLabel: isReturned ? 'تعديل الطلب المعاد للتعديل' : (isRejected ? 'معاينة الطلب المرفوض' : 'عرض ومتابعة الطلب'),
      icon: isReturned ? '✏️' : (isRejected ? '🚫' : '📋'),
      badgeLabel: isReturned ? 'معاد للتعديل' : (isRejected ? 'طلب مرفوض' : 'طلبي'),
      docType: 'PR',
      docNumber: info.docNumber,
      isActionable: isReturned,
      priority: isReturned ? 'URGENT' : priority,
    };
  }

  return {
    url: notification.target_url || '/requests',
    actionLabel: 'عرض التفاصيل',
    icon: '🔔',
    badgeLabel: 'إشعار',
    docType: 'GENERAL',
    isActionable,
    priority,
  };
};
