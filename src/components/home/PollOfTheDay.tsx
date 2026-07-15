import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { POLLS, type PollFixture } from '@/data/pollFixtures';
import { getPollDayET, dateSeed } from '@/lib/dateUtils';
import { FlagImg, FlagFromEmoji, TextWithFlags } from '@/components/FlagImg';

/**
 * Home: Poll of the Day 3.0.
 *
 * - Polls rotate at NOON Eastern (getPollDayET), so match-day polls show up
 *   the day of the match: e.g. the France vs Morocco quarterfinal poll
 *   appears from 12pm ET on matchday until 12pm ET the next day.
 * - Supports 2-4 options per poll (daily_polls option_c/option_d added for
 *   4-way polls like the Golden Boot race).
 * - Real flag IMAGES via FlagImg (option_*_flag holds a country name), not
 *   emoji — Windows renders flag emoji as bare letter codes, which is what
 *   the owner was seeing ("just showing the abbreviation of the flag").
 * - Voting: one row into public.poll_votes (poll_key, choice in a|b|c|d),
 *   localStorage anti-repeat guard per poll_key (courtesy, not security).
 * - Fallback: if the poll day has no daily_polls rows, deterministically
 *   pick from the legacy POLLS fixture pool so the section never renders
 *   empty.
 */

type ChoiceKey = 'a' | 'b' | 'c' | 'd';
const CHOICE_KEYS: ChoiceKey[] = ['a', 'b', 'c', 'd'];

interface PollOption {
  choice: ChoiceKey;
  label: string;
  emoji: string;
  flag: string; // country name understood by FlagImg, or ''
}

interface PollItem {
  key: string;
  question: string;
  options: PollOption[];
}

const VOTE_KEY_PREFIX = 'dukb-poll-vote-';
const FALLBACK_COUNT = 2;

function readStoredVote(pollKey: string): ChoiceKey | null {
  try {
    const raw = localStorage.getItem(VOTE_KEY_PREFIX + pollKey);
    return raw === 'a' || raw === 'b' || raw === 'c' || raw === 'd' ? raw : null;
  } catch {
    return null;
  }
}

function storeVote(pollKey: string, choice: ChoiceKey): void {
  try {
    localStorage.setItem(VOTE_KEY_PREFIX + pollKey, choice);
  } catch {
    /* localStorage unavailable — not critical */
  }
}

/** Deterministic fallback from the legacy fixture pool (2-option only). */
function fallbackPolls(dateStr: string): PollItem[] {
  const seed = dateSeed(dateStr);
  const items: PollItem[] = [];
  for (let i = 0; i < FALLBACK_COUNT; i++) {
    const idx = (seed + i * 7919) % POLLS.length;
    const fixture: PollFixture = POLLS[idx];
    items.push({
      key: fixture.key,
      question: fixture.prompt,
      options: [
        { choice: 'a', label: fixture.a, emoji: '', flag: '' },
        { choice: 'b', label: fixture.b, emoji: '', flag: '' },
      ],
    });
  }
  return items;
}

export function PollOfTheDay() {
  const pollDay = useMemo(getPollDayET, []);
  const [polls, setPolls] = useState<PollItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadTodaysPolls = async () => {
      try {
        const { data, error } = await (supabase.from as any)('daily_polls')
          .select(
            'poll_key, question, option_a, option_a_emoji, option_a_flag, option_b, option_b_emoji, option_b_flag, option_c, option_c_emoji, option_c_flag, option_d, option_d_emoji, option_d_flag, sort_order',
          )
          .eq('poll_date', pollDay)
          .order('sort_order', { ascending: true });

        if (cancelled) return;

        if (error || !data || data.length === 0) {
          setPolls(fallbackPolls(pollDay));
          return;
        }

        const items: PollItem[] = (data as any[]).map((r) => {
          const options: PollOption[] = [];
          const push = (choice: ChoiceKey, label: unknown, emoji: unknown, flag: unknown) => {
            if (typeof label === 'string' && label.trim().length > 0) {
              options.push({
                choice,
                label: label.trim(),
                emoji: typeof emoji === 'string' ? emoji : '',
                flag: typeof flag === 'string' ? flag : '',
              });
            }
          };
          push('a', r.option_a, r.option_a_emoji, r.option_a_flag);
          push('b', r.option_b, r.option_b_emoji, r.option_b_flag);
          push('c', r.option_c, r.option_c_emoji, r.option_c_flag);
          push('d', r.option_d, r.option_d_emoji, r.option_d_flag);
          return { key: r.poll_key as string, question: r.question as string, options };
        }).filter((p) => p.options.length >= 2);

        setPolls(items.length > 0 ? items : fallbackPolls(pollDay));
      } catch {
        if (!cancelled) setPolls(fallbackPolls(pollDay));
      }
    };

    loadTodaysPolls();
    return () => {
      cancelled = true;
    };
  }, [pollDay]);

  if (!polls || polls.length === 0) return null;

  return (
    <section>
      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-2">
        🗳️ Polls of the Day
      </p>
      <div className="space-y-3">
        {polls.map((poll) => (
          <PollCard key={poll.key} poll={poll} />
        ))}
      </div>
    </section>
  );
}

