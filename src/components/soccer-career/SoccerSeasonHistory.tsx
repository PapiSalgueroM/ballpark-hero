import type { CareerState } from "@/lib/soccerCareerEngine";
import { compareSavedSeasons, seasonHistoryRows, type SeasonHistoryRow } from "@/lib/soccerCareerSeasonHistory";

type Source = Pick<CareerState, "seasons" | "position">;
const selectClass = "min-h-11 w-full min-w-0 rounded-xl border border-border bg-card px-2 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
const yearLabel = (year: number | null) => year === null ? "Year not recorded" : `${year}/${String((year + 1) % 100).padStart(2, "0")}`;
const optionLabel = (row: SeasonHistoryRow) => `${yearLabel(row.year)} · ${row.club ?? "Club not recorded"} (record ${row.index + 1})`;
const numberLabel = (value: number | null, digits = 0, signed = false) => value === null ? "Not recorded" : `${signed && value > 0 ? "+" : ""}${value.toFixed(digits)}`;

function SeasonIdentity({ row, side }: { row: SeasonHistoryRow; side: "first" | "second" }) {
  return <div data-season-history-side={side} className="min-w-0 rounded-xl border border-border p-2 text-xs">
    <p className="font-bold">{yearLabel(row.year)}</p>
    <p className="break-words">{row.club ?? "Club not recorded"}</p>
    <p className="text-muted-foreground">{row.age === null ? "Age not recorded" : `Age ${row.age}`}</p>
    {row.onLoanFrom && <p className="break-words text-muted-foreground">On loan from {row.onLoanFrom}</p>}
  </div>;
}

function injuryLabel(saved: SeasonHistoryRow["availability"]) {
  return !saved.injuryRecorded ? "Not recorded" : saved.injury ?? "No injury recorded";
}
function suspensionLabel(matches: number | null) {
  return matches === null ? "Not recorded" : `${matches} club ${matches === 1 ? "match" : "matches"} missed`;
}

