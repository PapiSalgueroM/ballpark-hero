import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy, TrendingDown, TrendingUp } from 'lucide-react';
import { FlagImg } from '@/components/FlagImg';
import { GameNav } from '@/components/game/GameNav';
import { useOverratedUnderrated, type Vote } from '@/hooks/useOverratedUnderrated';

function formatValue(millions: number): string {
  return millions >= 1000 ? `€${(millions / 1000).toFixed(1)}B` : `€${millions}M`;
}

function SplitBar({ over, under }: { over: number; under: number }) {
  const total = over + under;
  if (total === 0) {
    return (
      <p className="text-center text-xs text-muted-foreground">
        You're the first to vote on this one.
      </p>
    );
  }
  const overPct = Math.round((over / total) * 100);
  const underPct = 100 - overPct;
  return (
    <div>
      <div className="flex h-8 w-full overflow-hidden rounded-full border border-border">
        {overPct > 0 && (
          <div
            className="flex items-center justify-center bg-destructive/80 text-xs font-bold text-destructive-foreground transition-all"
            style={{ width: `${overPct}%` }}
          >
            {overPct >= 15 && `${overPct}%`}
          </div>
        )}
        {underPct > 0 && (
          <div
            className="flex items-center justify-center bg-primary/80 text-xs font-bold text-primary-foreground transition-all"
            style={{ width: `${underPct}%` }}
          >
            {underPct >= 15 && `${underPct}%`}
          </div>
        )}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
        <span>Overrated</span>
        <span>
          {total} vote{total === 1 ? '' : 's'}
        </span>
        <span>Underrated</span>
      </div>
    </div>
  );
}

export function OverratedBoard() {
  const { loading, rounds, index, current, status, contrarianCount, vote, next, shareText } =
    useOverratedUnderrated();
  const [copied, setCopied] = useState(false);

  const copyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked, the text is on screen to copy by hand */ }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="mx-auto h-6 w-40 animate-pulse rounded bg-muted" />
        <p className="mt-4 text-sm text-muted-foreground">Loading today's players…</p>
      </div>
    );
  }

  if (rounds.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          Couldn't load today's players. Please try again shortly.
        </p>
        <Link to="/" className="mt-4 inline-block text-sm text-primary hover:underline">
          Back to all games →
        </Link>
      </div>
    );
  }

  // ---- Finished summary ----
  if (status === 'finished') {
    const label =
      contrarianCount >= 7 ? 'Certified contrarian'
      : contrarianCount >= 4 ? 'Free thinker'
      : contrarianCount >= 2 ? 'Mostly with the crowd'
      : 'One of the sheep';

    return (
      <div className="mx-auto max-w-xl px-4 py-8">
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Today's result
          </p>
          <p className="mt-3 font-display text-5xl font-black text-primary">
            {contrarianCount}/{rounds.length}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">times against the crowd</p>
          <p className="mt-4 font-display text-2xl font-bold text-foreground">{label}</p>

          <div className="mt-6 flex justify-center gap-1 text-2xl">
            {rounds.map((r, i) => {
              if (!r.userVote || !r.community || r.community.total === 0) return <span key={i}>⬜</span>;
              const majority: Vote = r.community.over >= r.community.under ? 'over' : 'under';
              return <span key={i}>{r.userVote === majority ? '🟩' : '🟪'}</span>;
            })}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            🟩 with the crowd · 🟪 against it
          </p>

          <button
            onClick={copyShare}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied!' : 'Share result'}
          </button>
        </div>

        <div className="mt-6 space-y-2">
          {rounds.map((r, i) => {
            const total = r.community?.total ?? 0;
            const overPct = total > 0 ? Math.round((r.community!.over / total) * 100) : null;
            return (
              <div
                key={i}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-2.5 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <FlagImg name={r.player.nationality} size={16} />
                  <span className="truncate font-medium text-foreground">{r.player.name}</span>
                </span>
                <span className="ml-3 shrink-0 text-xs text-muted-foreground">
                  you: <span className="font-semibold text-foreground">{r.userVote ?? '—'}</span>
                  {overPct !== null && <> · crowd: {overPct}% over</>}
                </span>
              </div>
            );
          })}
        </div>

        <GameNav currentPath="/overrated-underrated" />
      </div>
    );
  }

  // ---- Voting / reveal ----
  if (!current) return null;
  const p = current.player;
  const revealed = status === 'revealed';

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Player {index + 1} of {rounds.length}
        </p>
        <div className="flex gap-1">
          {rounds.map((r, i) => (
            <span
              key={i}
              className={`h-1.5 w-4 rounded-full ${
                i < index ? 'bg-primary' : i === index ? 'bg-primary/50' : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2">
            <FlagImg name={p.nationality} size={24} />
            <h2 className="font-display text-2xl font-black text-foreground">{p.name}</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {p.club} · {p.position} · {p.age > 0 ? `${p.age}y` : '—'}
          </p>

          <div className="my-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Market value
            </p>
            <p className="font-display text-4xl font-black text-gold">{formatValue(p.valueMillions)}</p>
          </div>

          {(p.matches > 0 || p.goals > 0 || p.assists > 0) && (
            <div className="mb-2 flex justify-center gap-5 text-xs text-muted-foreground">
              <span>{p.matches} apps</span>
              <span>{p.goals} goals</span>
              <span>{p.assists} assists</span>
            </div>
          )}
        </div>

        {!revealed ? (
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              onClick={() => vote('over')}
              className="flex flex-col items-center gap-1 rounded-xl border-2 border-destructive/40 bg-destructive/5 py-4 font-display font-bold text-destructive transition-colors hover:bg-destructive/15"
            >
              <TrendingDown className="h-5 w-5" />
              Overrated
            </button>
            <button
              onClick={() => vote('under')}
              className="flex flex-col items-center gap-1 rounded-xl border-2 border-primary/40 bg-primary/5 py-4 font-display font-bold text-primary transition-colors hover:bg-primary/15"
            >
              <TrendingUp className="h-5 w-5" />
              Underrated
            </button>
          </div>
        ) : (
          <div className="mt-6">
            <p className="mb-3 text-center text-sm">
              You said{' '}
              <span
                className={`font-bold ${
                  current.userVote === 'over' ? 'text-destructive' : 'text-primary'
                }`}
              >
                {current.userVote === 'over' ? 'Overrated' : 'Underrated'}
              </span>
            </p>
            <SplitBar over={current.community?.over ?? 0} under={current.community?.under ?? 0} />
            <button
              onClick={next}
              className="mt-6 w-full rounded-full bg-primary py-3 font-display font-bold text-primary-foreground transition-opacity hover:opacity-90"
            >
              {index + 1 >= rounds.length ? 'See result' : 'Next player'}
            </button>
          </div>
        )}
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        There's no right answer, it's a vote. The fun is finding out where you sit.
      </p>
    </div>
  );
}
