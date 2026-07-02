/* Fitness model — the numbers behind the projection chart.
   CTL (chronic load / "fitness") and ATL (acute load / "fatigue") are the
   standard exponentially-weighted averages of daily training load; TSB
   ("form") is yesterday's CTL minus ATL. Computed from REAL daily load, then
   projected forward over planned/suggested sessions. */

export interface DayLoad {
  date: string;
  load: number;
}

export interface FitnessPoint {
  date: string;
  ctl: number;
  atl: number;
  tsb: number;
  projected: boolean;
}

const CTL_TAU = 42;
const ATL_TAU = 7;

// Calendar-date math in UTC throughout — parsing local midnight and
// serializing via toISOString() shifts the date back a day on UTC+ servers.
function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Build the CTL/ATL/TSB series across a continuous, ascending daily-load
 *  history, then extend it `horizon` days forward using planned loads. */
export function buildFitnessSeries(
  history: DayLoad[],
  plannedByDate: Map<string, number>,
  horizon: number,
): FitnessPoint[] {
  const out: FitnessPoint[] = [];
  if (history.length === 0) return out;

  // Seed from the first observed day so the curve starts somewhere sane.
  let ctl = history[0]!.load;
  let atl = history[0]!.load;

  for (const { date, load } of history) {
    const tsb = ctl - atl; // form going into today = yesterday's balance
    ctl = ctl + (load - ctl) / CTL_TAU;
    atl = atl + (load - atl) / ATL_TAU;
    out.push({ date, ctl, atl, tsb, projected: false });
  }

  let cursor = history[history.length - 1]!.date;
  for (let i = 0; i < horizon; i++) {
    cursor = addDays(cursor, 1);
    const load = plannedByDate.get(cursor) ?? 0;
    const tsb = ctl - atl;
    ctl = ctl + (load - ctl) / CTL_TAU;
    atl = atl + (load - atl) / ATL_TAU;
    out.push({ date: cursor, ctl, atl, tsb, projected: true });
  }

  return out;
}

/** Readiness (0–100), derived from form (TSB) with a penalty when the
 *  acute:chronic ratio runs hot. A heuristic, not a device metric. */
export function computeReadiness(tsb: number, acr: number): number {
  let r = 55 + tsb * 1.6;
  if (acr > 1.5) r -= (acr - 1.5) * 28;
  if (acr > 0 && acr < 0.8) r -= (0.8 - acr) * 20;
  return Math.max(4, Math.min(98, Math.round(r)));
}

export function readinessVerdict(r: number): string {
  if (r >= 80) return "Primed";
  if (r >= 60) return "Ready";
  if (r >= 40) return "Maintain";
  if (r >= 22) return "Strained";
  return "Depleted";
}

/** Fill a continuous daily-load series (zeros for missing days) so the
 *  EWMA has no gaps. `from`/`to` inclusive, ISO dates. */
export function densifyLoads(
  loadByDate: Map<string, number>,
  from: string,
  to: string,
): DayLoad[] {
  const out: DayLoad[] = [];
  let cursor = from;
  let guard = 0;
  while (cursor <= to && guard < 1000) {
    out.push({ date: cursor, load: loadByDate.get(cursor) ?? 0 });
    cursor = addDays(cursor, 1);
    guard++;
  }
  return out;
}
