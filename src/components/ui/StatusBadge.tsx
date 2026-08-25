import React from 'react';
import { statusConfigs, StatusConfig } from '../../theme/tokens';

export interface StatusBadgeProps {
  status: string;
  showEnglish?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  showEnglish = false,
  className = '',
}) => {
  const normalizedStatus = (status || '').toUpperCase();

  const fallbackConfig: StatusConfig = {
    labelAr: 'الحالة غير معروفة',
    labelEn: '',
    badgeClass: 'bg-slate-850 text-slate-300 border-slate-700/80',
    dotClass: 'bg-slate-400',
  };

  const config = statusConfigs[normalizedStatus] || fallbackConfig;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border backdrop-blur-xs shadow-xs transition-all ${config.badgeClass} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ml-1.5 shrink-0 shadow-sm ${config.dotClass}`} aria-hidden="true" />
      <span className="whitespace-nowrap">{config.labelAr}</span>
      {showEnglish && config.labelEn && (
        <span className="mr-1.5 text-[10px] opacity-75 font-mono">
          ({config.labelEn})
        </span>
      )}
    </span>
  );
};

export default StatusBadge;
