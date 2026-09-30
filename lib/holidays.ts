// Peruvian national holidays.
//
// Covers the feriados nacionales that apply nationwide to the private sector.
// It does NOT cover:
//   • "días no laborables" the government decrees each year (long weekends),
//     which are recoverable working days rather than holidays;
//   • regional or municipal holidays.
// Those are handled by overriding a period's working days in Configuración.

export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
}

// Fixed-date holidays. The four added by Ley 31794 (7 jun, 23 jul, 6 ago,
// 9 dic) have applied since 2024, which is before any period this app tracks.
const FIXED: { month: number; day: number; name: string }[] = [
  { month:  1, day:  1, name: "Año Nuevo" },
  { month:  5, day:  1, name: "Día del Trabajo" },
  { month:  6, day:  7, name: "Batalla de Arica y Día de la Bandera" },
  { month:  6, day: 29, name: "San Pedro y San Pablo" },
  { month:  7, day: 23, name: "Día de la Fuerza Aérea del Perú" },
  { month:  7, day: 28, name: "Fiestas Patrias" },
  { month:  7, day: 29, name: "Fiestas Patrias" },
  { month:  8, day:  6, name: "Batalla de Junín" },
  { month:  8, day: 30, name: "Santa Rosa de Lima" },
  { month: 10, day:  8, name: "Combate de Angamos" },
  { month: 11, day:  1, name: "Todos los Santos" },
  { month: 12, day:  8, name: "Inmaculada Concepción" },
  { month: 12, day:  9, name: "Batalla de Ayacucho" },
  { month: 12, day: 25, name: "Navidad" },
];

function iso(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Easter Sunday, by the Meeus/Jones/Butcher algorithm for the Gregorian
 * calendar. Jueves Santo and Viernes Santo are derived from it, which is why
 * the two movable holidays need no yearly maintenance.
 */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = March, 4 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

const cache = new Map<number, Holiday[]>();

/** Every national holiday in a given year, sorted by date. */
export function peruHolidays(year: number): Holiday[] {
  const hit = cache.get(year);
  if (hit) return hit;

  const easter = easterSunday(year);

  const movable = (offsetDays: number, name: string): Holiday => {
    const d = new Date(easter);
    d.setDate(d.getDate() + offsetDays);
    return { date: iso(d.getFullYear(), d.getMonth() + 1, d.getDate()), name };
  };

  const list: Holiday[] = [
    ...FIXED.map(h => ({ date: iso(year, h.month, h.day), name: h.name })),
    movable(-3, "Jueves Santo"),
    movable(-2, "Viernes Santo"),
  ].sort((a, b) => a.date.localeCompare(b.date));

  cache.set(year, list);
  return list;
}

/** Holidays falling inside an inclusive date range, across year boundaries. */
export function holidaysBetween(startDate: string, endDate: string): Holiday[] {
  if (!startDate || !endDate || startDate > endDate) return [];

  const firstYear = Number(startDate.slice(0, 4));
  const lastYear  = Number(endDate.slice(0, 4));
  if (!firstYear || !lastYear) return [];

  const out: Holiday[] = [];
  for (let y = firstYear; y <= lastYear; y++) {
    out.push(...peruHolidays(y).filter(h => h.date >= startDate && h.date <= endDate));
  }
  return out;
}

export function isPeruHoliday(date: string): boolean {
  const year = Number(date.slice(0, 4));
  if (!year) return false;
  return peruHolidays(year).some(h => h.date === date);
}
