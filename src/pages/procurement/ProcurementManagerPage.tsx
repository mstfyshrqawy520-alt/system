import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { usePersistedState } from '../../hooks/usePersistedState';
import {
  approveProcurementPrApi,
  createDirectPoApi,
  getApprovedByProcurementPrsApi,
  getPendingProcurementApprovalApi,
  getPendingQuoteRequestsApi,
  getProcurementAnalyticsApi,
  getProcurementDepartmentsApi,
  getProcurementCatalogItemsApi,
  rejectProcurementPrApi,
  ProcurementAnalyticsResponse,
  ProcurementCatalogItemOption,
  ProcurementDepartmentOption,
  DirectAccountingFinancialData,
} from '../../api/procurement';
import { getPurchaseOrderApi, getPurchaseOrdersApi, PurchaseOrderPaginationMeta } from '../../api/purchaseOrders';
import { createSupplierApi, deleteSupplierApi, getSuppliersApi, SupplierPayload, updateSupplierApi } from '../../api/suppliers';
import { PurchaseOrder, المورد } from '../../types/purchaseOrder';
import { PurchaseRequest } from '../../types/purchaseRequest';
import PurchaseOrderPrintModal from '../../components/procurement/PurchaseOrderPrintModal';
import ReportPrintModal from '../../components/procurement/ReportPrintModal';
import SupplierModal from '../../components/procurement/SupplierModal';
import DirectPoModal from '../../components/procurement/DirectPoModal';
import DirectAccountingReviewModal from '../../components/procurement/DirectAccountingReviewModal';
import PurchaseQuotesModal from '../../components/procurement/PurchaseQuotesModal';
import ProcurementCharts from '../../components/procurement/ProcurementCharts';
import { getUnitLabel } from '../../utils/units';
import { parseApiError } from '../../utils/apiError';
import ErrorMessage from '../../components/ErrorMessage';
import { TableSkeleton } from '../../components/ui/StateFeedback';
import TableFilterBar from '../../components/ui/TableFilterBar';
import PaginationControls from '../../components/ui/PaginationControls';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Button } from '../../components/ui/Button';
import { Card, KpiCard } from '../../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { getDefaultDateFrom, getTodayInputDate, isDefaultTodayRange } from '../../utils/dateFilters';
import { CurrencyDisplay } from '../../components/ui/CurrencyDisplay';

const STATUS_LABELS: Record<string, string> = {
  PO_DRAFT: 'مسودة',
  ISSUED: 'تم الإصدار',
  PENDING_ACCOUNTING_REVIEW: 'بانتظار الحسابات',
  RETURNED_TO_PROCUREMENT: 'معاد للمشتريات',
  FINAL_APPROVED: 'اعتماد نهائي',
  REJECTED: 'مرفوض',
  APPROVED_BY_REVIEWER: 'معتمد من المراجع',
  PENDING_PROCUREMENT_APPROVAL: 'بانتظار اعتماد المشتريات',
  PENDING_ACCOUNTING_APPROVAL: 'بانتظار الموافقة المالية',
  APPROVED_BY_ACCOUNTING: 'معتمد ماليًا — جاهز للمشتريات',
  PENDING_QUOTE_RECOMMENDATIONS: 'بانتظار تجهيز عروض الأسعار',
  PENDING_EXECUTIVE_QUOTE_DECISION: 'بانتظار قرار العروض',
  APPROVED_BY_PROCUREMENT: 'معتمد من المشتريات',
  SUBMITTED: 'مقدم',
  UNDER_REVIEW: 'قيد المراجعة',
  DRAFT: 'مسودة طلب',
};

