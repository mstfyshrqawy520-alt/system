/**
 * Formats a date/time string or Date object into 12-hour format with AM/PM (م/ص).
 * Example: '2026-09-01T15:17:04Z' -> '03:17 م' or '03:17 PM'
 */
export const formatTime12h = (dateStr?: string | Date | null, useArabicSuffix = true): string => {
  if (!dateStr) return '';
  try {
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    if (isNaN(d.getTime())) return String(dateStr);

    let hours = d.getHours();
    const minutes = d.getMinutes();
    const isPm = hours >= 12;
    hours = hours % 12;
    if (hours === 0) hours = 12;

    const formattedHours = String(hours).padStart(2, '0');
    const formattedMinutes = String(minutes).padStart(2, '0');
    const suffix = useArabicSuffix ? (isPm ? 'م' : 'ص') : (isPm ? 'PM' : 'AM');

    return `${formattedHours}:${formattedMinutes} ${suffix}`;
  } catch {
    return '';
  }
};

/**
 * Formats date and time: '2026-09-01 | 03:17 م'
 */
export const formatDateTime12h = (dateStr?: string | Date | null, useArabicSuffix = true): string => {
  if (!dateStr) return '';
  try {
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    if (isNaN(d.getTime())) return String(dateStr);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const time = formatTime12h(d, useArabicSuffix);

    return `${year}-${month}-${day} ${time}`;
  } catch {
    return '';
  }
};
