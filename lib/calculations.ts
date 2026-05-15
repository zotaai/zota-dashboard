export function calculateWorkingDays(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0;

  // Parse as LOCAL date to avoid UTC-offset issues.
  // new Date("YYYY-MM-DD") is treated as UTC midnight which shifts the day
  // backward in negative-offset timezones (e.g. UTC-5 → previous calendar day).
  const parseLocal = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  };

  const start = parseLocal(startDate);
  const end   = parseLocal(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return 0;

  let workingDays = 0;
  const current = new Date(start);
  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) workingDays++;
    current.setDate(current.getDate() + 1);
  }
  return workingDays;
}

export function formatDays(value: number): string {
  const n = Number(value.toFixed(1));
  return n % 1 === 0 ? n.toFixed(0) : n.toString();
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}
