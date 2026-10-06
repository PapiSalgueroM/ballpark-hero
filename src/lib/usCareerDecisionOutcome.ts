import type { UsCareerCore } from '@/lib/usCareerSport';

export interface CareerDecisionChange {
  key: string;
  label: string;
  before: string;
  after: string;
  delta: string | null;
}

export interface CareerDecisionOutcomeData {
  title: string;
  choice: string;
  changes: CareerDecisionChange[];
}

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const amount = (value: number) => Number(value.toFixed(6)).toLocaleString('en-US', { maximumFractionDigits: 6 });
const fields: { key: keyof UsCareerCore; label: string; money?: boolean }[] = [
  { key: 'ovr', label: 'OVR' },
  { key: 'health', label: 'Health' },
  { key: 'morale', label: 'Morale' },
  { key: 'fanbase', label: 'Fanbase' },
  { key: 'pot', label: 'Potential' },
  { key: 'earnings', label: 'Career earnings', money: true },
  { key: 'netWorth', label: 'Cash', money: true },
  { key: 'salary', label: 'Annual salary', money: true },
  { key: 'contractYears', label: 'Contract years' },
  { key: 'yearlyCosts', label: 'Annual upkeep', money: true },
  { key: 'dirtyMoney', label: 'Unexplained money', money: true },
  { key: 'heat', label: 'Heat' },
  { key: 'suspendedSeasons', label: 'Suspended seasons' },
  { key: 'karma', label: 'Karma' },
];

export function buildCareerDecisionOutcome({ title, choice, before, after, teamLabel }: {
  title: string;
  choice: string;
  before: UsCareerCore;
  after: UsCareerCore;
  teamLabel: (team: string, eraId?: string) => string;
}): CareerDecisionOutcomeData {
  const changes: CareerDecisionChange[] = [];
  if (before.team !== after.team) {
    changes.push({
      key: 'team', label: 'Team',
      before: before.team ? teamLabel(before.team, before.eraId) : 'Not recorded',
      after: after.team ? teamLabel(after.team, after.eraId) : 'Not recorded',
      delta: null,
    });
  }
  for (const { key, label, money } of fields) {
    const from = before[key], to = after[key];
    if (from === to || (!finite(from) && !finite(to))) continue;
    const format = (value: unknown) => finite(value) ? money ? `$${amount(value)}M` : amount(value) : 'Not recorded';
    const difference = finite(from) && finite(to) ? to - from : null;
    changes.push({
      key, label, before: format(from), after: format(to),
      delta: difference === null ? null : `${difference > 0 ? '+' : difference < 0 ? '-' : ''}${money ? '$' : ''}${amount(Math.abs(difference))}${money ? 'M' : ''}`,
    });
  }
  return { title, choice, changes };
}
