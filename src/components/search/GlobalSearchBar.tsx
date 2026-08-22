import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { getPrimaryRoleSlug } from '../../routes/roleRouting';
import { cachedGetData } from '../../api/client';
import { PurchaseRequest } from '../../types/purchaseRequest';
import { PurchaseOrder } from '../../types/purchaseOrder';
import { LandParcel, SupplierAccountSummary, getLandParcelsApi, getSupplierAccountsApi } from '../../api/supplierFinance';
import { getPurchaseOrdersApi } from '../../api/purchaseOrders';

type SearchCategory = 'ALL' | 'PR' | 'PO' | 'SUPPLIER' | 'PARCEL' | 'PAGE';

interface SearchResultItem {
  id: string;
  type: 'PR' | 'PO' | 'SUPPLIER' | 'PARCEL' | 'PAGE';
  categoryLabel: string;
  title: string;
  subtitle: string;
  badge?: string;
  badgeColor?: string;
  url: string;
  meta?: string;
}

const money = (value: number | string | null | undefined) =>
  `${Number(value || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م`;

export const GlobalSearchBar: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<SearchCategory>('ALL');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  // Cached data for instant search
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierAccountSummary[]>([]);
  const [parcels, setParcels] = useState<LandParcel[]>([]);
  const [hasFetched, setHasFetched] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const primaryRole = getPrimaryRoleSlug(user);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus input on open & load data
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      if (!hasFetched) {
        void loadSearchData();
      }
    } else {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen, hasFetched]);

  const loadSearchData = async () => {
    setLoading(true);
    try {
      const [prRes, poRes, suppRes, parcelRes] = await Promise.allSettled([
        cachedGetData<{ data: PurchaseRequest[] }>('/purchase-requests').then((r) => r.data),
        getPurchaseOrdersApi({ per_page: 50 }).then((r) => r.data),
        getSupplierAccountsApi(),
        getLandParcelsApi(),
      ]);

      if (prRes.status === 'fulfilled') setRequests(prRes.value || []);
      if (poRes.status === 'fulfilled') setOrders(poRes.value || []);
      if (suppRes.status === 'fulfilled') setSuppliers(suppRes.value || []);
      if (parcelRes.status === 'fulfilled') setParcels(parcelRes.value || []);
      setHasFetched(true);
    } catch {
      // Non-blocking
    } finally {
      setLoading(false);
    }
  };

  // Quick navigation pages based on role
  const quickPages: SearchResultItem[] = useMemo(() => [
    { id: 'page-create-pr', type: 'PAGE', categoryLabel: 'صفحة', title: 'إنشاء طلب شراء جديد', subtitle: 'تقديم طلب شراء أصناف أو خدمات', url: '/requests/create', badge: 'طلب جديد', badgeColor: 'bg-cyan-950 text-cyan-300' },
    { id: 'page-my-pr', type: 'PAGE', categoryLabel: 'صفحة', title: 'طلبات الشراء الخاصة بي', subtitle: 'متابعة حالة طلباتي السابقة', url: '/requests', badge: 'طلباتي', badgeColor: 'bg-slate-800 text-slate-300' },
    { id: 'page-supplier-accounts', type: 'PAGE', categoryLabel: 'صفحة', title: 'حسابات الموردين والمديونية', subtitle: 'كشوف الحسابات والأرصدة والدفعات', url: '/accounting/supplier-accounts', badge: 'حسابات', badgeColor: 'bg-emerald-950 text-emerald-300' },
    { id: 'page-supplier-payments', type: 'PAGE', categoryLabel: 'صفحة', title: 'فواتير ودفعات الموردين وقطع الأراضي', subtitle: 'تسجيل الفواتير وتوزيع المصروف على الأراضي', url: '/accounting/supplier-payments', badge: 'فواتير', badgeColor: 'bg-amber-950 text-amber-300' },
    { id: 'page-quotes-proc', type: 'PAGE', categoryLabel: 'صفحة', title: 'إدارة المشتريات وعروض الأسعار', subtitle: 'تجهيز عروض الأسعار ومتابعة أوامر الشراء', url: '/procurement', badge: 'مشتريات', badgeColor: 'bg-indigo-950 text-indigo-300' },
    { id: 'page-warehouse', type: 'PAGE', categoryLabel: 'صفحة', title: 'استلام المواد وفحص المخزن', subtitle: 'إذونات الاستلام ومطابقة الكميات الموردة', url: '/warehouse', badge: 'مخزن', badgeColor: 'bg-amber-950 text-amber-300' },
    { id: 'page-site-eng', type: 'PAGE', categoryLabel: 'صفحة', title: 'اعتماد استلام الموقع (مهندس الموقع)', subtitle: 'المطابقة الفنية واعتماد إذونات الاستلام', url: '/site-engineer', badge: 'موقع', badgeColor: 'bg-cyan-950 text-cyan-300' },
    { id: 'page-gm', type: 'PAGE', categoryLabel: 'صفحة', title: 'لوحة المدير العام والقرارات التنفيذية', subtitle: 'قرارات عروض الأسعار واعتماد أوامر الشراء', url: '/general-manager', badge: 'تنفيذي', badgeColor: 'bg-rose-950 text-rose-300' },
  ], []);

  // Compute filtered search results
  const searchResults: SearchResultItem[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return quickPages.slice(0, 6);
    }

    const results: SearchResultItem[] = [];

    // 1. Match PRs
    if (activeCategory === 'ALL' || activeCategory === 'PR') {
      requests.forEach((pr) => {
        const itemNames = (pr.items || []).map((i) => `${i.item_description || i.item?.name || ''} ${i.item_reference || ''} ${i.region || ''}`).join(' ');
        const textToSearch = `${pr.request_number} ${pr.requester?.name || ''} ${pr.department?.name || ''} ${pr.justification || ''} ${itemNames}`.toLowerCase();
        if (textToSearch.includes(q)) {
          const prUrl = primaryRole === 'reviewer' ? '/reviewer/requests'
            : primaryRole === 'procurement_manager' ? '/procurement/purchase-requests'
            : primaryRole === 'accountant' ? '/accounting/purchase-requests'
            : primaryRole === 'general_manager' ? '/general-manager/purchase-requests'
            : `/requests/${pr.id}`;

          const firstItem = pr.items?.[0];
          const itemsSummary = firstItem ? `${firstItem.item_description || firstItem.item?.name || ''} ${pr.items && pr.items.length > 1 ? `(+${pr.items.length - 1} بنود)` : ''}` : '';

          results.push({
            id: `pr-${pr.id}`,
            type: 'PR',
            categoryLabel: 'طلب شراء',
            title: `${pr.request_number} — ${itemsSummary || pr.department?.name || 'طلب شراء'}`,
            subtitle: `مقدم الطلب: ${pr.requester?.name || '—'} | القسم: ${pr.department?.name || '—'} | تاريخ: ${pr.date_needed || pr.created_at?.split('T')[0] || ''}`,
            badge: pr.status,
            badgeColor: 'bg-cyan-950 text-cyan-300 border border-cyan-800/60',
            url: prUrl,
            meta: firstItem?.item_reference ? `قطعة #${firstItem.item_reference}` : undefined,
          });
        }
      });
    }

    // 2. Match POs
    if (activeCategory === 'ALL' || activeCategory === 'PO') {
      orders.forEach((po) => {
        const textToSearch = `${po.po_number || ''} PO-${po.id} ${po.supplier?.company_name || ''} ${po.status || ''} ${po.currency || ''}`.toLowerCase();
        if (textToSearch.includes(q)) {
          const poUrl = primaryRole === 'general_manager' ? `/general-manager/purchase-orders/${po.id}`
            : primaryRole === 'accountant' ? '/accounting/purchase-orders'
            : `/procurement/purchase-orders/${po.id}`;

          results.push({
            id: `po-${po.id}`,
            type: 'PO',
            categoryLabel: 'أمر شراء',
            title: `${po.po_number || `PO #${po.id}`} — ${po.supplier?.company_name || 'مورد غير محدد'}`,
            subtitle: `الإجمالي: ${money(po.grand_total || po.subtotal)} | الحالة: ${po.status || '—'} | التاريخ: ${po.created_at?.split('T')[0] || ''}`,
            badge: po.status || 'مفتوح',
            badgeColor: 'bg-amber-950 text-amber-300 border border-amber-800/60',
            url: poUrl,
          });
        }
      });
    }

    // 3. Match Suppliers
    if (activeCategory === 'ALL' || activeCategory === 'SUPPLIER') {
      suppliers.forEach((supp) => {
        const textToSearch = `${supp.company_name} ${supp.code || ''} ${supp.email || ''} ${supp.phone || ''}`.toLowerCase();
        if (textToSearch.includes(q)) {
          results.push({
            id: `supp-${supp.supplier_id}`,
            type: 'SUPPLIER',
            categoryLabel: 'مورد',
            title: `${supp.company_name} ${supp.code ? `(${supp.code})` : ''}`,
            subtitle: `الرصيد المستحق: ${money(Math.max(supp.balance, 0))} | الفواتير المفتوحة: ${supp.open_invoices_count} | هاتف: ${supp.phone || '—'}`,
            badge: supp.balance > 0 ? `مديونية: ${money(supp.balance)}` : 'مسدد',
            badgeColor: supp.balance > 0 ? 'bg-amber-950 text-amber-300 border border-amber-800/60' : 'bg-emerald-950 text-emerald-300 border border-emerald-800/60',
            url: `/accounting/supplier-accounts`,
          });
        }
      });
    }

    // 4. Match Land Parcels
    if (activeCategory === 'ALL' || activeCategory === 'PARCEL') {
      parcels.forEach((parcel) => {
        const textToSearch = `${parcel.parcel_reference} ${parcel.region} ${parcel.notes || ''}`.toLowerCase();
        if (textToSearch.includes(q)) {
          results.push({
            id: `parcel-${parcel.id}`,
            type: 'PARCEL',
            categoryLabel: 'قطعة أرض',
            title: `قطعة أرض رقم ${parcel.parcel_reference} — منطقة ${parcel.region}`,
            subtitle: `رصيد العميل المتاح: ${money(parcel.balance)} | ملاحظات: ${parcel.notes || 'لا توجد'}`,
            badge: Number(parcel.balance) < 0 ? 'عجز تمويل' : 'رصيد كافٍ',
            badgeColor: Number(parcel.balance) < 0 ? 'bg-rose-950 text-rose-300 border border-rose-800/60' : 'bg-emerald-950 text-emerald-300 border border-emerald-800/60',
            url: `/accounting/supplier-payments`,
          });
        }
      });
    }

    // 5. Match Quick Pages
    if (activeCategory === 'ALL' || activeCategory === 'PAGE') {
      quickPages.forEach((page) => {
        if (`${page.title} ${page.subtitle}`.toLowerCase().includes(q)) {
          results.push(page);
        }
      });
    }

    return results;
  }, [query, activeCategory, requests, orders, suppliers, parcels, quickPages, primaryRole]);

  // Handle Enter key or click
  const handleSelect = (item: SearchResultItem) => {
    setIsOpen(false);
    navigate(item.url);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (searchResults.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + searchResults.length) % (searchResults.length || 1));
    } else if (e.key === 'Enter' && searchResults[selectedIndex]) {
      e.preventDefault();
      handleSelect(searchResults[selectedIndex]);
    }
  };

  return (
    <>
      {/* Desktop Search Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="hidden md:flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-950/70 px-3 py-1.5 text-xs text-slate-400 hover:border-cyan-500/70 hover:bg-slate-900 hover:text-slate-200 transition-all shadow-inner w-64 lg:w-80 justify-between focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
        title="البحث الشامل في النظام (Ctrl + K)"
      >
        <span className="flex items-center gap-2 truncate">
          <span className="text-cyan-400 text-sm">🔍</span>
          <span className="truncate">بحث عن طلب، أمر شراء، مورد...</span>
        </span>
        <kbd className="shrink-0 rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-400 border border-slate-700">
          Ctrl K
        </kbd>
      </button>

      {/* Mobile Search Trigger Icon */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="md:hidden flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800/80 border border-slate-700 text-cyan-300 hover:text-white"
        aria-label="البحث الشامل"
        title="البحث الشامل"
      >
        🔍
      </button>

      {/* Search Modal */}
      {isOpen && createPortal(
        <div
          className="modal-top-viewport fixed inset-0 z-[10000] flex items-start justify-center overflow-y-auto bg-slate-950/85 p-3 sm:p-6 backdrop-blur-md pt-12 sm:pt-16"
          role="dialog"
          aria-modal="true"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-3xl overflow-hidden rounded-2xl border border-cyan-800/80 bg-slate-900 shadow-2xl animate-fade-in"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleKeyDown}
          >
            {/* Search Input Bar */}
            <div className="flex items-center gap-3 border-b border-slate-800 bg-slate-950 px-4 py-3.5">
              <span className="text-lg text-cyan-400">🔍</span>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                placeholder="ابحث برقم الطلب (PR)، أمر الشراء (PO)، اسم المورد، رقم قطعة الأرض..."
                className="w-full bg-transparent text-sm font-bold text-slate-100 placeholder-slate-500 focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="text-xs font-bold text-slate-500 hover:text-slate-300"
                >
                  مسح
                </button>
              )}
              <kbd className="hidden sm:inline-block rounded bg-slate-800 px-2 py-1 font-mono text-[10px] text-slate-400 border border-slate-700">
                ESC للإغلاق
              </kbd>
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-800/80 bg-slate-950/50 px-4 py-2 text-xs">
              {(
                [
                  { key: 'ALL', label: 'الكل' },
                  { key: 'PR', label: '📋 طلبات الشراء' },
                  { key: 'PO', label: '📑 أوامر الشراء' },
                  { key: 'SUPPLIER', label: '🏢 الموردين' },
                  { key: 'PARCEL', label: '📍 قطع الأراضي' },
                  { key: 'PAGE', label: '⚡ الصفحات' },
                ] as { key: SearchCategory; label: string }[]
              ).map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => {
                    setActiveCategory(cat.key);
                    setSelectedIndex(0);
                  }}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold whitespace-nowrap transition-all ${
                    activeCategory === cat.key
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/80 shadow'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Results List */}
            <div className="max-h-[60vh] overflow-y-auto p-2 space-y-1">
              {loading && searchResults.length === 0 ? (
                <div className="py-10 text-center text-xs font-bold text-cyan-300 animate-pulse">
                  جاري تحميل وفهرسة البيانات...
                </div>
              ) : searchResults.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  <span className="block text-2xl mb-2">🔎</span>
                  لا توجد نتائج مطابقة لـ &quot;<strong className="text-slate-300">{query}</strong>&quot;
                </div>
              ) : (
                searchResults.map((item, index) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`flex items-center justify-between gap-3 rounded-xl p-3 cursor-pointer transition-all ${
                      selectedIndex === index
                        ? 'bg-cyan-950/60 border border-cyan-800/80 shadow-md text-slate-100'
                        : 'hover:bg-slate-800/60 border border-transparent text-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-xs font-bold text-cyan-300 border border-slate-700">
                        {item.type === 'PR' ? '📋' : item.type === 'PO' ? '📑' : item.type === 'SUPPLIER' ? '🏢' : item.type === 'PARCEL' ? '📍' : '⚡'}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black truncate">{item.title}</span>
                          <span className="rounded bg-slate-800 px-1.5 py-0.2 text-[9px] font-bold text-slate-400 shrink-0">
                            {item.categoryLabel}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-400 truncate leading-relaxed">
                          {item.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.badge && (
                        <span className={`rounded-md px-2 py-0.5 text-[10px] font-black ${item.badgeColor || 'bg-slate-800 text-slate-300'}`}>
                          {item.badge}
                        </span>
                      )}
                      <span className="text-xs text-slate-500 font-bold">↵</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer Hints */}
            <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950 px-4 py-2 text-[10px] text-slate-500">
              <div className="flex items-center gap-3">
                <span>استخدم <kbd className="rounded bg-slate-800 px-1 font-mono">↑</kbd> <kbd className="rounded bg-slate-800 px-1 font-mono">↓</kbd> للتنقل</span>
                <span><kbd className="rounded bg-slate-800 px-1 font-mono">Enter</kbd> للاختيار</span>
                <span><kbd className="rounded bg-slate-800 px-1 font-mono">ESC</kbd> للإغلاق</span>
              </div>
              <span className="text-cyan-400 font-bold">{searchResults.length} نتيجة</span>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default GlobalSearchBar;
