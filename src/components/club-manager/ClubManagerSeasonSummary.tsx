import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, Trophy } from 'lucide-react';
import { ResultScreen } from '@/components/game/ResultScreen';
import { revealDelay } from '@/components/club-manager/Celebration';
import { cn } from '@/lib/utils';
import { bookAwardsState, evalWorldUcl, money } from '@/lib/clubManager';
import { BOOK_FULL_SHARE, type AwardMan } from '@/lib/clubManagerLeagueBoards';
import { MadeUpTag } from '@/components/club-manager/SquadScreen';
import { TeamLines } from '@/components/club-manager/SeasonHonoursCard';
import type { CareerState, SeasonSummary } from '@/lib/clubManager';
import type { SeasonFate } from '@/lib/clubManagerBoardVerdict';
import type { useClubManager } from '@/hooks/useClubManager';

/* Round 633: the five terms, in the order they are worth. Kept beside the
   screen that prints them rather than in the engine, because the wording is
   copy and the numbers are not. */
const SCORE_TERMS = [
  { key: 'form', label: 'League form' },
  { key: 'title', label: 'Title' },
  { key: 'cup', label: 'Cup run' },
  { key: 'euro', label: 'Europe' },
  { key: 'objectives', label: 'Board' },
] as const;

/* Round 1335: the summer move a season earned, in the review and on the career record. */
const FATE_LINE: Record<SeasonFate, string> = {
  up: 'You went up.',
  down: 'You went down.',
  escape: 'You stayed up when everyone had you going down.',
};
const FATE_WORD: Record<SeasonFate, string> = { up: 'promoted', down: 'relegated', escape: 'stayed up' };

