import React from 'react';
import { Link } from 'react-router-dom';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  to?: string;
  isActive?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick, to, isActive }) => {
  const isClickable = Boolean(onClick || to);
  const activeClasses = isActive
    ? 'ring-2 ring-cyan-500/70 border-cyan-500/80 bg-slate-850 shadow-cyan-950/40'
    : '';
  const clickableClasses = isClickable
    ? 'cursor-pointer hover:border-slate-600 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-cyan-950/30 active:scale-[0.98]'
    : '';

  const content = (
    <div
      onClick={onClick}
      className={`bg-slate-900/85 border border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-lg shadow-slate-950/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md transition-all duration-200 ${clickableClasses} ${activeClasses} ${className}`}
    >
      {children}
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block no-underline">
        {content}
      </Link>
    );
  }

  return content;
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
  to?: string;
  isActive?: boolean;
  clickableHint?: string;
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
  to,
  isActive = false,
  clickableHint,
}) => {
  const isInteractive = Boolean(onClick || to);

  const accentClasses: Record<string, { iconBg: string; text: string; glow: string; activeBorder: string }> = {
    cyan: { iconBg: 'bg-cyan-950/60 text-cyan-400 border-cyan-800/60', text: 'text-cyan-400', glow: 'group-hover:border-cyan-500/50', activeBorder: 'ring-2 ring-cyan-500/80 border-cyan-400/80' },
    emerald: { iconBg: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60', text: 'text-emerald-400', glow: 'group-hover:border-emerald-500/50', activeBorder: 'ring-2 ring-emerald-500/80 border-emerald-400/80' },
    amber: { iconBg: 'bg-amber-950/60 text-amber-400 border-amber-800/60', text: 'text-amber-400', glow: 'group-hover:border-amber-500/50', activeBorder: 'ring-2 ring-amber-500/80 border-amber-400/80' },
    rose: { iconBg: 'bg-rose-950/60 text-rose-400 border-rose-800/60', text: 'text-rose-400', glow: 'group-hover:border-rose-500/50', activeBorder: 'ring-2 ring-rose-500/80 border-rose-400/80' },
    indigo: { iconBg: 'bg-indigo-950/60 text-indigo-400 border-indigo-800/60', text: 'text-indigo-400', glow: 'group-hover:border-indigo-500/50', activeBorder: 'ring-2 ring-indigo-500/80 border-indigo-400/80' },
    purple: { iconBg: 'bg-purple-950/60 text-purple-400 border-purple-800/60', text: 'text-purple-400', glow: 'group-hover:border-purple-500/50', activeBorder: 'ring-2 ring-purple-500/80 border-purple-400/80' },
    orange: { iconBg: 'bg-orange-950/60 text-orange-400 border-orange-800/60', text: 'text-orange-400', glow: 'group-hover:border-orange-500/50', activeBorder: 'ring-2 ring-orange-500/80 border-orange-400/80' },
    violet: { iconBg: 'bg-violet-950/60 text-violet-400 border-violet-800/60', text: 'text-violet-400', glow: 'group-hover:border-violet-500/50', activeBorder: 'ring-2 ring-violet-500/80 border-violet-400/80' },
    slate: { iconBg: 'bg-slate-800/80 text-slate-300 border-slate-700/60', text: 'text-slate-300', glow: 'group-hover:border-slate-600', activeBorder: 'ring-2 ring-slate-400/80 border-slate-300/80' },
  };

  const accent = accentClasses[accentColor] || accentClasses.cyan;

  const cardElement = (
    <Card
      onClick={onClick}
      isActive={isActive}
      className={`relative overflow-hidden group select-none transition-all ${accent.glow} ${
        isActive ? `${accent.activeBorder} shadow-lg shadow-cyan-950/40` : ''
      } ${isInteractive ? 'hover:scale-[1.02] cursor-pointer' : ''} ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-bold text-slate-400 group-hover:text-slate-200 transition-colors">{title}</p>
            {isInteractive && (
              <span className="text-[10px] text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-[-2px] transition-all opacity-0 group-hover:opacity-100">
                ←
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-black text-slate-100 tracking-tight group-hover:text-white transition-colors">{value}</div>
            {trend && (
              <span className={`text-[11px] font-black ${trend.isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                {trend.isPositive ? '↑' : '↓'} {trend.value}
              </span>
            )}
          </div>
          {subtext && <p className="text-[11px] text-slate-500 font-medium">{subtext}</p>}
          {clickableHint && (
            <p className="text-[10px] text-cyan-400/80 font-semibold group-hover:text-cyan-300 transition-colors">
              {clickableHint}
            </p>
          )}
        </div>
        {icon && (
          <div className={`p-2.5 rounded-xl border ${accent.iconBg} transition-transform group-hover:scale-110 group-hover:rotate-3 shadow-inner`}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );

  if (to) {
    return (
      <Link to={to} className="block no-underline">
        {cardElement}
      </Link>
    );
  }

  return cardElement;
};

export default Card;
