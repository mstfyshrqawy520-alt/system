import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getPrimaryRoleSlug, getRoleLabel } from '../../routes/roleRouting';
import { useAuth } from '../../context/AuthContext';
import Breadcrumbs from './Breadcrumbs';

const PAGE_TITLES: Array<{ prefix: string; title: string }> = [
  { prefix: '/notifications', title: 'الإشعارات' },
  { prefix: '/my-archive', title: 'أرشيف إجراءاتي' },
  { prefix: '/profile', title: 'الملف الشخصي' },
  { prefix: '/preferences', title: 'تفضيلات المستخدم' },
  { prefix: '/help', title: 'مركز المساعدة' },
  { prefix: '/requests/create', title: 'إنشاء طلب شراء' },
  { prefix: '/requests', title: 'طلبات الشراء' },
  { prefix: '/admin/system-monitor', title: 'مراقبة النظام والـDeploy' },
  { prefix: '/admin', title: 'إدارة النظام' },
  { prefix: '/reviewer/purchase-quotes', title: 'ترشيح عروض الأسعار' },
  { prefix: '/reviewer/requests', title: 'طلبات المراجعة' },
  { prefix: '/reviewer', title: 'لوحة المراجعة' },
  { prefix: '/procurement/purchase-orders', title: 'أوامر الشراء' },
  { prefix: '/procurement/approved-requests', title: 'الطلبات المعتمدة للمشتريات' },
  { prefix: '/procurement/suppliers', title: 'إدارة موردي المشتريات' },
  { prefix: '/procurement/reports', title: 'تقارير وتحليلات المشتريات' },
  { prefix: '/procurement', title: 'لوحة المشتريات' },
  { prefix: '/accounting/supplier-payments', title: 'فواتير ودفعات الموردين' },
  { prefix: '/accounting/supplier-accounts', title: 'حسابات الموردين' },
  { prefix: '/accounting/purchase-orders', title: 'أوامر الشراء للحسابات' },
  { prefix: '/accounting/purchase-requests', title: 'موافقات الطلبات المالية' },
  { prefix: '/accounting', title: 'لوحة المحاسبة' },
  { prefix: '/general-manager/purchase-orders', title: 'أوامر الشراء الصادرة' },
  { prefix: '/general-manager/purchase-quotes', title: 'قرار عروض الأسعار' },
  { prefix: '/general-manager/purchase-requests', title: 'طلبات القرار التنفيذي' },
  { prefix: '/general-manager', title: 'لوحة المدير العام' },
  { prefix: '/warehouse', title: 'استلام المواد' },
  { prefix: '/site-engineer', title: 'اعتماد استلام الموقع' },
  { prefix: '/employee', title: 'لوحة الموظف' },
];

export const getPageTitle = (pathname: string): string => {
  return PAGE_TITLES.find(({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`))?.title || 'نظام المشتريات';
};

const getPageHint = (title: string): string => {
  if (title === 'نظام المشتريات') return 'شركة اشبيلية للتطوير العقاري والمقاولات';
  return 'راجع البيانات المتاحة للدور الحالي، ونفّذ الإجراء المسموح به فقط.';
};

export const PageHeader: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const title = useMemo(() => getPageTitle(location.pathname), [location.pathname]);
  const roleLabel = getRoleLabel(getPrimaryRoleSlug(user));

  return (
    <div className="mb-4 border-b border-slate-800/80 pb-3" dir="rtl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Breadcrumbs />
          <div className="mt-2 flex min-w-0 items-start gap-2">
            <h1 className="min-w-0 break-words text-base font-black text-slate-100 sm:text-lg">{title}</h1>
            <span className="shrink-0 rounded-full border border-cyan-800/70 bg-cyan-950/50 px-2 py-1 text-[10px] font-bold text-cyan-300">{roleLabel}</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">{getPageHint(title)}</p>
        </div>
        {location.pathname !== '/' && location.pathname !== '/protected' && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/70 px-3 text-xs font-bold text-slate-300 hover:border-cyan-700 hover:text-white sm:w-auto"
            aria-label="العودة إلى الصفحة السابقة"
          >
            <span aria-hidden="true">→</span>
            <span>رجوع</span>
            <span aria-hidden="true">‹</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default PageHeader;
