import React from 'react';
import { FormField, Input, Select, Textarea } from '../ui/FormField';
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

  return (
    <div className="space-y-5" aria-label="القسم المستهدف وبيانات الطلب">
      <FormField label="القسم المستهدف" required error={errors.targetDepartment}>
        <Select
          id="pr-target-department"
          value={data.target_department_id ? String(data.target_department_id) : ''}
          onChange={event => onChange({
            ...data,
            target_department_id: event.target.value ? Number(event.target.value) : undefined,
            reviewer_user_id: undefined,
            site_engineer_user_id: undefined,
          })}
          disabled={departmentLoading || departmentOptions.length === 0}
          error={Boolean(errors.targetDepartment)}
        >
          <option value="">{departmentLoading ? 'جاري تحميل الأقسام...' : 'اختر القسم الذي سيعالج الطلب'}</option>
          {departmentOptions.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}{department.code ? ` — ${department.code}` : ''}
            </option>
          ))}
        </Select>
        <p className="mt-1 text-[11px] text-slate-500">يمكنك اختيار قسمك أو قسمًا آخر حسب الجهة التي ستعالج الطلب.</p>
      </FormField>

      {targetDepartment ? (
        <div className="grid grid-cols-1 gap-3 rounded-xl border border-cyan-800/50 bg-cyan-950/20 p-4 text-xs sm:grid-cols-2">
          <div className={`rounded-lg border p-3 ${errors.targetManager ? 'border-rose-700/70 bg-rose-950/20' : 'border-slate-800 bg-slate-950/50'}`}>
            <span className="text-slate-500">مدير القسم المستهدف</span>
            <div className={`mt-1 font-bold ${errors.targetManager ? 'text-rose-200' : 'text-slate-100'}`}>{isGeneralManager ? 'غير مطلوب لمسار المدير العام' : targetDepartment.manager?.name || 'غير معين بعد'}</div>
            <p className="mt-1 text-[10px] text-slate-500">{isGeneralManager ? 'طلب المدير العام لا يمر على مدير القسم؛ ينتقل مباشرة إلى مدير المشتريات.' : 'يستقبل طلب الموظف حتى لو كان القسم نفسه. يُتخطى فقط عندما يكون مقدم الطلب مراجع القسم ويطلب من قسمه نفسه.'}</p>
            {errors.targetManager && <p className="mt-2 text-[11px] font-bold text-rose-300">{errors.targetManager}</p>}
          </div>
          <div className={`rounded-lg border p-3 ${errors.targetSiteEngineer ? 'border-rose-700/70 bg-rose-950/20' : 'border-slate-800 bg-slate-950/50'}`}>
            <span className="text-slate-500">مهندس الموقع للقسم</span>
            <div className={`mt-1 font-bold ${errors.targetSiteEngineer ? 'text-rose-200' : 'text-slate-100'}`}>{targetDepartment.site_engineer?.name || 'غير معين بعد'}</div>
            <p className="mt-1 text-[10px] text-slate-500">يعتمد إذن الاستلام بعد أمين المخزن.</p>
            {errors.targetSiteEngineer && <p className="mt-2 text-[11px] font-bold text-rose-300">{errors.targetSiteEngineer}</p>}
          </div>
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
