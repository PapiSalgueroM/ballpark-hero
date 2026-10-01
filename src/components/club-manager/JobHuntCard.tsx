import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { TIER_INFO, applyTargets, applicationOdds, jobApplyRefusal, money } from '@/lib/clubManager';
import type { CareerState, ApplyTarget } from '@/lib/clubManager';
import { ANSWER_MAX_MATCHES, APPLICATIONS_PER_SEASON, applicationsLeft, cooldownUntil, jobHuntOf, oddsWord } from '@/lib/clubManagerJobHunt';

/**
 * Round 783: the job hunt on the Manager panel. One small tile that opens a
 * picker (league chips, then club tiles, then a confirm sheet, each step with
 * its own back button, the tile rule), and the status card for whatever is in
 * flight: an application out, a club's yes waiting on you, or a summer move
 * booked. Every number here is the engine's: applicationOdds is the exact
 * figure the club will decide on, read today.
 */
export default function JobHuntCard({ c, onApply, onJoinNow, onJoinSummer }: {
  c: CareerState;
  onApply: (club: string) => void;
  onJoinNow: () => void;
  onJoinSummer: () => void;
}) {
  const hunt = jobHuntOf(c);
  const [picking, setPicking] = useState(false);
  const [leagueId, setLeagueId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ApplyTarget | null>(null);
  /* The world's clubs, built only while the picker is open: 330 lookups is
     nothing once, and nothing at all when the card is a status line. */
  const targets = useMemo(() => (picking ? applyTargets(c) : []), [picking, c]);
  const leagues = useMemo(() => {
    const seen = new Map<string, string>();
    for (const t of targets) if (!seen.has(t.leagueId)) seen.set(t.leagueId, t.league);
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [targets]);
  const chosenLeague = leagueId && leagues.some(l => l.id === leagueId) ? leagueId : leagues[0]?.id ?? null;
  const clubs = targets.filter(t => t.leagueId === chosenLeague);
  const left = applicationsLeft(c);
  /* The engine's own refusal, asked about no club in particular (no club is
     called '', so neither the own club nor a cooldown can answer), which is
     every rule that shuts the whole tile: a pre-agreement, an approach
     waiting on you, the season's three, too few league games left. */
  const block = jobApplyRefusal(c, '');

  const open = hunt.open;
  if (open && open.status === 'accepted') {
    return (
      <div data-job-hunt="accepted" className="bg-card border border-primary/50 rounded-xl p-3 mb-2">
        <div className="text-[10px] text-primary uppercase tracking-wider mb-1.5 font-bold">✅ {open.club} said yes</div>
        <p className="text-sm text-foreground font-bold mb-0.5">The job is yours. When do you start?</p>
        <p className="text-[10px] text-muted-foreground mb-2">
          Join now and their season so far is simulated under the manager before you, like a takeover, and your record only counts the games you pick a team for. Join in the summer and you see this season out at {c.clubName} first, with your board knowing you are leaving.
        </p>
        <div className="flex gap-2">
          <button
            onClick={onJoinNow}
            className="flex-1 min-h-[44px] py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity"
          >
            🧳 Join {open.club} now
          </button>
          <button
            onClick={onJoinSummer}
            className="flex-1 min-h-[44px] py-2 rounded-lg border border-border bg-card text-xs font-bold text-foreground hover:border-primary transition-colors"
          >
            🗓️ Join in the summer
          </button>
        </div>
      </div>
    );
  }

  if (open) {
    return (
      <div data-job-hunt="pending" className="bg-card border border-border rounded-xl p-3 mb-2 text-xs text-foreground">
        📨 <span className="font-bold">Application in at {open.club}.</span> They answer within about {open.matchesLeft} more match day{open.matchesLeft === 1 ? '' : 's'}. One application at a time.
      </div>
    );
  }

  if (hunt.summerMove) {
    return (
      <div data-job-hunt="summer" className="bg-card border border-gold/40 rounded-xl p-3 mb-2 text-xs text-foreground">
        🧳 <span className="font-bold">Agreed:</span> you take over at <span className="font-bold">{hunt.summerMove.club}</span> when the season ends. Finish the job here first.
      </div>
    );
  }

  if (!picking || block) {
    const blocked = block !== null;
    return (
      <button
        data-job-hunt="tile"
        disabled={blocked}
        onClick={() => { setPicking(true); setConfirm(null); }}
        className={cn(
          'w-full text-left bg-card border border-border rounded-xl p-3 mb-2 transition-all',
          blocked ? 'opacity-60' : 'hover:border-primary hover:-translate-y-0.5',
        )}
      >
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">📨 Apply for a job</div>
        <div className="text-sm font-bold text-foreground">Fancy a move? Write to a club.</div>
        <div className="text-[10px] text-muted-foreground mt-0.5">
          {block === 'committed'
            ? 'Not while a summer pre-agreement is on the table.'
            : block === 'approach'
              ? `Answer the ${c.approach?.club ?? 'other club'} approach first.`
              : block === 'limit'
                ? `All ${APPLICATIONS_PER_SEASON} applications used this season.`
                : block === 'late'
                  ? `Too late this season. A club needs up to ${ANSWER_MAX_MATCHES} league games to answer, so write again next season.`
                  : `${left} of ${APPLICATIONS_PER_SEASON} left this season. They answer in two to five match days.`}
        </div>
      </button>
    );
  }

  if (confirm) {
    const odds = applicationOdds(c, confirm.club);
    return (
      <div data-job-hunt="confirm" className="bg-card border border-primary/50 rounded-xl p-3 mb-2">
        <div className="text-[10px] text-primary uppercase tracking-wider mb-1.5 font-bold">📨 Apply to {confirm.club}?</div>
        <p className="text-[11px] text-muted-foreground mb-1">
          {TIER_INFO[confirm.tier]?.emoji} {TIER_INFO[confirm.tier]?.label} club · {confirm.league} · {money(confirm.budget, c)} budget
          {confirm.pos !== null && confirm.clubs !== null ? ` · ${confirm.pos}${ordinalSuffix(confirm.pos)} of ${confirm.clubs} right now` : ''}
        </p>
        <p className="text-xs text-foreground mb-2">
          Your read on it: <span className="font-bold">{oddsWord(odds)}</span>. They weigh your standing, the gap between the two clubs and how their own season is going, and they take two to five match days to answer. {left} of {APPLICATIONS_PER_SEASON} applications left this season.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => { onApply(confirm.club); setConfirm(null); setPicking(false); }}
            className="flex-1 min-h-[44px] py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity"
          >
            Send it
          </button>
          <button
            onClick={() => setConfirm(null)}
            className="flex-1 min-h-[44px] py-2 rounded-lg border border-border bg-card text-xs font-bold text-foreground hover:border-primary transition-colors"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div data-job-hunt="picker" className="bg-card border border-border rounded-xl p-3 mb-2">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">📨 Pick a club to write to</div>
        <button onClick={() => setPicking(false)} className="min-h-[32px] px-2 text-[11px] font-bold text-muted-foreground hover:text-foreground">← Back</button>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-2" role="group" aria-label="League">
        {leagues.map(l => (
          <button
            key={l.id}
            aria-pressed={l.id === chosenLeague}
            onClick={() => setLeagueId(l.id)}
            className={cn('min-h-[32px] px-2 rounded-lg text-[10px] font-bold border', l.id === chosenLeague ? 'bg-gold/10 border-gold/40 text-gold' : 'bg-card border-border text-muted-foreground')}
          >
            {l.name}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
        {clubs.map(t => {
          const until = cooldownUntil(c, t.club);
          return (
            <button
              key={t.club}
              disabled={until !== null}
              onClick={() => setConfirm(t)}
              className={cn(
                'min-h-[44px] rounded-lg border p-2 text-left transition-colors',
                until !== null ? 'border-border/40 bg-secondary/30 opacity-60' : 'border-border bg-card hover:border-primary',
              )}
            >
              <div className="text-[11px] font-bold text-foreground truncate">{t.club}</div>
              <div className="text-[9px] text-muted-foreground truncate">
                {until !== null
                  ? `Said no · back in season ${until + 1}`
                  : `${TIER_INFO[t.tier]?.emoji ?? ''} ${TIER_INFO[t.tier]?.label ?? ''}${t.pos !== null ? ` · ${t.pos}${ordinalSuffix(t.pos)}` : ''} · ${oddsWord(applicationOdds(c, t.club))}`}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ordinalSuffix(n: number): string {
  const rem = n % 100;
  if (rem >= 11 && rem <= 13) return 'th';
  return n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th';
}
