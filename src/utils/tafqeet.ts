/**
 * Professional Tafqeet Utility (تحويل الأرقام إلى نصوص باللغة العربية مع الجنيه المصري والقرش)
 */

const ONES = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
const TENS = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
const HUNDREDS = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

const convertThreeDigits = (num: number): string => {
  let result = '';
  const h = Math.floor(num / 100);
  const remainder = num % 100;

  if (h > 0) {
    result += HUNDREDS[h];
  }

  if (remainder > 0) {
    if (result) result += ' و ';
    if (remainder < 20) {
      result += ONES[remainder];
    } else {
      const o = remainder % 10;
      const t = Math.floor(remainder / 10);
      if (o > 0) {
        result += ONES[o] + ' و ' + TENS[t];
      } else {
        result += TENS[t];
      }
    }
  }

  return result;
};

export const tafqeetNumber = (num: number): string => {
  if (num === 0) return 'صفر';
  if (num < 0) return 'سالب ' + tafqeetNumber(Math.abs(num));

  const integerPart = Math.floor(num);
  if (integerPart === 0) return '';

  const billions = Math.floor(integerPart / 1_000_000_000);
  const millions = Math.floor((integerPart % 1_000_000_000) / 1_000_000);
  const thousands = Math.floor((integerPart % 1_000_000) / 1_000);
  const units = integerPart % 1_000;

  const parts: string[] = [];

  if (billions > 0) {
    if (billions === 1) parts.push('مليار');
    else if (billions === 2) parts.push('ملياران');
    else if (billions >= 3 && billions <= 10) parts.push(convertThreeDigits(billions) + ' مليارات');
    else parts.push(convertThreeDigits(billions) + ' مليار');
  }

  if (millions > 0) {
    if (millions === 1) parts.push('مليون');
    else if (millions === 2) parts.push('مليونان');
    else if (millions >= 3 && millions <= 10) parts.push(convertThreeDigits(millions) + ' ملايين');
    else parts.push(convertThreeDigits(millions) + ' مليون');
  }

  if (thousands > 0) {
    if (thousands === 1) parts.push('ألف');
    else if (thousands === 2) parts.push('ألفان');
    else if (thousands >= 3 && thousands <= 10) parts.push(convertThreeDigits(thousands) + ' آلاف');
    else parts.push(convertThreeDigits(thousands) + ' ألف');
  }

  if (units > 0) {
    parts.push(convertThreeDigits(units));
  }

  return parts.join(' و ');
};

export const tafqeetCurrency = (amount: number | string | null | undefined, currency: string = 'EGP'): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount || 0);
  if (isNaN(num) || num === 0) return 'فقط صفر جنيه مصري لا غير';

  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);

  let result = 'فقط ';
  result += tafqeetNumber(integerPart);

  if (currency === 'EGP') {
    if (integerPart === 1) result += ' جنيه مصري';
    else if (integerPart === 2) result += ' جنيهان مصريان';
    else if (integerPart >= 3 && integerPart <= 10) result += ' جنيهات مصرية';
    else result += ' جنيهاً مصرياً';
  } else {
    result += ` ${currency}`;
  }

  if (decimalPart > 0) {
    result += ' و ' + tafqeetNumber(decimalPart) + ' قرشاً';
  }

  result += ' لا غير';
  return result;
};

export default tafqeetCurrency;
