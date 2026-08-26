import React, { useEffect, useState, useMemo } from 'react';
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning';
import { useNavigate } from 'react-router-dom';
import ErrorMessage from '../ErrorMessage';
import LoadingSpinner from '../LoadingSpinner';
import { getCatalogItemsApi } from '../../api/catalog';
import { getPurchaseRequestDepartmentOptionsApi } from '../../api/purchaseRequests';
import { ApiError } from '../../types/api';
import {
  CatalogItem,
  CreatePurchaseRequestPayload,
  PurchaseRequest,
  PurchaseRequestItemFormInput,
  PurchaseRequestPriority,
  PurchaseRequestType,
  DepartmentOption,
} from '../../types/purchaseRequest';
import { parseApiError } from '../../utils/apiError';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { FormField, Input, Select, Textarea, SearchableSelect } from '../ui/FormField';
import { getUnitLabel, getUnitOptions } from '../../utils/units';
import { useAuth } from '../../context/AuthContext';

const UNIT_OPTIONS = getUnitOptions(['PCS', 'KG', 'TON', 'M', 'M2', 'M3', 'L', 'BAG', 'BOX', 'CARTON', 'SET', 'PAIR', 'UNIT', 'HOUR', 'DAY']);

const getTodayDateInputValue = (): string => {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${today.getFullYear()}-${month}-${day}`;
};

interface Props {
  initialData?: PurchaseRequest;
  onSubmit: (payload: CreatePurchaseRequestPayload) => Promise<void>;
  isSubmitting: boolean;
  submitButtonText?: string;
}

export const PurchaseRequestForm: React.FC<Props> = ({
  initialData,
  onSubmit,
  isSubmitting,
  submitButtonText = 'حفظ المسودة',
}) => {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const isGeneralManager = hasRole('general_manager');
  const [requestType, setRequestType] = useState<PurchaseRequestType>(initialData?.request_type || 'PROJECT');
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState<boolean>(true);
  const [departmentOptions, setDepartmentOptions] = useState<DepartmentOption[]>([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState<boolean>(true);

  const [targetDepartmentId, setTargetDepartmentId] = useState<number | ''>(initialData?.target_department_id || initialData?.department?.id || '');
  const [priority, setPriority] = useState<PurchaseRequestPriority>(initialData?.priority || 'NORMAL');
  const [dateNeeded, setDateNeeded] = useState<string>(() => {
    const today = getTodayDateInputValue();
    if (!initialData?.date_needed) return today;
    return initialData.date_needed < today ? today : initialData.date_needed;
  });
  const [notes, setNotes] = useState<string>(initialData?.notes || '');
  const [items, setItems] = useState<PurchaseRequestItemFormInput[]>([]);
  const [error, setError] = useState<ApiError | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const isDirty = !initialData && Boolean(targetDepartmentId || notes.trim() || items.some((item) => item.item_description.trim() || item.item_reference?.trim() || item.region?.trim() || Number(item.quantity) !== 1));
  useUnsavedChangesWarning(isDirty && !isSubmitting);

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const data = await getCatalogItemsApi();
        setCatalogItems(data);
      } catch (err) {
        console.error('Failed to load catalog items', err);
      } finally {
        setIsLoadingCatalog(false);
      }
    };
    fetchCatalog();
  }, []);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const data = await getPurchaseRequestDepartmentOptionsApi();
        setDepartmentOptions(data);
      } catch (err) {
        setError(parseApiError(err));
      } finally {
        setIsLoadingDepartments(false);
      }
    };
    void fetchDepartments();
  }, []);

  useEffect(() => {
    setTargetDepartmentId(initialData?.target_department_id || initialData?.department?.id || '');
    const today = getTodayDateInputValue();
    if (initialData?.date_needed) {
      setDateNeeded(initialData.date_needed < today ? today : initialData.date_needed);
    } else {
      setDateNeeded(today);
    }
  }, [initialData]);

  useEffect(() => {
    if (initialData && initialData.items && initialData.items.length > 0) {
      setItems(
        initialData.items.map((i) => ({
          item_id: i.item_id || null,
          item_description: i.item_description,
          item_reference: i.item_reference || '',
          region: i.region || '',
          quantity: parseFloat(i.quantity),
          uom: i.uom || '',
          specifications: i.specifications || '',
          notes: i.notes || '',
        }))
      );
    } else if (!initialData) {
      setItems([
        {
          item_id: null,
          item_description: '',
          item_reference: '',
          region: '',
          quantity: 1,
          uom: 'PCS',
          specifications: '',
          notes: '',
        },
      ]);
    }
  }, [initialData]);

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        item_id: null,
        item_description: '',
        quantity: 1,
        uom: 'PCS',
        specifications: '',
        notes: '',
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      setError({ message: 'يجب تقديم عنصر واحد على الأقل.' });
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (
    index: number,
    field: keyof PurchaseRequestItemFormInput,
    value: any
  ) => {
    setItems((prev) => {
      const updated = [...prev];
      const currentItem = { ...updated[index] };

      if (field === 'item_id') {
        const itemId = value ? parseInt(value, 10) : null;
        currentItem.item_id = itemId;
        if (itemId) {
          const selectedCatalog = catalogItems.find((c) => c.id === itemId);
          if (selectedCatalog) {
            currentItem.item_description = selectedCatalog.name;
            currentItem.uom = selectedCatalog.uom;
          }
        }
      } else {
        (currentItem as any)[field] = value;
      }

      updated[index] = currentItem;
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const nextFieldErrors: Record<string, string> = {};

    const isOffice = requestType === 'OFFICE_SUPPLIES';

    if (!targetDepartmentId) {
      nextFieldErrors.targetDepartment = 'اختر القسم المطلوب منه الشراء قبل حفظ الطلب.';
    }

    const selectedDepartment = departmentOptions.find((department) => department.id === Number(targetDepartmentId));
    if (targetDepartmentId && !isGeneralManager && !selectedDepartment?.manager) {
      nextFieldErrors.targetDepartment = 'القسم المختار لا يحتوي على مدير قسم معين من الإدارة.';
    } else if (targetDepartmentId && !isOffice && !selectedDepartment?.site_engineer) {
      nextFieldErrors.targetDepartment = 'القسم المختار لا يحتوي على مهندس موقع معين من الإدارة لمشتريات المشروعات.';
    }

    if (!dateNeeded) {
      nextFieldErrors.dateNeeded = 'حدد تاريخ الاحتياج قبل حفظ الطلب.';
    } else if (dateNeeded < getTodayDateInputValue()) {
      nextFieldErrors.dateNeeded = 'تاريخ الاحتياج لا يمكن أن يكون في الماضي. اختر اليوم أو تاريخًا قادمًا.';
    }

    if (items.length === 0) {
      setError({ message: 'يجب إضافة عنصر واحد على الأقل.', status: 422 });
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.item_description.trim()) nextFieldErrors[`item_${i}_description`] = 'اكتب وصف الصنف المطلوب.';
      if (!isOffice) {
        if (!item.item_reference?.trim()) nextFieldErrors[`item_${i}_reference`] = 'رقم قطعة الأرض مطلوب.';
        if (!item.region?.trim()) nextFieldErrors[`item_${i}_region`] = 'المنطقة مطلوبة.';
      }
      const qty = typeof item.quantity === 'number' ? item.quantity : parseFloat(String(item.quantity));
      if (!Number.isFinite(qty) || qty <= 0) nextFieldErrors[`item_${i}_quantity`] = 'أدخل كمية أكبر من صفر.';
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      const normalizedFieldErrors: Record<string, string[]> = Object.fromEntries(
        Object.entries(nextFieldErrors).map(([field, message]) => [field, [message]]),
      );
      setError({
        message: nextFieldErrors.targetDepartment || Object.values(nextFieldErrors)[0] || 'راجع الحقول المحددة باللون الأحمر ثم أعد المحاولة.',
        status: 422,
        errors: normalizedFieldErrors,
      });
      return;
    }

    try {
      await onSubmit({
        request_type: requestType,
        target_department_id: Number(targetDepartmentId),
        priority,
        date_needed: dateNeeded || undefined,
        notes: notes.trim() || undefined,
        items: items.map((item) => ({
          ...item,
          item_description: item.item_description.trim(),
          item_reference: item.item_reference?.trim() || (isOffice ? 'مقر الشركة' : undefined),
          region: item.region?.trim() || (isOffice ? 'إداري / المقر الرئيسي' : undefined),
          specifications: item.specifications?.trim(),
          notes: item.notes?.trim(),
          quantity: typeof item.quantity === 'string' ? Number(item.quantity) : item.quantity,
        })),
      });
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  const departmentSelectOptions = useMemo(() => {
    return departmentOptions.map((d) => ({
      value: d.id,
      label: d.name,
      subLabel: d.manager?.name ? `المدير: ${d.manager.name}` : undefined,
      badge: d.code || undefined,
      searchTerms: [d.code || '', d.manager?.name || '', d.site_engineer?.name || ''].filter(Boolean),
    }));
  }, [departmentOptions]);

  const catalogOptions = useMemo(() => {
    return catalogItems.map((c) => ({
      value: c.id,
      label: c.name,
      subLabel: c.code ? `كود: ${c.code}` : c.category?.name,
      badge: getUnitLabel(c.uom),
      searchTerms: [c.description || '', c.code || '', c.category?.name || ''].filter(Boolean),
    }));
  }, [catalogItems]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in" dir="rtl">
      <ErrorMessage error={error} onDismiss={() => setError(null)} />

      {/* Request Type Selector */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-slate-300">
            نوع الطلب والغرض منه <span className="text-rose-400">*</span>
          </label>
          <span className="text-[11px] text-slate-400">
            الافتراضي: <strong className="text-amber-300">مشتريات مشروعات ومواقع</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Option 1: Projects (Default) */}
          <button
            type="button"
            onClick={() => setRequestType('PROJECT')}
            className={`flex flex-col text-right p-3.5 rounded-xl border transition-all ${
              requestType === 'PROJECT'
                ? 'bg-amber-950/60 border-amber-500 ring-2 ring-amber-500/30 text-slate-100 shadow-lg shadow-amber-950/40'
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
              {requestType === 'PROJECT' && (
                <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full">
                  ✓ محدد
                </span>
              )}
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400">
              خاصة بقطع الأراضي والمواقع الإنشائية. تتطلب تحديد رقم القطعة والمنطقة وتمر على مهندس الموقع وأمين المخزن للاستلام.
            </p>
          </button>

          {/* Option 2: Office Supplies */}
          <button
            type="button"
            onClick={() => setRequestType('OFFICE_SUPPLIES')}
            className={`flex flex-col text-right p-3.5 rounded-xl border transition-all ${
              requestType === 'OFFICE_SUPPLIES'
                ? 'bg-indigo-950/60 border-indigo-500 ring-2 ring-indigo-500/30 text-slate-100 shadow-lg shadow-indigo-950/40'
                : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-1.5">
              <span className="text-base flex items-center gap-2 font-bold text-indigo-300">
                <span>🏢</span> مستلزمات مكتبية وإدارية
              </span>
              {requestType === 'OFFICE_SUPPLIES' && (
                <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded-full">
                  ✓ محدد
                </span>
              )}
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400">
              طابعات، أقلام، أحبار، أجهزة، أو أدوات للمقر. <strong className="text-indigo-200">مقدم الطلب يستلم مباشرة</strong> دون حاجة لمخازن أو موقع.
            </p>
          </button>
        </div>
      </Card>

      {/* Header Fields */}
      <Card className="space-y-4">
        <h3 className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3 text-sm font-bold text-slate-100">
          <span>📝</span> بيانات الطلب والقسم المعالج
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="القسم المطلوب منه الشراء" required error={fieldErrors.targetDepartment} helperText={requestType === 'OFFICE_SUPPLIES' ? 'سيتم توجيه الطلب إلى مدير القسم للمراجعة، والاستلام يتم من قبلك مباشرة.' : 'سيتم توجيه الطلب تلقائيًا إلى مدير القسم ثم مهندس الموقع التابع له.'}>
            <SearchableSelect
              options={departmentSelectOptions}
              value={targetDepartmentId || ''}
              onChange={(val) => setTargetDepartmentId(val ? Number(val) : '')}
              disabled={isLoadingDepartments}
              placeholder={isLoadingDepartments ? 'جاري تحميل الأقسام...' : 'اختر أو ابحث عن القسم'}
              searchPlaceholder="ابحث باسم القسم أو الكود أو المدير..."
              emptyMessage="لا يوجد قسم بهذا الاسم"
              error={Boolean(fieldErrors.targetDepartment)}
            />
            {targetDepartmentId && (() => {
              const selectedDepartment = departmentOptions.find((department) => department.id === Number(targetDepartmentId));
              return selectedDepartment ? (
                <p className="mt-1 text-[11px] text-slate-400">
                  مدير القسم: {selectedDepartment.manager?.name || 'غير معين'} {requestType === 'PROJECT' ? `| مهندس الموقع: ${selectedDepartment.site_engineer?.name || 'غير معين'}` : ''}
                </p>
              ) : null;
            })()}
          </FormField>

          <FormField label="درجة الأولوية">
            <Select
              value={priority}
              onChange={(e) => setPriority(e.target.value as PurchaseRequestPriority)}
            >
              <option value="NORMAL">عادي</option>
              <option value="LOW">منخفض</option>
              <option value="HIGH">عالي</option>
              <option value="URGENT">عاجل جداً</option>
            </Select>
          </FormField>

          <FormField label="تاريخ الحاجة والتوريد" error={fieldErrors.dateNeeded}>
            <Input
              type="date"
              min={getTodayDateInputValue()}
              value={dateNeeded}
              onChange={(e) => setDateNeeded(e.target.value)}
            />
          </FormField>

          <FormField label="ملاحظات عامة">
            <Input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي اشتراطات خاصة بالطلب"
            />
          </FormField>
        </div>
      </Card>

      {/* Items List */}
      <Card className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span>📦</span> بنود وأصناف الطلب
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {requestType === 'OFFICE_SUPPLIES' ? 'حدد المواد المكتبية المطلوبة والمواصفات والكميات.' : 'حدد المواد المطلوبة والمواصفات الفنية مع رقم قطعة الأرض والمنطقة.'}
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleAddItem}
            className="w-full sm:w-auto"
          >
            + إضافة عنصر جديد
          </Button>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={index}
              className="relative space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3 transition-all sm:p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60 font-mono">
                  بند #{index + 1}
                </span>
                {items.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveItem(index)}
                    className="w-full text-xs text-rose-400 hover:text-rose-300 sm:w-auto"
                  >
                    حذف البند
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <FormField label="اختيار سريع من الكتالوج">
                  <SearchableSelect
                    options={catalogOptions}
                    value={item.item_id || ''}
                    onChange={(val) => handleItemChange(index, 'item_id', val ? String(val) : '')}
                    disabled={isLoadingCatalog}
                    clearable
                    onClear={() => handleItemChange(index, 'item_id', '')}
                    placeholder="-- ابحث في كتالوج الأصناف... --"
                    searchPlaceholder="ابحث باسم الصنف أو الكود..."
                    emptyMessage="لا يوجد صنف بهذا الاسم في الكتالوج"
                  />
                </FormField>

                <div className="md:col-span-2">
                  <FormField label="الصنف" required error={fieldErrors[`item_${index}_description`]} >
                    <Input
                      type="text"
                      required
                      error={Boolean(fieldErrors[`item_${index}_description`])}
                      value={item.item_description}
                      onChange={(e) => handleItemChange(index, 'item_description', e.target.value)}
                      placeholder={requestType === 'OFFICE_SUPPLIES' ? 'مثال: طابعة ليزر / كرتونة ورق تصوير A4 / أقلام' : 'اسم الصنف أو المادة المطلوبة بالتفصيل'}
                    />
                  </FormField>
                </div>

                {requestType === 'OFFICE_SUPPLIES' ? (
                  <FormField label="مكتب / مكان الاستلام الداخلي (اختياري)">
                    <Input
                      type="text"
                      value={item.item_reference || ''}
                      onChange={(e) => {
                        handleItemChange(index, 'item_reference', e.target.value);
                        handleItemChange(index, 'region', e.target.value || 'مقر الشركة');
                      }}
                      placeholder="افتراضي: مقر الشركة / مكتب مقدم الطلب"
                    />
                  </FormField>
                ) : (
                  <>
                    <FormField label="رقم قطعة الأرض" required error={fieldErrors[`item_${index}_reference`]} >
                      <Input
                        type="text"
                        required
                        error={Boolean(fieldErrors[`item_${index}_reference`])}
                        value={item.item_reference || ''}
                        onChange={(e) => handleItemChange(index, 'item_reference', e.target.value)}
                        placeholder="أدخل رقم قطعة الأرض"
                        dir="ltr"
                      />
                    </FormField>

                    <FormField label="المنطقة" required error={fieldErrors[`item_${index}_region`]} >
                      <Input
                        type="text"
                        required
                        error={Boolean(fieldErrors[`item_${index}_region`])}
                        value={item.region || ''}
                        onChange={(e) => handleItemChange(index, 'region', e.target.value)}
                        placeholder="أدخل اسم المنطقة"
                      />
                    </FormField>
                  </>
                )}

                <FormField label="الكمية المطلوبة" required error={fieldErrors[`item_${index}_quantity`]} >
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    error={Boolean(fieldErrors[`item_${index}_quantity`])}
                    value={item.quantity === 0 ? '' : (item.quantity ?? '')}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                  />
                </FormField>

                <FormField label="الوحدة">
                  <Select
                    value={item.uom || 'PCS'}
                    onChange={(e) => handleItemChange(index, 'uom', e.target.value)}
                  >
                    {UNIT_OPTIONS.map((unit) => <option key={unit.value} value={unit.value}>{unit.label}</option>)}
                  </Select>
                </FormField>

                <div className="md:col-span-3">
                  <FormField label="المواصفات الفنية والتشغيلية">
                    <Input
                      type="text"
                      value={item.specifications || ''}
                      onChange={(e) => handleItemChange(index, 'specifications', e.target.value)}
                      placeholder="أدخل الأبعاد، الماركة، القياسات، أو المواصفات الدقيقة المطلوبة..."
                    />
                  </FormField>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Form الإجراءات */}
      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={() => navigate('/employee/requests')}
          className="w-full sm:w-auto"
        >
          إلغاء
        </Button>

        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={isSubmitting}
          className="w-full sm:w-auto"
        >
          {submitButtonText}
        </Button>
      </div>
    </form>
  );
};

export default PurchaseRequestForm;