type VoteCounts = Record<ChoiceKey, number>;

function emptyCounts(): VoteCounts {
  return { a: 0, b: 0, c: 0, d: 0 };
}

function PollCard({ poll }: { poll: PollItem }) {
  const [myVote, setMyVote] = useState<ChoiceKey | null>(null);
  const [counts, setCounts] = useState<VoteCounts | null>(null);
  const [voting, setVoting] = useState(false);
  const [errored, setErrored] = useState(false);

  // Seed the local anti-repeat guard on mount / poll change. Never
  // conditional — hooks always run in the same order.
  useEffect(() => {
    setMyVote(readStoredVote(poll.key));
  }, [poll.key]);

  // Fetch results once the player has voted (now or on a prior visit).
  useEffect(() => {
    if (!myVote) return;
    let cancelled = false;

    const loadResults = async () => {
      try {
        const { data, error } = await (supabase.from as any)('poll_votes')
          .select('choice')
          .eq('poll_key', poll.key);

        if (error || !data) {
          if (!cancelled) setErrored(true);
          return;
        }

        const next = emptyCounts();
        for (const row of data as { choice: string }[]) {
          if (CHOICE_KEYS.includes(row.choice as ChoiceKey)) {
            next[row.choice as ChoiceKey]++;
          }
        }
        if (!cancelled) setCounts(next);
      } catch {
        if (!cancelled) setErrored(true);
      }
    };

    loadResults();
    return () => {
      cancelled = true;
    };
  }, [myVote, poll.key]);

  const handleVote = async (choice: ChoiceKey) => {
    if (myVote || voting) return;
    setVoting(true);

    // Optimistic: lock in immediately so a slow network can't double-fire.
    storeVote(poll.key, choice);
    setMyVote(choice);

    try {
      const { error } = await (supabase.from as any)('poll_votes')
        .insert({ poll_key: poll.key, choice });
      if (error) {
        console.debug('[poll] insert failed (ignored):', error);
      }
    } catch {
      // Never let a tracking failure break the UI.
    } finally {
      setVoting(false);
    }
  };

  const total = counts ? poll.options.reduce((s, o) => s + counts[o.choice], 0) : 0;
  const pctFor = (o: PollOption): number => {
    if (total > 0 && counts) return Math.round((counts[o.choice] / total) * 100);
    return myVote === o.choice ? 100 : 0;
  };

  return (
    <div className="rounded-xl border border-border bg-surface-1 p-4">
      <p className="text-sm font-display font-bold text-foreground mb-3 leading-snug">
        {poll.question}
      </p>

      {!myVote ? (
        <div className="grid grid-cols-2 gap-2">
          {poll.options.map((o) => (
            <PollButton key={o.choice} option={o} onClick={() => handleVote(o.choice)} disabled={voting} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {poll.options.map((o) => (
            <ResultBar key={o.choice} option={o} pct={pctFor(o)} isMine={myVote === o.choice} />
          ))}
          {!errored && (
            <p className="text-[10px] text-muted-foreground text-right pt-0.5">
              {total > 0
                ? `${total.toLocaleString()} ${total === 1 ? 'vote' : 'votes'}`
                : "You're the first vote today"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function OptionLabel({ option, size = 18 }: { option: PollOption; size?: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 min-w-0">
      {option.flag ? (
        <FlagImg name={option.flag} size={size} />
      ) : option.emoji ? (
        <span aria-hidden="true"><FlagFromEmoji emoji={option.emoji} size={size} /></span>
      ) : null}
      <span className="truncate"><TextWithFlags text={option.label} size={size} /></span>
    </span>
  );
}

function PollButton({ option, onClick, disabled }: { option: PollOption; onClick: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg border border-border bg-surface-2 px-3 py-3 text-xs font-semibold text-foreground text-center hover:border-gold/50 hover:bg-surface-3 active:scale-[0.98] transition-all duration-150 disabled:opacity-60 flex items-center justify-center"
    >
      <OptionLabel option={option} />
    </button>
  );
}

function ResultBar({ option, pct, isMine }: { option: PollOption; pct: number; isMine: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2 px-3 py-2 relative overflow-hidden">
      <div
        className={cn(
          'absolute inset-y-0 left-0 rounded-lg transition-[width] duration-700 ease-out',
          isMine ? 'bg-gold/25' : 'bg-muted/40',
        )}
        style={{ width: `${pct}%` }}
        aria-hidden="true"
      />
      <div className="relative flex items-center justify-between gap-2 text-xs">
        <span className={cn('font-semibold truncate flex items-center gap-1', isMine ? 'text-gold' : 'text-foreground')}>
          <OptionLabel option={option} size={16} />
          {isMine && ' ✓'}
        </span>
        <span className="font-bold text-foreground shrink-0">{pct}%</span>
      </div>
    </div>
  );
}

export default PollOfTheDay;
