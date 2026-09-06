import { describe, it, expect } from 'vitest';
import { getSummaryParcels, getSummaryRegions, getSummaryQuantities } from '../utils/formatRequestSummary';

describe('formatRequestSummary utility', () => {
  it('deduplicates parcel numbers for single PR', () => {
    const pr = {
      parcel_reference: '1518',
      items: [
        { item_reference: '1518', item_description: 'طوب أحمر' },
        { item_reference: '1518', item_description: 'أسمنت' },
      ],
    };
    expect(getSummaryParcels(pr)).toBe('1518');
  });

  it('deduplicates regions for single PR', () => {
    const pr = {
      items: [
        { region: '29', item_description: 'طوب أحمر' },
        { region: '29', item_description: 'أسمنت' },
      ],
    };
    expect(getSummaryRegions(pr)).toBe('29');
  });

  it('handles OFFICE_SUPPLIES request type region', () => {
    const pr = {
      request_type: 'OFFICE_SUPPLIES',
      items: [{ region: '29' }],
    };
    expect(getSummaryRegions(pr)).toBe('مقر الشركة');
  });

  it('sums and formats quantities when all items have the same UOM', () => {
    const items = [
      { quantity: 35, uom: 'UNIT', item_description: 'طوب أحمر' },
      { quantity: 9, uom: 'UNIT', item_description: 'طوب إضافي' },
    ];
    const res = getSummaryQuantities(items);
    expect(res.display).toBe('44 وحدة');
    expect(res.subtext).toBe('(إجمالي 2 أصناف)');
    expect(res.tooltip).toContain('طوب أحمر: 35 وحدة');
    expect(res.tooltip).toContain('طوب إضافي: 9 وحدة');
  });

  it('formats single item quantity cleanly', () => {
    const items = [{ quantity: 35, uom: 'UNIT', item_description: 'طوب أحمر' }];
    const res = getSummaryQuantities(items);
    expect(res.display).toBe('35 وحدة');
    expect(res.subtext).toBeUndefined();
  });

  it('handles multiple items with different UOMs', () => {
    const items = [
      { quantity: 10, uom: 'TON', item_description: 'حديد' },
      { quantity: 5, uom: 'M', item_description: 'مواسير' },
    ];
    const res = getSummaryQuantities(items);
    expect(res.display).toBe('2 أصناف');
    expect(res.tooltip).toContain('حديد: 10 طن');
    expect(res.tooltip).toContain('مواسير: 5 متر');
  });
});
