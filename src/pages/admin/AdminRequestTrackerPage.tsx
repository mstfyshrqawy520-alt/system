import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  getTrackerListApi,
  getTrackerStatsApi,
  TrackerPrSummary,
  TrackerStats,
  TrackerPaginationMeta,
  TrackerFilters,
} from '../../api/admin/requestTracker';
import { getDepartmentsAdminApi } from '../../api/admin/departments';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage';
import { parseApiError } from '../../utils/apiError';
import { KpiCard, Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { PaginationControls } from '../../components/ui/PaginationControls';
import { exportToCsv } from '../../utils/exportCsv';

// ─── Stage labels ────────────────────────────────────────

const STAGE_LABELS: Record<string, string> = {
  creation: 'الإنشاء',
  review: 'المراجعة',
  executive: 'الإدارة التنفيذية',
  procurement: 'المشتريات',
  quotes: 'عروض الأسعار',
  accounting: 'الحسابات',
  issued: 'تم الإصدار',
  rejected: 'مرفوض',
  cancelled: 'ملغي',
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'منخفض',
  NORMAL: 'عادي',
  HIGH: 'عالي',
  URGENT: 'عاجل',
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'text-slate-400',
  NORMAL: 'text-blue-400',
  HIGH: 'text-amber-400',
  URGENT: 'text-rose-400',
};

// ─── Component ───────────────────────────────────────────

export const AdminRequestTrackerPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [data, setData] = useState<TrackerPrSummary[]>([]);
  const [meta, setMeta] = useState<TrackerPaginationMeta | null>(null);
  const [stats, setStats] = useState<TrackerStats | null>(null);
  const [departments, setDepartments] = useState<Array<{ id: number; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Derive filters from URL
  const filters: TrackerFilters = useMemo(() => ({
    status: searchParams.get('status') || undefined,
    stage: searchParams.get('stage') || undefined,
    department_id: searchParams.get('department_id') || undefined,
    request_type: searchParams.get('request_type') || undefined,
    priority: searchParams.get('priority') || undefined,
    search: searchParams.get('search') || undefined,
    stalled_days: searchParams.get('stalled_days') || undefined,
    include_archived: searchParams.get('include_archived') === 'true',
    sort: searchParams.get('sort') || undefined,
    dir: (searchParams.get('dir') as 'asc' | 'desc') || undefined,
    page: Number(searchParams.get('page')) || 1,
    per_page: 20,
  }), [searchParams]);

  const setFilter = useCallback((key: string, value: string | undefined) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      // Reset page when changing filters
      if (key !== 'page') next.delete('page');
      return next;
    });
  }, [setSearchParams]);

  const clearFilters = useCallback(() => {
    setSearchParams(new URLSearchParams());
    setSearchInput('');
  }, [setSearchParams]);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [listResult, statsResult] = await Promise.allSettled([
        getTrackerListApi(filters),
        getTrackerStatsApi(),
      ]);

      if (listResult.status === 'fulfilled') {
        setData(listResult.value.data);
        setMeta(listResult.value.meta);
      } else {
        throw listResult.reason;
      }

      if (statsResult.status === 'fulfilled') {
        setStats(statsResult.value);
      }
    } catch (err: unknown) {
      setError(parseApiError(err).message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load departments once
  useEffect(() => {
    getDepartmentsAdminApi()
      .then(setDepartments)
      .catch(() => {});
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== (filters.search || '')) {
        setFilter('search', searchInput || undefined);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]); // eslint-disable-line react-hooks/exhaustive-deps

  // Export to CSV
  const handleExport = () => {
    if (!data.length) return;
    setExporting(true);
    try {
      const headers = ['رقم الطلب', 'الحالة', 'المرحلة', 'مقدم الطلب', 'القسم', 'المسؤول الحالي', 'مدة التوقف (أيام)', 'تاريخ الإنشاء'];
      const rows = data.map(r => [
        r.request_number,
        r.status,
        STAGE_LABELS[r.stage] || r.stage,
        r.requester?.name || '-',
        r.department?.name || '-',
        r.current_responsible?.name || '-',
        String(r.days_in_stage),
        r.created_at ? new Date(r.created_at).toLocaleDateString('ar-EG') : '-',
      ]);
      exportToCsv({
        filename: 'admin-request-tracker',
        headers,
        rows,
      });
    } finally {
      setExporting(false);
    }
  };

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status) count++;
    if (filters.stage) count++;
    if (filters.department_id) count++;
    if (filters.request_type) count++;
    if (filters.priority) count++;
    if (filters.stalled_days) count++;
    if (filters.search) count++;
    if (filters.include_archived) count++;
    return count;
  }, [filters]);

  const hasActiveFilters = activeFilterCount > 0;
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <div className="space-y-4 sm:space-y-5" dir="rtl">
      {/* ── Page Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-100 flex items-center gap-2">
            <span className="text-xl">📋</span>
            مركز متابعة الطلبات والتحكم الإداري
          </h1>
          <p className="mt-1 text-xs text-slate-400">متابعة شاملة لجميع طلبات الشراء — الحالة والمرحلة والمسؤول الحالي</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            🔄 تحديث
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting || !data.length}>
            {exporting ? '⏳' : '📥'} تصدير CSV
          </Button>
          <div className="hidden sm:flex border border-slate-700 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1.5 text-xs font-bold transition-colors ${viewMode === 'table' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
            >▦</button>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-2.5 py-1.5 text-xs font-bold transition-colors ${viewMode === 'cards' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
            >▤</button>
          </div>
        </div>
      </div>

      {/* ── KPI Summary Cards ── */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard
            title="إجمالي الطلبات"
            value={stats.total}
            accentColor="cyan"
            icon={<span className="text-lg">📊</span>}
            onClick={() => clearFilters()}
          />
          <KpiCard
            title="نشطة"
            value={stats.active}
            accentColor="indigo"
            icon={<span className="text-lg">🔄</span>}
            subtext="قيد الإجراء"
          />
          <KpiCard
            title="متوقفة +3 أيام"
            value={stats.stalled}
            accentColor={stats.stalled > 0 ? 'amber' : 'slate'}
            icon={<span className="text-lg">⏸️</span>}
            onClick={() => setFilter('stalled_days', '3')}
          />
          <KpiCard
            title="تم الإصدار"
            value={stats.completed}
            accentColor="emerald"
            icon={<span className="text-lg">✅</span>}
            onClick={() => setFilter('status', 'ISSUED')}
          />
          <KpiCard
            title="مسودات"
            value={stats.drafts}
            accentColor="slate"
            icon={<span className="text-lg">📝</span>}
            onClick={() => setFilter('status', 'DRAFT')}
          />
          <KpiCard
            title="مرفوضة"
            value={stats.rejected}
            accentColor="rose"
            icon={<span className="text-lg">❌</span>}
            onClick={() => setFilter('status', 'REJECTED')}
          />
        </div>
      )}

      {/* ── Search & Filters ── */}
      <Card className="!p-3">
        <div className="flex flex-col gap-3">
          {/* Search Row */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="بحث برقم الطلب أو اسم مقدم الطلب..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 pr-10 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔍</span>
            </div>
            <button
              onClick={() => setFiltersOpen(p => !p)}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-bold transition-colors ${
                hasActiveFilters || filtersOpen
                  ? 'border-cyan-600/60 bg-cyan-950/40 text-cyan-300'
                  : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:text-white hover:border-slate-600'
              }`}
            >
              ⚙️ فلاتر {hasActiveFilters && <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-cyan-500 text-white text-[10px] font-black">{activeFilterCount}</span>}
            </button>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs text-rose-400 hover:text-rose-300 font-bold whitespace-nowrap">
                ✕ مسح الفلاتر
              </button>
            )}
          </div>

          {/* Filter Row (collapsible) */}
          {filtersOpen && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2 border-t border-slate-800/80 animate-[fadeIn_200ms_ease-out]">
              <select
                value={filters.status || ''}
                onChange={e => setFilter('status', e.target.value || undefined)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
              >
                <option value="">كل الحالات</option>
                <option value="DRAFT">مسودة</option>
                <option value="SUBMITTED">تم الإرسال</option>
                <option value="UNDER_REVIEW">قيد المراجعة</option>
                <option value="PENDING_EXECUTIVE_APPROVAL">بانتظار المدير التنفيذي</option>
                <option value="PENDING_PROCUREMENT_APPROVAL">بانتظار المشتريات</option>
                <option value="PENDING_ACCOUNTING_APPROVAL">بانتظار الحسابات</option>
                <option value="APPROVED_BY_ACCOUNTING">معتمد ماليًا</option>
                <option value="PENDING_QUOTE_RECOMMENDATIONS">بانتظار عروض الأسعار</option>
                <option value="PENDING_EXECUTIVE_QUOTE_DECISION">بانتظار قرار العروض</option>
                <option value="APPROVED_BY_PROCUREMENT">معتمد من المشتريات</option>
                <option value="ISSUED">تم الإصدار</option>
                <option value="REJECTED">مرفوض</option>
                <option value="CANCELLED">ملغي</option>
              </select>
              <select
                value={filters.stage || ''}
                onChange={e => setFilter('stage', e.target.value || undefined)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
              >
                <option value="">كل المراحل</option>
                {Object.entries(STAGE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <select
                value={filters.department_id || ''}
                onChange={e => setFilter('department_id', e.target.value || undefined)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
              >
                <option value="">كل الأقسام</option>
                {departments.map(d => (
                  <option key={d.id} value={String(d.id)}>{d.name}</option>
                ))}
              </select>
              <select
                value={filters.request_type || ''}
                onChange={e => setFilter('request_type', e.target.value || undefined)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
              >
                <option value="">كل الأنواع</option>
                <option value="PROJECT">مشروع</option>
                <option value="OFFICE_SUPPLIES">مكتبيات</option>
              </select>
              <select
                value={filters.priority || ''}
                onChange={e => setFilter('priority', e.target.value || undefined)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
              >
                <option value="">كل الأولويات</option>
                {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <select
                value={filters.stalled_days || ''}
                onChange={e => setFilter('stalled_days', e.target.value || undefined)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
              >
                <option value="">بدون فلتر توقف</option>
                <option value="3">متوقفة أكثر من 3 أيام</option>
                <option value="7">متوقفة أكثر من 7 أيام</option>
                <option value="14">متوقفة أكثر من 14 يوم</option>
              </select>
            </div>
          )}
        </div>
      </Card>

      {/* ── Stalled Alerts ── */}
      {stats && stats.stalled > 0 && !filters.stalled_days && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-800/50 bg-amber-950/30 px-4 py-3 text-xs">
          <span className="text-lg">⚠️</span>
          <span className="text-amber-300 font-bold">
            {stats.stalled} طلب متوقف لأكثر من 3 أيام بدون إجراء
          </span>
          <button
            onClick={() => setFilter('stalled_days', '3')}
            className="mr-auto text-amber-400 hover:text-amber-300 font-bold underline underline-offset-2"
          >
            عرض الطلبات المتوقفة
          </button>
        </div>
      )}

      {/* ── Error / Loading ── */}
      {error && <ErrorMessage error={error} />}
      {loading && <LoadingSpinner />}

      {/* ── Data Table / Cards ── */}
      {!loading && !error && (
        <>
          {data.length === 0 ? (
            <Card className="text-center py-12">
              <p className="text-slate-400 text-sm">لا توجد طلبات مطابقة للفلاتر المحددة.</p>
            </Card>
          ) : (
            <ResponsiveDataView data={data} viewMode={viewMode} />
          )}

          {/* Pagination */}
          {meta && meta.total > 0 && (
            <PaginationControls
              currentPage={meta.current_page}
              lastPage={meta.last_page}
              from={meta.from}
              to={meta.to}
              total={meta.total}
              onPageChange={p => setFilter('page', String(p))}
              disabled={loading}
            />
          )}
        </>
      )}
    </div>
  );
};

// ─── Desktop Table Sub-Component ─────────────────────────

const DesktopTable: React.FC<{ data: TrackerPrSummary[] }> = ({ data }) => (
  <div className="hidden sm:block w-full max-w-full min-w-0 overflow-x-auto overscroll-x-contain touch-pan-x [scrollbar-width:thin] rounded-2xl border border-slate-800/90 bg-slate-900/70 shadow-xl shadow-slate-950/60 backdrop-blur-md">
    <table style={{ minWidth: '900px' }} className="w-full text-right text-xs text-slate-200 border-collapse">
      <thead className="sticky top-0 z-10 bg-slate-950/95 text-slate-300 font-bold border-b border-slate-800">
        <tr>
          <th className="whitespace-nowrap px-3 py-3 text-xs font-bold">#</th>
          <th className="whitespace-nowrap px-3 py-3 text-xs font-bold">رقم الطلب</th>
          <th className="whitespace-nowrap px-3 py-3 text-xs font-bold">مقدم الطلب</th>
          <th className="whitespace-nowrap px-3 py-3 text-xs font-bold">القسم</th>
          <th className="whitespace-nowrap px-3 py-3 text-xs font-bold">النوع</th>
          <th className="whitespace-nowrap px-3 py-3 text-xs font-bold">الحالة</th>
          <th className="whitespace-nowrap px-3 py-3 text-xs font-bold">المسؤول الحالي</th>
          <th className="whitespace-nowrap px-3 py-3 text-xs font-bold">مدة التوقف</th>
          <th className="whitespace-nowrap px-3 py-3 text-xs font-bold">الأولوية</th>
          <th className="whitespace-nowrap px-3 py-3 text-xs font-bold">إجراءات</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-800/50">
        {data.map((pr, idx) => (
          <tr key={pr.id} className="hover:bg-slate-800/45 transition-colors">
            <td className="whitespace-nowrap px-3 py-3 text-slate-500 font-mono text-[10px]">{idx + 1}</td>
            <td className="whitespace-nowrap px-3 py-3">
              <Link to={`/admin/request-tracker/${pr.id}`} className="text-cyan-400 hover:text-cyan-300 font-bold underline underline-offset-2">
                {pr.request_number}
              </Link>
              {pr.is_archived && <span className="mr-1 text-[10px] text-gray-500 font-bold">(مؤرشف)</span>}
            </td>
            <td className="whitespace-nowrap px-3 py-3">{pr.requester?.name || '-'}</td>
            <td className="whitespace-nowrap px-3 py-3 text-slate-400">{pr.department?.name || '-'}</td>
            <td className="whitespace-nowrap px-3 py-3">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pr.request_type === 'OFFICE_SUPPLIES' ? 'bg-blue-950/60 text-blue-300' : 'bg-emerald-950/60 text-emerald-300'}`}>
                {pr.request_type === 'OFFICE_SUPPLIES' ? 'مكتبيات' : 'مشروع'}
              </span>
            </td>
            <td className="whitespace-nowrap px-3 py-3">
              <StatusBadge status={pr.status} />
            </td>
            <td className="whitespace-nowrap px-3 py-3">
              {pr.current_responsible ? (
                <div className="flex flex-col">
                  <span className="text-slate-200 font-bold text-[11px]">{pr.current_responsible.name}</span>
                  <span className="text-slate-500 text-[10px]">{pr.current_responsible.role}</span>
                </div>
              ) : (
                <span className="text-slate-600">—</span>
              )}
            </td>
            <td className="whitespace-nowrap px-3 py-3">
              <DaysInStageBadge days={pr.days_in_stage} status={pr.status} />
            </td>
            <td className="whitespace-nowrap px-3 py-3">
              {pr.priority && (
                <span className={`text-[11px] font-bold ${PRIORITY_COLORS[pr.priority] || 'text-slate-400'}`}>
                  {PRIORITY_LABELS[pr.priority] || pr.priority}
                </span>
              )}
            </td>
            <td className="whitespace-nowrap px-3 py-3">
              <Link
                to={`/admin/request-tracker/${pr.id}`}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-[11px] font-bold text-slate-300 hover:bg-slate-700 hover:text-white hover:border-cyan-600/50 transition-all"
              >
                فتح ←
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ─── Mobile Cards Sub-Component ──────────────────────────

