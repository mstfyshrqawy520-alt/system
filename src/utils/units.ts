export const UNIT_LABELS: Record<string, string> = {
  PCS: 'قطعة',
  EA: 'قطعة',
  UNIT: 'وحدة',
  KG: 'كيلو جرام',
  G: 'جرام',
  TON: 'طن',
  M: 'متر',
  CM: 'سنتيمتر',
  MM: 'مليمتر',
  M2: 'متر مربع',
  SQM: 'متر مربع',
  M3: 'متر مكعب',
  CBM: 'متر مكعب',
  L: 'لتر',
  ML: 'مليلتر',
  BAG: 'شيكارة',
  BOX: 'علبة',
  CARTON: 'كرتونة',
  SET: 'طقم',
  PAIR: 'زوج',
  ROLL: 'لفة',
  BUNDLE: 'ربطة',
  PALLET: 'طبالي',
  HOUR: 'ساعة',
  DAY: 'يوم',
};

const UNIT_ALIASES: Record<string, string> = {
  'M³': 'M3',
  'م3': 'M3',
  'متر مكعب': 'M3',
  'M²': 'M2',
  'م2': 'M2',
  'متر مربع': 'M2',
  'قطعة': 'PCS',
  'وحدة': 'UNIT',
  'كيلو': 'KG',
  'كيلوجرام': 'KG',
  'كيلو جرام': 'KG',
  'جرام': 'G',
  'طن': 'TON',
  'متر': 'M',
  'لتر': 'L',
  'شيكارة': 'BAG',
  'علبة': 'BOX',
  'كرتونة': 'CARTON',
  'طقم': 'SET',
  'زوج': 'PAIR',
  'ساعة': 'HOUR',
  'يوم': 'DAY',
};

const normalizeUnit = (unit?: string | null): string => {
  const trimmed = (unit || '').trim();
  if (!trimmed) return '';
  const aliasKey = UNIT_ALIASES[trimmed] || UNIT_ALIASES[trimmed.toUpperCase()];
  return (aliasKey || trimmed).toUpperCase();
};

export const getUnitLabel = (unit?: string | null): string => {
  const normalized = normalizeUnit(unit);
  if (!normalized) return '—';
  return UNIT_LABELS[normalized] || unit?.trim() || '—';
};

export const getUnitValue = (unit?: string | null): string => {
  const normalized = normalizeUnit(unit);
  if (!normalized) return 'UNIT';
  if (UNIT_LABELS[normalized]) return normalized;
  const arabicEntry = Object.entries(UNIT_LABELS).find(([, label]) => label === unit?.trim());
  return arabicEntry?.[0] || normalized;
};

export const getUnitOptions = (units: string[]): Array<{ value: string; label: string }> =>
  units.map((value) => ({ value, label: getUnitLabel(value) }));
