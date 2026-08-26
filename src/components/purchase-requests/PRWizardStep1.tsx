import React, { useMemo } from 'react';
import { FormField, Input, Select, Textarea, SearchableSelect } from '../ui/FormField';
import { CreatePurchaseRequestPayload, DepartmentOption, PurchaseRequestPriority } from '../../types/purchaseRequest';

interface Props {
  data: CreatePurchaseRequestPayload;
  onChange: (data: CreatePurchaseRequestPayload) => void;
  departmentOptions: DepartmentOption[];
  departmentLoading: boolean;
  isGeneralManager?: boolean;
  errors?: {
    targetDepartment?: string;
    targetManager?: string;
    targetSiteEngineer?: string;
    dateNeeded?: string;
  };
}

const getTodayDateInputValue = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const PRWizardStep1: React.FC<Props> = ({
  data,
  onChange,
  departmentOptions,
  departmentLoading,
  isGeneralManager = false,
  errors = {},
}) => {
  const targetDepartment = departmentOptions.find((department) => department.id === data.target_department_id);
  const todayStr = getTodayDateInputValue();

  const departmentSelectOptions = useMemo(() => {
    return departmentOptions.map((d) => ({
      value: d.id,
      label: d.name,
      subLabel: d.code || undefined,
      searchTerms: [d.code || '', d.manager?.name || '', d.site_engineer?.name || ''].filter(Boolean),
    }));
  }, [departmentOptions]);

  const requestType = data.request_type || 'PROJECT';
  const isOffice = requestType === 'OFFICE_SUPPLIES';

  return (
    <div className="space-y-5" aria-label="القسم المستهدف وبيانات الطلب">
      {/* Request Type Selector */}
      <div>
        <label className="block text-xs font-bold text-slate-300 mb-2">
          نوع الطلب والغرض منه <span className="text-rose-400">*</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onChange({ ...data, request_type: 'OFFICE_SUPPLIES' })}
            className={`flex flex-col text-right p-3.5 rounded-xl border transition-all ${
              isOffice
                ? 'bg-indigo-950/60 border-indigo-500 ring-2 ring-indigo-500/30 text-slate-100 shadow-lg shadow-indigo-950/40'
                : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-1.5">
              <span className="text-base flex items-center gap-2 font-bold text-indigo-300">
                <span>🏢</span> مستلزمات مكتبية وإدارية
              </span>
              {isOffice && (
                <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded-full">
                  ✓ محدد
                </span>
              )}
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400">
              لشراء طابعات، أقلام، أحبار، أجهزة، أو أدوات للمقر. <strong className="text-indigo-200">مقدم الطلب هو المستلم المباشر</strong> دون حاجة لمخازن أو موقع.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onChange({ ...data, request_type: 'PROJECT' })}
            className={`flex flex-col text-right p-3.5 rounded-xl border transition-all ${
              !isOffice
                ? 'bg-amber-950/60 border-amber-500 ring-2 ring-amber-500/30 text-slate-100 shadow-lg shadow-amber-950/40'
                : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-1.5">
              <span className="text-base flex items-center gap-2 font-bold text-amber-300">
                <span>🏗️</span> مشتريات مشروعات ومواقع
              </span>
              {!isOffice && (
                <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full">
                  ✓ محدد
                </span>
              )}
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400">
              خاصة بقطع الأراضي والمواقع الإنشائية. تتطلب تحديد رقم القطعة والمنطقة وتمر على مهندس الموقع وأمين المخزن للاستلام.
            </p>
          </button>
        </div>
      </div>

      <FormField label="القسم المستهدف" required error={errors.targetDepartment}>
        <SearchableSelect
          options={departmentSelectOptions}
          value={data.target_department_id || ''}
          onChange={(val) =>
            onChange({
              ...data,
              target_department_id: val ? Number(val) : undefined,
              reviewer_user_id: undefined,
              site_engineer_user_id: undefined,
            })
          }
          disabled={departmentLoading || departmentOptions.length === 0}
          placeholder={departmentLoading ? 'جاري تحميل الأقسام...' : 'اختر القسم الذي سيعالج الطلب'}
          searchPlaceholder="ابحث باسم القسم أو الكود..."
          emptyMessage="لا يوجد قسم بهذا الاسم"
          error={Boolean(errors.targetDepartment)}
        />
        <p className="mt-1 text-[11px] text-slate-500">يمكنك اختيار قسمك أو قسمًا آخر حسب الجهة التي ستعالج الطلب.</p>
      </FormField>

      {targetDepartment ? (
        <div className="grid grid-cols-1 gap-3 rounded-xl border border-cyan-800/50 bg-cyan-950/20 p-4 text-xs sm:grid-cols-2">
          <div className={`rounded-lg border p-3 ${errors.targetManager ? 'border-rose-700/70 bg-rose-950/20' : 'border-slate-800 bg-slate-950/50'}`}>
            <span className="text-slate-500">مدير القسم المستهدف</span>
            <div className={`mt-1 font-bold ${errors.targetManager ? 'text-rose-200' : 'text-slate-100'}`}>{isGeneralManager ? 'غير مطلوب لمسار المدير العام' : targetDepartment.manager?.name || 'غير معين بعد'}</div>
            <p className="mt-1 text-[10px] text-slate-500">{isGeneralManager ? 'طلب المدير العام لا يمر على مدير القسم؛ ينتقل مباشرة إلى مدير المشتريات.' : 'يستقبل طلب الموظف للمراجعة والاعتماد.'}</p>
            {errors.targetManager && <p className="mt-2 text-[11px] font-bold text-rose-300">{errors.targetManager}</p>}
          </div>
          
          {isOffice ? (
            <div className="rounded-lg border border-indigo-800/50 bg-indigo-950/30 p-3">
              <span className="text-indigo-400 font-bold flex items-center gap-1.5">
                <span>📦</span> آلية الاستلام (طلب مكتبي)
              </span>
              <div className="mt-1 font-bold text-slate-100">مقدم الطلب هو المستلم المباشر</div>
              <p className="mt-1 text-[10px] text-indigo-300/80 leading-relaxed">
                لا يتطلب مهندس موقع. فور إصدار أمر الشراء وتوريد الأصناف، ستظهر لك إمكانية تأكيد الاستلام مباشرة من شاشتك.
              </p>
            </div>
          ) : (
            <div className={`rounded-lg border p-3 ${errors.targetSiteEngineer ? 'border-rose-700/70 bg-rose-950/20' : 'border-slate-800 bg-slate-950/50'}`}>
              <span className="text-slate-500">مهندس الموقع للقسم</span>
              <div className={`mt-1 font-bold ${errors.targetSiteEngineer ? 'text-rose-200' : 'text-slate-100'}`}>{targetDepartment.site_engineer?.name || 'غير معين بعد'}</div>
              <p className="mt-1 text-[10px] text-slate-500">يعتمد إذن الاستلام بعد أمين المخزن.</p>
              {errors.targetSiteEngineer && <p className="mt-2 text-[11px] font-bold text-rose-300">{errors.targetSiteEngineer}</p>}
            </div>
          )}
          <div className="sm:col-span-2 rounded-lg border border-amber-800/40 bg-amber-950/20 p-3 text-[11px] leading-6 text-amber-100">
            {targetDepartment.id === undefined
              ? 'اختر قسمًا صحيحًا.'
              : isGeneralManager
                ? 'طلب المدير العام لا يحتاج إلى اختيار مراجع؛ بعد الإرسال ينتقل مباشرة إلى مدير المشتريات لاختيار عروض الأسعار أو مسار الطلب المباشر.'
                : 'بالنسبة للموظف، يمر الطلب على مدير القسم المستهدف سواء كان القسم نفسه أو مختلفًا. أما مراجع القسم، فإذا اختار قسمه نفسه ينتقل الطلب للمدير التنفيذي مباشرة، وإذا اختار قسمًا آخر يمر أولًا على مدير القسم المستهدف.'}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField label="الأولوية">
          <Select
            id="pr-priority"
            value={data.priority || 'NORMAL'}
            onChange={event => onChange({ ...data, priority: event.target.value as PurchaseRequestPriority })}
          >
            <option value="LOW">منخفض</option>
            <option value="NORMAL">عادي</option>
            <option value="HIGH">عالي</option>
            <option value="URGENT">عاجل</option>
          </Select>
        </FormField>
        <FormField label="تاريخ الاحتياج" required error={errors.dateNeeded}>
          <Input
            id="pr-date-needed"
            type="date"
            min={todayStr}
            value={data.date_needed || todayStr}
            onChange={event => onChange({ ...data, date_needed: event.target.value })}
            error={Boolean(errors.dateNeeded)}
          />
        </FormField>
      </div>

      <FormField label="ملاحظات إضافية">
        <Textarea
          id="pr-notes"
          value={data.notes || ''}
          onChange={event => onChange({ ...data, notes: event.target.value })}
          rows={4}
          placeholder="ملاحظات فنية أو توضيحية (اختياري)"
          dir="rtl"
        />
      </FormField>
    </div>
  );
};

export default PRWizardStep1;
