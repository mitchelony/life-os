const CALENDAR_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

export function parseDateValue(value: string) {
  const match = CALENDAR_DATE_PATTERN.exec(value);
  if (match) {
    const [, year, month, day] = match;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }
  return new Date(value);
}

export function compareDateValues(left: string, right: string) {
  return parseDateValue(left).getTime() - parseDateValue(right).getTime();
}

export function formatDateValue(
  value: string,
  options: Intl.DateTimeFormatOptions,
  locale = "en-US",
) {
  return new Intl.DateTimeFormat(locale, options).format(parseDateValue(value));
}

export function todayDateInputValue(base = new Date()) {
  return `${base.getFullYear()}-${padDatePart(base.getMonth() + 1)}-${padDatePart(base.getDate())}`;
}
