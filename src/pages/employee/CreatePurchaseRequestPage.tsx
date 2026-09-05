import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { FormField, Input, Select, Textarea } from '../../components/ui/FormField';
import {
  createPurchaseRequestApi,
  getPurchaseRequestDepartmentOptionsApi,
  getSiteEngineerReceiverOptionsApi,
  submitPurchaseRequestApi,
  updatePurchaseRequestApi,
} from '../../api/purchaseRequests';
import { getCatalogItemsApi } from '../../api/catalog';
import {
  CatalogItem,
  CreatePurchaseRequestPayload,
  DepartmentOption,
  PurchaseRequestItemFormInput,
  PurchaseRequestPriority,
  PurchaseRequestType,
  SiteEngineerReceiverOption,
  PR_TYPE_LABELS,
} from '../../types/purchaseRequest';
import { getUnitLabel, getUnitOptions } from '../../utils/units';
import { parseApiError } from '../../utils/apiError';
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning';
import { useAuth } from '../../context/AuthContext';
import { emitAppDataUpdated } from '../../hooks/useRealtimeRefresh';
import { SearchableSelect } from '../../components/ui/FormField';
import { PurchaseRequestItemsSummaryTable } from '../../components/purchase-requests/PurchaseRequestItemsSummaryTable';

const UNIT_OPTIONS = getUnitOptions(['PCS', 'KG', 'TON', 'M', 'M2', 'M3', 'L', 'BAG', 'BOX', 'CARTON', 'SET', 'PAIR', 'UNIT', 'HOUR', 'DAY']);

const getTodayDateInputValue = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const DRAFT_STORAGE_KEY = 'ashbiliya.purchase-request.draft.v1';

const emptyItem = (): PurchaseRequestItemFormInput => ({
  item_description: '',
  item_reference: '',
  region: '',
  quantity: 1,
  uom: 'PCS',
  specifications: '',
  notes: '',
});

const getInitialData = (): CreatePurchaseRequestPayload => ({
  request_type: 'PROJECT',
  target_department_id: undefined,
  priority: 'NORMAL',
  reviewer_user_id: undefined,
  site_engineer_user_id: undefined,
  date_needed: getTodayDateInputValue(),
  notes: '',
  items: [emptyItem()],
});

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
  const isOffice = (data.request_type || 'PROJECT') === 'OFFICE_SUPPLIES';

  data.items.forEach((item, index) => {
    const errors: ItemErrors[number] = {};
    if (!item.item_description.trim()) errors.description = 'اكتب وصف الصنف المطلوب.';
    if (!isOffice) {
      if (!item.item_reference?.trim()) errors.reference = 'رقم قطعة الأرض مطلوب.';
      if (!item.region?.trim()) errors.region = 'المنطقة مطلوبة.';
    }
    if (Number(item.quantity) <= 0 || Number.isNaN(Number(item.quantity))) errors.quantity = 'أدخل كمية أكبر من صفر.';
    if (Object.keys(errors).length) itemErrors[index] = errors;
  });

  const targetDepartment = departmentOptions.find((department) => department.id === data.target_department_id);
  const today = getTodayDateInputValue();
  return {
    targetDepartment: data.target_department_id ? undefined : 'اختر القسم الذي سيعالج الطلب.',
    targetManager: !isGeneralManager && data.target_department_id && targetDepartment && !targetDepartment.manager && !['EXECUTION', 'BUILDINGS', 'FINISHING', 'LICENSES', 'BUFFET'].includes(targetDepartment?.code || '')
      ? 'القسم المستهدف لا يوجد له مدير قسم معين. اطلب من مدير النظام تعيين مدير للقسم أولًا.'
      : undefined,
    targetSiteEngineer: isGeneralManager && !isOffice && !data.site_engineer_user_id
      ? 'طالما أن الطلب صادر من المدير التنفيذي ولا يمر على مراجع، يجب تحديد مهندس الموقع أو مسؤول الاستلام.'
      : undefined,
    dateNeeded: !data.date_needed
      ? 'حدد تاريخ الاحتياج.'
      : data.date_needed < today
        ? 'تاريخ الاحتياج لا يمكن أن يكون في الماضي. اختر اليوم أو تاريخًا قادمًا.'
        : undefined,
    items: itemErrors,
  };
};

const hasValidationErrors = (validation: ValidationResult): boolean =>
  Boolean(
    validation.targetDepartment ||
    validation.targetManager ||
    validation.targetSiteEngineer ||
    validation.dateNeeded ||
    Object.keys(validation.items).length
  );

