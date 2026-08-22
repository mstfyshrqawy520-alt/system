import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { PRWizardStep1 } from '../../components/purchase-requests/PRWizardStep1';
import { PRWizardStep2 } from '../../components/purchase-requests/PRWizardStep2';
import { PRWizardStep4 } from '../../components/purchase-requests/PRWizardStep4';
import {
  createPurchaseRequestApi,
  getPurchaseRequestDepartmentOptionsApi,
  submitPurchaseRequestApi,
  updatePurchaseRequestApi,
} from '../../api/purchaseRequests';
import { CreatePurchaseRequestPayload, DepartmentOption } from '../../types/purchaseRequest';
import { parseApiError } from '../../utils/apiError';
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning';
import { useAuth } from '../../context/AuthContext';

const getTodayDateInputValue = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const DRAFT_STORAGE_KEY = 'ashbiliya.purchase-request.draft.v1';

const INITIAL_DATA: CreatePurchaseRequestPayload = {
  target_department_id: undefined,
  priority: 'NORMAL',
  reviewer_user_id: undefined,
  site_engineer_user_id: undefined,
  date_needed: getTodayDateInputValue(),
  notes: '',
  items: [
    {
      item_description: '',
      item_reference: '',
      region: '',
      quantity: 1,
      uom: 'PCS',
      specifications: '',
    },
  ],
};

type ItemErrors = Record<number, {
  description?: string;
  reference?: string;
  region?: string;
  quantity?: string;
}>;

type ValidationResult = {
  targetDepartment?: string;
  targetManager?: string;
  targetSiteEngineer?: string;
  dateNeeded?: string;
  items: ItemErrors;
};

const validateRequest = (
  data: CreatePurchaseRequestPayload,
  departmentOptions: DepartmentOption[] = [],
  isGeneralManager = false,
): ValidationResult => {
  const itemErrors: ItemErrors = {};

  data.items.forEach((item, index) => {
    const errors: ItemErrors[number] = {};
    if (!item.item_description.trim()) errors.description = 'اكتب وصف الصنف المطلوب.';
    if (!item.item_reference?.trim()) errors.reference = 'رقم قطعة الأرض مطلوب.';
    if (!item.region?.trim()) errors.region = 'المنطقة مطلوبة.';
    if (Number(item.quantity) <= 0 || Number.isNaN(Number(item.quantity))) errors.quantity = 'أدخل كمية أكبر من صفر.';
    if (Object.keys(errors).length) itemErrors[index] = errors;
  });

  const targetDepartment = departmentOptions.find((department) => department.id === data.target_department_id);
  return {
    targetDepartment: data.target_department_id ? undefined : 'اختر القسم الذي سيعالج الطلب.',
    targetManager: !isGeneralManager && data.target_department_id && targetDepartment && !targetDepartment.manager
      ? 'القسم المستهدف لا يوجد له مدير قسم معين. اطلب من مدير النظام تعيين مدير للقسم أولًا.'
      : undefined,
    targetSiteEngineer: data.target_department_id && targetDepartment && !targetDepartment.site_engineer
      ? 'القسم المستهدف لا يوجد له مهندس موقع معين. اطلب من مدير النظام تعيين مهندس للموقع أولًا.'
      : undefined,
    dateNeeded: !data.date_needed
      ? 'حدد تاريخ الاحتياج.'
      : data.date_needed < getTodayDateInputValue()
        ? 'تاريخ الاحتياج لا يمكن أن يكون في الماضي. اختر اليوم أو تاريخًا قادمًا.'
        : undefined,
    items: itemErrors,
  };
};

const hasValidationErrors = (validation: ValidationResult): boolean =>
  Boolean(validation.targetDepartment || validation.targetManager || validation.targetSiteEngineer || validation.dateNeeded || Object.keys(validation.items).length);

const normalizeRequestData = (data: CreatePurchaseRequestPayload): CreatePurchaseRequestPayload => ({
  ...data,
  notes: data.notes?.trim(),
  items: data.items.map((item) => ({
    ...item,
    item_description: item.item_description.trim(),
    item_reference: item.item_reference?.trim(),
    region: item.region?.trim(),
    specifications: item.specifications?.trim(),
  })),
});

