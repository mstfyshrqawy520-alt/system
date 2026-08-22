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
    badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
    dotClass: 'bg-slate-400',
  };

  const config = statusConfigs[normalizedStatus] || fallbackConfig;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border transition-colors ${config.badgeClass} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ml-1.5 ${config.dotClass}`} aria-hidden="true" />
      <span>{config.labelAr}</span>
      {showEnglish && config.labelEn && (
        <span className="mr-1 text-[10px] opacity-80 font-medium">
          {config.labelEn}
        </span>
      )}
    </span>
  );
};
