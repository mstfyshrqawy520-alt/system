import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { FormField, Input, Select, Textarea } from '../../components/ui/FormField';
import {
  createPurchaseRequestApi,
  getPurchaseRequestDepartmentOptionsApi,
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
  PR_TYPE_LABELS,
} from '../../types/purchaseRequest';
import { getUnitLabel, getUnitOptions } from '../../utils/units';
import { parseApiError } from '../../utils/apiError';
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning';
import { useAuth } from '../../context/AuthContext';
import { emitAppDataUpdated } from '../../hooks/useRealtimeRefresh';
import { SearchableSelect } from '../../components/ui/FormField';

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
    targetManager: !isGeneralManager && data.target_department_id && targetDepartment && !targetDepartment.manager
      ? 'القسم المستهدف لا يوجد له مدير قسم معين. اطلب من مدير النظام تعيين مدير للقسم أولًا.'
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
  Boolean(validation.targetDepartment || validation.targetManager || validation.dateNeeded || Object.keys(validation.items).length);

const normalizeRequestData = (data: CreatePurchaseRequestPayload): CreatePurchaseRequestPayload => {
  const isOffice = (data.request_type || 'PROJECT') === 'OFFICE_SUPPLIES';
  return {
    ...data,
    request_type: data.request_type || 'PROJECT',
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
      await submitPurchaseRequestApi(draft.id);
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      emitAppDataUpdated();
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

  const handleClearDraft = () => {
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    setData(getInitialData());
    setServerDraftId(null);
    setDraftMessage('تم مسح المسودة والبدء من جديد.');
    setTimeout(() => setDraftMessage(null), 3000);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-cyan-400">
            <span>{isGeneralManager ? 'المدير العام' : 'منشئ الطلب'}</span>
            <span className="text-slate-600">/</span>
            <span>طلب شراء جديد</span>
          </div>
          <h1 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <span>✍️</span> إنشاء وإرسال طلب شراء
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            اختر نوع الطلب، وأدخل بيانات المواد المطلوبة، ثم اضغط على إرسال الطلب مباشرة لبدء دورة الاعتماد.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/requests">
            <Button type="button" variant="secondary" size="sm">
              ← أرشيف طلباتي
            </Button>
          </Link>
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
            <SearchableSelect
              options={departmentSelectOptions}
              value={data.target_department_id || ''}
              onChange={(val) =>
                setData({
                  ...data,
                  target_department_id: val ? Number(val) : undefined,
                  reviewer_user_id: undefined,
                  site_engineer_user_id: undefined,
                })
              }
              disabled={departmentLoading || departmentOptions.length === 0}
              placeholder={departmentLoading ? 'جاري تحميل الأقسام...' : 'اختر أو ابحث عن القسم'}
              searchPlaceholder="ابحث باسم القسم أو الكود أو المدير..."
              emptyMessage="لا يوجد قسم بهذا الاسم"
              error={Boolean(showValidation && validation.targetDepartment)}
            />
          </FormField>

          <FormField label="تاريخ الاحتياج" required error={showValidation ? validation.dateNeeded : undefined}>
            <Input
              type="date"
              id="pr-date-needed"
              min={getTodayDateInputValue()}
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
              <div className="font-bold text-slate-200 mt-0.5">{isGeneralManager ? 'مسار المدير العام المباشر' : targetDepartment.manager?.name || 'غير معين'}</div>
            </div>

            {isOffice ? (
              <div className="rounded-lg border border-indigo-800/50 bg-indigo-950/30 p-2.5">
                <span className="text-indigo-400 font-bold flex items-center gap-1 text-[10px]">
                  <span>📦</span> آلية الاستلام:
                </span>
                <div className="font-bold text-slate-200 mt-0.5">مقدم الطلب يستلم مباشرة بمقر الشركة</div>
              </div>
            ) : (
              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2.5">
                <span className="text-slate-500 text-[10px]">مهندس الموقع المعين:</span>
                <div className="font-bold text-slate-200 mt-0.5">{targetDepartment.site_engineer?.name || 'غير معين'}</div>
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

      {/* Card 2: Items List */}
      <Card className="space-y-4 border-slate-800 bg-slate-900/90 p-5 sm:p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-black text-slate-100 flex items-center gap-2">
              <span className="text-cyan-400">📦</span> 2. بنود ومواد الطلب ({data.items.length})
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {isOffice
                ? 'أدخل الأصناف المكتبية، الكميات المطلوبة، ومكان الاستلام الداخلي.'
                : 'أدخل الأصناف، أرقام قطع الأراضي، المناطق، والكميات المطلوبة.'}
            </p>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={addItem} className="text-xs">
            + إضافة صنف آخر
          </Button>
        </div>

        <div className="space-y-4">
          {data.items.map((item, index) => {
            const itemErr = showValidation ? validation.items[index] : undefined;

            return (
              <div
                key={index}
                className="rounded-xl border border-slate-800/90 bg-slate-950/60 p-4 space-y-3 transition-all hover:border-slate-700"
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-black text-cyan-300">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-950 border border-cyan-700 text-[10px]">
                      {index + 1}
                    </span>
                    {item.item_description || `بند جديد رقم ${index + 1}`}
                  </span>

                  {data.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="text-xs font-bold text-rose-400 hover:text-rose-300 px-2 py-1 rounded hover:bg-rose-950/40 transition-colors"
                      title="حذف هذا البند"
                    >
                      🗑️ حذف البند
                    </button>
                  )}
                </div>

                {catalogItems.length > 0 && (
                  <div className="text-xs">
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      اختيار سريع من دليل الأصناف (اختياري)
                    </label>
                    <SearchableSelect
                      options={catalogSelectOptions}
                      value={item.item_id || ''}
                      onChange={(val) => handleCatalogSelect(index, val ? Number(val) : '')}
                      clearable
                      onClear={() => handleCatalogSelect(index, '')}
                      placeholder="-- ابحث في كتالوج الأصناف... --"
                      searchPlaceholder="ابحث باسم الصنف أو الكود..."
                      emptyMessage="لا يوجد صنف بهذا الاسم في الكتالوج"
                    />
                  </div>
                )}

                <div className={`grid grid-cols-1 gap-3 ${isOffice ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
                  <div className={isOffice ? 'sm:col-span-1' : 'sm:col-span-1'}>
                    <FormField label="وصف الصنف / المادة" required error={itemErr?.description}>
                      <Input
                        type="text"
                        value={item.item_description}
                        onChange={(e) => updateItem(index, { item_description: e.target.value })}
                        placeholder={isOffice ? 'مثال: طابعة ليزر ملونة / كرتونة ورق A4 / أقلام...' : 'مثال: حديد تسليح 16مم، خرسانة جاهزة...'}
                        error={Boolean(itemErr?.description)}
                      />
                    </FormField>
                  </div>

                  {isOffice ? (
                    <div>
                      <FormField label="مكتب / مكان الاستلام الداخلي (اختياري)">
                        <Input
                          type="text"
                          value={item.item_reference || ''}
                          onChange={(e) => {
                            updateItem(index, {
                              item_reference: e.target.value,
                              region: e.target.value || 'مقر الشركة',
                            });
                          }}
                          placeholder="افتراضي: مقر الشركة / مكتب مقدم الطلب"
                        />
                      </FormField>
                    </div>
                  ) : (
                    <>
                      <div>
                        <FormField label="رقم قطعة الأرض" required error={itemErr?.reference}>
                          <Input
                            type="text"
                            value={item.item_reference || ''}
                            onChange={(e) => updateItem(index, { item_reference: e.target.value })}
                            placeholder="مثال: 256 أو A-14"
                            error={Boolean(itemErr?.reference)}
                          />
                        </FormField>
                      </div>

                      <div>
                        <FormField label="المنطقة" required error={itemErr?.region}>
                          <Input
                            type="text"
                            value={item.region || ''}
                            onChange={(e) => updateItem(index, { region: e.target.value })}
                            placeholder="مثال: المنطقة السابعة..."
                            error={Boolean(itemErr?.region)}
                          />
                        </FormField>
                      </div>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <FormField label="الكمية المطلوبة" required error={itemErr?.quantity}>
                      <Input
                        type="number"
                        min="0.01"
                        step="any"
                        value={item.quantity === 0 ? '' : (item.quantity ?? '')}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => updateItem(index, { quantity: e.target.value === '' ? ('' as any) : Number(e.target.value) })}
                        placeholder="1"
                        error={Boolean(itemErr?.quantity)}
                      />
                    </FormField>
                  </div>

                  <div>
                    <FormField label="وحدة القياس">
                      <Select
                        value={item.uom}
                        onChange={(e) => updateItem(index, { uom: e.target.value })}
                      >
                        {UNIT_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </Select>
                    </FormField>
                  </div>

                  <div>
                    <FormField label="المواصفات الفنية (اختياري)">
                      <Input
                        type="text"
                        value={item.specifications || ''}
                        onChange={(e) => updateItem(index, { specifications: e.target.value })}
                        placeholder="مثال: ماركة HP، دقة الطباعة، أبعاد..."
                      />
                    </FormField>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={addItem}
          className="w-full py-2.5 border-dashed border-slate-700 hover:border-cyan-500/70"
        >
          + إضافة صنف أو مادة أخرى للطلب
        </Button>
      </Card>

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