const normalizeRequestData = (data: CreatePurchaseRequestPayload): CreatePurchaseRequestPayload => {
  const isOffice = (data.request_type || 'PROJECT') === 'OFFICE_SUPPLIES';
  return {
    ...data,
    request_type: data.request_type || 'PROJECT',
    site_engineer_user_id: isOffice ? undefined : data.site_engineer_user_id,
    notes: data.notes?.trim(),
    items: data.items.map((item) => ({
      ...item,
      item_description: item.item_description.trim(),
      item_reference: item.item_reference?.trim() || (isOffice ? 'مقر الشركة' : undefined),
      region: item.region?.trim() || (isOffice ? 'إداري / المقر الرئيسي' : undefined),
      specifications: item.specifications?.trim(),
    })),
  };
};

const CreatePurchaseRequestPage: React.FC = () => {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const isGeneralManager = hasRole('general_manager');
  const [data, setData] = useState<CreatePurchaseRequestPayload>(() => getInitialData());
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState<DepartmentOption[]>([]);
  const [departmentLoading, setDepartmentLoading] = useState(true);
  const [siteEngineers, setSiteEngineers] = useState<SiteEngineerReceiverOption[]>([]);
  const [otherUsers, setOtherUsers] = useState<SiteEngineerReceiverOption[]>([]);
  const [isLoadingReceivers, setIsLoadingReceivers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  const [draftMessage, setDraftMessage] = useState<string | null>(null);
  const [serverDraftId, setServerDraftId] = useState<number | null>(null);
  const initialDataSnapshot = useMemo(() => getInitialData(), []);
  const isDirty = useMemo(() => JSON.stringify(data) !== JSON.stringify(initialDataSnapshot), [data, initialDataSnapshot]);
  useUnsavedChangesWarning(isDirty && !isSubmitting);

  // Restore local draft
  useEffect(() => {
    try {
      const todayStr = getTodayDateInputValue();
      const savedDraft = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft) as Partial<CreatePurchaseRequestPayload>;
        if (Array.isArray(parsed.items) && parsed.items.length > 0) {
          // If stored date_needed is in the past or missing, dynamically update to today's date
          const validDateNeeded = !parsed.date_needed || parsed.date_needed < todayStr ? todayStr : parsed.date_needed;
          setData({
            ...getInitialData(),
            ...parsed,
            date_needed: validDateNeeded,
            items: parsed.items,
          });
          setDraftMessage('تم استعادة المسودة المحفوظة على هذا الجهاز.');
        }
      }
    } catch {
      // Ignore corrupted draft
    } finally {
      setDraftReady(true);
    }
  }, []);

  // Auto-save local draft
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

  // Load department options & catalog items
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

    getCatalogItemsApi()
      .then((items) => {
        if (!cancelled) setCatalogItems(items);
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, []);

  // Load receiver options for General Manager / Executive Director
  useEffect(() => {
    if (isGeneralManager) {
      setIsLoadingReceivers(true);
      getSiteEngineerReceiverOptionsApi()
        .then((res) => {
          setSiteEngineers(res.site_engineers || []);
          setOtherUsers(res.other_users || []);
        })
        .catch(() => {})
        .finally(() => setIsLoadingReceivers(false));
    }
  }, [isGeneralManager]);

  const departmentSelectOptions = useMemo(() => {
    return departmentOptions.map((d) => ({
      value: d.id,
      label: d.name,
      subLabel: d.code || undefined,
      searchTerms: [d.code || '', d.manager?.name || '', d.site_engineer?.name || ''].filter(Boolean),
    }));
  }, [departmentOptions]);

  const catalogSelectOptions = useMemo(() => {
    return catalogItems.map((c) => ({
      value: c.id,
      label: c.name,
      subLabel: c.sku ? `كود: ${c.sku} | ${getUnitLabel(c.uom)}` : getUnitLabel(c.uom),
      searchTerms: [c.sku || '', c.category?.name || ''].filter(Boolean),
    }));
  }, [catalogItems]);

  const validation = useMemo(
    () => validateRequest(data, departmentOptions, isGeneralManager),
    [data, departmentOptions, isGeneralManager],
  );
  const requestHasErrors = hasValidationErrors(validation);
  const isOffice = (data.request_type || 'PROJECT') === 'OFFICE_SUPPLIES';
  const targetDepartment = departmentOptions.find((department) => department.id === data.target_department_id);

  // Item Management Helpers
  const updateItem = (index: number, partial: Partial<PurchaseRequestItemFormInput>) => {
    const updated = data.items.map((item, i) => (i === index ? { ...item, ...partial } : item));
    setData({ ...data, items: updated });
  };

  const addItem = () => {
    setData({ ...data, items: [...data.items, emptyItem()] });
  };

  const duplicateItem = (index: number) => {
    const itemToClone = data.items[index];
    if (!itemToClone) return;
    const cloned: PurchaseRequestItemFormInput = {
      ...itemToClone,
      quantity: 1,
    };
    const newItems = [...data.items];
    newItems.splice(index + 1, 0, cloned);
    setData({ ...data, items: newItems });
  };

  const removeItem = (index: number) => {
    if (data.items.length <= 1) return;
    setData({ ...data, items: data.items.filter((_, i) => i !== index) });
  };

  const handleCatalogSelect = (index: number, catalogId: string | number) => {
    if (!catalogId) {
      updateItem(index, { item_id: null });
      return;
    }
    const cat = catalogItems.find((c) => c.id === Number(catalogId));
    if (cat) {
      updateItem(index, {
        item_id: cat.id,
        item_description: cat.name,
        uom: cat.uom || 'PCS',
      });
    }
  };

  const ensureServerDraft = async (): Promise<{ id: number }> => {
    const normalizedData = normalizeRequestData(data);
    if (serverDraftId) {
      const updated = await updatePurchaseRequestApi(serverDraftId, normalizedData);
      return { id: updated.id };
    }

    const created = await createPurchaseRequestApi(normalizedData);
    setServerDraftId(created.id);
    return { id: created.id };
  };

  const handleSaveDraft = async () => {
    setError(null);
    setIsSavingDraft(true);
    try {
      const draft = await ensureServerDraft();
      setDraftMessage('تم حفظ المسودة بنجاح.');
      emitAppDataUpdated();
      setTimeout(() => setDraftMessage(null), 4000);
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleSubmit = async () => {
    setShowValidation(true);
    if (requestHasErrors) {
      setError('يرجى تصحيح الأخطاء المحددة في النموذج أولاً.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const draft = await ensureServerDraft();
      await submitPurchaseRequestApi(draft.id, {
        site_engineer_user_id: data.site_engineer_user_id || undefined,
      });
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      emitAppDataUpdated();
      navigate(`/requests/${draft.id}`, {
        state: {
          message: isGeneralManager
            ? 'تم إرسال طلب الشراء مباشرة إلى مدير المشتريات بنجاح بعد تحديد مسؤول الاستلام.'
            : 'تم إرسال طلب الشراء للمراجعة بنجاح.',
        },
      });
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearDraft = () => {
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    setData(getInitialData());
    setServerDraftId(null);
    setDraftMessage('تم مسح المسودة والبدء من جديد.');
    setTimeout(() => setDraftMessage(null), 3000);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-24" dir="rtl">
      {/* Sticky Action Header on Scroll */}
      <div className="sticky top-2 z-40 rounded-2xl border border-slate-700/80 bg-slate-950/90 p-3.5 shadow-2xl backdrop-blur-md transition-all">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 text-xl shadow-inner">
              ✍️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-slate-100">
                  {isGeneralManager ? 'طلب شراء تنفيذي جديد' : 'إنشاء وإرسال طلب شراء'}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 border border-slate-700 text-slate-300">
                  <span className={`h-2 w-2 rounded-full ${requestHasErrors ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`} />
                  {requestHasErrors ? 'بانتظار استكمال الحقول' : 'جاهز للإرسال الفوري'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                <span>📦 البنود: <strong className="text-cyan-300">{data.items.length} صنف</strong></span>
                <span className="text-slate-600">•</span>
                <span>
                  النوع: <strong className={isOffice ? 'text-indigo-300' : 'text-amber-300'}>
                    {isOffice ? '🏢 مكتبي' : '🏗️ مشروع/موقع'}
                  </strong>
                </span>
                {draftMessage && (
                  <>
                    <span className="text-slate-600">•</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                      {draftMessage}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/requests">
              <Button type="button" variant="secondary" size="sm" className="text-xs">
                ← أرشيف طلباتي
              </Button>
            </Link>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleSaveDraft}
              disabled={isSubmitting || isSavingDraft}
              isLoading={isSavingDraft}
              className="text-xs border-slate-700 hover:border-slate-500"
            >
              💾 مسودة
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => void handleSubmit()}
              disabled={isSubmitting || isSavingDraft}
              isLoading={isSubmitting}
              className={`text-xs px-4 font-bold shadow-lg transition-all ${
                requestHasErrors
                  ? 'bg-cyan-700 hover:bg-cyan-600 border-cyan-600/50'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border-emerald-500 text-white shadow-emerald-950/40 ring-2 ring-emerald-500/30 animate-pulse'
              }`}
            >
              🚀 {isGeneralManager ? 'إرسال مباشر للمشتريات' : 'إرسال الطلب فوراً'}
            </Button>
          </div>
        </div>
      </div>

      {/* Auto-save Draft Status Card */}
      {draftMessage && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-800/60 bg-emerald-950/40 px-4 py-2.5 text-xs text-emerald-200 shadow-md animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-bold">💾 {draftMessage}</span>
          </div>
          <button
            type="button"
            onClick={handleClearDraft}
            className="text-[11px] font-bold text-slate-400 hover:text-rose-300 transition-colors underline underline-offset-4"
          >
            مسح المسودة والبدء من جديد
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-800/80 bg-rose-950/40 p-4 text-xs font-bold text-rose-200 shadow-lg" role="alert">
          ⚠️ {error}
        </div>
      )}

      {/* Request Type Selector Card */}
      <Card className="space-y-3 border-amber-900/40 bg-slate-900/90 p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-slate-200">
            نوع الطلب والغرض منه <span className="text-rose-400">*</span>
          </label>
          <span className="text-[11px] text-slate-400">
            الافتراضي: <strong className="text-amber-300">مشتريات مشروعات ومواقع</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Option 1 (Right in RTL): Project Purchases - Primary Default */}
          <button
            type="button"
            onClick={() => setData({ ...data, request_type: 'PROJECT' })}
            className={`flex flex-col text-right p-4 rounded-xl border transition-all ${
              !isOffice
                ? 'bg-amber-950/70 border-amber-500 ring-2 ring-amber-500/30 text-slate-100 shadow-lg shadow-amber-950/50'
                : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-amber-300 flex items-center gap-1.5">
                  <span>🏗️</span> مشتريات مشروعات ومواقع
                </span>
                <span className="text-[10px] bg-amber-950 px-1.5 py-0.5 rounded text-amber-400 border border-amber-800/60 font-semibold">
                  (الافتراضي)
                </span>
              </div>
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

          {/* Option 2 (Left in RTL): Office Supplies */}
          <button
            type="button"
            onClick={() => setData({ ...data, request_type: 'OFFICE_SUPPLIES' })}
            className={`flex flex-col text-right p-4 rounded-xl border transition-all ${
              isOffice
                ? 'bg-indigo-950/70 border-indigo-500 ring-2 ring-indigo-500/30 text-slate-100 shadow-lg shadow-indigo-950/50'
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
              طابعات، أقلام، أحبار، أجهزة، أو أدوات للمقر. <strong className="text-indigo-200">مقدم الطلب هو المستلم المباشر</strong> دون حاجة لمخازن أو موقع.
            </p>
          </button>
        </div>
      </Card>

      {/* Card 1: Basic Request Info */}
      <Card className="space-y-5 border-slate-800 bg-slate-900/90 p-5 sm:p-6 shadow-xl">
        <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black text-slate-100 flex items-center gap-2">
              <span className="text-cyan-400">📋</span> 1. بيانات الطلب والجهة المعالجة
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">حدد القسم الذي سيعالج طلب الشراء وتاريخ الاحتياج والأولوية</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="القسم المستهدف" required error={showValidation ? validation.targetDepartment : undefined}>
            <Select
              id="pr-target-department"
              value={data.target_department_id || ''}
              onChange={(e) => {
                const deptId = e.target.value ? Number(e.target.value) : undefined;
                const selectedDept = departmentOptions.find((d) => d.id === deptId);
                setData({
                  ...data,
                  target_department_id: deptId,
                  reviewer_user_id: undefined,
                  site_engineer_user_id:
                    isGeneralManager && !isOffice && !data.site_engineer_user_id && selectedDept?.site_engineer?.id
                      ? selectedDept.site_engineer.id
                      : data.site_engineer_user_id,
                });
              }}
              disabled={departmentLoading || departmentOptions.length === 0}
              error={Boolean(showValidation && validation.targetDepartment)}
              className="font-bold text-slate-100 bg-slate-950 border-slate-700"
            >
              <option value="" disabled>-- اختر القسم المستهدف --</option>
              {departmentOptions.map((dept) => {
                const icon =
                  dept.code === 'EXECUTION' ? '🏗️' :
                  dept.code === 'BUILDINGS' ? '🏢' :
                  dept.code === 'FINISHING' ? '🎨' :
                  dept.code === 'LICENSES' ? '📜' :
                  dept.code === 'BUFFET' ? '☕' : '🏢';
                const managerName =
                  dept.manager?.name ||
                  (dept.code === 'EXECUTION' ? 'م. أيمن ماهر' :
                   dept.code === 'BUILDINGS' ? 'المهندس حاتم' :
                   dept.code === 'FINISHING' ? 'م. مسعود' :
                   dept.code === 'LICENSES' ? 'م. مصطفى' :
                   dept.code === 'BUFFET' ? 'أ. عمرو' : '');
                return (
                  <option key={dept.id} value={dept.id}>
                    {icon} {dept.name} {managerName ? `— (المراجع: ${managerName})` : ''}
                  </option>
                );
              })}
            </Select>
          </FormField>

          <FormField label="تاريخ الاحتياج" required error={showValidation ? validation.dateNeeded : undefined}>
            <Input
              type="date"
              id="pr-date-needed"
              min={getTodayDateInputValue()}
              max="2099-12-31"
              value={data.date_needed || ''}
              onChange={(event) => setData({ ...data, date_needed: event.target.value })}
              error={Boolean(showValidation && validation.dateNeeded)}
            />
          </FormField>
        </div>

        {targetDepartment && (
          <div className="grid grid-cols-1 gap-3 rounded-xl border border-cyan-800/40 bg-cyan-950/20 p-3 text-xs sm:grid-cols-2">
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2.5">
              <span className="text-slate-500 text-[10px]">مدير القسم المستهدف (المراجع):</span>
              <div className="font-bold text-slate-200 mt-0.5">
                {isGeneralManager
                  ? 'مسار المدير العام المباشر (تجاوز المراجع)'
                  : targetDepartment.manager?.name ||
                    (targetDepartment.code === 'EXECUTION' ? 'م. أيمن ماهر' :
                     targetDepartment.code === 'BUILDINGS' ? 'المهندس حاتم' :
                     targetDepartment.code === 'FINISHING' ? 'م. مسعود' :
                     targetDepartment.code === 'LICENSES' ? 'م. مصطفى' :
                     targetDepartment.code === 'BUFFET' ? 'أ. عمرو' : 'غير معين')}
              </div>
            </div>

            {isOffice ? (
              <div className="rounded-lg border border-indigo-800/50 bg-indigo-950/30 p-2.5">
                <span className="text-indigo-400 font-bold flex items-center gap-1 text-[10px]">
                  <span>📦</span> آلية الاستلام:
                </span>
                <div className="font-bold text-slate-200 mt-0.5">مقدم الطلب يستلم مباشرة بمقر الشركة</div>
              </div>
            ) : isGeneralManager ? (
              <div className="rounded-xl border border-emerald-700/60 bg-emerald-950/30 p-3.5 sm:col-span-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-emerald-400 font-black flex items-center gap-1.5 text-xs">
                    <span>👷</span> تحديد مهندس الموقع / مسؤول الاستلام (اختيار المدير التنفيذي) <span className="text-rose-400">*</span>
                  </span>
                  <span className="text-[10px] text-emerald-300 font-bold bg-emerald-950/90 px-2 py-0.5 rounded border border-emerald-600/50">
                    بديل خطوة المراجع — إرسال مباشر للمشتريات
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  طالما أن طلب الشراء صادر من المدير التنفيذي فلن يمر على مراجع قسم، لذلك يتعين عليك تحديد مهندس الموقع أو مسؤول الاستلام الذي سيتولى فحص واستلام المواد قبل إرسال الطلب للمشتريات:
                </p>
                {isLoadingReceivers ? (
                  <div className="text-xs text-slate-400 py-1 font-bold">جاري تحميل قائمة المهندسين والمستلمين...</div>
                ) : (
                  <Select
                    id="pr-site-engineer"
                    value={data.site_engineer_user_id || ''}
                    onChange={(e) =>
                      setData({
                        ...data,
                        site_engineer_user_id: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="font-bold text-slate-100 bg-slate-900 border-emerald-600/70 focus:border-emerald-400"
                  >
                    <option value="" disabled>-- اختر مهندس الموقع أو مسؤول الاستلام المعتمد --</option>
                    {siteEngineers.length > 0 && (
                      <optgroup label="👷 مهندسو الموقع الأساسيون">
                        {siteEngineers.map((eng) => (
                          <option key={`gm-se-${eng.id}`} value={eng.id}>
                            {eng.name} {eng.department_name ? `(${eng.department_name})` : ''}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {otherUsers.length > 0 && (
                      <optgroup label="👥 مستخدمو النظام الآخرون (تفويض أي دور)">
                        {otherUsers.map((u) => (
                          <option key={`gm-oth-${u.id}`} value={u.id}>
                            {u.name} — {u.role_name || 'مستخدم'} {u.department_name ? `(${u.department_name})` : ''}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </Select>
                )}
                {showValidation && validation.targetSiteEngineer && (
                  <p className="text-[11px] font-bold text-rose-300 mt-1">⚠️ {validation.targetSiteEngineer}</p>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2.5">
                <span className="text-slate-500 text-[10px]">مسؤول استلام الموقع:</span>
                <div className="font-bold text-slate-200 mt-0.5">يحدده مراجع القسم عند الاعتماد</div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="الأولوية">
            <Select
              id="pr-priority"
              value={data.priority}
              onChange={(event) => setData({ ...data, priority: event.target.value as PurchaseRequestPriority })}
            >
              <option value="LOW">منخفضة</option>
              <option value="NORMAL">عادية</option>
              <option value="HIGH">عاجلة</option>
              <option value="URGENT">حرجة للغاية (طارئة)</option>
            </Select>
          </FormField>

          <FormField label="ملاحظات / الغرض من الشراء">
            <Textarea
              id="pr-notes"
              rows={2}
              value={data.notes || ''}
              onChange={(event) => setData({ ...data, notes: event.target.value })}
              placeholder="اكتب أي ملاحظات أو توضيحات خاصة بالطلب..."
            />
          </FormField>
        </div>
      </Card>

      {/* Card 2: Items List - Compact Spreadsheet Table */}
      <Card className="space-y-4 border-slate-800 bg-slate-900/90 p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-slate-100 flex items-center gap-2">
                <span className="text-cyan-400">📦</span> 2. جدول إدخال البنود والمواد السريع
              </h2>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800/60 text-cyan-300">
                {data.items.length} {data.items.length === 1 ? 'بند' : 'بنود'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              إدخال أفقي سريع بنمط جدول إكسيل (Compact Spreadsheet) مع تكرار وإضافة الأصناف بنقرة واحدة.
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={addItem}
              className="text-xs bg-cyan-600 hover:bg-cyan-500 border-cyan-500 font-bold px-3 py-1.5 flex items-center gap-1.5 shadow-md shadow-cyan-950/40"
            >
              <span>+</span> إضافة صنف جديد
            </Button>
          </div>
        </div>

        {/* Quick Picks for Common Items */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/70">
          <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 ml-1">
            <span>⚡</span> أصناف شائعة:
          </span>
          {isOffice ? (
            <>
              {['ورق تصوير A4 80 جم', 'أقلام جاف أزرق', 'حبر طابعة HP أسود', 'ملفات بلاستيك دوسيه', 'ضيافة وبوفيه'].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => {
                    const lastIdx = data.items.length - 1;
                    if (lastIdx >= 0 && !data.items[lastIdx].item_description.trim()) {
                      updateItem(lastIdx, { item_description: chip });
                    } else {
                      setData({ ...data, items: [...data.items, { ...emptyItem(), item_description: chip }] });
                    }
                  }}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-indigo-950/60 border border-indigo-800/50 text-indigo-300 hover:bg-indigo-900/60 hover:text-white transition-all font-medium"
                >
                  + {chip}
                </button>
              ))}
            </>
          ) : (
            <>
              {['حديد تسليح 16 مم', 'حديد تسليح 12 مم', 'أسمنت بورتلاندي عادي', 'خرسانة جاهزة عيار 350', 'طوب أسمنتي مصمت', 'رمل ناعم'].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => {
                    const lastIdx = data.items.length - 1;
                    if (lastIdx >= 0 && !data.items[lastIdx].item_description.trim()) {
                      updateItem(lastIdx, { item_description: chip });
                    } else {
                      setData({ ...data, items: [...data.items, { ...emptyItem(), item_description: chip }] });
                    }
                  }}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-amber-950/60 border border-amber-800/50 text-amber-300 hover:bg-amber-900/60 hover:text-white transition-all font-medium"
                >
                  + {chip}
                </button>
              ))}
            </>
          )}
        </div>

        {/* Compact Spreadsheet Table Container */}
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60 shadow-inner">
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 text-[11px] font-bold">
                <th className="p-3 w-10 text-center">م</th>
                <th className="p-3 min-w-[200px]">
                  وصف الصنف / المادة <span className="text-rose-400">*</span>
                </th>
                <th className="p-3 min-w-[130px]">
                  {isOffice ? 'مكان الاستلام' : 'رقم القطعة *'}
                </th>
                {!isOffice && (
                  <th className="p-3 min-w-[130px]">
                    المنطقة <span className="text-rose-400">*</span>
                  </th>
                )}
                <th className="p-3 w-24">
                  الكمية <span className="text-rose-400">*</span>
                </th>
                <th className="p-3 w-28">الوحدة</th>
                <th className="p-3 min-w-[160px]">المواصفات الفنية</th>
                <th className="p-3 w-20 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {data.items.map((item, index) => {
                const itemErr = validation.items[index];
                const hasItemError = Boolean(itemErr && (itemErr.description || itemErr.reference || itemErr.region || itemErr.quantity));

                return (
                  <tr
                    key={index}
                    id={`pr-item-card-${index}`}
                    className={`transition-colors hover:bg-slate-900/50 ${
                      hasItemError && showValidation ? 'bg-rose-950/20' : index % 2 === 0 ? 'bg-slate-950/30' : 'bg-slate-900/20'
                    }`}
                  >
                    {/* Index */}
                    <td className="p-2.5 text-center font-mono font-bold text-slate-400">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-cyan-300">
                        {index + 1}
                      </span>
                    </td>

                    {/* Item Description */}
                    <td className="p-2.5 align-top">
                      <div className="space-y-1">
                        <input
                          type="text"
                          value={item.item_description}
                          onChange={(e) => updateItem(index, { item_description: e.target.value })}
                          placeholder={isOffice ? 'مثال: ورق A4 80جم، حبر HP...' : 'مثال: حديد تسليح، خرسانة...'}
                          className={`w-full rounded-lg bg-slate-900 border px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 ${
                            itemErr?.description && (showValidation || item.item_description.length > 0)
                              ? 'border-rose-500/80 focus:ring-rose-500'
                              : 'border-slate-800 focus:border-cyan-500 focus:ring-cyan-500/40'
                          }`}
                        />
                        {itemErr?.description && showValidation && (
                          <span className="text-[10px] text-rose-400 block font-semibold leading-tight">
                            ⚠️ {itemErr.description}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Item Reference (Plot # or Office Room) */}
                    <td className="p-2.5 align-top">
                      <div className="space-y-1">
                        <input
                          type="text"
                          value={item.item_reference || ''}
                          onChange={(e) => {
                            if (isOffice) {
                              updateItem(index, { item_reference: e.target.value, region: e.target.value || 'مقر الشركة' });
                            } else {
                              updateItem(index, { item_reference: e.target.value });
                            }
                          }}
                          placeholder={isOffice ? 'مقر الشركة' : 'مثال: 256 أو A-14'}
                          className={`w-full rounded-lg bg-slate-900 border px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 ${
                            !isOffice && itemErr?.reference && (showValidation || (item.item_reference && item.item_reference.length > 0))
                              ? 'border-rose-500/80 focus:ring-rose-500'
                              : 'border-slate-800 focus:border-cyan-500 focus:ring-cyan-500/40'
                          }`}
                        />
                        {!isOffice && itemErr?.reference && showValidation && (
                          <span className="text-[10px] text-rose-400 block font-semibold leading-tight">
                            ⚠️ {itemErr.reference}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Region (Projects only) */}
                    {!isOffice && (
                      <td className="p-2.5 align-top">
                        <div className="space-y-1">
                          <input
                            type="text"
                            value={item.region || ''}
                            onChange={(e) => updateItem(index, { region: e.target.value })}
                            placeholder="مثال: المنطقة السابعة"
                            className={`w-full rounded-lg bg-slate-900 border px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 ${
                              itemErr?.region && (showValidation || (item.region && item.region.length > 0))
                                ? 'border-rose-500/80 focus:ring-rose-500'
                                : 'border-slate-800 focus:border-cyan-500 focus:ring-cyan-500/40'
                            }`}
                          />
                          {itemErr?.region && showValidation && (
                            <span className="text-[10px] text-rose-400 block font-semibold leading-tight">
                              ⚠️ {itemErr.region}
                            </span>
                          )}
                        </div>
                      </td>
                    )}

                    {/* Quantity */}
                    <td className="p-2.5 align-top">
                      <div className="space-y-1">
                        <input
                          type="number"
                          min="0.01"
                          step="any"
                          value={item.quantity === 0 ? '' : (item.quantity ?? '')}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => updateItem(index, { quantity: e.target.value === '' ? ('' as any) : Number(e.target.value) })}
                          placeholder="1"
                          className={`w-full text-center font-mono font-bold rounded-lg bg-slate-900 border px-2 py-1.5 text-xs text-amber-300 placeholder-slate-500 focus:outline-none focus:ring-1 ${
                            itemErr?.quantity && showValidation
                              ? 'border-rose-500/80 focus:ring-rose-500'
                              : 'border-slate-800 focus:border-cyan-500 focus:ring-cyan-500/40'
                          }`}
                        />
                        {itemErr?.quantity && showValidation && (
                          <span className="text-[10px] text-rose-400 block font-semibold text-center leading-tight">
                            ⚠️ خطأ
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Unit */}
                    <td className="p-2.5 align-top">
                      <select
                        value={item.uom}
                        onChange={(e) => updateItem(index, { uom: e.target.value })}
                        className="w-full rounded-lg bg-slate-900 border border-slate-800 px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                      >
                        {UNIT_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Specifications */}
                    <td className="p-2.5 align-top">
                      <input
                        type="text"
                        value={item.specifications || ''}
                        onChange={(e) => updateItem(index, { specifications: e.target.value })}
                        placeholder="ماركة، دقة، أبعاد..."
                        className="w-full rounded-lg bg-slate-900 border border-slate-800 px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      />
                    </td>

                    {/* Actions */}
                    <td className="p-2.5 align-top text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => duplicateItem(index)}
                          className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800/80 rounded-lg transition-colors"
                          title="نسخ وتكرار هذا البند بنفس البيانات"
                        >
                          📋
                        </button>
                        {data.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors"
                            title="حذف هذا البند"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Quick add bottom bar */}
        <div className="flex items-center justify-between pt-1">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={addItem}
            className="text-xs border-dashed border-slate-700 hover:border-cyan-500/70 hover:text-cyan-300 px-4 py-2"
          >
            + إضافة سطر صنف آخر (Add Row)
          </Button>

          <div className="text-[11px] text-slate-400 font-mono">
            إجمالي الأصناف: <strong className="text-cyan-300 font-bold">{data.items.length}</strong> | إجمالي الكميات:{' '}
            <strong className="text-amber-300 font-bold">
              {data.items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0)}
            </strong>
          </div>
        </div>
      </Card>

      {/* Real-time Items Summary Table (similar to quotes table) */}
      <PurchaseRequestItemsSummaryTable
        items={data.items}
        requestType={data.request_type}
        onRemoveItem={data.items.length > 1 ? removeItem : undefined}
        onScrollToItem={(index) => {
          const el = document.getElementById(`pr-item-card-${index}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('ring-2', 'ring-cyan-400');
            setTimeout(() => el.classList.remove('ring-2', 'ring-cyan-400'), 1500);
          }
        }}
      />

      {/* Bottom Submit & Action Bar */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/80 p-4 shadow-2xl backdrop-blur-sm">
        <div className="text-xs text-slate-400">
          💡 عند الضغط على <strong>&quot;إرسال طلب الشراء فوراً&quot;</strong> سيتم حفظ الطلب وإرساله مباشرة لدورة الاعتماد.
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={handleSaveDraft}
            disabled={isSubmitting || isSavingDraft}
            isLoading={isSavingDraft}
          >
            💾 حفظ كمسودة
          </Button>

          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={() => void handleSubmit()}
            disabled={isSubmitting || isSavingDraft}
            isLoading={isSubmitting}
            className="px-6 shadow-lg shadow-cyan-600/30"
          >
            🚀 إرسال طلب الشراء فوراً
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreatePurchaseRequestPage;
