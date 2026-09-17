import { Trophy } from 'lucide-react';
import { ResultScreen } from '@/components/game/ResultScreen';
import { revealDelay } from '@/components/club-manager/Celebration';
import { cn } from '@/lib/utils';
import { money } from '@/lib/clubManager';
import type { CareerState, SeasonSummary } from '@/lib/clubManager';
import type { useClubManager } from '@/hooks/useClubManager';

/* Round 628: the five terms, in the order they are worth. Kept beside the
   screen that prints them rather than in the engine, because the wording is
   copy and the numbers are not. */
const SCORE_TERMS = [
  { key: 'form', label: 'League form' },
  { key: 'title', label: 'Title' },
  { key: 'cup', label: 'Cup run' },
  { key: 'euro', label: 'Europe' },
  { key: 'objectives', label: 'Board' },
] as const;

export default function ClubManagerSeasonSummary({ sm, c, g }: {
  sm: SeasonSummary;
  c: CareerState;
  g: Pick<ReturnType<typeof useClubManager>, 'nextSeason' | 'startNew'>;
}) {
  const trophyLine = sm.trophies.length ? sm.trophies.map(() => '🏆').join('') : '-';
  /* Optional: a summary stored before Round 628 carries no breakdown, and the
     block below simply does not render for it. */
  const parts = sm.seasonScoreParts;
  const partsTotal = parts ? parts.form + parts.title + parts.cup + parts.euro + parts.objectives : 0;
  let tick = 0;
  const tickIn = () => ({ animationDelay: revealDelay(tick++) });
  return (
<ResultScreen
          won={sm.verdictGrade === 'A' || sm.verdictGrade === 'B' ? true : sm.verdictGrade === 'C' ? undefined : false}
          outcomeEmoji={sm.trophies.length > 0 ? '🏆' : sm.position <= 4 ? '🥈' : sm.verdictGrade === 'F' ? '😬' : '⚽'}
          headline={`Board verdict: ${sm.verdictGrade}`}
          statLine={`${sm.wins}W ${sm.draws}D ${sm.losses}L · GF ${sm.gf} GA ${sm.ga}`}
          funFact={sm.verdict}
          statRow={[
            { label: 'Finish', value: `#${sm.position}` },
            { label: 'Points', value: sm.points },
            { label: 'Season Score', value: sm.seasonScore },
          ]}
          emojiGrid={`🏟️ S${sm.season} · #${sm.position} · ${sm.points}pts · ${trophyLine}`}
          share={{
            score: `#${sm.position} (${sm.points} pts, ${sm.trophies.length} trophies)`,
            gameName: 'Club Manager',
            gamePath: '/club-manager',
          }}
          onPlayAgain={() => g.nextSeason()}
          playAgainLabel={`Continue to Season ${sm.season + 1}`}
          playNext={
            <div className="space-y-3">
              {sm.offers.length > 0 && (
                <div className="text-left bg-surface-2 border border-border/60 rounded-xl p-3">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">📞 Job offers on the table</div>
                  {/* Round 530: each offer rises in on its own beat, keyed on
                      the season so next year's offers rise again. The button
                      works from frame one; only its opacity is on the way in. */}
                  {sm.offers.map((o, i) => (
                    <button
                      key={`${sm.season}:${o.club}`}
                      onClick={() => g.nextSeason(o.club)}
                      className="cm-rise w-full mb-2 last:mb-0 rounded-lg border border-primary/40 bg-primary/5 p-2.5 text-left hover:bg-primary/15 transition-colors"
                      style={{ animationDelay: revealDelay(i) }}
                    >
                      <div className="text-sm font-bold text-primary">{o.club} want you as manager</div>
                      <div className="text-[10px] text-muted-foreground">{o.blurb}</div>
                    </button>
                  ))}
                  <p className="text-[9px] text-muted-foreground">Accepting an offer moves you there for Season {sm.season + 1}.</p>
                </div>
              )}
              <button onClick={g.startNew} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                Retire and start a new career
              </button>
            </div>
          }
        >
          {/* Round 530: every line below ticks in on its own beat, keyed on
              the season. ResultScreen mounts CelebrationStyles, so the
              classes are live here. A trophy line glows once it has landed:
              the glow sits on an inner span because cm-tick-in and
              cm-gold-glow both set the animation shorthand and would cancel
              each other on one element, which would leave the trophy line at
              opacity 0 for good. */}
          <div key={sm.season} data-season-lines className="text-left space-y-1.5 mb-2">
            <p className="cm-tick-in text-sm text-foreground flex items-start gap-2" style={tickIn()}>
              <Trophy className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
              Champions: <span className="font-bold">{sm.champion}</span>
            </p>
            {sm.trophies.map(t => {
              /* The glow starts 0.35s after this line's own beat, once the
                 tick-in has finished. */
              const glowAt = revealDelay(tick, 0.95);
              return (
                <p key={t} className="cm-tick-in text-sm text-foreground flex items-start gap-2" style={tickIn()}>
                  <Trophy className="w-3.5 h-3.5 text-gold mt-0.5 shrink-0" />
                  <span>
                    You won the{' '}
                    <span className="cm-gold-glow font-bold rounded px-1 text-gold" style={{ animationDelay: glowAt }}>{t}</span>!
                  </span>
                </p>
              );
            })}
            {sm.topScorer && (
              <p className="cm-tick-in text-sm text-foreground flex items-start gap-2" style={tickIn()}>
                <span className="shrink-0">⚽</span>Top scorer: {sm.topScorer.name} ({sm.topScorer.goals} goals)
              </p>
            )}
            {sm.topAssister && (
              <p className="cm-tick-in text-sm text-foreground flex items-start gap-2" style={tickIn()}>
                <span className="shrink-0">🎯</span>Most assists: {sm.topAssister.name} ({sm.topAssister.assists})
              </p>
            )}
            {/* Round 165: the season's individual honours. */}
            {sm.goldenBoot && (
              <p className="cm-tick-in text-sm text-foreground flex items-start gap-2" style={tickIn()}>
                <span className="shrink-0">👟</span>Golden boot: <span className="font-bold">{sm.goldenBoot.name}</span> ({sm.goldenBoot.club}, {sm.goldenBoot.goals} goals)
              </p>
            )}
            {sm.playerOfSeason && (
              <p className="cm-tick-in text-sm text-foreground flex items-start gap-2" style={tickIn()}>
                <span className="shrink-0">🎖️</span>Player of the season: <span className="font-bold">{sm.playerOfSeason.name}</span> ({sm.playerOfSeason.club})
              </p>
            )}
            {sm.ballonDor && (
              <p className="cm-tick-in text-sm text-foreground flex items-start gap-2" style={tickIn()}>
                <span className="shrink-0">🌍</span>Ballon d'Or: <span className="font-bold">{sm.ballonDor.name}</span> ({sm.ballonDor.club})
              </p>
            )}
            {sm.qualifiedUcl && (
              <p className="cm-tick-in text-sm text-foreground flex items-start gap-2" style={tickIn()}>
                <span className="shrink-0">⭐</span>Qualified for next season's Champions League
              </p>
            )}
            {/* Round 628: the season score shows its working. It used to be
                league points plus 10 a trophy, which meant the tile next to
                Finish and Points was really reading which club you picked, so
                there was nothing to explain. Now it is five things you did,
                and a number a player cannot explain is a number they cannot
                aim at. Only the terms that scored anything are listed. */}
            {parts && (
              <div className="pt-1">
                <div className="cm-tick-in text-[10px] text-muted-foreground uppercase tracking-wider mb-1" style={tickIn()}>
                  Season score {sm.seasonScore} of 130
                </div>
                <p className="cm-tick-in text-xs text-muted-foreground" style={tickIn()}>
                  {SCORE_TERMS.filter(t => parts[t.key] > 0).map(t => `${t.label} ${parts[t.key]}`).join(' · ') || 'Nothing scored this season'}
                  {/* The five terms are worth 154 between them and the scale
                      stops at 130, so an outstanding season earns more than it
                      can be paid. Saying so beats printing a list that visibly
                      adds up to more than the number printed above it. */}
                  {partsTotal > sm.seasonScore && ` · ${partsTotal} earned, capped at 130`}
                </p>
              </div>
            )}
            {sm.objectives && sm.objectives.length > 0 && (
              <div className="pt-1">
                <div className="cm-tick-in text-[10px] text-muted-foreground uppercase tracking-wider mb-1" style={tickIn()}>Board objectives</div>
                {sm.objectives.map((o, i) => (
                  <p key={i} className={cn('cm-tick-in text-xs', o.hit ? 'text-emerald-400' : 'text-red-400')} style={tickIn()}>
                    {o.hit ? '✓' : '✗'} <span className="text-foreground">{o.label}</span>
                  </p>
                ))}
              </div>
            )}
            {sm.signings.length > 0 && (
              <div className="pt-1">
                <div className="cm-tick-in text-[10px] text-muted-foreground uppercase tracking-wider mb-1" style={tickIn()}>Transfer business</div>
                {sm.signings.slice(0, 8).map((t, i) => (
                  <p key={i} className="cm-tick-in text-xs text-muted-foreground" style={tickIn()}>
                    {t.dir === 'in' ? '🟢 IN' : '🔴 OUT'} {t.name} ({money(t.fee, c)})
                  </p>
                ))}
              </div>
            )}
          </div>
        </ResultScreen>
  );
}

