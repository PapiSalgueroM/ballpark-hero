import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { POLLS, type PollFixture } from '@/data/pollFixtures';
import { getTodayET, dateSeed } from '@/lib/dateUtils';

/**
 * Home: Poll of the Day 2.0 (item #10 rework).
 *
 * Multiple topical polls per day (matchup hype, GOAT debates, team vs team,
 * athlete vs athlete), sourced from public.daily_polls. Every visitor on the
 * same America/New_York calendar day sees the same set of polls, ordered by
 * sort_order.
 *
 * daily_polls isn't in the generated Supabase types (added via direct SQL,
 * same situation as poll_votes elsewhere on the site), so it is addressed
 * dynamically via `(supabase.from as any)`.
 *
 * Fallback: if today has no rows in daily_polls (pool not seeded that far
 * out, or a fetch error), the section deterministically builds today's polls
 * from the legacy POLLS pool in src/data/pollFixtures.ts using the same
 * date-hash convention as the old single-poll implementation, so the section
 * never goes empty.
 *
 * Voting: one row inserted into public.poll_votes (poll_key, choice) per
 * poll, keyed by each poll's own poll_key. Anti-repeat-vote is a localStorage
 * guard per poll_key, same courtesy-not-security convention as before.
 */

interface PollItem {
  key: string;
  question: string;
  optionA: string;
  optionAEmoji: string;
  optionB: string;
  optionBEmoji: string;
}

interface VoteCounts {
  a: number;
  b: number;
}

const VOTE_KEY_PREFIX = 'dukb-poll-vote-';
const FALLBACK_COUNT = 2;

function readStoredVote(pollKey: string): 'a' | 'b' | null {
  try {
    const raw = localStorage.getItem(VOTE_KEY_PREFIX + pollKey);
    return raw === 'a' || raw === 'b' ? raw : null;
  } catch {
    return null;
  }
}

function storeVote(pollKey: string, choice: 'a' | 'b'): void {
  try {
    localStorage.setItem(VOTE_KEY_PREFIX + pollKey, choice);
  } catch {
    /* localStorage unavailable (quota/private mode) - not critical */
  }
}

/**
 * Deterministic fallback: picks FALLBACK_COUNT polls from the legacy fixture
 * pool using the date seed, so every user on the same ET day still sees the
 * same fallback set, and the section never renders empty.
 */
function fallbackPolls(dateStr: string): PollItem[] {
  const seed = dateSeed(dateStr);
  const items: PollItem[] = [];
  for (let i = 0; i < FALLBACK_COUNT; i++) {
    const idx = (seed + i * 7919) % POLLS.length; // 7919 is prime, spreads picks apart
    const fixture: PollFixture = POLLS[idx];
    items.push({
      key: fixture.key,
      question: fixture.prompt,
      optionA: fixture.a,
      optionAEmoji: '',
      optionB: fixture.b,
      optionBEmoji: '',
    });
  }
  return items;
}

export function PollOfTheDay() {
  const today = useMemo(getTodayET, []);
  const [polls, setPolls] = useState<PollItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadTodaysPolls = async () => {
      try {
        const { data, error } = await (supabase.from as any)('daily_polls')
          .select('poll_key, question, option_a, option_a_emoji, option_b, option_b_emoji, sort_order')
          .eq('poll_date', today)
          .order('sort_order', { ascending: true });

        if (cancelled) return;

        if (error || !data || data.length === 0) {
          setPolls(fallbackPolls(today));
          return;
        }

        const rows = data as {
          poll_key: string;
          question: string;
          option_a: string;
          option_a_emoji: string;
          option_b: string;
          option_b_emoji: string;
        }[];

        setPolls(
          rows.map((r) => ({
            key: r.poll_key,
            question: r.question,
            optionA: r.option_a,
            optionAEmoji: r.option_a_emoji ?? '',
            optionB: r.option_b,
            optionBEmoji: r.option_b_emoji ?? '',
          })),
        );
      } catch {
        if (!cancelled) setPolls(fallbackPolls(today));
      }
    };

    loadTodaysPolls();
    return () => {
      cancelled = true;
    };
  }, [today]);

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

function PollCard({ poll }: { poll: PollItem }) {
  const [myVote, setMyVote] = useState<'a' | 'b' | null>(null);
  const [counts, setCounts] = useState<VoteCounts | null>(null);
  const [voting, setVoting] = useState(false);
  const [errored, setErrored] = useState(false);

  // Seed the local anti-repeat guard on mount / whenever the poll changes.
  // No hooks below this are conditional - this only sets state, it never
  // returns early.
  useEffect(() => {
    setMyVote(readStoredVote(poll.key));
  }, [poll.key]);

  // Fetch results once the player has voted (either just now or on a prior visit).
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

        const next: VoteCounts = { a: 0, b: 0 };
        for (const row of data as { choice: string }[]) {
          if (row.choice === 'a') next.a++;
          else if (row.choice === 'b') next.b++;
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

  const handleVote = async (choice: 'a' | 'b') => {
    if (myVote || voting) return; // already voted, or a vote is in flight
    setVoting(true);

    // Optimistic: lock in the choice + guard immediately so a slow network
    // can't let the same tap double-fire, and the bars render right away.
    storeVote(poll.key, choice);
    setMyVote(choice);

    try {
      const { error } = await (supabase.from as any)('poll_votes')
        .insert({ poll_key: poll.key, choice });
      if (error) {
        console.debug('[poll] insert failed (ignored):', error);
      }
    } catch {
      // Never let a tracking failure break the UI - the vote already
      // "landed" from the player's perspective via the optimistic state above.
    } finally {
      setVoting(false);
    }
  };

  const total = counts ? counts.a + counts.b : 0;
  const pctA = total > 0 ? Math.round((counts!.a / total) * 100) : myVote === 'a' ? 100 : 0;
  const pctB = total > 0 ? 100 - pctA : myVote === 'b' ? 100 : 0;

  const labelA = poll.optionAEmoji ? `${poll.optionAEmoji} ${poll.optionA}` : poll.optionA;
  const labelB = poll.optionBEmoji ? `${poll.optionBEmoji} ${poll.optionB}` : poll.optionB;

  return (
    <div className="rounded-xl border border-border bg-surface-1 p-4">
      <p className="text-sm font-display font-bold text-foreground mb-3 leading-snug">
        {poll.question}
      </p>

      {!myVote ? (
        <div className="grid grid-cols-2 gap-2">
          <PollButton label={labelA} onClick={() => handleVote('a')} disabled={voting} />
          <PollButton label={labelB} onClick={() => handleVote('b')} disabled={voting} />
        </div>
      ) : (
        <div className="space-y-2">
          <ResultBar label={labelA} pct={pctA} isMine={myVote === 'a'} />
          <ResultBar label={labelB} pct={pctB} isMine={myVote === 'b'} />
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

function PollButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg border border-border bg-surface-2 px-3 py-3 text-xs font-semibold text-foreground text-center hover:border-gold/50 hover:bg-surface-3 active:scale-[0.98] transition-all duration-150 disabled:opacity-60"
    >
      {label}
    </button>
  );
}

function ResultBar({ label, pct, isMine }: { label: string; pct: number; isMine: boolean }) {
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
        <span className={cn('font-semibold truncate', isMine ? 'text-gold' : 'text-foreground')}>
          {label}
          {isMine && ' ✓'}
        </span>
        <span className="font-bold text-foreground shrink-0">{pct}%</span>
      </div>
    </div>
  );
}

export default PollOfTheDay;
