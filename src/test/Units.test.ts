import { describe, expect, it } from 'vitest';
import { getUnitLabel, getUnitOptions, getUnitValue } from '../utils/units';

describe('Arabic unit labels', () => {
  it('translates M3 and common aliases to متر مكعب', () => {
    expect(getUnitLabel('M3')).toBe('متر مكعب');
    expect(getUnitLabel(' m3 ')).toBe('متر مكعب');
    expect(getUnitLabel('CBM')).toBe('متر مكعب');
    expect(getUnitLabel('م3')).toBe('متر مكعب');
  });

  it('translates all standard construction units used by the forms', () => {
    expect(getUnitLabel('PCS')).toBe('قطعة');
    expect(getUnitLabel('NO')).toBe('عدد');
    expect(getUnitLabel('عدد')).toBe('عدد');
    expect(getUnitLabel('THOUSAND_BRICKS')).toBe('ألف طوبة');
    expect(getUnitLabel('ألف طوبة')).toBe('ألف طوبة');
    expect(getUnitLabel('الالف طوبه')).toBe('ألف طوبة');
    expect(getUnitLabel('KG')).toBe('كيلو جرام');
    expect(getUnitLabel('BAG')).toBe('شيكارة');
    expect(getUnitLabel('M2')).toBe('متر مربع');
    expect(getUnitLabel('TON')).toBe('طن');
    expect(getUnitLabel('GALLON')).toBe('جالون');
    expect(getUnitLabel('JERRICAN')).toBe('جركن');
    expect(getUnitLabel('DRUM')).toBe('برميل');
    expect(getUnitLabel('ROLL')).toBe('رول');
    expect(getUnitLabel('SPOOL')).toBe('بكرة');
    expect(getUnitLabel('DOZEN')).toBe('دستة');
    expect(getUnitLabel('BAR')).toBe('سيخ');
  });

  it('keeps API values in English while accepting Arabic display values', () => {
    expect(getUnitValue('متر مكعب')).toBe('M3');
    expect(getUnitValue('متر مربع')).toBe('M2');
    expect(getUnitValue('كيلو جرام')).toBe('KG');
    expect(getUnitValue('عدد')).toBe('NO');
    expect(getUnitValue('ألف طوبة')).toBe('THOUSAND_BRICKS');
    expect(getUnitValue('الالف طوبه')).toBe('THOUSAND_BRICKS');
    expect(getUnitValue('M3')).toBe('M3');
  });

  it('builds Arabic select options without changing option values', () => {
    expect(getUnitOptions(['M3', 'PCS', 'NO', 'THOUSAND_BRICKS'])).toEqual([
      { value: 'M3', label: 'متر مكعب' },
      { value: 'PCS', label: 'قطعة' },
      { value: 'NO', label: 'عدد' },
      { value: 'THOUSAND_BRICKS', label: 'ألف طوبة' },
    ]);
  });
});
