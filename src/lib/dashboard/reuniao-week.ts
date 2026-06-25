/**
 * Semana comercial da Reunião de Terça: terça 00:00 → segunda seguinte inclusive
 * (a próxima terça 00:00 abre a semana seguinte).
 */

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatLocalIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function parseLocalYmd(ymd: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(d.getDate() + days);
  return next;
}

export function tuesdayOfReuniaoWeek(ref: Date): Date {
  const local = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const daysSinceTuesday = (local.getDay() - 2 + 7) % 7;
  local.setDate(local.getDate() - daysSinceTuesday);
  return local;
}

export function currentReuniaoTuesdayIso(ref: Date = new Date()): string {
  return formatLocalIsoDate(tuesdayOfReuniaoWeek(ref));
}

export function reuniaoWeekEndIso(tuesdayStartIso: string): string {
  const tue = parseLocalYmd(tuesdayStartIso);
  if (!tue) return tuesdayStartIso;
  return formatLocalIsoDate(addDays(tue, 6));
}

export type ReuniaoWeekBounds = {
  from: string;
  to: string;
  fullEnd: string;
};

export function getReuniaoWeekBounds(
  tuesdayStartIso: string,
  reference = new Date(),
): ReuniaoWeekBounds {
  const tue = parseLocalYmd(tuesdayStartIso);
  if (!tue) {
    return { from: tuesdayStartIso, to: tuesdayStartIso, fullEnd: tuesdayStartIso };
  }
  const mon = addDays(tue, 6);
  const fullEnd = formatLocalIsoDate(mon);
  const today = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  const to = today.getTime() < mon.getTime() ? formatLocalIsoDate(today) : fullEnd;
  return {
    from: formatLocalIsoDate(tue),
    to,
    fullEnd,
  };
}

export function isCurrentReuniaoWeek(tuesdayStartIso: string, reference = new Date()): boolean {
  return tuesdayStartIso === currentReuniaoTuesdayIso(reference);
}

export function previousReuniaoTuesdayIso(ref: Date = new Date()): string {
  return addWeeksToReuniaoTuesday(currentReuniaoTuesdayIso(ref), -1);
}

export function plannedDateWithinReuniaoWeek(plannedIso: string, tuesdayStartIso: string): boolean {
  const planned = parseLocalYmd(plannedIso);
  const tue = parseLocalYmd(tuesdayStartIso);
  if (!planned || !tue) return false;
  const mon = addDays(tue, 6);
  const start = tue.getTime();
  const end = mon.getTime();
  const t = planned.getTime();
  return t >= start && t <= end;
}

export function addWeeksToReuniaoTuesday(tuesdayStartIso: string, deltaWeeks: number): string {
  const dt = parseLocalYmd(tuesdayStartIso);
  if (!dt) return tuesdayStartIso;
  dt.setDate(dt.getDate() + deltaWeeks * 7);
  return formatLocalIsoDate(dt);
}

export function reuniaoWeekRangeLabel(tuesdayStartIso: string): string {
  const tue = parseLocalYmd(tuesdayStartIso);
  if (!tue) return "—";
  const mon = addDays(tue, 6);
  const fmt = (d: Date) => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;
  return `${fmt(tue)} – ${fmt(mon)}`;
}

export function weeklyActionsWeekStartFromReuniao(tuesdayStartIso: string): string {
  const tue = parseLocalYmd(tuesdayStartIso);
  if (!tue) return tuesdayStartIso;
  return formatLocalIsoDate(addDays(tue, -1));
}