export function SackedCareerSummary({ c, g }: {
  c: CareerState;
  g: Pick<ReturnType<typeof useClubManager>, 'startNew' | 'takeJob' | 'waitAWeek'>;
}) {
  return (
<ResultScreen
          won={false}
          outcomeEmoji="🚪"
          headline="You've been sacked"
          statLine={`The ${c.clubName} board ran out of patience in Season ${c.season}.`}
          statRow={[
            { label: 'Seasons', value: c.season },
            { label: 'Win %', value: `${c.careerStats.played ? Math.round((c.careerStats.wins / c.careerStats.played) * 100) : 0}%` },
            { label: 'Trophies', value: c.trophies.length },
          ]}
          emojiGrid={`🚪 Sacked in S${c.season} · ${c.careerStats.wins}W ${c.careerStats.draws}D ${c.careerStats.losses}L · 🏆×${c.trophies.length}`}
          share={{
            score: `Sacked after ${c.season} season${c.season > 1 ? 's' : ''} (${c.trophies.length} trophies)`,
            gameName: 'Club Manager',
            gamePath: '/club-manager',
          }}
          onPlayAgain={g.startNew}
          playAgainLabel="Start New Career"
        >
          {/* Round 201: the wilderness. A sacking used to end the save here,
              which is the one moment in a manager's life that should not end
              anything. Your record follows you and decides who calls. */}
          <div data-wilderness className="cm-rise text-left rounded-xl border border-border bg-card p-3 mb-3" style={{ animationDelay: '0.35s' }}>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">🧳 Out of work</div>
            <p className="text-xs text-foreground">
              {(c.wilderness?.weeksOut ?? 0) === 0
                ? 'You are between jobs. Clubs will call, but the longer you sit out the quieter the phone gets.'
                : `${c.wilderness?.weeksOut} week${c.wilderness?.weeksOut === 1 ? '' : 's'} without a club. ${(c.wilderness?.offers.length ?? 0) > 0 ? 'The phone has rung.' : 'Nobody has called yet.'}`}
            </p>
            <div className="mt-2 space-y-1.5">
              {/* Round 530: the offers rise in one after another. Round 530
                  review: keyed on the CLUB, not on the week. Keyed on the week,
                  every "wait a week" remounted the lot and re-ran the rise on
                  offers that had been on the table for weeks (wildernessWeek
                  carries them forward and adds at most one new call, and only
                  in about half of the weeks), so a phone that had not rung read
                  as though it had. On the club, a new call rises and the rest
                  hold their final frame. Clubs cannot repeat: wildernessWeek
                  adds every offered club to seen and excludes seen. */}
              {(c.wilderness?.offers ?? []).map((o, i) => (
                <div
                  key={o.club}
                  data-wilderness-offer={o.club}
                  className="cm-rise rounded-lg border border-border bg-background/40 p-2"
                  style={{ animationDelay: revealDelay(i) }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-foreground truncate">{o.club}</span>
                    <span className="text-[9px] text-muted-foreground shrink-0">{o.league}</span>
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-0.5 leading-snug">{o.reason}</p>
                  <p className="text-[9px] text-foreground mt-0.5 leading-snug"><span className="text-muted-foreground">The brief:</span> {o.brief}</p>
                  <button
                    onClick={() => g.takeJob(o.club)}
                    className="mt-1.5 w-full py-1.5 rounded-lg text-[11px] font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                  >
                    Take the {o.club} job
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={g.waitAWeek}
              data-wait-week
              className="mt-2 w-full py-2 rounded-lg text-xs font-bold bg-secondary text-foreground hover:opacity-90 transition-opacity"
            >
              ⏭️ Wait a week for the phone to ring
            </button>
            <p className="text-[9px] text-muted-foreground mt-1.5">
              Trophies and promotions open doors; relegations shut them. Waiting costs you standing, so the job you hold out for may not be there when you finally say yes. Somebody always needs a manager in the end.
            </p>
          </div>
          <div className="text-left space-y-1.5 mb-2">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Career record</div>
            {c.history.length === 0 && <p className="text-xs text-muted-foreground">Sacked before finishing a single season. Brutal.</p>}
            {c.history.map(h => (
              <p key={h.season} className="text-xs text-foreground">
                S{h.season} · {h.club} · #{h.position} ({h.points} pts){h.trophies.length ? ` · 🏆 ${h.trophies.join(', ')}` : ''}
              </p>
            ))}
            {c.trophies.length > 0 && (
              <p className="text-xs text-foreground pt-1">
                Cabinet: {c.trophies.map(t => `${t.emoji} ${t.name} (S${t.season})`).join(' · ')}
              </p>
            )}
          </div>
        </ResultScreen>
  );
}