export function SeasonAvailabilitySummary({ rows }: { rows: SeasonHistoryRow[] }) {
  return <div className="space-y-2">
    <h4 className="text-sm font-bold">All saved senior seasons</h4>
    <ul aria-label="Recorded availability by season" className="grid grid-cols-2 gap-2">
      {[...rows].reverse().map(row => <li key={row.index} data-season-availability-summary={row.index} className="min-w-0 rounded-xl border border-border p-2 text-xs space-y-1">
        <p data-availability-summary-field="year" className="font-bold">{yearLabel(row.year)}</p>
        <p data-availability-summary-field="club" className="break-words">{row.club ?? "Club not recorded"}</p>
        {row.onLoanFrom && <p className="break-words text-muted-foreground">Loan from {row.onLoanFrom}</p>}
        <p className="break-words"><span className="text-muted-foreground">Injury: </span><span data-availability-summary-field="injury">{injuryLabel(row.availability)}</span></p>
        <p className="break-words"><span className="text-muted-foreground">Suspension: </span><span data-availability-summary-field="suspension">{suspensionLabel(row.availability.suspensionMatches)}</span></p>
      </li>)}
    </ul>
  </div>;
}
export default function SoccerSeasonHistory({ career, mode, first, second, availability, onFirst, onSecond, onAvailability }: {
  career: Source; mode: "compare" | "availability"; first: number; second: number; availability: number;
  onFirst: (index: number) => void; onSecond: (index: number) => void; onAvailability: (index: number) => void;
}) {
  const rows = seasonHistoryRows(career);
  const choices = [...rows].reverse();
  if (mode === "compare") {
    const comparison = compareSavedSeasons(career, first, second);
    if (!comparison) return <p className="text-sm text-muted-foreground">Choose two different saved senior seasons to compare.</p>;
    return <div className="space-y-3" data-season-history-comparison>
      <p className="text-xs text-muted-foreground">Change is the second season minus the first. These are your saved club numbers.</p>
      <div className="grid grid-cols-2 gap-2">
        {([{ side: "first", label: "First season", value: first, other: second, change: onFirst }, { side: "second", label: "Second season", value: second, other: first, change: onSecond }] as const).map(choice => <label key={choice.side} className="min-w-0 space-y-1 text-xs font-semibold">
          <span className="block">{choice.label}</span>
          <select aria-label={choice.label} data-season-history-select={choice.side} className={selectClass} value={choice.value} onChange={event => choice.change(Number(event.target.value))}>
            {choices.filter(row => row.index !== choice.other).map(row => <option key={row.index} value={row.index}>{optionLabel(row)}</option>)}
          </select>
        </label>)}
      </div>
      <button type="button" data-season-history-swap className={`${selectClass} font-bold`} onClick={() => { onFirst(second); onSecond(first); }}>Swap seasons</button>
      <div className="grid grid-cols-2 gap-2"><SeasonIdentity row={comparison.first} side="first" /><SeasonIdentity row={comparison.second} side="second" /></div>
      <div className="grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground"><span>First season</span><span>Second season</span><span>Change</span></div>
      <dl className="space-y-2">
        {comparison.metrics.map(metric => <div key={metric.key} data-season-history-stat={metric.key} className="rounded-xl bg-muted/25 p-2">
          <dt className="mb-1 text-xs text-muted-foreground">{metric.label}</dt>
          <div className="grid grid-cols-3 gap-2 text-center text-sm font-bold tabular-nums">
            <dd data-season-history-value="first" className="min-w-0 break-words">{numberLabel(metric.first, metric.digits)}</dd>
            <dd data-season-history-value="second" className="min-w-0 break-words">{numberLabel(metric.second, metric.digits)}</dd>
            <dd data-season-history-value="delta" className="min-w-0 break-words">{numberLabel(metric.delta, metric.digits, true)}</dd>
          </div>
        </div>)}
      </dl>
    </div>;
  }
  const selected = rows.find(row => row.index === availability);
  if (!selected) return <p className="text-sm text-muted-foreground">No saved senior seasons yet. Availability will show up here when one is recorded.</p>;
  const saved = selected.availability;
  const fields = [
    { key: "apps", label: "Appearances", value: numberLabel(saved.apps) },
    { key: "injury", label: "Injury", value: injuryLabel(saved) },
    { key: "weeks", label: "Recorded injury weeks", value: saved.injuryWeeks === null ? "Not recorded" : `${saved.injuryWeeks} ${saved.injuryWeeks === 1 ? "week" : "weeks"}` },
    { key: "severity", label: "Serious injury", value: saved.injurySevere === null ? "Not recorded" : saved.injurySevere ? "Serious injury recorded" : "No serious injury recorded" },
    { key: "suspension", label: "Missed through suspension", value: suspensionLabel(saved.suspensionMatches) },
    { key: "reason", label: "Recorded availability", value: saved.zeroAppsReason ?? (saved.apps === null ? "Appearances not recorded" : "Appearances recorded") },
  ];
  return <div className="space-y-3" data-season-availability={selected.index}>
    <label className="block space-y-1 text-xs font-semibold"><span className="block">Availability season</span>
      <select aria-label="Availability season" data-season-history-select="availability" className={selectClass} value={availability} onChange={event => onAvailability(Number(event.target.value))}>
        {choices.map(row => <option key={row.index} value={row.index}>{optionLabel(row)}</option>)}
      </select>
    </label>
    <p className="text-sm font-bold break-words">{yearLabel(selected.year)} · {selected.club ?? "Club not recorded"}</p>
    {selected.onLoanFrom && <p className="text-xs text-muted-foreground break-words">On loan from {selected.onLoanFrom}</p>}
    <p className="text-xs text-muted-foreground">Only what this save kept. Injury weeks and suspension matches stay separate.</p>
    <dl className="space-y-2">{fields.map(field => <div key={field.key} className="rounded-xl bg-muted/25 p-3">
      <dt className="text-xs text-muted-foreground">{field.label}</dt><dd data-season-availability-field={field.key} className="mt-1 text-sm font-bold break-words">{field.value}</dd>
    </div>)}</dl>
    <SeasonAvailabilitySummary rows={rows} />
  </div>;
}
