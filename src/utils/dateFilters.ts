export const getTodayInputDate = (): string => {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
};

export const getDefaultDateFrom = (): string => {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  localDate.setDate(localDate.getDate() - 9);
  return localDate.toISOString().slice(0, 10);
};

export const isDateWithinRange = (
  value: string | null | undefined,
  dateFrom: string,
  dateTo: string,
): boolean => {
  if (!value) return false;
  const normalized = value.slice(0, 10);
  return (!dateFrom || normalized >= dateFrom) && (!dateTo || normalized <= dateTo);
};

export const isDefaultTodayRange = (dateFrom: string, dateTo: string): boolean => {
  return dateFrom === getDefaultDateFrom() && dateTo === getTodayInputDate();
};