const CreatePurchaseRequestPage: React.FC = () => {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const isGeneralManager = hasRole('general_manager');
  const [data, setData] = useState<CreatePurchaseRequestPayload>(INITIAL_DATA);
  const [departmentOptions, setDepartmentOptions] = useState<DepartmentOption[]>([]);
  const [departmentLoading, setDepartmentLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  const [draftMessage, setDraftMessage] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [serverDraftId, setServerDraftId] = useState<number | null>(null);
  const isDirty = useMemo(() => JSON.stringify(data) !== JSON.stringify(INITIAL_DATA), [data]);
  useUnsavedChangesWarning(isDirty && !isSubmitting);

  useEffect(() => {
    try {
      const savedDraft = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft) as Partial<CreatePurchaseRequestPayload>;
        if (Array.isArray(parsed.items) && parsed.items.length > 0) {
          setData({ ...INITIAL_DATA, ...parsed, items: parsed.items });
          setDraftMessage('تم استعادة المسودة المحفوظة على هذا الجهاز.');
        }
      }
    } catch {
      // تجاهل أي مسودة تالفة والبدء بنموذج جديد.
    } finally {
      setDraftReady(true);
    }
  }, []);

  useEffect(() => {
    if (!draftReady) return;
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(data));
        setDraftMessage('تم الحفظ تلقائيًا على هذا الجهاز.');
      } catch {
        setDraftMessage(null);
      }
    }, 900);
    return () => window.clearTimeout(timer);
  }, [data, draftReady]);

  useEffect(() => {
    let cancelled = false;
    getPurchaseRequestDepartmentOptionsApi()
      .then((options) => {
        if (!cancelled) setDepartmentOptions(options);
      })
      .catch(() => {
        if (!cancelled) setDepartmentOptions([]);
      })
      .finally(() => {
        if (!cancelled) setDepartmentLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  const validation = useMemo(
    () => validateRequest(data, departmentOptions, isGeneralManager),
    [data, departmentOptions, isGeneralManager],
  );
  const requestHasErrors = hasValidationErrors(validation);
  const completedItems = data.items.filter((item) =>
    item.item_description.trim() && item.item_reference?.trim() && item.region?.trim() && Number(item.quantity) > 0,
  ).length;
  const targetDepartment = departmentOptions.find((department) => department.id === data.target_department_id);
  const managerName = targetDepartment?.manager?.name || 'غير معين';
  const siteEngineerName = targetDepartment?.site_engineer?.name || 'غير معين';
  const canSubmit = !requestHasErrors && !departmentLoading;

  const ensureServerDraft = async (): Promise<{ id: number }> => {
    const normalizedData = normalizeRequestData(data);
    if (serverDraftId) {
      const updated = await updatePurchaseRequestApi(serverDraftId, normalizedData);
      return { id: updated.id };
    }

    const created = await createPurchaseRequestApi(normalizedData);
    setServerDraftId(created.id);
    setDraftMessage(`تم إنشاء المسودة ${created.request_number} ويمكنك مراجعة الطلب قبل الإرسال.`);
    return { id: created.id };
  };

  const handleNextStep = async () => {
    setError(null);
    if (currentStep === 1) {
      setShowValidation(true);
      if (validation.targetDepartment || validation.targetManager || validation.targetSiteEngineer || validation.dateNeeded) {
        setError(validation.targetManager || validation.targetSiteEngineer || 'أكمل بيانات الطلب والقسم المستهدف قبل الانتقال للتفاصيل.');
        return;
      }
    }
    if (currentStep === 2) {
      setShowValidation(true);
      if (requestHasErrors) {
        setError('راجع تفاصيل البنود المحددة باللون الأحمر قبل الانتقال للمراجعة.');
        return;
      }
      try {
        await ensureServerDraft();
      } catch (err) {
        setError(parseApiError(err).message);
        return;
      }
    }
    setCurrentStep((step) => Math.min(4, step + 1));
  };

  const handlePreviousStep = () => {
    setError(null);
    setCurrentStep((step) => Math.max(1, step - 1));
  };

  const handleSaveDraft = () => {
    setError(null);
    setIsSavingDraft(true);
    try {
      window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(data));
      setDraftMessage('تم حفظ المسودة على هذا الجهاز. يمكنك العودة إليها لاحقًا.');
    } catch {
      setError('تعذر حفظ المسودة على هذا الجهاز. يمكنك متابعة الطلب وإرساله بعد استكمال البيانات.');
    } finally {
      window.setTimeout(() => setIsSavingDraft(false), 350);
    }
  };


  const handleSubmit = async () => {
    setShowValidation(true);
    if (!canSubmit) {
      setError('راجع الحقول المحددة باللون الأحمر قبل إرسال الطلب.');
      setCurrentStep(1);
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const draft = await ensureServerDraft();
      await submitPurchaseRequestApi(draft.id);
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      navigate(`/requests/${draft.id}`, {
        state: {
          message: isGeneralManager
            ? 'تم إرسال طلب الشراء مباشرة إلى مدير المشتريات بنجاح.'
            : 'تم إرسال طلب الشراء للمراجعة بنجاح.',
        },
      });
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepTitles = ['بيانات الطلب', 'التفاصيل', 'المراجعة والإرسال'];

  return (
    <div className="mx-auto max-w-6xl space-y-4 pb-8" dir="rtl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-cyan-400">
              <span>{isGeneralManager ? 'المدير العام' : 'منشئ الطلب'}</span>
            <span className="text-slate-600">/</span>
            <span>إنشاء طلب شراء</span>
          </div>
          <h1 className="text-xl font-black text-slate-100">طلب شراء جديد</h1>
          <p className="mt-1 text-xs text-slate-400">أدخل البيانات التشغيلية فقط، ثم راجع الطلب قبل إرساله.</p>
        </div>
        <Link to="/requests">
          <Button type="button" variant="secondary" size="sm">← أرشيف طلباتي</Button>
        </Link>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900/70 shadow-2xl shadow-slate-950/30">
        <header className="border-b border-slate-800 bg-slate-950/40 px-5 py-5 md:px-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold text-cyan-300">خطوات الطلب</p>
              <p className="mt-1 text-xs leading-6 text-slate-400">لا تظهر في هذه الشاشة أي أسعار أو ميزانيات أو بيانات مالية.</p>
              {draftMessage && <p className="mt-2 text-[11px] font-medium text-emerald-300" aria-live="polite">{draftMessage}</p>}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {stepTitles.map((title, index) => {
                const step = index + 1;
                const isActive = currentStep === step;
                const isCompleted = currentStep > step;
                return (
                  <button
                    key={title}
                    type="button"
                    disabled={step > currentStep}
                    onClick={() => step <= currentStep && setCurrentStep(step)}
                    className={`min-h-11 rounded-xl border px-3 py-2 text-right text-[11px] transition-colors ${isActive ? 'border-cyan-500/70 bg-cyan-950/50 text-cyan-200' : isCompleted ? 'border-emerald-700/60 bg-emerald-950/30 text-emerald-300' : 'border-slate-800 bg-slate-900/60 text-slate-500'} ${step > currentStep ? 'cursor-not-allowed opacity-60' : 'hover:border-cyan-700/70'}`}
                  >
                    <span className="ml-1 font-black">{isCompleted ? '✓' : step}</span>{title}
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        {error && (
          <div className="mx-5 mt-5 rounded-xl border border-rose-800/60 bg-rose-950/30 px-4 py-3 text-sm text-rose-200 md:mx-7" role="alert" aria-live="polite">
            {error}
          </div>
        )}

        <div className="px-5 py-6 md:px-7">
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="border-b border-slate-800/80 pb-3">
                <h2 className="text-sm font-bold text-cyan-300">بيانات الطلب</h2>
                <p className="mt-1 text-[11px] text-slate-500">اختر القسم المستهدف وحدد الأولوية وتاريخ الاحتياج.</p>
              </div>
              <PRWizardStep1
                data={data}
                onChange={setData}
                departmentOptions={departmentOptions}
                departmentLoading={departmentLoading}
                isGeneralManager={isGeneralManager}
                errors={showValidation ? validation : {}}
              />
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="border-b border-slate-800/80 pb-3">
                <h2 className="text-sm font-bold text-cyan-300">تفاصيل البنود</h2>
                <p className="mt-1 text-[11px] text-slate-500">أدخل الوصف ورقم قطعة الأرض والمنطقة والكمية والوحدة والمواصفات فقط.</p>
              </div>
              <PRWizardStep2 data={data} onChange={setData} errors={showValidation ? validation.items : {}} />
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="border-b border-slate-800/80 pb-3">
                <h2 className="text-sm font-bold text-cyan-300">المراجعة قبل الإرسال</h2>
                <p className="mt-1 text-[11px] text-slate-500">راجع البيانات التشغيلية وتأكد من اكتمالها قبل بدء دورة الاعتماد الرسمية.</p>
              </div>
              <PRWizardStep4
                data={data}
                onSubmit={() => void handleSubmit()}
                isSubmitting={isSubmitting}
                isGeneralManager={isGeneralManager}
              />
            </div>
          )}
        </div>

        <footer className="flex flex-col-reverse gap-3 border-t border-slate-800 bg-slate-950/40 px-5 py-5 sm:flex-row sm:items-center sm:justify-between md:px-7">
          <p className="text-[11px] leading-5 text-slate-500">حفظ المسودة محلي، وإنشاء المسودة على الخادم يتم عند الانتقال إلى المراجعة. الإرسال فقط يبدأ دورة الاعتماد.</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="secondary" size="md" onClick={handleSaveDraft} disabled={isSubmitting || isSavingDraft} isLoading={isSavingDraft}>
              {isSavingDraft ? 'جارٍ حفظ المسودة...' : 'حفظ كمسودة'}
            </Button>
            {currentStep > 1 && (
              <Button type="button" variant="secondary" size="md" onClick={handlePreviousStep} disabled={isSubmitting}>
                السابق
              </Button>
            )}
            {currentStep < 3 && (
              <Button type="button" variant="primary" size="md" onClick={() => void handleNextStep()} disabled={isSubmitting || isSavingDraft}>
                التالي
              </Button>
            )}
          </div>
        </footer>
      </section>
    </div>
  );
};

export default CreatePurchaseRequestPage;