export default function ClubManagerSeasonSummary({ sm, c, g }: {
  sm: SeasonSummary;
  c: CareerState;
  g: Pick<ReturnType<typeof useClubManager>, 'nextSeason' | 'startNew'>;
}) {
  const trophyLine = sm.trophies.length ? sm.trophies.map(() => '🏆').join('') : '-';
  /* Optional: a summary stored before Round 633 carries no breakdown, and the
     block below simply does not render for it. */
  const parts = sm.seasonScoreParts;
  const partsTotal = parts ? parts.form + parts.title + parts.cup + parts.euro + parts.objectives : 0;
  /* Round 783: a move you booked through an application outranks the offers,
     and the rollover takes it whatever the button is tapped with. */
  const summerMove = c.jobHunt?.summerMove ?? null;
  let tick = 0;
  const tickIn = () => ({ animationDelay: revealDelay(tick++) });
  /* Round 1503: the Champions League a save follows from outside it plays its final after the last league game in
     today's world, so the season ends before the Cups tile can show it: the winner lands here. Read only. */
  const watchedFinal = (() => {
    try {
      const r = c.uclGroup ? null : evalWorldUcl(c);
      return r?.done && r.winner && r.runnerUp ? { winner: r.winner, runnerUp: r.runnerUp } : null;
    } catch {
      return null;
    }
  })();
  /* Round 1311: the league's awards from the book. A summary written before them has no `awards`; it
     prints as it always did, plus, on a season the book could not settle, one line that says why. */
  const awards = sm.awards;
  const awardsBy = awards ? null : bookAwardsState(c);
  const [teamOpen, setTeamOpen] = useState(false);
  /* Round 1335: an offer asks before it moves the career. The question opens in place of the list, in the
     same panel, and only "Take the job" moves anything. Keyed on the season, so the next review opens on the
     list. Focus follows: to the question's button when it opens, back to the card that was tapped. */
  const [asking, setAsking] = useState<{ season: number; club: string } | null>(null);
  const askingOffer = asking && asking.season === sm.season ? sm.offers.find(o => o.club === asking.club) ?? null : null;
  const takeRef = useRef<HTMLButtonElement>(null);
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const backTo = useRef<string | null>(null);
  /* Review fix: the list Back returns to is the one already on screen, so it does not rise in again (the
     cards would sit invisible for most of a second with focus on one of them). Keyed on the season. */
  const [backedIn, setBackedIn] = useState<number | null>(null);
  useEffect(() => {
    if (askingOffer) { takeRef.current?.focus({ preventScroll: true }); return; }
    if (backTo.current) { cardRefs.current[backTo.current]?.focus({ preventScroll: true }); backTo.current = null; }
  }, [askingOffer]);
  const mineInTeam = awards?.xi ? awards.xi.filter(m => (m[3] & 2) !== 0).length : 0;
  const winner = (m: AwardMan) => (
    <><span className={cn('font-bold', (m[3] & 2) !== 0 && 'text-primary')}>{m[0]}</span>{(m[3] & 1) !== 0 && <MadeUpTag className="ml-1" />} ({m[1]}, {m[2]})</>
  );
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
          playAgainLabel={summerMove ? `Start Season ${sm.season + 1} at ${summerMove.club}` : `Continue to Season ${sm.season + 1}`}
          playNext={
            <div className="space-y-3">
              {summerMove && (
                <div data-summer-move className="text-left bg-surface-2 border border-gold/40 rounded-xl p-3">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">🧳 Agreed during the season</div>
                  <p className="text-sm font-bold text-foreground">You take over at {summerMove.club} for Season {sm.season + 1}.</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{summerMove.blurb}</p>
                </div>
              )}
              {!summerMove && sm.offers.length > 0 && (
                <div data-cm-offers className="text-left bg-surface-2 border border-border/60 rounded-xl p-3">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">📞 Job offers on the table</div>
                  {askingOffer ? (
                    <div data-cm-offer-confirm role="group" aria-labelledby="cm-offer-question">
                      <p id="cm-offer-question" className="text-sm font-bold text-primary">Take the {askingOffer.club} job?</p>
                      <p className="text-xs text-muted-foreground mt-1">{askingOffer.blurb}</p>
                      <p className="text-xs text-foreground mt-1.5">Your players and the money you did not spend stay at {c.clubName}. You start Season {sm.season + 1} with theirs.</p>
                      <div className="flex gap-2 mt-2.5">
                        <button
                          ref={takeRef}
                          data-cm-offer-take
                          onClick={() => g.nextSeason(askingOffer.club)}
                          className="min-h-[44px] flex-1 rounded-lg bg-primary px-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                          Take the job
                        </button>
                        <button
                          data-cm-offer-back
                          onClick={() => { backTo.current = askingOffer.club; setBackedIn(sm.season); setAsking(null); }}
                          className="min-h-[44px] inline-flex items-center gap-1 rounded-lg border border-border px-4 text-sm text-foreground hover:bg-primary/10 transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4" />Back
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Round 530: each offer rises in on its own beat, keyed on
                          the season so next year's offers rise again. The button
                          works from frame one; only its opacity is on the way in. */}
                      {sm.offers.map((o, i) => (
                        <button
                          key={`${sm.season}:${o.club}`}
                          ref={el => { cardRefs.current[o.club] = el; }}
                          data-cm-offer={o.club}
                          onClick={() => setAsking({ season: sm.season, club: o.club })}
                          className={cn('w-full mb-2 last:mb-0 rounded-lg border border-primary/40 bg-primary/5 p-2.5 text-left hover:bg-primary/15 transition-colors', backedIn !== sm.season && 'cm-rise')}
                          style={backedIn === sm.season ? undefined : { animationDelay: revealDelay(i) }}
                        >
                          <div className="text-sm font-bold text-primary">{o.club} want you as manager</div>
                          <div className="text-[10px] text-muted-foreground">{o.blurb}</div>
                        </button>
                      ))}
                      <p data-cm-offer-note className="text-xs text-muted-foreground">Tap an offer to see it first. Nothing moves until you take the job.</p>
                    </>
                  )}
                </div>
              )}
              <button onClick={g.startNew} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                Start a new manager (this career stays saved)
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
            {watchedFinal && (
              <p data-cm-world-final-line className="cm-tick-in text-sm text-foreground flex items-start gap-2" style={tickIn()}>
                <span className="shrink-0">⭐</span>
                <span>Champions League: <span className="font-bold">{watchedFinal.winner}</span> beat {watchedFinal.runnerUp} in the final.</span>
              </p>
            )}
            {sm.fate && (
              <p data-cm-fate={sm.fate} className="cm-tick-in text-sm text-foreground flex items-start gap-2" style={tickIn()}>
                <span className="shrink-0">{sm.fate === 'up' ? '⬆️' : sm.fate === 'down' ? '⬇️' : '🛟'}</span>
                <span className="font-bold">{FATE_LINE[sm.fate]}</span>
              </p>
            )}
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
                <span className="shrink-0">⚽</span><span>Your top scorer: {sm.topScorer.name} ({sm.topScorer.goals} goals)</span>
              </p>
            )}
            {sm.topAssister && (
              <p className="cm-tick-in text-sm text-foreground flex items-start gap-2" style={tickIn()}>
                <span className="shrink-0">🎯</span><span>Your most assists: {sm.topAssister.name} ({sm.topAssister.assists})</span>
              </p>
            )}
            {/* Round 165: the season's individual honours. */}
            {sm.goldenBoot && (
              <p className="cm-tick-in text-sm text-foreground flex items-start gap-2" style={tickIn()}>
                <span className="shrink-0">👟</span><span>Golden boot: <span className="font-bold">{sm.goldenBoot.name}</span> ({sm.goldenBoot.club}, {sm.goldenBoot.goals} goals)</span>
              </p>
            )}
            {awards?.ast && (
              <p data-cm-award="ast" className="cm-tick-in text-sm text-foreground flex items-start gap-2" style={tickIn()}>
                <span className="shrink-0">🅰️</span><span>Most assists in the league: {winner(awards.ast)}</span>
              </p>
            )}
            {awards?.glove && (
              <p data-cm-award="glove" className="cm-tick-in text-sm text-foreground flex items-start gap-2" style={tickIn()}>
                <span className="shrink-0">🧤</span><span>Most clean sheets: {winner(awards.glove)}</span>
              </p>
            )}
            {awards?.xi && (teamOpen ? (
              <div data-cm-team-open className="text-left rounded-xl border border-border p-3 space-y-2">
                <button type="button" data-cm-team-back onClick={() => setTeamOpen(false)} className="inline-flex items-center gap-1 min-h-[44px] min-w-[44px] pr-2 text-xs text-muted-foreground hover:text-foreground">
                  <ChevronLeft className="w-3.5 h-3.5" /> Back
                </button>
                <div className="text-sm font-bold text-foreground">🌟 Team of the season</div>
                <TeamLines xi={awards.xi} />
              </div>
            ) : (
              <button type="button" data-cm-team-tile onClick={() => setTeamOpen(true)} className="min-h-[44px] w-full rounded-xl border border-border bg-card px-3 py-2 text-left text-sm hover:border-primary">
                <span className="mr-1">🌟</span>Team of the season <span className="text-xs text-muted-foreground">{mineInTeam ? `${mineInTeam} of yours made it` : 'None of yours this time'}</span>
              </button>
            ))}
            {awards && awards.cov < BOOK_FULL_SHARE && (
              <p data-cm-award-thin className="text-[9px] text-yellow-500/80">The data covers only part of this league: {awards.cov} in 100 of the other clubs' goals had a name on them this season.</p>
            )}
            {awardsBy && awardsBy.by !== 'book' && (
              <p data-cm-award-withheld className="text-[10px] text-muted-foreground">{awardsBy.by === 'thin'
                ? `Only ${awardsBy.share} in 100 of the other clubs' goals had a name on them, too few to settle awards on, so the golden boot went to the scorers' race and there are no most assists, most clean sheets or team of the season awards this time.`
                : 'The league book only covered part of this season, so the golden boot went to the scorers\' race and there are no most assists, most clean sheets or team of the season awards this time.'}</p>
            )}
            {sm.playerOfSeason && (
              <p className="cm-tick-in text-sm text-foreground flex items-start gap-2" style={tickIn()}>
                <span className="shrink-0">🎖️</span><span>Player of the season: <span className="font-bold">{sm.playerOfSeason.name}</span> ({sm.playerOfSeason.club})</span>
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
            {/* Round 633: the season score shows its working. It used to be
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
                S{h.season} · {h.club} · #{h.position} ({h.points} pts){h.fate ? ` · ${FATE_WORD[h.fate]}` : ''}{h.trophies.length ? ` · 🏆 ${h.trophies.join(', ')}` : ''}
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