const MobileCards: React.FC<{ data: TrackerPrSummary[] }> = ({ data }) => (
  <div className="space-y-3 sm:hidden">
    {data.map(pr => (
      <MobileRequestCard key={pr.id} pr={pr} />
    ))}
  </div>
);

const MobileRequestCard: React.FC<{ pr: TrackerPrSummary }> = ({ pr }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="!p-0 overflow-hidden">
      {/* Compact Header */}
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center gap-3 p-3 text-right"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-cyan-400 font-bold text-xs">{pr.request_number}</span>
            {pr.is_archived && <span className="text-[9px] text-gray-500">(مؤرشف)</span>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={pr.status} />
            <DaysInStageBadge days={pr.days_in_stage} status={pr.status} />
          </div>
        </div>
        <span className={`text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-slate-800 px-3 py-3 space-y-2 text-xs animate-[fadeIn_150ms_ease-out]">
          <InfoRow label="مقدم الطلب" value={pr.requester?.name} />
          <InfoRow label="القسم" value={pr.department?.name} />
          <InfoRow label="النوع" value={pr.request_type === 'OFFICE_SUPPLIES' ? 'مكتبيات' : 'مشروع'} />
          <InfoRow label="المسؤول الحالي" value={pr.current_responsible ? `${pr.current_responsible.name} (${pr.current_responsible.role})` : undefined} />
          {pr.priority && <InfoRow label="الأولوية" value={PRIORITY_LABELS[pr.priority] || pr.priority} />}
          <div className="pt-2">
            <Link
              to={`/admin/request-tracker/${pr.id}`}
              className="block w-full text-center rounded-lg border border-cyan-700/50 bg-cyan-950/40 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-900/50"
            >
              فتح التفاصيل ←
            </Link>
          </div>
        </div>
      )}
    </Card>
  );
};

// ─── Helper Sub-Components ───────────────────────────────

const DaysInStageBadge: React.FC<{ days: number; status: string }> = ({ days, status }) => {
  const isTerminal = ['ISSUED', 'REJECTED', 'CANCELLED'].includes(status);
  if (isTerminal) return <span className="text-slate-600 text-[10px]">—</span>;

  let colorClass = 'text-slate-400 bg-slate-800/60';
  if (days >= 7) colorClass = 'text-rose-400 bg-rose-950/40 border-rose-800/40';
  else if (days >= 3) colorClass = 'text-amber-400 bg-amber-950/40 border-amber-800/40';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border border-transparent ${colorClass}`}>
      {days > 0 ? `${days} يوم` : 'اليوم'}
    </span>
  );
};

const InfoRow: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
  <div className="flex items-center justify-between">
    <span className="text-slate-500 font-bold">{label}</span>
    <span className="text-slate-200">{value || '—'}</span>
  </div>
);

// ─── Show responsive view automatically ──────────────────
// The DesktopTable is hidden on mobile (sm:block + hidden)
// The MobileCards is shown on mobile only (sm:hidden)
// But we also need to show cards on desktop when viewMode === 'cards'

const ResponsiveDataView: React.FC<{ data: TrackerPrSummary[]; viewMode: 'table' | 'cards' }> = ({ data, viewMode }) => {
  if (viewMode === 'cards') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {data.map(pr => (
          <MobileRequestCard key={pr.id} pr={pr} />
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Desktop: table, Mobile: cards */}
      <DesktopTable data={data} />
      <MobileCards data={data} />
    </>
  );
};

export default AdminRequestTrackerPage;
