import React from 'react';

export interface OfficialPrintHeaderProps {
  title: string;
  documentNumber?: string | null;
  date?: string | null;
  subtitle?: string | null;
}

export const OfficialPrintHeader: React.FC<OfficialPrintHeaderProps> = ({
  title,
  documentNumber,
  date,
  subtitle,
}) => {
  const currentDate = date || new Date().toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-6 text-black" dir="rtl">
      <div className="flex items-center justify-between">
        {/* Company Identity */}
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 border border-slate-400 rounded-lg p-1 flex items-center justify-center">
            <img src="/eshbelia-logo.png" alt="شعار شركة اشبيلية" className="h-full w-full object-contain" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight text-black">
              شركة اشبيلية للتطوير العقاري والمقاولات
            </h1>
            <p className="text-[11px] text-slate-700 font-bold">
              إدارة المشروعات والعمليات والمشتريات التشغيلية
            </p>
          </div>
        </div>

        {/* Document Title & Meta */}
        <div className="text-left font-mono">
          <div className="inline-block bg-slate-100 border border-slate-400 px-3 py-1 rounded text-sm font-black text-black text-center">
            {title}
          </div>
          {documentNumber && (
            <div className="text-xs font-bold mt-1 text-slate-900">
              الرقم المرجعي: <strong className="font-mono text-black">{documentNumber}</strong>
            </div>
          )}
          <div className="text-[11px] text-slate-600 mt-0.5 font-sans">
            التاريخ: {currentDate}
          </div>
        </div>
      </div>

      {subtitle && (
        <div className="mt-2 text-xs text-slate-700 font-semibold border-t border-slate-200 pt-1.5">
          {subtitle}
        </div>
      )}
    </div>
  );
};

export const OfficialPrintFooter: React.FC<{
  preparedBy?: string | null;
  reviewedBy?: string | null;
  approvedBy?: string | null;
}> = ({
  preparedBy = 'معد التقرير',
  reviewedBy = 'المراجعة والتدقيق',
  approvedBy = 'الاعتماد المالي / الإداري',
}) => {
  return (
    <div className="hidden print:block mt-12 pt-6 border-t border-slate-400 text-black text-xs" dir="rtl">
      <div className="grid grid-cols-3 gap-6 text-center font-bold">
        <div className="space-y-8">
          <p className="text-slate-800">{preparedBy}</p>
          <p className="border-b border-dashed border-slate-400 pb-1 text-slate-400 text-[10px]">التوقيع: .....................</p>
        </div>
        <div className="space-y-8">
          <p className="text-slate-800">{reviewedBy}</p>
          <p className="border-b border-dashed border-slate-400 pb-1 text-slate-400 text-[10px]">التوقيع: .....................</p>
        </div>
        <div className="space-y-8">
          <p className="text-slate-800">{approvedBy}</p>
          <p className="border-b border-dashed border-slate-400 pb-1 text-slate-400 text-[10px]">الختم والاعتماد: .....................</p>
        </div>
      </div>
      <div className="mt-6 text-[9px] text-center text-slate-500 font-mono">
        تم استخراج هذا المستند إلكترونياً من نظام شركة اشبيلية للمشتريات بتاريخ {new Date().toLocaleString('ar-EG')}
      </div>
    </div>
  );
};

export default OfficialPrintHeader;
