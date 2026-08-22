import React from 'react';

export interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export const Table: React.FC<TableProps> = ({ children, className = '' }) => {
  return (
    <div className="w-full max-w-full min-w-0 overflow-x-visible rounded-xl border border-slate-800 bg-slate-900/60 shadow-lg md:overflow-x-auto md:overscroll-x-contain md:touch-pan-x md:[scrollbar-width:thin]">
      <table className={`min-w-full text-right text-xs text-slate-200 border-collapse ${className}`}>
        {children}
      </table>
    </div>
  );
};

export const TableHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return (
    <thead className={`sticky top-0 z-10 bg-slate-950 text-slate-300 font-semibold border-b border-slate-700 shadow-sm ${className}`}>
      {children}
    </thead>
  );
};

export const TableBody: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return <tbody className={`divide-y divide-slate-800/60 ${className}`}>{children}</tbody>;
};

export const TableRow: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({
  children,
  className = '',
  onClick,
}) => {
  return (
    <tr
      onClick={onClick}
      className={`hover:bg-slate-800/40 transition-colors ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </tr>
  );
};

export const TableHead: React.FC<{ children?: React.ReactNode; className?: string; colSpan?: number }> = ({
  children,
  className = '',
  colSpan,
}) => {
  return <th scope="col" colSpan={colSpan} className={`max-w-0 whitespace-normal break-words px-2 py-2.5 text-xs font-semibold text-slate-300 sm:px-4 sm:py-3.5 sm:whitespace-nowrap ${className}`}>{children}</th>;
};

export const TableCell: React.FC<{ children?: React.ReactNode; className?: string; colSpan?: number }> = ({
  children,
  className = '',
  colSpan,
}) => {
  return <td colSpan={colSpan} className={`px-2 py-2.5 sm:px-4 sm:py-3 text-xs ${className}`}>{children}</td>;
};
