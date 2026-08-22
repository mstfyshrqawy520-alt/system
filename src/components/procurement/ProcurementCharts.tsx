import React, { useMemo } from 'react';
import { PurchaseOrder } from '../../types/purchaseOrder';
import { statusConfigs } from '../../theme/tokens';

interface ProcurementChartsProps {
  orders: PurchaseOrder[];
}

interface Segment {
  label: string;
  value: number;
  color: string;
}

const COLORS = ['#09b5d3', '#2dd4bf', '#f59e0b', '#8b5cf6', '#f43f5e', '#22c55e', '#38bdf8', '#fb7185'];

const amount = (value: number) => value.toLocaleString('ar-EG', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const shortAmount = (value: number) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toLocaleString('ar-EG', { maximumFractionDigits: 1 })} م`;
  if (value >= 1_000) return `${(value / 1_000).toLocaleString('ar-EG', { maximumFractionDigits: 1 })} ك`;
  return amount(value);
};

const buildSegments = (values: Array<{ label: string; value: number }>): Segment[] => values
  .filter((entry) => entry.value > 0)
  .sort((a, b) => b.value - a.value)
  .map((entry, index) => ({ ...entry, color: COLORS[index % COLORS.length] }));

const DonutChart: React.FC<{ segments: Segment[]; centerLabel: string; centerValue: string }> = ({ segments, centerLabel, centerValue }) => {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const radius = 76;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex min-h-[260px] items-center justify-center gap-6">
      <div className="relative h-[220px] w-[220px] shrink-0">
        <svg viewBox="0 0 220 220" className="h-full w-full -rotate-90" role="img" aria-label={centerLabel}>
          <circle cx="110" cy="110" r={radius} fill="none" stroke="#1e293b" strokeWidth="30" />
          {segments.map((segment) => {
            const length = total ? (segment.value / total) * circumference : 0;
            const currentOffset = offset;
            offset += length;
            return (
              <circle
                key={segment.label}
                cx="110"
                cy="110"
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth="30"
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-currentOffset}
              />
            );
          })}
          <circle cx="110" cy="110" r="57" fill="#080f1f" />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-black text-slate-100">{centerValue}</span>
          <span className="mt-1 text-[11px] text-slate-400">{centerLabel}</span>
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        {segments.map((segment) => (
          <div key={segment.label} className="flex items-center justify-between gap-3 text-xs">
            <span className="flex min-w-0 items-center gap-2 text-slate-300">
              <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: segment.color }} />
              <span className="truncate">{segment.label}</span>
            </span>
            <span className="shrink-0 font-mono font-bold text-slate-100">{shortAmount(segment.value)} ج.م</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const HorizontalBars: React.FC<{ segments: Segment[] }> = ({ segments }) => {
  const max = Math.max(...segments.map((segment) => segment.value), 1);
  return (
    <div className="space-y-4 py-2">
      {segments.slice(0, 7).map((segment) => (
        <div key={segment.label}>
          <div className="mb-1 flex items-center justify-between gap-3 text-xs">
            <span className="max-w-[60%] truncate text-slate-300">{segment.label}</span>
            <span className="font-mono font-bold text-slate-100">{amount(segment.value)} ج.م</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full rounded-full" style={{ width: `${(segment.value / max) * 100}%`, backgroundColor: segment.color }} />
          </div>
        </div>
      ))}
    </div>
  );
};

const EmptyChart: React.FC<{ text: string }> = ({ text }) => (
  <div className="flex min-h-[260px] items-center justify-center text-sm text-slate-500">{text}</div>
);

const ProcurementCharts: React.FC<ProcurementChartsProps> = ({ orders }) => {
  const departmentSegments = useMemo(() => buildSegments(Array.from(orders.reduce((map, order) => {
    const label = order.department?.name || order.purchase_request?.department?.name || 'غير محدد';
    map.set(label, (map.get(label) || 0) + Number(order.grand_total || 0));
    return map;
  }, new Map<string, number>()).entries()).map(([label, value]) => ({ label, value }))), [orders]);

  const supplierSegments = useMemo(() => buildSegments(Array.from(orders.reduce((map, order) => {
    const label = order.supplier?.company_name || 'غير محدد';
    map.set(label, (map.get(label) || 0) + Number(order.grand_total || 0));
    return map;
  }, new Map<string, number>()).entries()).map(([label, value]) => ({ label, value }))), [orders]);

  const statusSegments = useMemo(() => buildSegments(Array.from(orders.reduce((map, order) => {
    const label = statusConfigs[order.status]?.labelAr || order.status;
    map.set(label, (map.get(label) || 0) + 1);
    return map;
  }, new Map<string, number>()).entries()).map(([label, value]) => ({ label, value }))), [orders]);

  const totalValue = orders.reduce((sum, order) => sum + Number(order.grand_total || 0), 0);
  const totalOrders = orders.length;

  if (!orders.length) return <EmptyChart text="لا توجد بيانات كافية لإنشاء الرسومات ضمن الفلاتر الحالية." />;

  return (
    <div className="space-y-4" dir="rtl">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-[#080f1f] p-4">
          <div className="mb-1 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-cyan-300">توزيع المصروفات حسب الأقسام</h3>
              <p className="mt-1 text-xs text-slate-500">حصة كل قسم من إجمالي قيمة أوامر الشراء الحالية</p>
            </div>
            <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-300">بالجنيه المصري</span>
          </div>
          <DonutChart segments={departmentSegments} centerLabel="إجمالي الإنفاق" centerValue={`${shortAmount(totalValue)} ج.م`} />
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#080f1f] p-4">
          <div className="mb-1 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-cyan-300">أبرز الموردين حسب الإنفاق</h3>
              <p className="mt-1 text-xs text-slate-500">الموردون الأعلى قيمة ضمن النتائج المفلترة</p>
            </div>
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">أعلى 7</span>
          </div>
          <HorizontalBars segments={supplierSegments} />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-[#080f1f] p-4">
        <div className="mb-1 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-cyan-300">حالة أوامر الشراء</h3>
            <p className="mt-1 text-xs text-slate-500">توزيع عدد الأوامر حسب الحالة الحالية</p>
          </div>
          <span className="text-sm font-bold text-slate-200">{amount(totalOrders)} أمر</span>
        </div>
        <DonutChart segments={statusSegments} centerLabel="عدد الأوامر" centerValue={amount(totalOrders)} />
      </div>
    </div>
  );
};

export default ProcurementCharts;
