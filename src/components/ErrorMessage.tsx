import React from 'react';
import { ApiError } from '../types/api';

interface ErrorMessageProps {
  error: ApiError | string | null;
  onDismiss?: () => void;
  onRetry?: () => void;
  suggestion?: string;
}

const FIELD_LABELS: Record<string, string> = {
  email: 'البريد الإلكتروني',
  password: 'كلمة المرور',
  item_reference: 'رقم قطعة الأرض',
  region: 'المنطقة',
  item_description: 'اسم الصنف',
  description: 'الوصف',
  quantity: 'الكمية',
  uom: 'وحدة القياس',
  priority: 'الأولوية',
  date_needed: 'تاريخ الاحتياج',
  supplier_id: 'المورد',
  department_id: 'القسم',
  target_department_id: 'القسم المستهدف',
  reviewer_user_id: 'مسؤول القسم',
  site_engineer_user_id: 'مهندس الموقع',
  comment: 'التعليق',
  reason: 'السبب',
  invoice_number: 'رقم الفاتورة',
  amount: 'المبلغ',
};

const getErrorDetails = (error: ApiError | string): { cause: string; suggestion: string } => {
  if (typeof error === 'string') {
    return {
      cause: error,
      suggestion: 'راجع البيانات المدخلة، ثم أعد المحاولة. إذا استمرت المشكلة تواصل مع مسؤول النظام.',
    };
  }

  switch (error.status) {
    case 401:
      return {
        cause: 'انتهت جلسة الدخول أو لم تعد صالحة.',
        suggestion: 'أعد تسجيل الدخول ثم حاول تنفيذ الإجراء مرة أخرى.',
      };
    case 403:
      return {
        cause: 'هذا الإجراء غير متاح للدور أو الصلاحية الحالية.',
        suggestion: 'ارجع إلى مسؤول النظام إذا كنت تعتقد أن الصلاحية يجب أن تكون متاحة لك.',
      };
    case 404:
      return {
        cause: 'السجل المطلوب غير موجود أو لم يعد متاحًا.',
        suggestion: 'ارجع إلى القائمة وحدّث البيانات، ثم افتح السجل الصحيح.',
      };
    case 409:
      return {
        cause: error.message || 'حدث تعارض لأن السجل تغير من مستخدم آخر.',
        suggestion: 'حدّث الصفحة، راجع آخر بيانات، ثم أعد المحاولة دون فقد التعديلات المهمة.',
      };
    case 422:
      return {
        cause: error.message || 'بعض البيانات لا تتوافق مع قواعد النظام.',
        suggestion: 'راجع الحقول الموضحة أسفل الرسالة وصححها قبل الإرسال.',
      };
    case 429:
      return {
        cause: 'تم تكرار الطلبات بسرعة أكبر من المسموح.',
        suggestion: 'انتظر لحظات قبل إعادة المحاولة، وتجنب الضغط على الزر أكثر من مرة.',
      };
    default:
      return {
        cause: error.message || 'تعذر تنفيذ العملية.',
        suggestion: 'تحقق من الاتصال بالإنترنت، ثم أعد المحاولة. إذا تكرر الخطأ احتفظ برقم الطلب وأبلغ مسؤول النظام.',
      };
  }
};

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ error, onDismiss, onRetry, suggestion }) => {
  if (!error) return null;

  const message = typeof error === 'string' ? error : error.message;
  const fieldErrors = typeof error === 'object' && error?.errors ? error.errors : null;
  const details = getErrorDetails(error);
  const displayedCause = typeof error === 'string' ? error : (message || details.cause);

  return (
    <div
      className="my-3 rounded-xl border border-rose-800/80 bg-rose-950/40 px-4 py-3 text-xs text-rose-200 shadow-lg shadow-rose-950/20 backdrop-blur-sm"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="shrink-0 text-base font-bold text-rose-400" aria-hidden="true">⚠️</span>
          <div className="min-w-0">
            <span className="block text-[11px] font-bold text-rose-300">تعذر تنفيذ العملية</span>
            <strong className="mt-1 block break-words font-bold text-rose-100">{displayedCause}</strong>
            <p className="mt-1 break-words text-rose-300">الإجراء المقترح: {suggestion || details.suggestion}</p>
            {fieldErrors && (
              <div className="mt-2 space-y-1.5 text-[11px] text-rose-300">
                <div className="font-semibold text-rose-200">راجع الحقول التالية ثم أعد المحاولة:</div>
                <ul className="list-inside list-disc space-y-0.5">
                  {Object.entries(fieldErrors).map(([field, messages]) => (
                    <li key={field}>
                      <span className="font-semibold">{FIELD_LABELS[field] || field}:</span> {messages.join('، ')}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="mt-3 rounded-lg border border-rose-700 bg-rose-900/40 px-3 py-2 text-[11px] font-bold text-rose-100 hover:bg-rose-800/60"
              >
                إعادة المحاولة
              </button>
            )}
          </div>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 rounded p-1 text-base font-bold leading-none text-rose-400 hover:bg-rose-900/40 hover:text-rose-200"
            aria-label="إغلاق رسالة الخطأ"
          >
            &times;
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorMessage;
