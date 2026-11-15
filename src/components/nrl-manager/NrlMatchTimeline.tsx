import type { NrlPhaseScoring, NrlScoring } from '@/lib/nrlManager';
import { nrlScorePoints } from '@/lib/nrlPlayerScoring';

const scoringLabels = [
  ['tries', 'try', 'tries'],
  ['conversions', 'conversion', 'conversions'],
  ['penalties', 'penalty goal', 'penalty goals'],
  ['fieldGoals', 'field goal', 'field goals'],
  ['longFieldGoals', 'two-point field goal', 'two-point field goals'],
] as const;

type ScoringPair = NrlPhaseScoring['halfTime'];

function PeriodScore({ score, before }: { score: NrlScoring; before?: NrlScoring }) {
  const points = nrlScorePoints(score) - (before ? nrlScorePoints(before) : 0);
  const plays = scoringLabels.flatMap(([kind, single, plural]) => {
    const count = score[kind] - (before?.[kind] ?? 0);
    return count > 0 ? [count + ' ' + (count === 1 ? single : plural)] : [];
  });
  return (
    <td className="break-words px-1 py-2 align-top text-center">
      <strong className="tabular-nums">{points}</strong>
      {plays.length > 0 && <span className="block text-xs text-muted-foreground">{plays.join(', ')}</span>}
    </td>
  );
}

export default function NrlMatchTimeline({ home, away, phases, extra, changes = [] }: {
  home: string; away: string; phases: NrlPhaseScoring; extra?: { label: string; final: ScoringPair }; changes?: string[];
}) {
  const { halfTime, at60, regulation } = phases;
  const rows: { label: string; score: ScoringPair; before?: ScoringPair }[] = [{ label: 'First half', score: halfTime }];
  if (at60) rows.push({ label: '40 to 60 min', score: at60, before: halfTime });
  if (regulation) rows.push({ label: at60 ? '60 to 80 min' : 'Second half', score: regulation, before: at60 ?? halfTime });
  if (extra && regulation) rows.push({ label: extra.label, score: extra.final, before: regulation });
  return (
    <section aria-label="Match timeline" data-nrl-phase-timeline>
      <table className="w-full table-fixed text-left text-sm" data-nrl-score-periods>
        <caption className="pb-1 text-left font-semibold">Match timeline</caption>
        <thead className="text-muted-foreground">
          <tr>
            <th scope="col" className="py-1 pr-2 font-medium">Period</th>
            <th scope="col" className="break-words px-1 text-center font-medium">{home}</th>
            <th scope="col" className="break-words px-1 text-center font-medium">{away}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map(({ label, score, before }) => (
            <tr key={label}>
              <th scope="row" className="py-2 pr-2 align-top font-medium">{label}</th>
              <PeriodScore score={score[0]} before={before?.[0]} />
              <PeriodScore score={score[1]} before={before?.[1]} />
            </tr>
          ))}
        </tbody>
      </table>
      {changes.length > 0 && (
        <ul aria-label="Confirmed interchanges" className="space-y-1 border-t border-border pt-2 text-xs text-muted-foreground">
          {changes.map(change => <li key={change}>{change}</li>)}
        </ul>
      )}
    </section>
  );
}
