import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`bg-slate-900/85 border border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-lg shadow-slate-950/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:border-slate-700 hover:shadow-xl hover:shadow-cyan-950/20' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};

export interface KpiCardProps {
  title: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  subtext?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  accentColor?: 'cyan' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'purple' | 'slate' | 'orange' | 'violet';
  className?: string;
  onClick?: () => void;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  icon,
  subtext,
  trend,
  accentColor = 'cyan',
  className = '',
  onClick,
}) => {
  const accentClasses: Record<string, { iconBg: string; text: string; glow: string }> = {
    cyan: { iconBg: 'bg-cyan-950/60 text-cyan-400 border-cyan-800/60', text: 'text-cyan-400', glow: 'group-hover:border-cyan-500/40' },
    emerald: { iconBg: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60', text: 'text-emerald-400', glow: 'group-hover:border-emerald-500/40' },
    amber: { iconBg: 'bg-amber-950/60 text-amber-400 border-amber-800/60', text: 'text-amber-400', glow: 'group-hover:border-amber-500/40' },
    rose: { iconBg: 'bg-rose-950/60 text-rose-400 border-rose-800/60', text: 'text-rose-400', glow: 'group-hover:border-rose-500/40' },
    indigo: { iconBg: 'bg-indigo-950/60 text-indigo-400 border-indigo-800/60', text: 'text-indigo-400', glow: 'group-hover:border-indigo-500/40' },
    purple: { iconBg: 'bg-purple-950/60 text-purple-400 border-purple-800/60', text: 'text-purple-400', glow: 'group-hover:border-purple-500/40' },
    orange: { iconBg: 'bg-orange-950/60 text-orange-400 border-orange-800/60', text: 'text-orange-400', glow: 'group-hover:border-orange-500/40' },
    violet: { iconBg: 'bg-violet-950/60 text-violet-400 border-violet-800/60', text: 'text-violet-400', glow: 'group-hover:border-violet-500/40' },
    slate: { iconBg: 'bg-slate-800/80 text-slate-300 border-slate-700/60', text: 'text-slate-300', glow: 'group-hover:border-slate-600' },
  };

  const accent = accentClasses[accentColor] || accentClasses.cyan;

  return (
    <Card
      onClick={onClick}
      className={`relative overflow-hidden group hover:border-slate-700/90 transition-all ${accent.glow} ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-bold text-slate-400">{title}</p>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-black text-slate-100 tracking-tight">{value}</div>
            {trend && (
              <span className={`text-[11px] font-black ${trend.isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                {trend.isPositive ? '↑' : '↓'} {trend.value}
              </span>
            )}
          </div>
          {subtext && <p className="text-[11px] text-slate-500 font-medium">{subtext}</p>}
        </div>
        {icon && (
          <div className={`p-2.5 rounded-xl border ${accent.iconBg} transition-transform group-hover:scale-110 shadow-inner`}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
};

export default Card;
