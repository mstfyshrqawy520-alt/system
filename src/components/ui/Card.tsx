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
      className={`bg-slate-900/80 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-lg shadow-slate-950/50 backdrop-blur-sm transition-all duration-200 ${onClick ? 'cursor-pointer hover:border-slate-700' : ''} ${className}`}
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
  const accentClasses: Record<string, { iconBg: string; text: string }> = {
    cyan: { iconBg: 'bg-cyan-950/60 text-cyan-400 border-cyan-800/50', text: 'text-cyan-400' },
    emerald: { iconBg: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/50', text: 'text-emerald-400' },
    amber: { iconBg: 'bg-amber-950/60 text-amber-400 border-amber-800/50', text: 'text-amber-400' },
    rose: { iconBg: 'bg-rose-950/60 text-rose-400 border-rose-800/50', text: 'text-rose-400' },
    indigo: { iconBg: 'bg-indigo-950/60 text-indigo-400 border-indigo-800/50', text: 'text-indigo-400' },
    purple: { iconBg: 'bg-purple-950/60 text-purple-400 border-purple-800/50', text: 'text-purple-400' },
    orange: { iconBg: 'bg-orange-950/60 text-orange-400 border-orange-800/50', text: 'text-orange-400' },
    violet: { iconBg: 'bg-violet-950/60 text-violet-400 border-violet-800/50', text: 'text-violet-400' },
    slate: { iconBg: 'bg-slate-800/80 text-slate-300 border-slate-700/50', text: 'text-slate-300' },
  };

  const accent = accentClasses[accentColor] || accentClasses.cyan;

  return (
    <Card
      onClick={onClick}
      className={`relative overflow-hidden group hover:border-slate-700 transition-all ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-400">{title}</p>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-black text-slate-100 tracking-tight">{value}</div>
            {trend && (
              <span className={`text-[11px] font-bold ${trend.isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                {trend.isPositive ? '↑' : '↓'} {trend.value}
              </span>
            )}
          </div>
          {subtext && <p className="text-[11px] text-slate-500 font-medium">{subtext}</p>}
        </div>
        {icon && (
          <div className={`p-2.5 rounded-lg border ${accent.iconBg} transition-transform group-hover:scale-105`}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
};
