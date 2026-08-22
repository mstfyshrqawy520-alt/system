import React from 'react';

export interface DashboardChartSegment {
  label: string;
  value: number;
  color?: string;
}

const palette = ['#06b6d4', '#22c55e', '#f59e0b', '#8b5cf6', '#f43f5e', '#38bdf8', '#14b8a6', '#fb7185'];

const formatValue = (value: number) => value.toLocaleString('ar-EG', { maximumFractionDigits: 0 });

export const DashboardDonut: React.FC<{
  title: string;
  subtitle?: string;
  segments: DashboardChartSegment[];
  centerLabel: string;
  centerValue: string | number;
}> = ({ title, subtitle, segments, centerLabel, centerValue }) => {
  const visible = segments.filter((segment) => segment.value > 0).map((segment, index) => ({ ...segment, color: segment.color || palette[index % palette.length] }));
  const total = visible.reduce((sum, segment) => sum + segment.value, 0);
  const radius = 66;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950 p-4" dir="rtl">
      <h3 className="font-bold text-cyan-300">{title}</h3>
      {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
      {!visible.length ? (
        <div className="flex min-h-[210px] items-center justify-center text-xs text-slate-500">لا توجد بيانات كافية للرسم.</div>
      ) : (
        <div className="flex min-h-[235px] items-center gap-4">
          <div className="relative h-[190px] w-[190px] shrink-0">
            <svg viewBox="0 0 190 190" className="h-full w-full -rotate-90" role="img" aria-label={title}>
              <circle cx="95" cy="95" r={radius} fill="none" stroke="#1e293b" strokeWidth="26" />
              {visible.map((segment) => {
                const length = total ? segment.value / total * circumference : 0;
                const segmentOffset = offset;
                offset += length;
                return <circle key={segment.label} cx="95" cy="95" r={radius} fill="none" stroke={segment.color} strokeWidth="26" strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={-segmentOffset} />;
              })}
              <circle cx="95" cy="95" r="48" fill="#080f1f" />
            </svg>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <strong className="text-xl text-slate-100">{typeof centerValue === 'number' ? formatValue(centerValue) : centerValue}</strong>
              <span className="mt-1 text-[10px] text-slate-500">{centerLabel}</span>
            </div>
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            {visible.map((segment) => (
              <div key={segment.label} className="flex items-center justify-between gap-2 text-xs">
                <span className="flex min-w-0 items-center gap-2 text-slate-300"><span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: segment.color }} /><span className="truncate">{segment.label}</span></span>
                <strong className="shrink-0 font-mono text-slate-100">{formatValue(segment.value)}</strong>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export const DashboardBars: React.FC<{
  title: string;
  subtitle?: string;
  segments: DashboardChartSegment[];
  unit?: string;
}> = ({ title, subtitle, segments, unit = '' }) => {
  const visible = segments.filter((segment) => segment.value > 0).sort((a, b) => b.value - a.value).slice(0, 7).map((segment, index) => ({ ...segment, color: segment.color || palette[index % palette.length] }));
  const max = Math.max(...visible.map((segment) => segment.value), 1);

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950 p-4" dir="rtl">
      <h3 className="font-bold text-cyan-300">{title}</h3>
      {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
      {!visible.length ? (
        <div className="flex min-h-[210px] items-center justify-center text-xs text-slate-500">لا توجد بيانات كافية للرسم.</div>
      ) : (
        <div className="space-y-4 py-5">
          {visible.map((segment) => (
            <div key={segment.label}>
              <div className="mb-1 flex items-center justify-between gap-3 text-xs"><span className="max-w-[62%] truncate text-slate-300">{segment.label}</span><strong className="font-mono text-slate-100">{formatValue(segment.value)} {unit}</strong></div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full" style={{ width: `${segment.value / max * 100}%`, backgroundColor: segment.color }} /></div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
