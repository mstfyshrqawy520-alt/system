import React, { useEffect, useState, useMemo } from 'react';
import { Input, Select, Textarea, SearchableSelect } from '../ui/FormField';
import { Button } from '../ui/Button';
import { getCatalogItemsApi } from '../../api/catalog';
import { CatalogItem, CreatePurchaseRequestPayload, PurchaseRequestItemFormInput } from '../../types/purchaseRequest';
import { getUnitLabel, getUnitOptions } from '../../utils/units';

interface Props {
  data: CreatePurchaseRequestPayload;
  onChange: (data: CreatePurchaseRequestPayload) => void;
  errors?: Record<number, { description?: string; reference?: string; region?: string; quantity?: string }>;
}

const UNIT_OPTIONS = getUnitOptions(['PCS', 'KG', 'TON', 'M', 'M2', 'M3', 'L', 'BAG', 'BOX', 'CARTON', 'SET', 'PAIR', 'UNIT', 'HOUR', 'DAY']);

function emptyItem(): PurchaseRequestItemFormInput {
  return { item_description: '', item_reference: '', region: '', quantity: 1, uom: 'PCS', specifications: '', notes: '' };
}

export const PRWizardStep2: React.FC<Props> = ({ data, onChange, errors = {} }) => {
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0);

  useEffect(() => {
    getCatalogItemsApi().then(setCatalogItems).catch(() => {});
  }, []);

  const catalogOptions = useMemo(() => {
    return catalogItems.map((cat) => ({
      value: String(cat.id),
      label: cat.name,
      subLabel: cat.code ? `كود: ${cat.code}` : cat.category?.name,
      badge: getUnitLabel(cat.uom),
      searchTerms: [cat.description || '', cat.code || '', cat.category?.name || ''].filter(Boolean),
    }));
  }, [catalogItems]);

  const items: PurchaseRequestItemFormInput[] = data.items && data.items.length > 0 ? data.items : [emptyItem()];

  const updateItem = (idx: number, partial: Partial<PurchaseRequestItemFormInput>) => {
    const updated = items.map((it, i) => i === idx ? { ...it, ...partial } : it);
    onChange({ ...data, items: updated });
  };

  const addItem = () => {
    onChange({ ...data, items: [...items, emptyItem()] });
    setExpandedIdx(items.length);
  };

  const removeItem = (idx: number) => {
    if (items.length <= 1) return;
    const updated = items.filter((_, i) => i !== idx);
    onChange({ ...data, items: updated });
  };

  const handleCatalogSelect = (idx: number, catalogId: string) => {
    if (!catalogId) {
      updateItem(idx, { item_id: null });
      return;
    }
    const cat = catalogItems.find(c => String(c.id) === String(catalogId));
    if (cat) {
      updateItem(idx, {
        item_id: cat.id,
        item_description: cat.name,
        uom: cat.uom || 'PCS',
      });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <span>📦</span> بنود الطلب({items.length})
        </h3>
        <Button type="button" variant="secondary" size="sm" onClick={addItem}>
          + إضافة بند
        </Button>
      </div>

      {items.map((item, idx) => (
        <div
          key={idx}
          className="border-t border-slate-800/80 first:border-t-0 py-5"
        >
          {/* Accordion header */}
          <div className="flex items-center justify-between gap-3 py-2">
            <button
              type="button"
              className="min-w-0 flex-1 text-right hover:text-cyan-200 transition-colors"
              onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
              aria-expanded={expandedIdx === idx}
            >
              <span className="font-semibold text-slate-200 text-sm">
                {idx + 1}. {item.item_description || 'بند جديد'}
                <span className="block mt-1 text-[10px] font-normal text-slate-400">
                  رقم قطعة الأرض: {item.item_reference || 'مطلوب'} — المنطقة: {item.region || 'مطلوبة'}
                </span>
              </span>
            </button>
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-xs text-slate-400 font-mono">{item.quantity} {getUnitLabel(item.uom)}</span>
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  className="text-rose-400 hover:text-rose-300 text-xs font-bold px-2 py-0.5 transition-colors"
                  aria-label={`حذف البند ${idx + 1}`}
                >
                  حذف
                </button>
              )}
              <button
                type="button"
                onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                className="text-slate-400 px-1"
                aria-label={expandedIdx === idx ? 'طي البند' : 'فتح البند'}
              >
                {expandedIdx === idx ? '▲' : '▼'}
              </button>
            </div>
          </div>

          {expandedIdx === idx && (
            <div className="pt-4 space-y-4">
              {/* Catalog select */}
              {catalogItems.length > 0 && (
                <div>
                  <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                    🔍 بحث واختيار سريع من كتالوج الأصناف
                  </label>
                  <SearchableSelect
                    options={catalogOptions}
                    value={item.item_id ? String(item.item_id) : ''}
                    onChange={(val) => handleCatalogSelect(idx, String(val))}
                    clearable
                    onClear={() => handleCatalogSelect(idx, '')}
                    placeholder="-- ابحث في كتالوج الأصناف بالاسم أو الكود... --"
                    searchPlaceholder="اكتب اسم الصنف للبحث الفوري..."
                    emptyMessage="لا يوجد صنف بهذا الاسم في الكتالوج"
                  />
                </div>
              )}

              <div className={`grid grid-cols-1 ${data.request_type === 'OFFICE_SUPPLIES' ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-4`}>
                <div>
                  <label className="text-[10px] font-semibold text-slate-400 block mb-1">وصف الصنف*</label>
                  <Input
                    type="text"
                    required
                    value={item.item_description}
                    onChange={e => updateItem(idx, { item_description: e.target.value })}
                    placeholder={data.request_type === 'OFFICE_SUPPLIES' ? 'مثال: طابعة ليزر ملونة / كرتونة ورق A4' : 'وصف دقيق للصنف المطلوب'}
                    dir="rtl"
                    error={Boolean(errors[idx]?.description)}
                  />
                  {errors[idx]?.description && <p className="text-[11px] font-medium text-rose-400 mt-1">{errors[idx]?.description}</p>}
                </div>

                {data.request_type === 'OFFICE_SUPPLIES' ? (
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block mb-1">مكتب / مكان الاستلام الداخلي (اختياري)</label>
                    <Input
                      value={item.item_reference || ''}
                      onChange={e => updateItem(idx, { item_reference: e.target.value, region: e.target.value || 'مقر الشركة' })}
                      placeholder="افتراضي: مقر الشركة / مكتب مقدم الطلب"
                      dir="rtl"
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 block mb-1">رقم قطعة الأرض*</label>
                      <Input
                        required
                        value={item.item_reference || ''}
                        onChange={e => updateItem(idx, { item_reference: e.target.value })}
                        placeholder="أدخل رقم قطعة الأرض"
                        dir="ltr"
                        error={Boolean(errors[idx]?.reference)}
                      />
                      {errors[idx]?.reference && <p className="text-[11px] font-medium text-rose-400 mt-1">{errors[idx]?.reference}</p>}
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 block mb-1">المنطقة*</label>
                      <Input
                        required
                        value={item.region || ''}
                        onChange={e => updateItem(idx, { region: e.target.value })}
                        placeholder="مثال: المنطقة السابعة والعشرين"
                        error={Boolean(errors[idx]?.region)}
                      />
                      {errors[idx]?.region && <p className="text-[11px] font-medium text-rose-400 mt-1">{errors[idx]?.region}</p>}
                    </div>
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block mb-1">الكمية*</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={item.quantity}
                      onChange={e => updateItem(idx, { quantity: e.target.value })}
                      error={Boolean(errors[idx]?.quantity)}
                    />
                    {errors[idx]?.quantity && <p className="text-[11px] font-medium text-rose-400 mt-1">{errors[idx]?.quantity}</p>}
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block mb-1">الوحدة</label>
                    <Select
                      value={item.uom || 'PCS'}
                      onChange={e => updateItem(idx, { uom: e.target.value })}
                    >
                      {UNIT_OPTIONS.map(unit => <option key={unit.value} value={unit.value}>{unit.label}</option>)}
                    </Select>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-400 block mb-1">المواصفات الفنية</label>
                <Textarea
                  rows={3}
                  value={item.specifications || ''}
                  onChange={e => updateItem(idx, { specifications: e.target.value })}
                  placeholder="المواصفات التقنية التفصيلية..."
                  dir="rtl"
                />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default PRWizardStep2;
