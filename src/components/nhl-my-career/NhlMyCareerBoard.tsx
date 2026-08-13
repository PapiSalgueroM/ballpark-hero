import { useCallback, useEffect, useState } from 'react';
import { Crown, Dumbbell, RotateCcw, Sparkles } from 'lucide-react';
import ShareButtons from '@/components/game/ShareButtons';
import {
  NHL_ARCHETYPES, startNhlCareer, simNhlSeason, nhlProgress, drawNhlEvent,
  nhlShouldRetire, nhlLegacyOf, nhlCareerTotals, nhlRollTeamQuality, nhlTeamLabelOf, nhlMarketSalary,
  type NhlCareerPos, type NhlCareerState, type NhlCareerEvent, type NhlSeasonLine,
} from '@/lib/nhlMyCareer';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { cn } from '@/lib/utils';

type Phase = 'create' | 'season' | 'event' | 'retired';

const SAVE_KEY = 'nhl-my-career-save-v1';

interface SaveShape { c: NhlCareerState; phase: Phase; teamQuality: number | null }

export default function NhlMyCareerBoard() {
  const [phase, setPhase] = useState<Phase>('create');
  const [career, setCareer] = useState<NhlCareerState | null>(null);
  const [teamQuality, setTeamQuality] = useState<number | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [pos, setPos] = useState<NhlCareerPos>('C');
  const [archetypeId, setArchetypeId] = useState(NHL_ARCHETYPES.C[0].id);
  const [feed, setFeed] = useState<string[]>([]);
  const [pendingEvent, setPendingEvent] = useState<NhlCareerEvent | null>(null);
  const [lastLine, setLastLine] = useState<NhlSeasonLine | null>(null);

  const done = phase === 'retired';
  useGameCompletion('nhl-my-career', done, career ? nhlLegacyOf(career).score : 0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw) as SaveShape;
      if (!s.c) return;
      setCareer(s.c);
      setTeamQuality(s.teamQuality);
      setPhase(s.c.retired ? 'retired' : 'season');
    } catch { /* fresh */ }
  }, []);

  const persist = useCallback((c: NhlCareerState, ph: Phase, tq: number | null) => {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ c, phase: ph, teamQuality: tq } satisfies SaveShape)); } catch { /* full */ }
  }, []);

  const create = () => {
    const arch = NHL_ARCHETYPES[pos].find(a => a.id === archetypeId) ?? NHL_ARCHETYPES[pos][0];
    const c = startNhlCareer(nameInput.trim() || 'Gordie Blaze', pos, arch);
    const tq = nhlRollTeamQuality(null, Math.random);
    setCareer(c);
    setTeamQuality(tq);
    setFeed([
      `🎓 With pick ${c.draftPick}, the ${nhlTeamLabelOf(c.team)} select ${c.name}.`,
      c.draftPick <= 10 ? 'The city expects a savior.' : c.draftPick <= 32 ? 'First round money, first round pressure.' : 'Late pick. Everything must be earned.',
    ]);
    setPhase('season');
    persist(c, 'season', tq);
  };

  const playSeason = () => {
    if (!career || teamQuality == null) return;
    const c: NhlCareerState = JSON.parse(JSON.stringify(career));
    const { line, notes } = simNhlSeason(c, teamQuality, Math.random);
    const progressNotes = nhlProgress(c, Math.random);
    setLastLine(line);
    const newFeed = [...notes, ...progressNotes];
    if (nhlShouldRetire(c)) {
      c.retired = true;
      setCareer(c);
      setFeed(newFeed);
      setPhase('retired');
      persist(c, 'retired', teamQuality);
      return;
    }
    const ev = drawNhlEvent(c, Math.random);
    setPendingEvent(ev);
    setCareer(c);
    setFeed(newFeed);
    setPhase('event');
    persist(c, 'event', teamQuality);
  };

  const chooseOption = (idx: number) => {
    if (!career || !pendingEvent) return;
    const c: NhlCareerState = JSON.parse(JSON.stringify(career));
    const outcome = pendingEvent.options[idx].apply(c, Math.random);
    const tq = nhlRollTeamQuality(teamQuality, Math.random);
    setTeamQuality(tq);
    setCareer(c);
    setFeed(f => [outcome, ...f].slice(0, 6));
    setPendingEvent(null);
    setPhase('season');
    persist(c, 'season', tq);
  };

  const retireNow = () => {
    if (!career) return;
    const c: NhlCareerState = JSON.parse(JSON.stringify(career));
    c.retired = true;
    setCareer(c);
    setPhase('retired');
    persist(c, 'retired', teamQuality);
  };

  const reset = () => {
    localStorage.removeItem(SAVE_KEY);
    setCareer(null);
    setPhase('create');
    setFeed([]);
    setLastLine(null);
    setPendingEvent(null);
  };

  const statLine = (s: NhlSeasonLine, p: NhlCareerPos) =>
    p === 'G' ? `${s.wins} W, .${String(Math.round((s.svpct ?? 0.9) * 1000))} SV%`
      : `${s.goals} G, ${s.assists} A, ${s.points} P`;

  /* ------------------------------ create ------------------------------ */
  if (phase === 'create' || !career) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <p className="font-display text-lg font-bold text-foreground">Create your player</p>
          <p className="mt-1 text-xs text-muted-foreground">
            You are a fictional prospect entering the real league. Position and archetype shape your
            whole career: growth, injuries, money, legacy. Saves automatically.
          </p>
        </div>
        <div className="mx-auto max-w-md space-y-3">
          <input
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            placeholder="Your player's name"
            maxLength={24}
            className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <div className="flex items-center justify-center gap-1 rounded-full bg-secondary p-1">
            {(['C', 'W', 'D', 'G'] as NhlCareerPos[]).map(p => (
              <button
                key={p}
                onClick={() => { setPos(p); setArchetypeId(NHL_ARCHETYPES[p][0].id); }}
                className={cn('flex-1 rounded-full px-4 py-1.5 text-sm font-bold', pos === p ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground')}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="grid gap-1.5">
            {NHL_ARCHETYPES[pos].map(a => (
              <button
                key={a.id}
                onClick={() => setArchetypeId(a.id)}
                className={cn(
                  'rounded-xl border-2 px-3 py-2 text-left',
                  archetypeId === a.id ? 'border-gold bg-gold/10' : 'border-border bg-card hover:border-primary/50',
                )}
              >
                <span className="block text-sm font-bold text-foreground">{a.label}</span>
                <span className="block text-[11px] text-muted-foreground">{a.desc}</span>
              </button>
            ))}
          </div>
          <button
            onClick={create}
            className="w-full rounded-full bg-primary px-8 py-3 text-sm font-bold text-primary-foreground hover:opacity-90"
          >
            Enter the draft
          </button>
        </div>
      </div>
    );
  }

  const totals = nhlCareerTotals(career);
  const legacy = nhlLegacyOf(career);

  /* ------------------------------ retired ------------------------------ */
  if (phase === 'retired') {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-gold/50 bg-card p-5 text-center">
          <Crown className="mx-auto h-10 w-10 text-gold" />
          <p className="mt-2 font-display text-2xl font-black text-foreground">{career.name} retires</p>
          <p className="mt-1 text-sm font-semibold text-gold">{legacy.verdict}</p>
          <div className="mt-3 space-y-1 text-xs text-muted-foreground">
            {legacy.bullets.map((b, i) => <p key={i}>{b}</p>)}
          </div>
          <div className="mt-3 flex items-center justify-center gap-3 text-sm">
            <span className="rounded-full border border-border bg-background px-3 py-1.5">Legacy <b className="text-gold">{legacy.score}</b></span>
            <span className="rounded-full border border-border bg-background px-3 py-1.5">{legacy.hof ? '🏛️ Hockey Hall of Fame' : 'No plaque in Toronto'}</span>
          </div>
          <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button onClick={reset} className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-2.5 text-sm font-semibold text-foreground">
              <RotateCcw className="h-4 w-4" /> New career
            </button>
            <ShareButtons
              gameName="NHL My Career"
              gamePath="/nhl-my-career"
              score={`legacy ${legacy.score}`}
              customText={`NHL My Career 🏒 ${career.name}: ${career.seasons.length} seasons, ${career.cups} rings, ${career.harts} MVPs. Verdict: ${legacy.verdict}. Legacy ${legacy.score}. douknowball.com/nhl-my-career`}
            />
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="mb-1 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Season by season</p>
          <div className="max-h-72 space-y-0.5 overflow-y-auto">
            {career.seasons.map((s, i) => (
              <div key={i} className="flex items-center justify-between rounded px-2 py-1 text-[11px] odd:bg-background">
                <span className="text-muted-foreground">{s.year} · {s.team} · age {s.age}</span>
                <span className="text-foreground">{statLine(s, career.pos)}{s.awards.length ? ` · ${s.awards.join(', ')}` : ''}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------ season hub ------------------------------ */
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
        <span className="rounded-full border border-border bg-card px-3 py-1 font-bold text-foreground">{career.name} · {career.pos}</span>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">{nhlTeamLabelOf(career.team)}</span>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">{career.year} · age {career.age}</span>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">OVR <b className="text-primary">{career.ovr}</b></span>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">${career.salary}M x{Math.max(0, career.contractYears)}</span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
        {[['Morale', career.morale], ['Fanbase', career.fanbase], ['Health', career.health]].map(([lbl, v]) => (
          <div key={lbl as string} className="rounded-xl border border-border bg-card px-2 py-1.5">
            <p className="text-muted-foreground">{lbl}</p>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
              <div className={cn('h-full rounded-full', (v as number) > 60 ? 'bg-primary' : (v as number) > 35 ? 'bg-gold' : 'bg-destructive')} style={{ width: `${v}%` }} />
            </div>
          </div>
        ))}
      </div>

      {feed.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-3 text-xs text-muted-foreground">
          {feed.slice(0, 5).map((n, i) => <p key={i}>{n}</p>)}
        </div>
      )}

      {phase === 'event' && pendingEvent ? (
        <div className="rounded-2xl border border-gold/40 bg-card p-4">
          <p className="text-center text-sm font-bold text-foreground"><Sparkles className="mr-1 inline h-4 w-4 text-gold" />{pendingEvent.title}</p>
          <p className="mt-1 text-center text-xs text-muted-foreground">{pendingEvent.body}</p>
          <div className="mt-3 grid gap-1.5">
            {pendingEvent.options.map((o, i) => (
              <button
                key={i}
                onClick={() => chooseOption(i)}
                className="rounded-xl border border-border bg-background px-3 py-2 text-left hover:border-primary/60"
              >
                <span className="block text-sm font-bold text-foreground">{o.label}</span>
                <span className="block text-[10px] text-muted-foreground">{o.effect}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-gold/40 bg-card p-4 text-center">
          {lastLine && (
            <p className="mb-2 text-xs text-muted-foreground">
              Last season: {statLine(lastLine, career.pos)} · {lastLine.teamResult}
            </p>
          )}
          <button
            onClick={playSeason}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90"
          >
            <Dumbbell className="h-4 w-4" /> Play the {career.year} season
          </button>
          <p className="mt-2 text-[10px] text-muted-foreground">
            Career so far: {career.cups} Cups · {career.harts} majors · {career.allStars} All-Star ·{' '}
            {career.pos === 'G' ? `${totals.wins} career wins` : `${totals.points.toLocaleString()} career points`}
          </p>
          {career.seasons.length >= 6 && (
            <button onClick={retireNow} className="mt-2 text-[11px] text-muted-foreground hover:text-destructive">Hang them up now</button>
          )}
        </div>
      )}

      {career.seasons.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="mb-1 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Career log</p>
          <div className="max-h-48 space-y-0.5 overflow-y-auto">
            {[...career.seasons].reverse().map((s, i) => (
              <div key={i} className="flex items-center justify-between rounded px-2 py-1 text-[11px] odd:bg-background">
                <span className="text-muted-foreground">{s.year} · {s.team}</span>
                <span className="text-foreground">{statLine(s, career.pos)}{s.awards.length ? ' 🏆' : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
