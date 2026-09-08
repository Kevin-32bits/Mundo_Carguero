export interface HistoryDayGroup<T> {
  key: string;
  label: string;
  total: number;
  items: T[];
}

export interface HistoryMonthGroup<T> {
  key: string;
  label: string;
  year: number;
  month: number;
  total: number;
  days: HistoryDayGroup<T>[];
}

export interface GroupHistoryOptions<T> {
  getDate: (item: T) => string | Date;
  getTotal: (item: T) => number;
}

export function parseDateLike(value: string | Date): Date {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? new Date() : value;
  }

  const text = String(value ?? '').trim();
  const parts = text.split('/');
  if (parts.length === 3) {
    const mm = Number(parts[0]) - 1;
    const dd = Number(parts[1]);
    const yyyy = Number(parts[2]);
    const d = new Date(yyyy, mm, dd);
    if (!Number.isNaN(d.getTime())) {
      return d;
    }
  }

  const fallback = new Date(text);
  return Number.isNaN(fallback.getTime()) ? new Date() : fallback;
}

export function monthName(index: number): string {
  const months = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];

  return months[index] ?? 'Mes';
}

export function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

export function groupHistoryByMonthDay<T>(
  items: T[],
  options: GroupHistoryOptions<T>,
): HistoryMonthGroup<T>[] {
  const monthMap = new Map<
    string,
    { key: string; year: number; month: number; label: string; total: number; dayMap: Map<string, HistoryDayGroup<T>> }
  >();

  for (const item of items ?? []) {
    const date = parseDateLike(options.getDate(item));
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    const monthKey = `${year}-${pad2(month + 1)}`;
    let monthGroup = monthMap.get(monthKey);
    if (!monthGroup) {
      monthGroup = {
        key: monthKey,
        year,
        month,
        label: `${monthName(month)} ${year}`,
        total: 0,
        dayMap: new Map<string, HistoryDayGroup<T>>(),
      };
      monthMap.set(monthKey, monthGroup);
    }

    const itemTotal = Number(options.getTotal(item)) || 0;
    monthGroup.total += itemTotal;

    const dayKey = `${year}-${pad2(month + 1)}-${pad2(day)}`;
    let dayGroup = monthGroup.dayMap.get(dayKey);
    if (!dayGroup) {
      dayGroup = {
        key: dayKey,
        label: `${pad2(day)} de ${monthName(month)}`,
        total: 0,
        items: [],
      };
      monthGroup.dayMap.set(dayKey, dayGroup);
    }

    dayGroup.total += itemTotal;
    dayGroup.items.push(item);
  }

  return Array.from(monthMap.values())
    .sort((a, b) => (b.year - a.year) || (b.month - a.month))
    .map((m) => ({
      key: m.key,
      label: m.label,
      year: m.year,
      month: m.month,
      total: m.total,
      days: Array.from(m.dayMap.entries())
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map((entry) => entry[1]),
    }));
}