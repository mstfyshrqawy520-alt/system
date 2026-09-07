import React, { useEffect, useMemo, useState } from 'react';
import {
  getPurchasesReportApi,
  PurchasesReportResponse,
  PurchasesReportRow,
} from '../../api/reports';
import { parseApiError } from '../../utils/apiError';
import { CurrencyDisplay } from '../../components/ui/CurrencyDisplay';
import { getUnitLabel } from '../../utils/units';

interface ColumnFilters {
  delivery_date: string;
  po_number: string;
  item_name: string;
  uom: string;
  quantity: string;
  unit_price: string;
  total_price: string;
  supplier_name: string;
  parcel_reference: string;
  region: string;
  department_name: string;
  works: string;
}

const initialFilters: ColumnFilters = {
  delivery_date: '',
  po_number: '',
  item_name: '',
  uom: '',
  quantity: '',
  unit_price: '',
  total_price: '',
  supplier_name: '',
  parcel_reference: '',
  region: '',
  department_name: '',
  works: '',
};

export const PurchasesReportView: React.FC = () => {
  // Period filter states
  const [filterType, setFilterType] = useState<'daily' | 'monthly' | 'custom'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [fromDate, setFromDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedDepartment, setSelectedDepartment] = useState<string>('ALL');

  // Column search filters
  const [colFilters, setColFilters] = useState<ColumnFilters>(initialFilters);
  const [showColumnFilters, setShowColumnFilters] = useState<boolean>(true);

  // Data state
  const [data, setData] = useState<PurchasesReportResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  // Fetch report from backend
  const loadReport = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const response = await getPurchasesReportApi({
        filter_type: filterType,
        month: filterType === 'monthly' ? selectedMonth : undefined,
        date: filterType === 'daily' ? selectedDate : undefined,
        from_date: filterType === 'custom' ? fromDate : undefined,
        to_date: filterType === 'custom' ? toDate : undefined,
        department_id: selectedDepartment !== 'ALL' ? selectedDepartment : undefined,
      });
      setData(response);
    } catch (err) {
      setError(parseApiError(err).message || 'تعذر تحميل تقرير المشتريات المحاسبي.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadReport();
  }, [filterType, selectedMonth, selectedDate, fromDate, toDate, selectedDepartment]);

  // Selected Department Name for dynamic title
  const activeDepartmentName = useMemo(() => {
    if (selectedDepartment === 'ALL' || !data?.departments) return null;
    const dept = data.departments.find((d) => String(d.id) === String(selectedDepartment));
    return dept?.name || null;
  }, [selectedDepartment, data?.departments]);

  // Dynamic Report Title
  const dynamicReportTitle = useMemo(() => {
    let deptPrefix = activeDepartmentName ? `قسم ${activeDepartmentName}` : 'العام';
    let timePeriod = '';

    if (filterType === 'monthly') {
      const [y, m] = selectedMonth.split('-');
      timePeriod = `لشهر ${m}-${y}`;
    } else if (filterType === 'daily') {
      timePeriod = `ليوم ${selectedDate}`;
    } else {
      timePeriod = `للفترة من ${fromDate} إلى ${toDate}`;
    }

    return `تقرير مشتريات ${deptPrefix} ${timePeriod}`;
  }, [activeDepartmentName, filterType, selectedMonth, selectedDate, fromDate, toDate]);

  // Client-side filtering by column inputs
  const filteredRows = useMemo(() => {
    if (!data?.rows) return [];
    return data.rows.filter((row) => {
      const matchDate = !colFilters.delivery_date || row.delivery_date?.toLowerCase().includes(colFilters.delivery_date.toLowerCase()) || row.delivery_date_formatted?.includes(colFilters.delivery_date);
      const matchPo = !colFilters.po_number || row.po_number?.toLowerCase().includes(colFilters.po_number.toLowerCase()) || row.po_number_short?.includes(colFilters.po_number);
      const matchItem = !colFilters.item_name || row.item_name?.toLowerCase().includes(colFilters.item_name.toLowerCase());
      const matchUom = !colFilters.uom || row.uom?.toLowerCase().includes(colFilters.uom.toLowerCase());
      const matchQty = !colFilters.quantity || String(row.quantity).includes(colFilters.quantity);
      const matchUnitPrice = !colFilters.unit_price || String(row.unit_price).includes(colFilters.unit_price);
      const matchTotal = !colFilters.total_price || String(row.total_price).includes(colFilters.total_price);
      const matchSupplier = !colFilters.supplier_name || row.supplier_name?.toLowerCase().includes(colFilters.supplier_name.toLowerCase());
      const matchParcel = !colFilters.parcel_reference || row.parcel_reference?.toLowerCase().includes(colFilters.parcel_reference.toLowerCase());
      const matchRegion = !colFilters.region || row.region?.toLowerCase().includes(colFilters.region.toLowerCase());
      const matchDept = !colFilters.department_name || row.department_name?.toLowerCase().includes(colFilters.department_name.toLowerCase());
      const matchWorks = !colFilters.works || row.works?.toLowerCase().includes(colFilters.works.toLowerCase());

      return (
        matchDate &&
        matchPo &&
        matchItem &&
        matchUom &&
        matchQty &&
        matchUnitPrice &&
        matchTotal &&
        matchSupplier &&
        matchParcel &&
        matchRegion &&
        matchDept &&
        matchWorks
      );
    });
  }, [data?.rows, colFilters]);

  // Live totals of currently filtered rows
  const liveTotals = useMemo(() => {
    const totalQty = filteredRows.reduce((sum, r) => sum + Number(r.quantity || 0), 0);
    const totalAmount = filteredRows.reduce((sum, r) => sum + Number(r.total_price || 0), 0);
    const uniqueOrders = new Set(filteredRows.map((r) => r.purchase_order_id)).size;
    const uniqueSuppliers = new Set(filteredRows.map((r) => r.supplier_name).filter((s) => s && s !== '—')).size;

    return { totalQty, totalAmount, uniqueOrders, uniqueSuppliers };
  }, [filteredRows]);

  const hasActiveColFilters = useMemo(() => {
    return Object.values(colFilters).some((val) => val.trim() !== '');
  }, [colFilters]);

  const handleClearColFilters = () => {
    setColFilters(initialFilters);
  };

  const handleUpdateColFilter = (key: keyof ColumnFilters, value: string) => {
    setColFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!filteredRows.length) return;

    const headers = [
      'تاريخ التوريد',
      'رقم أمر الشراء',
      'الصنف',
      'الوحدة',
      'الكمية',
      'سعر الوحدة',
      'سعر الكمية',
      'أسم المورد',
      'رقم القطعة',
      'إسم المنطقة',
      'القسم',
      'الاعمال',
    ];

    const lines: string[] = [];
    // BOM for Excel Arabic support
    lines.push('\uFEFF' + headers.join(','));

    filteredRows.forEach((r) => {
      lines.push(
        [
          `"${r.delivery_date_formatted || r.delivery_date || '—'}"`,
          `"${r.po_number || '—'}"`,
          `"${(r.item_name || '—').replace(/"/g, '""')}"`,
          `"${r.uom || '—'}"`,
          r.quantity,
          r.unit_price,
          r.total_price,
          `"${(r.supplier_name || '—').replace(/"/g, '""')}"`,
          `"${r.parcel_reference || '—'}"`,
          `"${r.region || '—'}"`,
          `"${r.department_name || '—'}"`,
          `"${(r.works || '—').replace(/"/g, '""')}"`,
        ].join(',')
      );
    });

    // Summary line
    lines.push(
      [
        '"الإجمالي"',
        `"${liveTotals.uniqueOrders} أمر شراء"`,
        '""',
        '""',
        liveTotals.totalQty,
        '""',
        liveTotals.totalAmount,
        `"${liveTotals.uniqueSuppliers} مورد"`,
        '""',
        '""',
        '""',
        '""',
      ].join(',')
    );

    const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${dynamicReportTitle.replace(/[\s/]/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy to Clipboard (Tab-separated for direct paste into Excel)
  const handleCopyClipboard = () => {
    if (!filteredRows.length) return;

    const headers = [
      'تاريخ التوريد',
      'رقم أمر الشراء',
      'الصنف',
      'الوحدة',
      'الكمية',
      'سعر الوحدة',
      'سعر الكمية',
      'أسم المورد',
      'رقم القطعة',
      'إسم المنطقة',
      'القسم',
      'الاعمال',
    ];

    const lines: string[] = [headers.join('\t')];
    filteredRows.forEach((r) => {
      lines.push(
        [
          r.delivery_date_formatted || r.delivery_date || '—',
          r.po_number || '—',
          r.item_name || '—',
          r.uom || '—',
          r.quantity,
          r.unit_price,
          r.total_price,
          r.supplier_name || '—',
          r.parcel_reference || '—',
          r.region || '—',
          r.department_name || '—',
          r.works || '—',
        ].join('\t')
      );
    });

    void navigator.clipboard.writeText(lines.join('\n'));
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 3000);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* ========================================================================= */}
      {/* ── 1. OFFICIAL PRINT VIEW (Visible ONLY during window.print()) ─────────── */}
      {/* ========================================================================= */}
      <div className="hidden print:block font-sans text-black bg-white p-2">
        <div className="border-b-2 border-black pb-3 mb-3 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-black text-black tracking-tight">
              شركة اشبيلية للتطوير العقاري والمقاولات
            </h1>
            <h2 className="text-base font-extrabold text-slate-900 mt-1">
              {dynamicReportTitle}
            </h2>
            <div className="text-[11px] text-slate-600 mt-0.5">
              تقرير مشتريات معتمد ومسقط محاسبياً بالكميات المستلمة الفعلية وأسعارها المعتمدة
            </div>
          </div>
          <div className="text-left text-[11px] font-mono border border-black p-2 rounded bg-slate-50">
            <div>تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</div>
            <div>الوقت: {new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</div>
            <div>الحالة: معتمد نهائي بالحسابات</div>
          </div>
        </div>

        {/* Metadata Strip */}
        <div className="grid grid-cols-4 gap-2 mb-3 text-xs border border-black bg-slate-100 p-2 font-semibold">
          <div>
            <span className="text-slate-600 block text-[10px]">نطاق التقرير:</span>
            <span className="font-bold text-black">{dynamicReportTitle}</span>
          </div>
          <div>
            <span className="text-slate-600 block text-[10px]">القسم المحدد:</span>
            <span className="font-bold text-black">{activeDepartmentName || 'كافة الأقسام'}</span>
          </div>
          <div>
            <span className="text-slate-600 block text-[10px]">عدد بنود التوريد:</span>
            <span className="font-bold text-black font-mono">{filteredRows.length} بند</span>
          </div>
          <div>
            <span className="text-slate-600 block text-[10px]">إجمالي قيمة المشتريات:</span>
            <span className="font-black text-black font-mono text-sm">
              {liveTotals.totalAmount.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
            </span>
          </div>
        </div>

        {/* Print Table */}
        <table className="w-full border-collapse border-2 border-black text-[10px] text-right">
          <thead>
            <tr className="bg-slate-200 border-b-2 border-black font-black text-black">
              <th className="border border-black px-2 py-1 text-center w-8">م</th>
              <th className="border border-black px-2 py-1 text-center whitespace-nowrap">تاريخ التوريد</th>
              <th className="border border-black px-2 py-1 text-center whitespace-nowrap">رقم أمر الشراء</th>
              <th className="border border-black px-2 py-1">الصنف</th>
              <th className="border border-black px-1.5 py-1 text-center">الوحدة</th>
              <th className="border border-black px-2 py-1 text-center">الكمية</th>
              <th className="border border-black px-2 py-1 text-center">سعر الوحدة</th>
              <th className="border border-black px-2 py-1 text-center font-bold">سعر الكمية</th>
              <th className="border border-black px-2 py-1">أسم المورد</th>
              <th className="border border-black px-1.5 py-1 text-center">رقم القطعة</th>
              <th className="border border-black px-2 py-1 text-center">إسم المنطقة</th>
              <th className="border border-black px-2 py-1 text-center">القسم</th>
              <th className="border border-black px-2 py-1">الاعمال</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, idx) => (
              <tr key={row.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="border border-black px-1.5 py-1 text-center font-bold">{idx + 1}</td>
                <td className="border border-black px-2 py-1 text-center font-mono whitespace-nowrap">
                  {row.delivery_date_formatted || row.delivery_date}
                </td>
                <td className="border border-black px-2 py-1 text-center font-mono font-bold whitespace-nowrap">
                  {row.po_number_short || row.po_number}
                </td>
                <td className="border border-black px-2 py-1 font-bold">{row.item_name}</td>
                <td className="border border-black px-1.5 py-1 text-center">{getUnitLabel(row.uom) || row.uom}</td>
                <td className="border border-black px-2 py-1 text-center font-mono font-bold">
                  {Number(row.quantity).toLocaleString('ar-EG', { maximumFractionDigits: 3 })}
                </td>
                <td className="border border-black px-2 py-1 text-center font-mono">
                  {Number(row.unit_price).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                </td>
                <td className="border border-black px-2 py-1 text-center font-mono font-bold bg-slate-100">
                  {Number(row.total_price).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                </td>
                <td className="border border-black px-2 py-1">{row.supplier_name}</td>
                <td className="border border-black px-1.5 py-1 text-center font-mono font-bold">{row.parcel_reference}</td>
                <td className="border border-black px-2 py-1 text-center">{row.region}</td>
                <td className="border border-black px-2 py-1 text-center">{row.department_name}</td>
                <td className="border border-black px-2 py-1">{row.works}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-200 border-t-2 border-black font-black text-black">
              <td colSpan={5} className="border border-black px-2 py-1.5 text-center">
                الإجمالي العام ({filteredRows.length} بند توريد)
              </td>
              <td className="border border-black px-2 py-1.5 text-center font-mono font-bold">
                {liveTotals.totalQty.toLocaleString('ar-EG', { maximumFractionDigits: 3 })}
              </td>
              <td className="border border-black px-2 py-1.5 text-center">—</td>
              <td className="border border-black px-2 py-1.5 text-center font-mono font-black text-sm bg-slate-300">
                {liveTotals.totalAmount.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
              </td>
              <td colSpan={5} className="border border-black px-2 py-1.5 text-left text-[9px] text-slate-700">
                أوامر الشراء: {liveTotals.uniqueOrders} | الموردين: {liveTotals.uniqueSuppliers}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Signatures */}
        <div className="mt-8 pt-4 border-t border-black grid grid-cols-3 gap-6 text-center text-xs">
          <div className="space-y-4">
            <div className="font-bold">إعداد الحسابات</div>
            <div className="border-b border-dashed border-black h-8 w-40 mx-auto" />
            <div className="text-[10px] text-slate-500">التوقيع والتاريخ</div>
          </div>
          <div className="space-y-4">
            <div className="font-bold">مراجعة مدير المشتريات</div>
            <div className="border-b border-dashed border-black h-8 w-40 mx-auto" />
            <div className="text-[10px] text-slate-500">التوقيع والتاريخ</div>
          </div>
          <div className="space-y-4">
            <div className="font-bold">اعتماد المدير التنفيذي</div>
            <div className="border-b border-dashed border-black h-8 w-40 mx-auto" />
            <div className="text-[10px] text-slate-500">التوقيع والتاريخ</div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ── 2. ON-SCREEN INTERACTIVE DASHBOARD & TABLE ──────────────────────────── */}
      {/* ========================================================================= */}
      <div className="print:hidden space-y-6">
        {/* Header Title & Top Controls */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-l from-slate-900 via-slate-900/90 to-slate-950 p-5 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-lg">
                  📑
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-black text-slate-100 flex items-center gap-2">
                    <span>{dynamicReportTitle}</span>
                  </h1>
                  <p className="text-xs text-slate-400">
                    تقرير مشتريات تفصيلي مسقط من الحسابات وفق إذن الاستلام المعتمد والكميات الفعلية.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions (Print / Excel / Copy / Refresh) */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 px-3.5 py-2 text-xs font-bold text-slate-200 shadow-sm transition"
                title="طباعة التقرير الرسمي"
              >
                <span>🖨️</span>
                <span>طباعة التقرير</span>
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-600/40 bg-emerald-950/40 hover:bg-emerald-900/50 px-3.5 py-2 text-xs font-bold text-emerald-300 shadow-sm transition"
                title="تصدير شيت إكسل"
              >
                <span>📥</span>
                <span>تصدير إكسل</span>
              </button>

              <button
                type="button"
                onClick={handleCopyClipboard}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 px-3 py-2 text-xs font-bold text-slate-300 shadow-sm transition"
                title="نسخ الجدول لبرنامج إكسل"
              >
                <span>📋</span>
                <span>{copySuccess ? 'تم النسخ!' : 'نسخ لإكسل'}</span>
              </button>

              <button
                type="button"
                onClick={() => void loadReport()}
                disabled={refreshing}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-2 text-xs font-bold text-slate-300 transition disabled:opacity-50"
              >
                <span className={refreshing ? 'animate-spin' : ''}>🔄</span>
                <span>تحديث</span>
              </button>
            </div>
          </div>

          {/* Filter Bar: Period Type + Date Pickers + Department Dropdown */}
          <div className="mt-5 pt-4 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3 items-end">
            {/* 1. Period Mode Selection */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 block">نوع التقرير:</label>
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-950 p-1 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setFilterType('monthly')}
                  className={`py-1.5 text-xs font-extrabold rounded-lg transition ${
                    filterType === 'monthly'
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  شهري
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('daily')}
                  className={`py-1.5 text-xs font-extrabold rounded-lg transition ${
                    filterType === 'daily'
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  يومي
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('custom')}
                  className={`py-1.5 text-xs font-extrabold rounded-lg transition ${
                    filterType === 'custom'
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  مخصص
                </button>
              </div>
            </div>

            {/* 2. Date Input according to filterType */}
            {filterType === 'monthly' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 block">شهر التقرير (MM-YYYY):</label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono font-bold text-slate-200 focus:border-amber-400 focus:outline-none"
                />
              </div>
            )}

            {filterType === 'daily' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 block">تاريخ اليوم المحدد:</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono font-bold text-slate-200 focus:border-amber-400 focus:outline-none"
                />
              </div>
            )}

            {filterType === 'custom' && (
              <div className="space-y-1 col-span-1 md:col-span-2 grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-400 block">من تاريخ:</label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-slate-200 focus:border-amber-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block">إلى تاريخ:</label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-slate-200 focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* 3. Department Selector */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 block">القسم المنفذ / الطالب:</label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-bold text-slate-200 focus:border-amber-400 focus:outline-none"
              >
                <option value="ALL">جميع الأقسام</option>
                {data?.departments?.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Toggle Column Filters */}
            <div className="flex items-center justify-end pb-1">
              <button
                type="button"
                onClick={() => setShowColumnFilters((prev) => !prev)}
                className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 transition"
              >
                <span>🔍</span>
                <span>{showColumnFilters ? 'إخفاء فلاتر الأعمدة' : 'إظهار فلاتر الأعمدة'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-bold text-rose-300">
            {error}
          </div>
        )}

        {/* Financial KPI Summary Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-1 shadow-md">
            <span className="text-[11px] font-bold text-slate-400 block">إجمالي مشتريات التقرير</span>
            <span className="text-lg font-black text-emerald-400 font-mono block">
              <CurrencyDisplay amount={liveTotals.totalAmount} />
            </span>
            <span className="text-[10px] text-slate-500 block">معتمد ومسقط بالحسابات</span>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-1 shadow-md">
            <span className="text-[11px] font-bold text-slate-400 block">إجمالي الكميات المسقطة</span>
            <span className="text-lg font-black text-amber-300 font-mono block">
              {liveTotals.totalQty.toLocaleString('ar-EG', { maximumFractionDigits: 3 })}
            </span>
            <span className="text-[10px] text-slate-500 block">كميات مستلمة فعلياً</span>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-1 shadow-md">
            <span className="text-[11px] font-bold text-slate-400 block">أوامر الشراء المسجلة</span>
            <span className="text-lg font-black text-cyan-300 font-mono block">
              {liveTotals.uniqueOrders} أمر
            </span>
            <span className="text-[10px] text-slate-500 block">إجمالي البنود: {filteredRows.length}</span>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-1 shadow-md">
            <span className="text-[11px] font-bold text-slate-400 block">الموردين المعتمدين</span>
            <span className="text-lg font-black text-purple-300 font-mono block">
              {liveTotals.uniqueSuppliers} مورد
            </span>
            <span className="text-[10px] text-slate-500 block">حسب الفلاتر المحددة</span>
          </div>
        </div>

        {/* ── Main 12-Column Table Container ── */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 sm:p-5 space-y-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 text-base">📊</span>
              <h3 className="text-sm font-black text-slate-100">
                جدول بيانات تقرير المشتريات (12 عموداً محاسبياً)
              </h3>
              {hasActiveColFilters && (
                <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-300 border border-amber-500/30">
                  فلاتر نشطة
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {hasActiveColFilters && (
                <button
                  type="button"
                  onClick={handleClearColFilters}
                  className="rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-rose-400 transition"
                >
                  إلغاء فلاتر الأعمدة ✕
                </button>
              )}
              <span className="text-xs text-slate-400 font-mono">
                المعروض: <strong className="text-slate-200">{filteredRows.length}</strong> بند
              </span>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[250px] items-center justify-center p-8 text-amber-400">
              <div className="flex flex-col items-center gap-3 text-center">
                <span className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                <span className="text-xs font-bold text-slate-400">
                  جاري جلب واحتساب بيانات مشتريات الحسابات المعتمدة...
                </span>
              </div>
            </div>
          ) : filteredRows.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-slate-800 shadow-inner">
              <table className="w-full text-right text-xs border-collapse min-w-[1100px]">
                {/* 1. Header with exact column names from paper slip */}
                <thead className="bg-slate-900 border-b border-slate-700 text-slate-200 font-black">
                  <tr>
                    <th className="px-2.5 py-3 text-center w-8 border-l border-slate-800">م</th>
                    <th className="px-3 py-3 text-center border-l border-slate-800 whitespace-nowrap">تاريخ التوريد</th>
                    <th className="px-3 py-3 text-center border-l border-slate-800 whitespace-nowrap">رقم أمر الشراء</th>
                    <th className="px-3 py-3 border-l border-slate-800 min-w-[150px]">الصنف</th>
                    <th className="px-2.5 py-3 text-center border-l border-slate-800 w-16">الوحدة</th>
                    <th className="px-3 py-3 text-center border-l border-slate-800 w-20">الكمية</th>
                    <th className="px-3 py-3 text-center border-l border-slate-800 w-24">سعر الوحدة</th>
                    <th className="px-3 py-3 text-center border-l border-slate-800 w-28 bg-slate-900/90 text-amber-300">سعر الكمية</th>
                    <th className="px-3 py-3 border-l border-slate-800 min-w-[130px]">أسم المورد</th>
                    <th className="px-2.5 py-3 text-center border-l border-slate-800 w-20">رقم القطعة</th>
                    <th className="px-3 py-3 text-center border-l border-slate-800 w-24">إسم المنطقة</th>
                    <th className="px-3 py-3 text-center border-l border-slate-800 w-24">القسم</th>
                    <th className="px-3 py-3 min-w-[160px]">الاعمال</th>
                  </tr>

                  {/* 2. Per-Column Filter Input Row */}
                  {showColumnFilters && (
                    <tr className="bg-slate-950 border-b border-slate-800 text-[11px] font-normal">
                      <th className="p-1 border-l border-slate-800 text-center text-slate-600">—</th>
                      <th className="p-1 border-l border-slate-800">
                        <input
                          type="text"
                          placeholder="تاريخ..."
                          value={colFilters.delivery_date}
                          onChange={(e) => handleUpdateColFilter('delivery_date', e.target.value)}
                          className="w-full rounded bg-slate-900 px-1.5 py-1 text-[11px] text-slate-200 placeholder-slate-600 border border-slate-800 focus:border-amber-400 focus:outline-none"
                        />
                      </th>
                      <th className="p-1 border-l border-slate-800">
                        <input
                          type="text"
                          placeholder="رقم الأمر..."
                          value={colFilters.po_number}
                          onChange={(e) => handleUpdateColFilter('po_number', e.target.value)}
                          className="w-full rounded bg-slate-900 px-1.5 py-1 text-[11px] text-slate-200 placeholder-slate-600 border border-slate-800 focus:border-amber-400 focus:outline-none"
                        />
                      </th>
                      <th className="p-1 border-l border-slate-800">
                        <input
                          type="text"
                          placeholder="الصنف..."
                          value={colFilters.item_name}
                          onChange={(e) => handleUpdateColFilter('item_name', e.target.value)}
                          className="w-full rounded bg-slate-900 px-1.5 py-1 text-[11px] text-slate-200 placeholder-slate-600 border border-slate-800 focus:border-amber-400 focus:outline-none"
                        />
                      </th>
                      <th className="p-1 border-l border-slate-800">
                        <input
                          type="text"
                          placeholder="الوحدة..."
                          value={colFilters.uom}
                          onChange={(e) => handleUpdateColFilter('uom', e.target.value)}
                          className="w-full rounded bg-slate-900 px-1.5 py-1 text-[11px] text-slate-200 placeholder-slate-600 border border-slate-800 focus:border-amber-400 focus:outline-none text-center"
                        />
                      </th>
                      <th className="p-1 border-l border-slate-800">
                        <input
                          type="text"
                          placeholder="كمية..."
                          value={colFilters.quantity}
                          onChange={(e) => handleUpdateColFilter('quantity', e.target.value)}
                          className="w-full rounded bg-slate-900 px-1.5 py-1 text-[11px] text-slate-200 placeholder-slate-600 border border-slate-800 focus:border-amber-400 focus:outline-none text-center"
                        />
                      </th>
                      <th className="p-1 border-l border-slate-800">
                        <input
                          type="text"
                          placeholder="سعر..."
                          value={colFilters.unit_price}
                          onChange={(e) => handleUpdateColFilter('unit_price', e.target.value)}
                          className="w-full rounded bg-slate-900 px-1.5 py-1 text-[11px] text-slate-200 placeholder-slate-600 border border-slate-800 focus:border-amber-400 focus:outline-none text-center"
                        />
                      </th>
                      <th className="p-1 border-l border-slate-800">
                        <input
                          type="text"
                          placeholder="إجمالي..."
                          value={colFilters.total_price}
                          onChange={(e) => handleUpdateColFilter('total_price', e.target.value)}
                          className="w-full rounded bg-slate-900 px-1.5 py-1 text-[11px] text-slate-200 placeholder-slate-600 border border-slate-800 focus:border-amber-400 focus:outline-none text-center"
                        />
                      </th>
                      <th className="p-1 border-l border-slate-800">
                        <input
                          type="text"
                          placeholder="المورد..."
                          value={colFilters.supplier_name}
                          onChange={(e) => handleUpdateColFilter('supplier_name', e.target.value)}
                          className="w-full rounded bg-slate-900 px-1.5 py-1 text-[11px] text-slate-200 placeholder-slate-600 border border-slate-800 focus:border-amber-400 focus:outline-none"
                        />
                      </th>
                      <th className="p-1 border-l border-slate-800">
                        <input
                          type="text"
                          placeholder="قطعة..."
                          value={colFilters.parcel_reference}
                          onChange={(e) => handleUpdateColFilter('parcel_reference', e.target.value)}
                          className="w-full rounded bg-slate-900 px-1.5 py-1 text-[11px] text-slate-200 placeholder-slate-600 border border-slate-800 focus:border-amber-400 focus:outline-none text-center"
                        />
                      </th>
                      <th className="p-1 border-l border-slate-800">
                        <input
                          type="text"
                          placeholder="منطقة..."
                          value={colFilters.region}
                          onChange={(e) => handleUpdateColFilter('region', e.target.value)}
                          className="w-full rounded bg-slate-900 px-1.5 py-1 text-[11px] text-slate-200 placeholder-slate-600 border border-slate-800 focus:border-amber-400 focus:outline-none text-center"
                        />
                      </th>
                      <th className="p-1 border-l border-slate-800">
                        <input
                          type="text"
                          placeholder="القسم..."
                          value={colFilters.department_name}
                          onChange={(e) => handleUpdateColFilter('department_name', e.target.value)}
                          className="w-full rounded bg-slate-900 px-1.5 py-1 text-[11px] text-slate-200 placeholder-slate-600 border border-slate-800 focus:border-amber-400 focus:outline-none text-center"
                        />
                      </th>
                      <th className="p-1">
                        <input
                          type="text"
                          placeholder="الاعمال..."
                          value={colFilters.works}
                          onChange={(e) => handleUpdateColFilter('works', e.target.value)}
                          className="w-full rounded bg-slate-900 px-1.5 py-1 text-[11px] text-slate-200 placeholder-slate-600 border border-slate-800 focus:border-amber-400 focus:outline-none"
                        />
                      </th>
                    </tr>
                  )}
                </thead>

                {/* 3. Table Rows */}
                <tbody className="divide-y divide-slate-800/70">
                  {filteredRows.map((row, idx) => (
                    <tr
                      key={row.id}
                      className={`hover:bg-slate-900/60 transition-colors ${
                        idx % 2 === 0 ? 'bg-slate-950/40' : 'bg-slate-900/20'
                      }`}
                    >
                      {/* م */}
                      <td className="px-2.5 py-2.5 text-center font-mono font-bold text-slate-500 border-l border-slate-800">
                        {idx + 1}
                      </td>

                      {/* 1. تاريخ التوريد */}
                      <td className="px-3 py-2.5 text-center font-mono text-slate-300 border-l border-slate-800 whitespace-nowrap text-[11px]">
                        {row.delivery_date_formatted || row.delivery_date}
                      </td>

                      {/* 2. رقم أمر الشراء */}
                      <td className="px-3 py-2.5 text-center font-mono font-bold text-cyan-300 border-l border-slate-800 whitespace-nowrap">
                        {row.po_number_short || row.po_number}
                      </td>

                      {/* 3. الصنف */}
                      <td className="px-3 py-2.5 font-bold text-slate-100 border-l border-slate-800">
                        {row.item_name}
                      </td>

                      {/* 4. الوحدة */}
                      <td className="px-2.5 py-2.5 text-center text-slate-300 border-l border-slate-800">
                        {getUnitLabel(row.uom) || row.uom}
                      </td>

                      {/* 5. الكمية */}
                      <td className="px-3 py-2.5 text-center font-mono font-extrabold text-amber-300 border-l border-slate-800">
                        {Number(row.quantity).toLocaleString('ar-EG', { maximumFractionDigits: 3 })}
                      </td>

                      {/* 6. سعر الوحدة */}
                      <td className="px-3 py-2.5 text-center font-mono text-slate-300 border-l border-slate-800">
                        {Number(row.unit_price).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                      </td>

                      {/* 7. سعر الكمية (الإجمالي) */}
                      <td className="px-3 py-2.5 text-center font-mono font-extrabold text-emerald-300 border-l border-slate-800 bg-emerald-950/20">
                        {Number(row.total_price).toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                      </td>

                      {/* 8. أسم المورد */}
                      <td className="px-3 py-2.5 font-bold text-slate-200 border-l border-slate-800">
                        {row.supplier_name}
                      </td>

                      {/* 9. رقم القطعة */}
                      <td className="px-2.5 py-2.5 text-center font-mono font-bold text-amber-400 border-l border-slate-800">
                        {row.parcel_reference}
                      </td>

                      {/* 10. إسم المنطقة */}
                      <td className="px-3 py-2.5 text-center text-slate-300 border-l border-slate-800">
                        {row.region}
                      </td>

                      {/* 11. القسم */}
                      <td className="px-3 py-2.5 text-center text-slate-300 border-l border-slate-800">
                        <span className="inline-block rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-bold text-slate-200">
                          {row.department_name}
                        </span>
                      </td>

                      {/* 12. الاعمال */}
                      <td className="px-3 py-2.5 text-slate-300 font-medium leading-relaxed">
                        {row.works}
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* 4. Table Footer Summary Row */}
                <tfoot className="bg-slate-900 border-t-2 border-slate-700 text-slate-200 font-black">
                  <tr>
                    <td colSpan={5} className="px-3 py-3 text-center border-l border-slate-800 text-xs">
                      إجمالي البنود المفلترة ({filteredRows.length} بند)
                    </td>
                    <td className="px-3 py-3 text-center font-mono font-extrabold text-amber-300 border-l border-slate-800">
                      {liveTotals.totalQty.toLocaleString('ar-EG', { maximumFractionDigits: 3 })}
                    </td>
                    <td className="px-3 py-3 text-center font-mono text-slate-400 border-l border-slate-800">
                      —
                    </td>
                    <td className="px-3 py-3 text-center font-mono font-black text-sm text-emerald-400 border-l border-slate-800 bg-emerald-950/40">
                      {liveTotals.totalAmount.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
                    </td>
                    <td colSpan={5} className="px-3 py-3 text-slate-400 text-xs text-left">
                      الأوامر: <strong className="text-slate-200">{liveTotals.uniqueOrders}</strong> | الموردين: <strong className="text-slate-200">{liveTotals.uniqueSuppliers}</strong>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-slate-800/80 bg-slate-950/40">
              <span className="text-4xl mb-2">🔍</span>
              <p className="text-sm font-extrabold text-slate-200">
                لا توجد مشتريات معتمدة مسجلة بالحسابات لهذه الفترة أو الفلاتر
              </p>
              <p className="text-xs text-slate-500 mt-1">
                تأكد من قيام الحسابات بتسجيل فاتورة المورد على إذن الاستلام المعتمد لتسقط البيانات في هذا التقرير.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PurchasesReportView;
