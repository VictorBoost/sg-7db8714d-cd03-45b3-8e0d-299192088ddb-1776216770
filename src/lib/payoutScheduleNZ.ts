/**
 * Friday Stripe payouts with Wednesday cutoff (Pacific/Auckland).
 *
 * If eligibility happens before Wednesday 00:00 NZ of the week that contains
 * the upcoming Friday payout, use that Friday; otherwise use the following Friday.
 */

export const NZ_TIMEZONE = "Pacific/Auckland";

const MS_DAY = 86400000;

const ymdFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: NZ_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function nzYmd(date: Date): string {
  return ymdFmt.format(date);
}

function weekdayIndexNz(date: Date): number {
  const w = new Intl.DateTimeFormat("en-US", {
    timeZone: NZ_TIMEZONE,
    weekday: "short",
  }).format(date);
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[w.slice(0, 3)] ?? 0;
}

function ymdAddCalendarDays(ymd: string, deltaDays: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + deltaDays));
  return ymdFmt.format(t);
}

function wednesdayYmdSameWeekAsFridayNy(fridayNzYmd: string): string {
  return ymdAddCalendarDays(fridayNzYmd, -2);
}

/** First NZ Friday on or after eligibility's NZ calendar date; then apply Wednesday cutoff. */
export function payoutFridayDateNz(eligibilityUtc: Date): string {
  const eligYmd = nzYmd(eligibilityUtc);

  for (let add = 0; add <= 28; add++) {
    const probe = new Date(eligibilityUtc.getTime() + add * MS_DAY);
    if (weekdayIndexNz(probe) !== 5) continue;
    const probeYmd = nzYmd(probe);
    if (probeYmd < eligYmd) continue;

    const wedYmd = wednesdayYmdSameWeekAsFridayNy(probeYmd);
    // Eligibility must be *before* Wednesday (NZ calendar) of that payout week.
    if (eligYmd.localeCompare(wedYmd) >= 0) continue;

    return probeYmd;
  }

  const fallback = new Date(eligibilityUtc.getTime() + 14 * MS_DAY);
  return nzYmd(fallback);
}

export function todayDateStringNz(now: Date = new Date()): string {
  return nzYmd(now);
}
