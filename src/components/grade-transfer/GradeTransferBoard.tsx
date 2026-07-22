import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Copy } from 'lucide-react';
import { FlagImg } from '@/components/FlagImg';
import { GameNav } from '@/components/game/GameNav';
import { GRADES, type Grade } from '@/lib/fetchTransferGrades';
import { useGradeTransfer } from '@/hooks/useGradeTransfer';

const GRADE_STYLE: Record<Grade, string> = {
  A: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-500',
  B: 'border-lime-500/50 bg-lime-500/10 text-lime-500',
  C: 'border-amber-500/50 bg-amber-500/10 text-amber-500',
  D: 'border-orange-500/50 bg-orange-500/10 text-orange-500',
  F: 'border-destructive/50 bg-destructive/10 text-destructive',
};

export function GradeTransferBoard() {
  const { loading, rounds, index, current, status, score, exact, grade, next, shareText } =
    useGradeTransfer();
  const [copied, setCopied] = useState(false);

  const copyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked */ }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="mx-auto h-6 w-40 animate-pulse rounded bg-muted" />
        <p className="mt-4 text-sm text-muted-foreground">Loading today's transfers…</p>
      </div>
    );
  }

  if (rounds.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">Couldn't load today's transfers. Try again shortly.</p>
        <Link to="/" className="mt-4 inline-block text-sm text-primary hover:underline">
          Back to all games →
        </Link>
      </div>
    );
  }

  if (status === 'finished') {
    return (
      <div className="mx-auto max-w-xl px-4 py-8">
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Today's result
          </p>
          <p className="mt-3 font-display text-5xl font-black text-primary">{score}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            points · {exact}/{rounds.length} graded spot on
          </p>
          <div className="mt-5 flex justify-center gap-1 text-2xl">
            {rounds.map((r, i) => {
              if (!r.userGrade) return <span key={i}>⬜</span>;
              const d = Math.abs(GRADES.indexOf(r.userGrade) - GRADES.indexOf(r.tc.actualGrade));
              return <span key={i}>{d === 0 ? '🟩' : d === 1 ? '🟨' : '🟥'}</span>;
            })}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            🟩 exact · 🟨 one grade off · 🟥 way off
          </p>
          <button
            onClick={copyShare}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied!' : 'Share result'}
          </button>
        </div>

        <div className="mt-6 space-y-2">
          {rounds.map((r, i) => (
            <div key={i} className="rounded-xl border border-border bg-card px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <FlagImg name={r.tc.nationality} size={14} />
                  <span className="truncate font-medium text-foreground">{r.tc.playerName}</span>
                </span>
                <span className="ml-3 shrink-0 text-xs">
                  you: <span className="font-bold text-foreground">{r.userGrade}</span> · real:{' '}
                  <span className="font-bold text-primary">{r.tc.actualGrade}</span>
                </span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {r.tc.fromClub} → {r.tc.toClub} ({r.tc.moveYear}) · €{r.tc.valueAtMove}M → €{r.tc.valueAfter}M
              </p>
            </div>
          ))}
        </div>

        <GameNav currentPath="/grade-transfer" />
      </div>
    );
  }

  if (!current) return null;
  const tc = current.tc;
  const revealed = status === 'revealed';
  const up = tc.pctChange >= 0;

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Transfer {index + 1} of {rounds.length}
        </p>
        <div className="flex gap-1">
          {rounds.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-5 rounded-full ${
                i < index ? 'bg-primary' : i === index ? 'bg-primary/50' : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2">
            <FlagImg name={tc.nationality} size={22} />
            <h2 className="font-display text-2xl font-black text-foreground">{tc.playerName}</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{tc.position}</p>

          <div className="my-5 flex items-center justify-center gap-3 text-sm">
            <span className="max-w-[35%] truncate font-medium text-muted-foreground">{tc.fromClub}</span>
            <ArrowRight className="h-4 w-4 shrink-0 text-primary" />
            <span className="max-w-[35%] truncate font-bold text-foreground">{tc.toClub}</span>
          </div>
          <p className="text-xs text-muted-foreground">{tc.moveYear}</p>

          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Value at the time
            </p>
            <p className="font-display text-4xl font-black text-gold">€{tc.valueAtMove}M</p>
          </div>
        </div>

        {!revealed ? (
          <>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              How did this move work out? Grade it.
            </p>
            <div className="mt-3 grid grid-cols-5 gap-2">
              {GRADES.map(g => (
                <button
                  key={g}
                  onClick={() => grade(g)}
                  className={`rounded-xl border-2 py-4 font-display text-2xl font-black transition-transform hover:scale-105 ${GRADE_STYLE[g]}`}
                >
                  {g}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="mt-6">
            <div className="rounded-xl border border-border bg-background p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Three years later
              </p>
              <p className={`font-display text-3xl font-black ${up ? 'text-emerald-500' : 'text-destructive'}`}>
                €{tc.valueAfter}M
              </p>
              <p className={`text-sm font-semibold ${up ? 'text-emerald-500' : 'text-destructive'}`}>
                {up ? '+' : ''}{tc.pctChange}%
              </p>
            </div>

            <div className="mt-4 flex items-center justify-center gap-6 text-center">
              <div>
                <p className="text-[11px] text-muted-foreground">You said</p>
                <p className="font-display text-3xl font-black text-foreground">{current.userGrade}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Real grade</p>
                <p className="font-display text-3xl font-black text-primary">{tc.actualGrade}</p>
              </div>
              {current.crowd && current.crowd.total > 0 && (
                <div>
                  <p className="text-[11px] text-muted-foreground">Crowd</p>
                  <p className="font-display text-3xl font-black text-gold">{current.crowd.mode}</p>
                  <p className="text-[9px] text-muted-foreground">{current.crowd.total} votes</p>
                </div>
              )}
            </div>

            <button
              onClick={next}
              className="mt-6 w-full rounded-full bg-primary py-3 font-display font-bold text-primary-foreground hover:opacity-90"
            >
              {index + 1 >= rounds.length ? 'See result' : 'Next transfer'}
            </button>
          </div>
        )}
      </div>

      <p className="mt-4 text-center text-[11px] text-muted-foreground">
        Grades are relative to other moves at the same price — an A means it beat comparable transfers,
        not that it was cheap.
      </p>
    </div>
  );
}
