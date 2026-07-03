import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { POLLS, type PollFixture } from '@/data/pollFixtures';
import { getTodayET, dateSeed } from '@/lib/dateUtils';

/**
 * Home: Poll of the Day (item #10).
 *
 * Rotation: date-seeded through POLLS using the same convention as every
 * other daily feature on the site (getTodayET() + dateSeed(), see
 * src/lib/dateUtils.ts), so all visitors see the same matchup on the same
 * America/New_York calendar day, and it advances automatically at midnight ET.
 *
 * Voting: one row inserted into public.poll_votes (poll_key, choice). The
 * table isn't in the generated Supabase types (added via direct SQL, same
 * situation as game_completions/poll_votes in src/lib/completions.ts), so it
 * is addressed dynamically via `(supabase.from as any)`.
 *
 * Anti-repeat-vote: a localStorage guard keyed by poll_key remembers which
 * choice this browser already voted for that poll, and skips straight to the
 * results view on mount. This is a courtesy, not a security boundary — RLS
 * still allows anyone to insert, matching the "no accounts required" spirit
 * of the rest of the site.
 *
 * Failure handling: any fetch/insert error is swallowed quietly (matches the
 * silent-catch convention used throughout Index.tsx and useMostPlayed) so a
 * Supabase hiccup never breaks the home page.
 */

const VOTE_KEY_PREFIX = 'dukb-poll-vote-';

interface VoteCounts {
  a: number;
  b: number;
}

function todaysPoll(): PollFixture {
  const idx = dateSeed(getTodayET()) % POLLS.length;
  return POLLS[idx];
}

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
    /* localStorage unavailable (quota/private mode) — not critical */
  }
}

export function PollOfTheDay() {
  const poll = useMemo(todaysPoll, []);
  const [myVote, setMyVote] = useState<'a' | 'b' | null>(null);
  const [counts, setCounts] = useState<VoteCounts | null>(null);
  const [voting, setVoting] = useState(false);
  const [errored, setErrored] = useState(false);

  // On mount / whenever the poll changes: check the local anti-repeat guard.
  // If already voted, jump straight to results (no hooks below this are
  // conditional — this just seeds state, it never returns early).
  useEffect(() => {
    setMyVote(readStoredVote(poll.key));
  }, [poll.key]);

  // Fetch results once the player has voted (either just now or on a prior visit).
  useEffect(() => {
    if (!myVote) return;
    let cancelled = false;

    const loadResults = async () => {
      try {
        // poll_votes isn't in the generated types (added via direct SQL), so
        // it's addressed dynamically like game_completions elsewhere on the site.
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
    return () => { cancelled = true; };
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
      // Never let a tracking failure break the UI — the vote already
      // "landed" from the player's perspective via the optimistic state above.
    } finally {
      setVoting(false);
    }
  };

  const total = counts ? counts.a + counts.b : 0;
  // Show at least a sliver for the side that was picked even with 0 rows yet
  // (e.g. this vote hasn't round-tripped into the SELECT below), so the UI
  // never looks broken with two empty bars right after voting.
  const pctA = total > 0 ? Math.round((counts!.a / total) * 100) : myVote === 'a' ? 100 : 0;
  const pctB = total > 0 ? 100 - pctA : myVote === 'b' ? 100 : 0;

  return (
    <section>
      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-2">
        🗳️ Poll of the Day
      </p>
      <div className="rounded-xl border border-border bg-surface-1 p-4">
        <p className="text-sm font-display font-bold text-foreground mb-3 leading-snug">
          {poll.prompt}
        </p>

        {!myVote ? (
          <div className="grid grid-cols-2 gap-2">
            <PollButton label={poll.a} onClick={() => handleVote('a')} disabled={voting} />
            <PollButton label={poll.b} onClick={() => handleVote('b')} disabled={voting} />
          </div>
        ) : (
          <div className="space-y-2">
            <ResultBar label={poll.a} pct={pctA} isMine={myVote === 'a'} />
            <ResultBar label={poll.b} pct={pctB} isMine={myVote === 'b'} />
            {!errored && (
              <p className="text-[10px] text-muted-foreground text-right pt-0.5">
                {total > 0
                  ? `${total.toLocaleString()} ${total === 1 ? 'vote' : 'votes'}`
                  : 'You\'re the first vote today'}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
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
