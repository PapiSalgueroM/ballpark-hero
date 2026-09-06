import { cn } from '@/lib/utils';
import { ChevronLeft, Play, Zap } from 'lucide-react';
import type { CareerState, MatchFacts, FormResult, TalkTone } from '@/lib/clubManager';
import { TeamTalkRow } from '@/components/club-manager/TeamTalkRow';

/**
 * Round 157: the pre-match facts screen, modelled on what a matchday app
 * shows before kick off and built only from what this save has really
 * simulated. Form is the last five results this world actually played,
 * the head-to-head is matches YOU played against them, and the win chances
 * are the engine's own odds from the exact formula the match will be drawn
 * with, labelled as engine odds because inventing a fan vote would be a lie.
 *
 * The team talk lives here now, out of the way of the Play button on the
 * hub, because the owner said the talk was being forced on him every match.
 * It is one optional row: say nothing and they go out as they came in.
 */

const FORM_CHIP: Record<FormResult, string> = {
  W: 'bg-emerald-500/20 text-emerald-400',
  D: 'bg-yellow-500/20 text-yellow-400',
  L: 'bg-red-500/20 text-red-400',
};

function FormRow({ form, align }: { form: FormResult[]; align: 'left' | 'right' }) {
  if (!form.length) {
    return <span className="text-[9px] text-muted-foreground">No matches yet</span>;
  }
  return (
    <span className={cn('inline-flex gap-1', align === 'right' && 'flex-row-reverse')}>
      {form.map((f, i) => (
        <span key={i} className={cn('w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center', FORM_CHIP[f])}>
          {f}
        </span>
      ))}
    </span>
  );
}

interface MatchCentreProps {
  career: CareerState;
  facts: MatchFacts;
  clubColor: string;
  tone: TalkTone | null;
  onTone: (tone: TalkTone) => void;
  talkRead: string | null;
  talkStale: boolean;
  onQuickSim: () => void;
  /** Round 158's animated viewer, which Round 472 made the one live way in. */
  onLive: () => void;
  onBack: () => void;
}

export function MatchCentre({
  career, facts, clubColor, tone, onTone, talkRead, talkStale, onQuickSim, onLive, onBack,
}: MatchCentreProps) {
  const f = facts;
  const venue = f.home === true ? 'Home' : f.home === false ? 'Away' : 'Neutral venue';
  const myPosLabel = f.myPos ? `#${f.myPos}` : null;
  const oppPosLabel = f.oppPos
    ? `#${f.oppPos}${f.oppLeagueName ? ` in the ${f.oppLeagueName}` : ''}`
    : f.oppLeagueName ? `Plays in the ${f.oppLeagueName}` : null;

  return (
    <div className="max-w-md mx-auto space-y-3">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="w-3.5 h-3.5" /> Club home
      </button>

      {/* The tie */}
      <div className="bg-card border border-border rounded-2xl p-4 text-center">
        <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">{f.compLabel}</div>
        <div className="flex items-center justify-center gap-3">
          <div className="flex-1 text-right min-w-0">
            <div className="text-sm font-bold text-primary truncate">{career.clubName}</div>
            {myPosLabel && <div className="text-[9px] text-muted-foreground">{myPosLabel} in league</div>}
          </div>
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: clubColor }} />
          <div className="px-2.5 py-1 rounded-lg bg-secondary text-xs font-bold text-muted-foreground shrink-0">VS</div>
          <div className="flex-1 text-left min-w-0">
            <div className="text-sm font-bold text-foreground truncate">{f.opponent}</div>
            {oppPosLabel && <div className="text-[9px] text-muted-foreground truncate">{oppPosLabel}</div>}
          </div>
        </div>
        <div className="text-[10px] text-muted-foreground mt-1.5">
          {venue} · their strength ~{f.oppStrength} · your XI ~{f.myStrength}
        </div>

        {/* Form, both dugouts */}
        <div className="flex items-center justify-between mt-3 px-1">
          <FormRow form={f.myForm} align="left" />
          <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Form</span>
          <FormRow form={f.oppForm} align="right" />
        </div>

        {/* Engine odds. Ours, honestly labelled, never a fake fan vote. */}
        <div className="mt-3">
          <div className="flex h-2 rounded-full overflow-hidden bg-secondary">
            <div className="bg-emerald-500/80" style={{ width: `${f.odds.win}%` }} />
            <div className="bg-yellow-500/70" style={{ width: `${f.odds.draw}%` }} />
            <div className="bg-red-500/70" style={{ width: `${f.odds.loss}%` }} />
          </div>
          <div className="flex items-center justify-between text-[9px] text-muted-foreground mt-1">
            <span className="text-emerald-400 font-bold">Win {f.odds.win}%</span>
            <span>Draw {f.odds.draw}%</span>
            <span className="text-red-400 font-bold">They win {f.odds.loss}%</span>
          </div>
          <div className="text-[8px] text-muted-foreground/70 mt-0.5">Engine odds, from the same maths the match is played with.</div>
        </div>
      </div>

      {/* Ones to watch */}
      {(f.myDanger.length > 0 || f.oppDanger.length > 0) && (
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">🔥 Ones to watch</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              {f.myDanger.map(n => (
                <p key={n} className="text-[11px] text-foreground truncate">⚽ {n}</p>
              ))}
              {f.myDanger.length === 0 && <p className="text-[10px] text-muted-foreground">-</p>}
            </div>
            <div className="text-right">
              {f.oppDanger.map(n => (
                <p key={n} className="text-[11px] text-muted-foreground truncate">⚠️ {n}</p>
              ))}
              {f.oppDanger.length === 0 && <p className="text-[10px] text-muted-foreground">-</p>}
            </div>
          </div>
        </div>
      )}

      {/* Head to head: matches you actually played against them in this save */}
      {f.h2h.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">📖 Your meetings</div>
          <div className="space-y-0.5">
            {f.h2h.map((h, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px]">
                <span className={cn('w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center shrink-0', FORM_CHIP[h.res])}>
                  {h.res}
                </span>
                <span className="font-bold text-foreground">{h.score}</span>
                <span className="text-muted-foreground truncate">{h.home === false ? 'away' : h.home === true ? 'home' : 'neutral'}</span>
                <span className="text-[9px] text-muted-foreground/70 ml-auto shrink-0">S{h.season}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* The talk, if you want one. Optional by design. */}
      <TeamTalkRow tone={tone} onTone={onTone} read={talkRead} when="before kick off" stale={talkStale} />

      {/* Actions. Round 472: one match, two ways through it. There used to be
          three buttons here and two of them were the same fixture with the
          theatre turned off, so Play Match and Watch Live are one thing now:
          play it live. Same seed, same result either way, so choosing the
          quick one costs you nothing but the ninety minutes. */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onLive}
          className="inline-flex items-center justify-center gap-1 px-2 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:opacity-90 transition-opacity"
        >
          <Play className="w-4 h-4" /> Play Live
        </button>
        <button
          onClick={onQuickSim}
          className="inline-flex items-center justify-center gap-1 px-2 py-3 bg-secondary text-foreground rounded-xl font-bold text-sm hover:bg-secondary/70 transition-colors"
        >
          <Zap className="w-4 h-4" /> Quick Sim
        </button>
      </div>
      <p className="text-[9px] text-muted-foreground text-center">
        Play Live puts it on the pitch at your speed, with the dressing room at the break and subs and shape in your hands. Quick Sim plays the same match without you and goes straight to the report. Same match either way.
      </p>
    </div>
  );
}

export default MatchCentre;