const fmtDate = (value?: string | null) => value ? new Date(value).toLocaleDateString('ar-EG') : '—';
const fmtAmount = (value?: string | number | null) => Number(value || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const statusLabel = (status: string) => STATUS_LABELS[status] || status;
const reviewerName = (request: PurchaseRequest, departments: ProcurementDepartmentOption[]) => request.approval_history?.find((entry) => entry.action === 'APPROVED_BY_REVIEWER')?.actor?.name || request.assigned_reviewer?.name || departments.find((department) => department.id === request.department?.id || department.name === request.department?.name)?.manager?.name || '—';

type ProcurementQueueStage = 'PENDING_ROUTE' | 'QUOTE_SETUP' | 'READY_FOR_PO';

type ProcurementQueueRow = {
  request: PurchaseRequest;
  stage: ProcurementQueueStage;
};

const QUEUE_STAGE_LABELS: Record<ProcurementQueueStage, string> = {
  PENDING_ROUTE: 'بانتظار اختيار المسار',
  QUOTE_SETUP: 'بانتظار تجهيز عروض الأسعار',
  READY_FOR_PO: 'جاهز لإنشاء أمر شراء',
};

type ReportLine = {
  id?: number;
  item_id?: number | null;
  item_description?: string | null;
  item_name?: string | null;
  item_reference?: string | null;
  region?: string | null;
  uom?: string | null;
  quantity?: string | number | null;
  unit_price?: string | number | null;
  line_total?: string | number | null;
  grand_total?: string | number | null;
};

export const ProcurementManagerPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = usePersistedState<number>('procurement.active-tab.v1', 0);
  const [pendingPrs, setPendingPrs] = useState<PurchaseRequest[]>([]);
  const [quotePrs, setQuotePrs] = useState<PurchaseRequest[]>([]);
  const [approvedPrs, setApprovedPrs] = useState<PurchaseRequest[]>([]);
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [poPage, setPoPage] = useState(1);
  const [poMeta, setPoMeta] = useState<PurchaseOrderPaginationMeta>({ current_page: 1, from: null, last_page: 1, per_page: 15, to: null, total: 0 });
  const [poDetails, setPoDetails] = useState<Record<number, PurchaseOrder>>({});
  const [suppliers, setSuppliers] = useState<المورد[]>([]);
  const [departments, setDepartments] = useState<ProcurementDepartmentOption[]>([]);
  const [catalogItems, setCatalogItems] = useState<ProcurementCatalogItemOption[]>([]);
  const [analytics, setAnalytics] = useState<ProcurementAnalyticsResponse | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedRef = useRef(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const today = getTodayInputDate();
  const defaultDateFrom = getDefaultDateFrom();
  const [queueSearch, setQueueSearch] = usePersistedState('procurement.queue-search.v1', '');
  const [queueDepartment, setQueueDepartment] = usePersistedState('procurement.queue-department.v1', 'ALL');
  const [queueRoute, setQueueRoute] = usePersistedState('procurement.queue-route.v1', 'ALL');
  const [queueStage, setQueueStage] = usePersistedState('procurement.queue-stage.v1', 'ALL');
  const [queuePriority, setQueuePriority] = usePersistedState('procurement.queue-priority.v1', 'ALL');
  const [queueDateFrom, setQueueDateFrom] = usePersistedState('procurement.queue-date-from.v1', defaultDateFrom);
  const [queueDateTo, setQueueDateTo] = usePersistedState('procurement.queue-date-to.v1', today);
  const [poSearch, setPoSearch] = usePersistedState('procurement.po-search.v1', '');
  const [poStatus, setPoStatus] = usePersistedState('procurement.po-status.v1', 'ALL');
  const [poSupplier, setPoSupplier] = usePersistedState('procurement.po-supplier.v1', 'ALL');
  const [poDateFrom, setPoDateFrom] = usePersistedState('procurement.po-date-from.v3', defaultDateFrom);
  const [poDateTo, setPoDateTo] = usePersistedState('procurement.po-date-to.v3', today);
  const [supplierSearch, setSupplierSearch] = usePersistedState('procurement.supplier-search.v1', '');
  const [supplierStatus, setSupplierStatus] = usePersistedState('procurement.supplier-status.v1', 'ALL');
  const [reportPeriod, setReportPeriod] = usePersistedState('procurement.report-period.v1', 'all');
  const [reportStatus, setReportStatus] = usePersistedState('procurement.report-status.v1', '');
  const [reportDateFrom, setReportDateFrom] = usePersistedState('procurement.report-date-from.v3', defaultDateFrom);
  const [reportDateTo, setReportDateTo] = usePersistedState('procurement.report-date-to.v3', today);
  const [reportDepartment, setReportDepartment] = usePersistedState('procurement.report-department.v1', 'ALL');
  const [reportSupplier, setReportSupplier] = usePersistedState('procurement.report-supplier.v1', 'ALL');
  const [reportItem, setReportItem] = usePersistedState('procurement.report-item.v1', 'ALL');
  const [reportSearch, setReportSearch] = usePersistedState('procurement.report-search.v1', '');
  const ignoreDefaultPoDateForSearch = Boolean(poSearch.trim()) && isDefaultTodayRange(poDateFrom, poDateTo);

  const [directPoOpen, setDirectPoOpen] = useState(false);
  const [quoteRequest, setQuoteRequest] = useState<PurchaseRequest | null>(null);
  const [selectedPrintPo, setSelectedPrintPo] = useState<PurchaseOrder | null>(null);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<المورد | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<المورد | null>(null);
  const [deletingSupplier, setDeletingSupplier] = useState(false);
  const [reportPrintOpen, setReportPrintOpen] = useState(false);
  const [directAccountingRequest, setDirectAccountingRequest] = useState<PurchaseRequest | null>(null);
  const [directAccountingSubmitting, setDirectAccountingSubmitting] = useState(false);

  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/purchase-requests')) setActiveTab(0);
    else if (path.includes('/purchase-orders')) setActiveTab(1);
    else if (path.includes('/suppliers')) setActiveTab(3);
    else if (path.includes('/reports')) setActiveTab(4);
    else setActiveTab(0);
  }, [location.pathname]);

  const loadData = async () => {
    const isInitialLoad = !hasLoadedRef.current;
    if (isInitialLoad) setLoading(true);
    else setRefreshing(true);
    setPageError(null);
    const loadErrors: string[] = [];
    const safeLoad = async <T,>(label: string, loader: Promise<T>, fallback: T): Promise<T> => {
      try {
        return await loader;
      } catch (error) {
        loadErrors.push(`${label}: ${parseApiError(error).message}`);
        return fallback;
      }
    };

    try {
      const [pending, quotePending, approved, ordersPage, supplierData, departmentData, catalogData, report] = await Promise.all([
        safeLoad('طلبات الاعتماد', getPendingProcurementApprovalApi(), []),
        safeLoad('عروض الأسعار', getPendingQuoteRequestsApi(), []),
        safeLoad('الطلبات المعتمدة', getApprovedByProcurementPrsApi(), []),
        safeLoad('أوامر الشراء', getPurchaseOrdersApi({
          page: poPage,
          per_page: 15,
          ...(poSearch.trim() ? { search: poSearch.trim() } : {}),
          ...(poStatus !== 'ALL' ? { status: poStatus } : {}),
          ...(poSupplier !== 'ALL' ? { supplier_id: Number(poSupplier) } : {}),
          ...(poDateFrom && !ignoreDefaultPoDateForSearch ? { date_from: poDateFrom } : {}),
          ...(poDateTo && !ignoreDefaultPoDateForSearch ? { date_to: poDateTo } : {}),
        }), null),
        safeLoad('الموردون', getSuppliersApi(), []),
        safeLoad('الأقسام', getProcurementDepartmentsApi(), []),
        safeLoad('كتالوج الأصناف', getProcurementCatalogItemsApi(), []),
        safeLoad('تحليلات المشتريات', getProcurementAnalyticsApi(reportPeriod, reportStatus || undefined), null),
      ]);

      setPendingPrs(pending || []);
      setQuotePrs(quotePending || []);
      setApprovedPrs(approved || []);
      setPos(ordersPage?.data || []);
      if (ordersPage?.meta) setPoMeta(ordersPage.meta);
      setSuppliers(supplierData || []);
      setDepartments(departmentData || []);
      setCatalogItems(catalogData || []);
      setAnalytics(report);
      if (report) setAnalyticsError(null);
      if (loadErrors.length) {
        const message = `تعذر تحميل بعض بيانات لوحة المشتريات: ${loadErrors.join(' — ')}`;
        setPageError(message);
        if (!report) setAnalyticsError(loadErrors.find((error) => error.startsWith('تحليلات المشتريات')) || null);
      }
    } catch (error) {
      setPageError(parseApiError(error).message);
    } finally {
      if (isInitialLoad) {
        hasLoadedRef.current = true;
        setLoading(false);
      }
      setRefreshing(false);
    }
  };

  useEffect(() => { void loadData(); }, []);

  useEffect(() => {
    const requestId = Number(searchParams.get('open') || 0);
    if (!requestId || loading) return;
    const request = [...pendingPrs, ...quotePrs, ...approvedPrs].find((item) => item.id === requestId);
    if (!request) return;
    setActiveTab(0);
    setQueueSearch(request.request_number);
    setSearchParams((current) => {
      current.delete('open');
      return current;
    }, { replace: true });
  }, [loading, pendingPrs, quotePrs, approvedPrs, searchParams, setSearchParams]);

  useEffect(() => {
    if (!hasLoadedRef.current) return;
    let cancelled = false;
    setRefreshing(true);
    getPurchaseOrdersApi({
      page: poPage,
      per_page: 15,
      ...(poSearch.trim() ? { search: poSearch.trim() } : {}),
      ...(poStatus !== 'ALL' ? { status: poStatus } : {}),
      ...(poSupplier !== 'ALL' ? { supplier_id: Number(poSupplier) } : {}),
      ...(poDateFrom ? { date_from: poDateFrom } : {}),
      ...(poDateTo ? { date_to: poDateTo } : {}),
    })
      .then((result) => { if (!cancelled) { setPos(result.data || []); setPoMeta(result.meta); } })
      .catch((error) => { if (!cancelled) { const message = parseApiError(error).message; setPageError(message); } })
      .finally(() => { if (!cancelled) setRefreshing(false); });
    return () => { cancelled = true; };
  }, [poPage, poSearch, poStatus, poSupplier, poDateFrom, poDateTo]);

  const handleStartQuotes = async (request: PurchaseRequest) => {
    setRefreshing(true);
    try {
      await approveProcurementPrApi(request.id, { use_quotes: true });
      await loadData();
    } catch (error) {
      setPageError(parseApiError(error).message);
    } finally {
      setRefreshing(false);
    }
  };

  const handleReject = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من رفض هذا الطلب؟')) return;
    setRefreshing(true);
    try {
      await rejectProcurementPrApi(id, 'تم الرفض بواسطة مدير المشتريات');
      await loadData();
    } catch (error) {
      setPageError(parseApiError(error).message);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSendDirectToAccounting = async (request: PurchaseRequest, financialData: DirectAccountingFinancialData) => {
    setDirectAccountingSubmitting(true);
    try {
      await approveProcurementPrApi(request.id, {
        use_quotes: false,
        financial_data: financialData,
      });
      setDirectAccountingRequest(null);
      await loadData();
    } catch (error) {
      setPageError(parseApiError(error).message);
    } finally {
      setDirectAccountingSubmitting(false);
    }
  };

  const handlePrintPo = async (po: PurchaseOrder) => {
    setRefreshing(true);
    try {
      const fullPo = await getPurchaseOrderApi(po.id);
      setSelectedPrintPo(fullPo);
    } catch (error) {
      setPageError(parseApiError(error).message);
    } finally {
      setRefreshing(false);
    }
  };

  const openAddSupplier = () => { setEditingSupplier(null); setSupplierModalOpen(true); };
  const openEditSupplier = (supplier: المورد) => { setEditingSupplier(supplier); setSupplierModalOpen(true); };
  const deleteSupplier = (supplier: المورد) => { setSupplierToDelete(supplier); };
  const confirmDeleteSupplier = async () => {
    if (!supplierToDelete) return;
    setDeletingSupplier(true);
    try {
      await deleteSupplierApi(supplierToDelete.id);
      setSupplierToDelete(null);
      await loadData();
    } catch (error) {
      setPageError(parseApiError(error).message);
    } finally {
      setDeletingSupplier(false);
    }
  };

  const retryAnalytics = async () => { await loadData(); };
  const clearPoFilters = () => { setPoSearch(''); setPoStatus('ALL'); setPoSupplier('ALL'); setPoDateFrom(defaultDateFrom); setPoDateTo(today); setPoPage(1); };
  const clearSupplierFilters = () => { setSupplierSearch(''); setSupplierStatus('ALL'); };
  const clearReportFilters = () => { setReportSearch(''); setReportDepartment('ALL'); setReportSupplier('ALL'); setReportItem('ALL'); setReportDateFrom(defaultDateFrom); setReportDateTo(today); };

  const exportReportCsv = () => {
    if (!filteredReportPos.length) return;
    const headers = ['رقم الأمر', 'التاريخ', 'المورد', 'القسم', 'الإجمالي'];
    const rows = filteredReportPos.map(po => [
      po.po_number,
      fmtDate(po.updated_at),
      po.supplier?.company_name || '—',
      po.department?.name || po.purchase_request?.department?.name || '—',
      po.grand_total
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `procurement_report_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSelectedQuote = (request: PurchaseRequest) => request.selected_quote || request.quotes?.find((quote) => (quote as typeof quote & { is_selected?: boolean }).is_selected || quote.status === 'SELECTED');
  const getReportItems = (po: PurchaseOrder): ReportLine[] => {
    if (po.items?.length) return po.items;
    if (po.purchase_request?.items?.length) return po.purchase_request.items;
    return [];
  };

  const containsText = (text: string | null | undefined, search: string) => !search || (text || '').toLocaleLowerCase('ar-EG').includes(search.toLocaleLowerCase('ar-EG'));

  const queueRows = useMemo((): ProcurementQueueRow[] => [
    ...pendingPrs.map(request => ({ request, stage: 'PENDING_ROUTE' as const })),
    ...quotePrs.map(request => ({ request, stage: 'QUOTE_SETUP' as const })),
    ...approvedPrs.map(request => ({ request, stage: 'READY_FOR_PO' as const })),
  ], [pendingPrs, quotePrs, approvedPrs]);

  const filteredQueueRows = useMemo(() => queueRows.filter(({ request, stage }) => {
    const search = queueSearch.trim();
    const matchesSearch = !search ||
      containsText(request.request_number, search) ||
      containsText(request.requester?.name, search) ||
      containsText(request.department?.name, search) ||
      containsText(request.target_department?.name, search) ||
      request.items?.some(item => containsText(item.item?.name || item.item_description, search) || containsText(item.item_reference, search) || containsText(item.region, search));

    const matchesDept = queueDepartment === 'ALL' || request.department?.id === Number(queueDepartment) || request.department?.name === queueDepartment;
    const matchesRoute = queueRoute === 'ALL' || (queueRoute === 'UNDECIDED' && !request.procurement_route) || request.procurement_route === queueRoute;
    const matchesStage = queueStage === 'ALL' || stage === queueStage;
    const matchesPriority = queuePriority === 'ALL' || request.priority === queuePriority;
    const reqDate = String(request.created_at || '').slice(0, 10);
    const matchesDate = (!queueDateFrom || reqDate >= queueDateFrom) && (!queueDateTo || reqDate <= queueDateTo);

    return matchesSearch && matchesDept && matchesRoute && matchesStage && matchesPriority && matchesDate;
  }), [queueRows, queueSearch, queueDepartment, queueRoute, queueStage, queuePriority, queueDateFrom, queueDateTo]);

  const filteredPos = pos;
  const filteredSuppliers = suppliers.filter(s => {
    const search = supplierSearch.trim();
    const matchesSearch = !search || containsText(s.company_name, search) || containsText(s.code, search) || containsText(s.email, search) || containsText(s.phone, search);
    const matchesStatus = supplierStatus === 'ALL' || (supplierStatus === 'active' ? s.is_active : !s.is_active);
    return matchesSearch && matchesStatus;
  });

  const filteredReportPos = useMemo(() => {
    return pos.filter((po) => {
      const search = reportSearch.trim();
      const matchesSearch = !search || containsText(po.po_number, search) || containsText(po.supplier?.company_name, search) || containsText(po.department?.name || po.purchase_request?.department?.name, search) || containsText(po.requested_by?.name || po.purchase_request?.requester?.name, search);
      const matchesDept = reportDepartment === 'ALL' || po.department?.id === Number(reportDepartment) || po.department?.name === reportDepartment || po.purchase_request?.department?.id === Number(reportDepartment);
      const matchesSup = reportSupplier === 'ALL' || po.supplier_id === Number(reportSupplier);
      const matchesItem = reportItem === 'ALL' || po.items?.some((item) => item.item_id === Number(reportItem));
      const poDate = String(po.updated_at || '').slice(0, 10);
      const matchesDate = (!reportDateFrom || poDate >= reportDateFrom) && (!reportDateTo || poDate <= reportDateTo);
      return matchesSearch && matchesDept && matchesSup && matchesItem && matchesDate;
    });
  }, [pos, reportSearch, reportDepartment, reportSupplier, reportItem, reportDateFrom, reportDateTo]);

  const reportTotals = useMemo(() => {
    const totalValue = filteredReportPos.reduce((sum, po) => sum + Number(po.grand_total || 0), 0);
    const totalQuantity = filteredReportPos.reduce((sum, po) => sum + getReportItems(po).reduce((s, i) => s + Number(i.quantity || 0), 0), 0);
    const supplierCount = new Set(filteredReportPos.map(po => po.supplier?.company_name || 'غير محدد')).size;
    return { totalValue, totalQuantity, supplierCount, averageValue: filteredReportPos.length ? totalValue / filteredReportPos.length : 0 };
  }, [filteredReportPos]);

  const reportDepartmentBreakdown = useMemo(() => {
    const map: Record<string, { name: string, count: number, total: number }> = {};
    filteredReportPos.forEach(po => {
      const name = po.department?.name || po.purchase_request?.department?.name || 'غير محدد';
      if (!map[name]) map[name] = { name, count: 0, total: 0 };
      map[name].count++;
      map[name].total += Number(po.grand_total || 0);
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filteredReportPos]);

  const reportSupplierBreakdown = useMemo(() => {
    const map: Record<string, { name: string, count: number, total: number }> = {};
    filteredReportPos.forEach(po => {
      const name = po.supplier?.company_name || 'غير محدد';
      if (!map[name]) map[name] = { name, count: 0, total: 0 };
      map[name].count++;
      map[name].total += Number(po.grand_total || 0);
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filteredReportPos]);

  const departmentOptions = departments.map(d => ({ value: String(d.id), label: d.name }));
  const supplierOptions = suppliers.map(s => ({ value: String(s.id), label: s.company_name }));
  const poStatuses = Array.from(new Set(pos.map(po => po.status)));

  const selectedQuotePrs = approvedPrs.filter((pr) => Boolean(getSelectedQuote(pr)));

  if (loading) return <div className="min-h-[400px] p-8"><TableSkeleton rows={8} columns={6} /></div>;

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-100">لوحة إدارة المشتريات</h1>
          <p className="mt-1 text-xs text-slate-400">راجع الطلبات المتاحة للدور الحالي، ونفّذ الإجراء المسموح به فقط.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant={activeTab === 0 ? 'primary' : 'secondary'} size="sm" onClick={() => navigate('/procurement/purchase-requests')}>الطلبات المعلقة ({queueRows.length})</Button>
          <Button variant={activeTab === 2 ? 'primary' : 'secondary'} size="sm" onClick={() => setActiveTab(2)}>الأسعار المعتمدة ({selectedQuotePrs.length})</Button>
          <Button variant={activeTab === 1 ? 'primary' : 'secondary'} size="sm" onClick={() => navigate('/procurement/purchase-orders')}>أرشيف أوامر الشراء</Button>
          <Button variant={activeTab === 3 ? 'primary' : 'secondary'} size="sm" onClick={() => navigate('/procurement/suppliers')}>إدارة الموردين</Button>
          <Button variant={activeTab === 4 ? 'primary' : 'secondary'} size="sm" onClick={() => navigate('/procurement/reports')}>التقارير والتحليلات</Button>
        </div>
      </div>

      {pageError && <ErrorMessage error={pageError} onDismiss={() => setPageError(null)} onRetry={() => void loadData()} />}

      {activeTab === 0 && (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 border-b border-slate-800 pb-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-base font-bold text-cyan-300">طابور طلبات المشتريات الموحد ({filteredQueueRows.length} من {queueRows.length})</h2>
              <p className="mt-1 text-xs leading-6 text-slate-400">كل الطلبات الواردة للمشتريات في جدول واحد. يوضح الجدول المسار والمرحلة الحالية، ويعرض الإجراء المتاح حسب حالة الطلب.</p>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] font-bold">
              <span className="rounded-full border border-cyan-700/50 bg-cyan-950/30 px-3 py-1.5 text-cyan-300">اختيار المسار: {queueRows.filter((row) => row.stage === 'PENDING_ROUTE').length}</span>
              <span className="rounded-full border border-amber-700/50 bg-amber-950/30 px-3 py-1.5 text-amber-300">تجهيز العروض: {queueRows.filter((row) => row.stage === 'QUOTE_SETUP').length}</span>
              <span className="rounded-full border border-emerald-700/50 bg-emerald-950/30 px-3 py-1.5 text-emerald-300">جاهز لأمر الشراء: {queueRows.filter((row) => row.stage === 'READY_FOR_PO').length}</span>
            </div>
          </div>

          <TableFilterBar
            searchValue={queueSearch}
            onSearchChange={setQueueSearch}
            searchPlaceholder="بحث برقم الطلب أو الموظف أو القسم أو الصنف أو رقم قطعة الأرض أو المنطقة..."
            selects={[
              { label: 'القسم المصدر', value: queueDepartment, onChange: setQueueDepartment, options: [{ value: 'ALL', label: 'كل الأقسام' }, ...departmentOptions] },
              { label: 'مسار الشراء', value: queueRoute, onChange: setQueueRoute, options: [{ value: 'ALL', label: 'كل المسارات' }, { value: 'UNDECIDED', label: 'لم يتم تحديده' }, { value: 'DIRECT', label: 'شراء مباشر' }, { value: 'QUOTES', label: 'عروض أسعار' }] },
              { label: 'مرحلة التنفيذ', value: queueStage, onChange: setQueueStage, options: [{ value: 'ALL', label: 'كل المراحل' }, { value: 'PENDING_ROUTE', label: QUEUE_STAGE_LABELS.PENDING_ROUTE }, { value: 'QUOTE_SETUP', label: QUEUE_STAGE_LABELS.QUOTE_SETUP }, { value: 'READY_FOR_PO', label: QUEUE_STAGE_LABELS.READY_FOR_PO }] },
              { label: 'الأولوية', value: queuePriority, onChange: setQueuePriority, options: [{ value: 'ALL', label: 'كل الأولويات' }, { value: 'URGENT', label: 'عاجل جدًا' }, { value: 'HIGH', label: 'عالي' }, { value: 'NORMAL', label: 'عادي' }, { value: 'LOW', label: 'منخفض' }] },
            ]}
            dateFrom={queueDateFrom}
            dateTo={queueDateTo}
            onDateFromChange={setQueueDateFrom}
            onDateToChange={setQueueDateTo}
            onClear={() => { setQueueSearch(''); setQueueDepartment('ALL'); setQueueRoute('ALL'); setQueueStage('ALL'); setQueuePriority('ALL'); setQueueDateFrom(defaultDateFrom); setQueueDateTo(today); }}
            hasActiveFilters={Boolean(queueSearch || queueDepartment !== 'ALL' || queueRoute !== 'ALL' || queueStage !== 'ALL' || queuePriority !== 'ALL' || queueDateFrom !== defaultDateFrom || queueDateTo !== today)}
            resultCount={filteredQueueRows.length}
            totalCount={queueRows.length}
            resultLabel="طلب"
          />

          <div className="hidden overflow-x-auto rounded-xl border border-slate-800/80 sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الطلب</TableHead>
                  <TableHead>المرحلة الحالية</TableHead>
                  <TableHead>مسار الشراء</TableHead>
                  <TableHead>القسم المصدر</TableHead>
                  <TableHead>القسم المستهدف</TableHead>
                  <TableHead>الصنف / الكمية</TableHead>
                  <TableHead>رقم قطعة الأرض</TableHead>
                  <TableHead>المنطقة</TableHead>
                  <TableHead>المورد</TableHead>
                  <TableHead>مقدم الطلب</TableHead>
                  <TableHead>رئيس القسم</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="text-center">الإجراء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQueueRows.length === 0 ? (
                  <TableRow><TableCell colSpan={14} className="py-10 text-center text-slate-400">{queueRows.length ? 'لم نجد طلبات مطابقة للفلاتر الحالية.' : 'لا توجد طلبات واردة للمشتريات ضمن الفترة المحددة.'}</TableCell></TableRow>
                ) : filteredQueueRows.map(({ request, stage }) => {
                  const itemNames = request.items?.map((item) => item.item?.name || item.item_description).filter(Boolean).join('، ') || '—';
                  const quantities = request.items?.map((item) => `${item.quantity || '—'} ${getUnitLabel(item.uom)}`).join('، ') || '—';
                  const parcelReferences = request.items?.map((item) => item.item_reference).filter(Boolean).join('، ') || '—';
                  const regions = request.items?.map((item) => item.region).filter(Boolean).join('، ') || '—';
                  const supplier = request.direct_supplier?.company_name || getSelectedQuote(request)?.supplier?.company_name || '—';
                  const stageClass = stage === 'PENDING_ROUTE' ? 'bg-cyan-400/15 text-cyan-300' : stage === 'QUOTE_SETUP' ? 'bg-amber-400/15 text-amber-300' : 'bg-emerald-400/15 text-emerald-300';
                  const route = request.procurement_route === 'DIRECT' ? 'شراء مباشر' : request.procurement_route === 'QUOTES' ? 'عروض أسعار' : 'لم يحدد';
                  return (
                    <TableRow key={`${stage}-${request.id}`}>
                      <TableCell className="font-mono font-bold text-cyan-300">{request.request_number}</TableCell>
                      <TableCell><span className={`whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-bold ${stageClass}`}>{QUEUE_STAGE_LABELS[stage]}</span></TableCell>
                      <TableCell><span className="whitespace-nowrap font-bold text-slate-200">{route}</span></TableCell>
                      <TableCell>{request.department?.name || '—'}</TableCell>
                      <TableCell className="font-bold text-cyan-300">{request.target_department?.name || '—'}</TableCell>
                      <TableCell><div className="max-w-[230px] font-bold text-slate-100">{itemNames}</div><div className="mt-1 text-xs text-slate-400">{quantities}{request.items && request.items.length > 1 ? ` — ${request.items.length} بنود` : ''}</div></TableCell>
                      <TableCell className="font-mono text-cyan-300">{parcelReferences}</TableCell>
                      <TableCell>{regions}</TableCell>
                      <TableCell className="font-bold text-emerald-300">{supplier}</TableCell>
                      <TableCell>{request.requester?.name || '—'}</TableCell>
                      <TableCell>{reviewerName(request, departments)}</TableCell>
                      <TableCell className="font-mono">{fmtDate(request.created_at)}</TableCell>
                      <TableCell><span className="whitespace-nowrap">{statusLabel(request.status)}</span></TableCell>
                      <TableCell className="text-center">
                        <div className="flex min-w-[280px] flex-wrap justify-center gap-2">
                          {stage === 'PENDING_ROUTE' && <>
                            <Button variant="primary" size="sm" onClick={() => void handleStartQuotes(request)}>بدء عروض الأسعار</Button>
                            <Button variant="secondary" size="sm" onClick={() => setDirectAccountingRequest(request)}>إرسال للحسابات بدون عروض</Button>
                            <Button variant="danger" size="sm" onClick={() => void handleReject(request.id)}>رفض</Button>
                          </>}
                          {stage === 'QUOTE_SETUP' && <Button variant="primary" size="sm" onClick={() => setQuoteRequest(request)}>إدخال عروض الأسعار</Button>}
                          {stage === 'READY_FOR_PO' && <Button variant="primary" size="sm" onClick={() => navigate(`/procurement/purchase-orders/create?pr=${request.id}${getSelectedQuote(request)?.id ? `&quote=${getSelectedQuote(request)?.id}` : ''}`)}>إنشاء أمر شراء</Button>}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-3 sm:hidden">
            {filteredQueueRows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-700 px-3 py-8 text-center text-xs text-slate-400">{queueRows.length ? 'لم نجد طلبات مطابقة للفلاتر الحالية.' : 'لا توجد طلبات واردة للمشتريات ضمن الفترة المحددة.'}</div>
            ) : filteredQueueRows.map(({ request, stage }) => {
              const itemNames = request.items?.map((item) => item.item?.name || item.item_description).filter(Boolean).join('، ') || '—';
              const quantities = request.items?.map((item) => `${item.quantity || '—'} ${getUnitLabel(item.uom)}`).join('، ') || '—';
              const parcelReferences = request.items?.map((item) => item.item_reference).filter(Boolean).join('، ') || '—';
              const regions = request.items?.map((item) => item.region).filter(Boolean).join('، ') || '—';
              const supplier = request.direct_supplier?.company_name || getSelectedQuote(request)?.supplier?.company_name || '—';
              const stageClass = stage === 'PENDING_ROUTE' ? 'bg-cyan-400/15 text-cyan-300' : stage === 'QUOTE_SETUP' ? 'bg-amber-400/15 text-amber-300' : 'bg-emerald-400/15 text-emerald-300';
              const route = request.procurement_route === 'DIRECT' ? 'شراء مباشر' : request.procurement_route === 'QUOTES' ? 'عروض أسعار' : 'لم يحدد';
              return (
                <article key={`mobile-${stage}-${request.id}`} className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                  <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-500">رقم الطلب</p>
                      <p className="mt-1 break-words font-mono text-sm font-black text-cyan-300">{request.request_number}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${stageClass}`}>{QUEUE_STAGE_LABELS[stage]}</span>
                  </div>
                  <dl className="mt-3 grid grid-cols-1 gap-3 text-xs min-[420px]:grid-cols-2">
                    <div><dt className="text-slate-500">مسار الشراء</dt><dd className="mt-1 font-bold text-slate-200">{route}</dd></div>
                    <div><dt className="text-slate-500">التاريخ</dt><dd className="mt-1 font-mono text-slate-300">{fmtDate(request.created_at)}</dd></div>
                    <div><dt className="text-slate-500">القسم المصدر</dt><dd className="mt-1 break-words text-slate-200">{request.department?.name || '—'}</dd></div>
                    <div><dt className="text-slate-500">القسم المستهدف</dt><dd className="mt-1 break-words font-bold text-cyan-300">{request.target_department?.name || '—'}</dd></div>
                    <div><dt className="text-slate-500">مقدم الطلب</dt><dd className="mt-1 break-words text-slate-200">{request.requester?.name || '—'}</dd></div>
                    <div><dt className="text-slate-500">رئيس القسم</dt><dd className="mt-1 break-words text-slate-200">{reviewerName(request, departments)}</dd></div>
                    <div className="col-span-1 min-[420px]:col-span-2"><dt className="text-slate-500">الصنف والكمية</dt><dd className="mt-1 break-words font-bold text-slate-100">{itemNames}<span className="font-normal text-slate-400"> — {quantities}</span></dd></div>
                    <div><dt className="text-slate-500">رقم قطعة الأرض</dt><dd className="mt-1 break-words font-mono text-cyan-300">{parcelReferences}</dd></div>
                    <div><dt className="text-slate-500">المنطقة</dt><dd className="mt-1 break-words text-slate-200">{regions}</dd></div>
                    <div className="col-span-1 min-[420px]:col-span-2"><dt className="text-slate-500">المورد</dt><dd className="mt-1 break-words font-bold text-emerald-300">{supplier}</dd></div>
                  </dl>
                  <div className="mt-4 grid grid-cols-1 gap-2">
                    {stage === 'PENDING_ROUTE' && <>
                      <Button variant="primary" size="sm" className="w-full" onClick={() => void handleStartQuotes(request)}>بدء عروض الأسعار</Button>
                      <Button variant="secondary" size="sm" className="w-full" onClick={() => setDirectAccountingRequest(request)}>إرسال للحسابات بدون عروض</Button>
                      <Button variant="danger" size="sm" className="w-full" onClick={() => void handleReject(request.id)}>رفض</Button>
                    </>}
                    {stage === 'QUOTE_SETUP' && <Button variant="primary" size="sm" className="w-full" onClick={() => setQuoteRequest(request)}>إدخال عروض الأسعار</Button>}
                    {stage === 'READY_FOR_PO' && <Button variant="primary" size="sm" className="w-full" onClick={() => navigate(`/procurement/purchase-orders/create?pr=${request.id}${getSelectedQuote(request)?.id ? `&quote=${getSelectedQuote(request)?.id}` : ''}`)}>إنشاء أمر شراء</Button>}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {activeTab === 2 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between"><h2 className="text-base font-bold text-amber-300">أسعار اعتمدها المدير التنفيذي — جاهزة لإنشاء أمر شراء ({selectedQuotePrs.length})</h2><span className="text-xs text-slate-400">المورد والسعر ورقم قطعة الأرض مأخوذة من الطلب والعرض المعتمد</span></div>
          <div className="hidden min-w-0 md:block"><Table><TableHeader><TableRow><TableHead className="whitespace-nowrap">رقم الطلب</TableHead><TableHead className="whitespace-nowrap">الصنف</TableHead><TableHead className="whitespace-nowrap">رقم قطعة الأرض</TableHead><TableHead className="whitespace-nowrap">المنطقة</TableHead><TableHead className="whitespace-nowrap">المورد المختار</TableHead><TableHead className="whitespace-nowrap">سعر الوحدة</TableHead><TableHead className="whitespace-nowrap">الإجمالي</TableHead><TableHead className="whitespace-nowrap">الإجراء</TableHead></TableRow></TableHeader><TableBody>{selectedQuotePrs.length === 0 ? <TableRow><TableCell colSpan={8} className="py-10 text-center text-slate-400">لا توجد أسعار معتمدة تنتظر إنشاء أمر شراء.</TableCell></TableRow> : selectedQuotePrs.map((request) => { const item = request.items?.[0]; const quote = getSelectedQuote(request); return <TableRow key={request.id}><TableCell className="whitespace-nowrap font-mono font-bold text-cyan-300">{request.request_number}</TableCell><TableCell className="max-w-[180px]">{item?.item_description || item?.item?.name || '—'}</TableCell><TableCell className="whitespace-nowrap font-mono text-cyan-300">{item?.item_reference || '—'}</TableCell><TableCell>{item?.region || '—'}</TableCell><TableCell className="max-w-[180px] font-bold">{quote?.supplier?.company_name || '—'}</TableCell><TableCell className="whitespace-nowrap font-mono font-bold text-amber-300">{quote?.unit_price || '—'} ج.م</TableCell><TableCell className="whitespace-nowrap font-mono font-bold text-emerald-300">{quote?.total_amount || '—'} ج.م</TableCell><TableCell><Button variant="primary" size="sm" className="whitespace-nowrap" onClick={() => navigate(`/procurement/purchase-orders/create?pr=${request.id}&quote=${quote?.id || ''}`)}>إنشاء أمر شراء</Button></TableCell></TableRow>; })}</TableBody></Table></div><div className="space-y-3 md:hidden">{selectedQuotePrs.length === 0 ? <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-xs text-slate-400">لا توجد أسعار معتمدة تنتظر إنشاء أمر شراء.</div> : selectedQuotePrs.map((request) => { const item = request.items?.[0]; const quote = getSelectedQuote(request); return <article key={`mobile-approved-quote-${request.id}`} className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/80 p-4"><div className="flex min-w-0 items-start justify-between gap-3"><span className="min-w-0 break-normal font-mono text-sm font-black text-cyan-300">{request.request_number}</span><span className="shrink-0 text-[11px] text-amber-300">سعر معتمد</span></div><dl className="mt-4 grid min-w-0 grid-cols-1 gap-3 text-xs min-[420px]:grid-cols-2"><div className="min-[420px]:col-span-2"><dt className="text-slate-500">الصنف</dt><dd className="mt-1 break-normal font-bold leading-6 text-slate-100">{item?.item_description || item?.item?.name || 'غير محدد'}</dd></div><div><dt className="text-slate-500">قطعة الأرض</dt><dd className="mt-1 break-normal font-mono text-cyan-300">{item?.item_reference || '—'}</dd></div><div><dt className="text-slate-500">المنطقة</dt><dd className="mt-1 break-normal text-slate-300">{item?.region || 'غير محددة'}</dd></div><div><dt className="text-slate-500">المورد المختار</dt><dd className="mt-1 break-normal font-bold leading-6 text-slate-100">{quote?.supplier?.company_name || 'غير محدد'}</dd></div><div><dt className="text-slate-500">سعر الوحدة</dt><dd className="mt-1 whitespace-nowrap font-mono font-bold text-amber-300">{quote?.unit_price || '—'} ج.م</dd></div><div className="min-[420px]:col-span-2"><dt className="text-slate-500">الإجمالي</dt><dd className="mt-1 whitespace-nowrap font-mono font-bold text-emerald-300">{quote?.total_amount || '—'} ج.م</dd></div></dl><Button variant="primary" size="sm" className="mt-4 w-full whitespace-nowrap" onClick={() => navigate(`/procurement/purchase-orders/create?pr=${request.id}&quote=${quote?.id || ''}`)}>إنشاء أمر شراء</Button></article>; })}</div>
        </section>
      )}

      {activeTab === 1 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between"><h2 className="text-base font-bold text-cyan-300">أرشيف أوامر الشراء ({poMeta.total})</h2>
<Button variant="primary" size="sm" onClick={() => setDirectPoOpen(true)}>+ طلب شراء مباشر</Button></div>
          <TableFilterBar
            searchValue={poSearch}
            onSearchChange={(value) => { setPoSearch(value); setPoPage(1); }}
            searchPlaceholder="بحث برقم أمر الشراء أو الطلب أو المورد أو القسم..."
            selects={[
              { label: 'الحالة', value: poStatus, onChange: (value) => { setPoStatus(value); setPoPage(1); }, options: [{ value: 'ALL', label: 'كل الحالات' }, ...poStatuses.map((status) => ({ value: status, label: statusLabel(status) }))] },
              { label: 'المورد', value: poSupplier, onChange: (value) => { setPoSupplier(value); setPoPage(1); }, options: [{ value: 'ALL', label: 'كل الموردين' }, ...supplierOptions] },
            ]}
            dateFrom={poDateFrom}
            dateTo={poDateTo}
            onDateFromChange={(value) => { setPoDateFrom(value); setPoPage(1); }}
            onDateToChange={(value) => { setPoDateTo(value); setPoPage(1); }}
            onClear={clearPoFilters}
            hasActiveFilters={Boolean(poSearch || poStatus !== 'ALL' || poSupplier !== 'ALL' || poDateFrom !== defaultDateFrom || poDateTo !== today)}
            resultCount={filteredPos.length}
            totalCount={poMeta.total}
            resultLabel="أمر شراء"
          />
          <div className="hidden min-w-0 md:block"><Table><TableHeader><TableRow><TableHead className="whitespace-nowrap">رقم الأمر</TableHead><TableHead className="whitespace-nowrap">رقم الطلب</TableHead><TableHead className="whitespace-nowrap">المورد</TableHead><TableHead className="whitespace-nowrap">القسم</TableHead><TableHead className="whitespace-nowrap">مقدم الطلب</TableHead><TableHead className="whitespace-nowrap">رئيس القسم</TableHead><TableHead className="whitespace-nowrap">الصنف</TableHead><TableHead className="whitespace-nowrap">قطعة الأرض</TableHead><TableHead className="whitespace-nowrap">المنطقة</TableHead><TableHead className="whitespace-nowrap">الوحدة</TableHead><TableHead className="whitespace-nowrap">الكمية</TableHead><TableHead className="whitespace-nowrap">المبلغ</TableHead><TableHead className="whitespace-nowrap">الحالة</TableHead><TableHead className="whitespace-nowrap">التاريخ</TableHead><TableHead className="whitespace-nowrap text-center">إجراء</TableHead></TableRow></TableHeader><TableBody>{filteredPos.length === 0 ? <TableRow><TableCell colSpan={15} className="py-8 text-center text-slate-400">{poMeta.total ? 'لم نجد أوامر شراء مطابقة للفلاتر الحالية.' : 'لا توجد أوامر شراء متاحة.'}</TableCell></TableRow> : filteredPos.map((po) => { const item = getReportItems(po)[0]; return <TableRow key={po.id}><TableCell className="whitespace-nowrap font-mono font-bold text-cyan-300">{po.po_number}</TableCell><TableCell className="whitespace-nowrap font-mono">{po.purchase_request?.request_number || 'شراء مباشر'}</TableCell><TableCell className="max-w-[180px] font-bold">{po.supplier?.company_name || '—'}</TableCell><TableCell className="max-w-[160px]">{po.department?.name || po.purchase_request?.department?.name || '—'}</TableCell><TableCell className="max-w-[160px]">{poDetails[po.id]?.requested_by?.name || po.requested_by?.name || po.purchase_request?.requester?.name || '—'}</TableCell><TableCell className="max-w-[160px]">{poDetails[po.id]?.department_approver?.name || po.department_approver?.name || '—'}</TableCell><TableCell className="max-w-[180px] font-bold">{item?.item_name || item?.item_description || '—'}</TableCell><TableCell className="whitespace-nowrap font-mono">{item?.item_reference || '—'}</TableCell><TableCell>{item?.region || '—'}</TableCell><TableCell className="whitespace-nowrap">{getUnitLabel(item?.uom)}</TableCell><TableCell className="whitespace-nowrap">{item?.quantity || '—'}</TableCell><TableCell className="whitespace-nowrap"><CurrencyDisplay amount={po.grand_total} amountClassName="font-mono font-bold text-emerald-300" /></TableCell><TableCell className="whitespace-nowrap">{statusLabel(po.status)}</TableCell><TableCell className="whitespace-nowrap font-mono">{fmtDate(po.updated_at)}</TableCell><TableCell className="text-center"><div className="flex justify-center gap-2"><Button variant="secondary" size="sm" className="whitespace-nowrap" onClick={() => navigate(`/procurement/purchase-orders/${po.id}`)}>عرض</Button><Button variant="outline" size="sm" className="whitespace-nowrap" onClick={() => void handlePrintPo(po)}>طباعة</Button></div></TableCell></TableRow>; })}</TableBody></Table></div><div className="space-y-3 md:hidden">{filteredPos.length === 0 ? <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-xs text-slate-400">{poMeta.total ? 'لم نجد أوامر شراء مطابقة للفلاتر الحالية.' : 'لا توجد أوامر شراء متاحة.'}</div> : filteredPos.map((po) => { const item = getReportItems(po)[0]; return <article key={`mobile-po-${po.id}`} className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/80 p-4"><div className="flex min-w-0 items-start justify-between gap-3"><span className="min-w-0 break-normal font-mono text-sm font-black text-cyan-300">{po.po_number}</span><span className="shrink-0 text-[11px] text-slate-400">{statusLabel(po.status)}</span></div><dl className="mt-4 grid min-w-0 grid-cols-1 gap-3 text-xs min-[420px]:grid-cols-2"><div><dt className="text-slate-500">رقم الطلب</dt><dd className="mt-1 break-normal font-mono text-slate-300">{po.purchase_request?.request_number || 'شراء مباشر'}</dd></div><div><dt className="text-slate-500">المورد</dt><dd className="mt-1 break-normal font-bold leading-6 text-slate-100">{po.supplier?.company_name || 'غير محدد'}</dd></div><div><dt className="text-slate-500">القسم</dt><dd className="mt-1 break-normal text-slate-300">{po.department?.name || po.purchase_request?.department?.name || 'غير محدد'}</dd></div><div><dt className="text-slate-500">مقدم الطلب</dt><dd className="mt-1 break-normal text-slate-300">{poDetails[po.id]?.requested_by?.name || po.requested_by?.name || po.purchase_request?.requester?.name || 'غير محدد'}</dd></div><div className="min-[420px]:col-span-2"><dt className="text-slate-500">الصنف وقطعة الأرض</dt><dd className="mt-1 break-normal font-bold leading-6 text-slate-100">{item?.item_name || item?.item_description || 'غير محدد'} <span className="font-mono text-cyan-300">({item?.item_reference || 'بدون رقم'})</span></dd></div><div><dt className="text-slate-500">المنطقة والكمية</dt><dd className="mt-1 break-normal text-slate-300">{item?.region || 'غير محددة'} — {item?.quantity || '—'} {getUnitLabel(item?.uom)}</dd></div><div><dt className="text-slate-500">المبلغ</dt><dd className="mt-1 whitespace-nowrap"><CurrencyDisplay amount={po.grand_total} amountClassName="font-mono font-bold text-emerald-300" /></dd></div><div><dt className="text-slate-500">التاريخ</dt><dd className="mt-1 whitespace-nowrap font-mono text-slate-300">{fmtDate(po.updated_at)}</dd></div></dl><div className="mt-4 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2"><Button variant="secondary" size="sm" className="w-full whitespace-nowrap" onClick={() => navigate(`/procurement/purchase-orders/${po.id}`)}>عرض الأمر</Button><Button variant="outline" size="sm" className="w-full whitespace-nowrap" onClick={() => void handlePrintPo(po)}>طباعة</Button></div></article>; })}</div>
          <PaginationControls
            currentPage={poMeta.current_page}
            lastPage={poMeta.last_page}
            from={poMeta.from}
            to={poMeta.to}
            total={poMeta.total}
            onPageChange={setPoPage}
            disabled={refreshing}
          />
        </section>
      )}

      {activeTab === 3 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between"><h2 className="text-base font-bold text-cyan-300">إدارة الموردين ({suppliers.length})</h2><Button variant="primary" size="sm" onClick={openAddSupplier}>+ إضافة مورد</Button></div>
          <TableFilterBar
            searchValue={supplierSearch}
            onSearchChange={setSupplierSearch}
            searchPlaceholder="بحث باسم المورد أو الكود أو البريد أو الهاتف..."
            selects={[{ label: 'الحالة', value: supplierStatus, onChange: setSupplierStatus, options: [{ value: 'ALL', label: 'كل الموردين' }, { value: 'active', label: 'نشط' }, { value: 'inactive', label: 'غير نشط' }] }]}
            onClear={clearSupplierFilters}
            hasActiveFilters={Boolean(supplierSearch || supplierStatus !== 'ALL')}
            resultCount={filteredSuppliers.length}
            totalCount={suppliers.length}
            resultLabel="مورد"
          />
          <div className="hidden min-w-0 md:block"><Table><TableHeader><TableRow><TableHead className="whitespace-nowrap">الكود</TableHead><TableHead className="whitespace-nowrap">اسم المورد</TableHead><TableHead className="whitespace-nowrap">مسؤول التواصل</TableHead><TableHead className="whitespace-nowrap">الهاتف والبريد</TableHead><TableHead className="whitespace-nowrap">الحالة</TableHead><TableHead className="whitespace-nowrap text-center">الإجراءات</TableHead></TableRow></TableHeader><TableBody>{filteredSuppliers.length === 0 ? <TableRow><TableCell colSpan={6} className="py-8 text-center text-slate-400">{suppliers.length ? 'لم نجد موردين مطابقين للفلاتر الحالية.' : 'لا يوجد موردون مسجلون.'}</TableCell></TableRow> : filteredSuppliers.map((supplier) => <TableRow key={supplier.id}><TableCell className="whitespace-nowrap font-mono text-cyan-300">{supplier.code || `SUP-${supplier.id}`}</TableCell><TableCell className="max-w-[200px] font-bold">{supplier.company_name}</TableCell><TableCell>{supplier.contact_name || '—'}</TableCell><TableCell><div dir="ltr" className="whitespace-nowrap font-mono text-xs">{supplier.phone || '—'}</div><div className="break-normal text-xs text-slate-400">{supplier.email || '—'}</div></TableCell><TableCell className="whitespace-nowrap">{supplier.is_active ? 'نشط' : 'غير نشط'}</TableCell><TableCell className="text-center"><div className="flex justify-center gap-2"><Button variant="secondary" size="sm" className="whitespace-nowrap" onClick={() => openEditSupplier(supplier)}>تعديل</Button><Button variant="danger" size="sm" className="whitespace-nowrap" onClick={() => void deleteSupplier(supplier)}>حذف</Button></div></TableCell></TableRow>)}</TableBody></Table></div><div className="space-y-3 md:hidden">{filteredSuppliers.length === 0 ? <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-xs text-slate-400">{suppliers.length ? 'لم نجد موردين مطابقين للفلاتر الحالية.' : 'لا يوجد موردون مسجلون.'}</div> : filteredSuppliers.map((supplier) => <article key={`mobile-supplier-${supplier.id}`} className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/80 p-4"><div className="flex min-w-0 items-start justify-between gap-3"><span className="min-w-0 break-normal font-bold text-slate-100">{supplier.company_name}</span><span className="shrink-0 text-[11px] text-cyan-300">{supplier.is_active ? 'نشط' : 'غير نشط'}</span></div><p className="mt-1 break-normal font-mono text-xs text-cyan-300">{supplier.code || `SUP-${supplier.id}`}</p><dl className="mt-4 grid min-w-0 grid-cols-1 gap-3 text-xs min-[420px]:grid-cols-2"><div><dt className="text-slate-500">مسؤول التواصل</dt><dd className="mt-1 break-normal leading-6 text-slate-300">{supplier.contact_name || 'غير محدد'}</dd></div><div><dt className="text-slate-500">الهاتف</dt><dd dir="ltr" className="mt-1 whitespace-nowrap font-mono text-slate-300">{supplier.phone || '—'}</dd></div><div className="min-[420px]:col-span-2"><dt className="text-slate-500">البريد الإلكتروني</dt><dd className="mt-1 break-all text-slate-300">{supplier.email || '—'}</dd></div></dl><div className="mt-4 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2"><Button variant="secondary" size="sm" className="w-full whitespace-nowrap" onClick={() => openEditSupplier(supplier)}>تعديل المورد</Button><Button variant="danger" size="sm" className="w-full whitespace-nowrap" onClick={() => void deleteSupplier(supplier)}>حذف المورد</Button></div></article>)}</div>
        </section>
      )}

      {activeTab === 4 && !analytics && (
        <Card className="space-y-4 border-amber-500/30 bg-amber-950/10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-amber-400/30 bg-amber-400/10 text-xl">📊</div>
          <div>
            <h2 className="text-base font-bold text-slate-100">{analyticsError ? 'تعذر تحميل التقرير' : 'جاري تحميل التقرير'}</h2>
            <p className="mt-2 text-xs leading-6 text-slate-400">{analyticsError || 'يتم تجهيز مؤشرات المشتريات والرسومات، انتظر لحظات ثم حاول مرة أخرى.'}</p>
          </div>
          <Button variant="primary" size="sm" onClick={() => void retryAnalytics()} disabled={refreshing}>
            {refreshing ? 'جاري المحاولة...' : 'إعادة تحميل التقرير'}
          </Button>
        </Card>
      )}

      {activeTab === 4 && analytics && (
        <section className="space-y-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-bold text-cyan-300">التقارير والتحليلات الفورية</h2>
              <p className="mt-1 text-xs text-slate-400">تحليل أحدث أوامر الشراء حسب الفترة والقسم والمورد والصنف، بدون ضرائب أو خصومات.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <select value={reportPeriod} onChange={(event) => setReportPeriod(event.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100"><option value="all">كل الفترات</option><option value="30">آخر 30 يومًا</option><option value="90">آخر 90 يومًا</option><option value="180">آخر 180 يومًا</option></select>
              <select value={reportStatus} onChange={(event) => setReportStatus(event.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100"><option value="">كل الحالات</option>{poStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select>
              <Button variant="secondary" size="sm" onClick={exportReportCsv} disabled={!filteredReportPos.length}>تصدير CSV</Button>
              <Button variant="primary" size="sm" onClick={() => setReportPrintOpen(true)}>طباعة التقرير</Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-6"><KpiCard title="أوامر الشراء" value={filteredReportPos.length} accentColor="cyan" /><KpiCard title="إجمالي المشتريات" value={<CurrencyDisplay amount={reportTotals.totalValue} amountClassName="font-mono text-emerald-300" />} accentColor="emerald" /><KpiCard title="إجمالي الكمية" value={reportTotals.totalQuantity.toLocaleString('ar-EG')} accentColor="amber" /><KpiCard title="متوسط الأمر" value={<CurrencyDisplay amount={reportTotals.averageValue} amountClassName="font-mono text-cyan-300" />} accentColor="cyan" /><KpiCard title="الموردون" value={reportTotals.supplierCount} accentColor="purple" /><KpiCard title="بانتظار الحسابات" value={analytics.metrics.pending_accounting_count} accentColor="rose" /></div>
          <TableFilterBar
            searchValue={reportSearch}
            onSearchChange={setReportSearch}
            searchPlaceholder="بحث برقم الأمر أو المورد أو القسم أو الموظف..."
            selects={[
              { label: 'القسم', value: reportDepartment, onChange: setReportDepartment, options: [{ value: 'ALL', label: 'كل الأقسام' }, ...departmentOptions] },
              { label: 'المورد', value: reportSupplier, onChange: setReportSupplier, options: [{ value: 'ALL', label: 'كل الموردين' }, ...supplierOptions] },
              { label: 'الصنف', value: reportItem, onChange: setReportItem, options: [{ value: 'ALL', label: 'كل الأصناف' }, ...catalogItems.map((item) => ({ value: String(item.id), label: item.name }))] },
            ]}
            dateFrom={reportDateFrom}
            dateTo={reportDateTo}
            onDateFromChange={setReportDateFrom}
            onDateToChange={setReportDateTo}
            onClear={clearReportFilters}
            hasActiveFilters={Boolean(reportSearch || reportDepartment !== 'ALL' || reportSupplier !== 'ALL' || reportItem !== 'ALL' || reportDateFrom !== defaultDateFrom || reportDateTo !== today)}
            resultCount={filteredReportPos.length}
            totalCount={analytics.metrics.purchase_orders_count}
            resultLabel="أمر في التقرير"
          />
          <ProcurementCharts orders={filteredReportPos} />
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <Card><h3 className="mb-3 font-bold text-slate-100">توزيع الإنفاق حسب الأقسام</h3><Table><TableHeader><TableRow><TableHead>القسم</TableHead><TableHead>عدد الأوامر</TableHead><TableHead>الإجمالي</TableHead></TableRow></TableHeader><TableBody>{reportDepartmentBreakdown.length === 0 ? <TableRow><TableCell colSpan={3} className="py-6 text-center text-slate-500">لا توجد بيانات ضمن الفلاتر.</TableCell></TableRow> : reportDepartmentBreakdown.map((item) => <TableRow key={item.name}><TableCell className="font-bold">{item.name}</TableCell><TableCell>{item.count}</TableCell><TableCell className="font-mono text-emerald-300">{fmtAmount(item.total)} ج.م</TableCell></TableRow>)}</TableBody></Table></Card>
            <Card><h3 className="mb-3 font-bold text-slate-100">أبرز الموردين</h3><Table><TableHeader><TableRow><TableHead>المورد</TableHead><TableHead>عدد الأوامر</TableHead><TableHead>الإجمالي</TableHead></TableRow></TableHeader><TableBody>{reportSupplierBreakdown.length === 0 ? <TableRow><TableCell colSpan={3} className="py-6 text-center text-slate-500">لا توجد بيانات ضمن الفلاتر.</TableCell></TableRow> : reportSupplierBreakdown.map((item) => <TableRow key={item.name}><TableCell className="font-bold">{item.name}</TableCell><TableCell>{item.count}</TableCell><TableCell className="font-mono text-emerald-300">{fmtAmount(item.total)} ج.م</TableCell></TableRow>)}</TableBody></Table></Card>
          </div>
          <Card><h3 className="mb-3 font-bold text-slate-100">تفاصيل أحدث أوامر الشراء</h3><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>رقم الأمر</TableHead><TableHead>القسم</TableHead><TableHead>المورد</TableHead><TableHead>اسم الصنف</TableHead><TableHead>رقم قطعة الأرض</TableHead><TableHead>المنطقة</TableHead><TableHead>الوحدة</TableHead><TableHead>الكمية</TableHead><TableHead>الإجمالي</TableHead></TableRow></TableHeader><TableBody>{filteredReportPos.length === 0 ? <TableRow><TableCell colSpan={9} className="py-6 text-center text-slate-500">لا توجد أوامر مطابقة للفلاتر الحالية.</TableCell></TableRow> : filteredReportPos.flatMap((po) => getReportItems(po).map((item) => <TableRow key={`${po.id}-${item.id || item.item_reference}`}>
<TableCell className="font-mono text-cyan-300">{po.po_number}</TableCell><TableCell>{po.department?.name || po.purchase_request?.department?.name || '—'}</TableCell><TableCell>{po.supplier?.company_name || '—'}</TableCell><TableCell className="font-bold">{item.item_description || '—'}</TableCell><TableCell className="font-mono">{item.item_reference || '—'}</TableCell><TableCell>{item.region || '—'}</TableCell><TableCell>{getUnitLabel(item.uom)}</TableCell><TableCell>{item.quantity || '—'}</TableCell><TableCell className="font-mono text-emerald-300">{fmtAmount(item.grand_total)} ج.م</TableCell></TableRow>))}</TableBody></Table></div></Card>
        </section>
      )}

      <PurchaseQuotesModal isOpen={Boolean(quoteRequest)} request={quoteRequest} suppliers={suppliers} onClose={() => { setQuoteRequest(null); void loadData(); }} onSupplierCreated={(supplier) => setSuppliers(current => current.some(item => item.id === supplier.id) ? current : [...current, supplier])} onSuccess={() => { setQuoteRequest(null); void loadData(); }} />
      <DirectPoModal isOpen={directPoOpen} onClose={() => setDirectPoOpen(false)} onSuccess={() => { setActiveTab(0); void loadData(); }} />
      {selectedPrintPo && <PurchaseOrderPrintModal po={selectedPrintPo} isOpen={true} onClose={() => setSelectedPrintPo(null)} />}
      <SupplierModal supplier={editingSupplier} isOpen={supplierModalOpen} onClose={() => { setSupplierModalOpen(false); setEditingSupplier(null); }} onSuccess={() => void loadData()} />
      <DirectAccountingReviewModal
        request={directAccountingRequest}
        suppliers={suppliers}
        isOpen={Boolean(directAccountingRequest)}
        onConfirm={(financialData) => { if (directAccountingRequest) void handleSendDirectToAccounting(directAccountingRequest, financialData); }}
        onClose={() => { if (!directAccountingSubmitting) setDirectAccountingRequest(null); }}
        isSubmitting={directAccountingSubmitting}
      />
      <ConfirmDialog
        isOpen={Boolean(supplierToDelete)}
        title="تأكيد حذف المورد"
        message={supplierToDelete ? `هل أنت متأكد من حذف المورد «${supplierToDelete.company_name}»؟` : ''}
        confirmLabel="حذف المورد"
        onConfirm={() => void confirmDeleteSupplier()}
        onClose={() => setSupplierToDelete(null)}
        isLoading={deletingSupplier}
      />
      <ReportPrintModal data={analytics} isOpen={reportPrintOpen} onClose={() => setReportPrintOpen(false)} />
    </div>
  );
};

export default ProcurementManagerPage;
