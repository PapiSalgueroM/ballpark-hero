/**
 * Round 720: Contract Chaos, the screen. Rules in src/lib/contractChaos.ts,
 * state in src/hooks/useContractChaos.ts. This draws the menu, the offer
 * tiles, one offer at a time with a back button, the five seasons (newest on
 * top, so nothing new lands below the fold) and the verdict.
 */
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GameNav } from '@/components/game/GameNav';
import { GameShell } from '@/components/game/GameShell';
import { ResultScreen } from '@/components/game/ResultScreen';
import { RulesGate } from '@/components/game/RulesGate';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { useRevealScroll } from '@/hooks/useRevealScroll';
import { useContractChaos } from '@/hooks/useContractChaos';
import {
  HORIZON, ROLE_WORD, SEAT_WORD, CITY_WORD, AMBITION_WORD, fmtM, totalValue, shareText,
  type CcOffer,
} from '@/lib/contractChaos';

const ContractChaos = () => {
  const g = useContractChaos();
  const revealRef = useRevealScroll<HTMLDivElement>(`${g.phase}:${g.focus}:${g.revealed}`);
  const deal = g.deal;
  const mine = g.signed !== null ? g.outcomes[g.signed] : null;
  const avg = g.save.played ? Math.round(g.save.total / g.save.played) : 0;

  return (
    <>
      <PageSeo
        title="Contract Chaos: Soccer Agent Contract Game | DoUKnowBall"
        description="Be the agent for a generated footballer. Compare wages, role, bonuses and release clauses, sign one deal and watch five seasons play out. Free soccer game."
        path="/contract-chaos"
      />
      <GameShell
        help="none"
        width="narrow"
        title="📝 CONTRACT CHAOS"
        subtitle="You are the agent. Pick the deal, then live with it for five seasons."
      >
        <RulesGate title="How to Play Contract Chaos">
          <div className="space-y-3">
            <p>You are the agent for a footballer whose contract is up. His club wants him back and other clubs want him away. Compare the offers, sign one, and watch five seasons play out. The score is how his career went.</p>
            <p className="font-semibold text-foreground">The rules:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Every offer has a wage, a length, a promised role, the manager's job security, home or abroad, a signing bonus, a trophy bonus, maybe a release clause, and how ambitious the club is.</li>
              <li>Title chasers pay less and the bench is crowded. Rebuilds overpay and hand you the shirt. That is the trade.</li>
              <li>You can push each offer for more money once. A star usually gets it. Push too hard and an outside club can walk, but your own club never does and the last offer standing never does.</li>
              <li>The promised role only lasts while that manager keeps his job. A hot seat manager can be gone by season two.</li>
              <li>A release clause lets a bigger club buy him out if he outgrows the place. No clause, no escape until the deal ends.</li>
              <li>Five seasons, whatever the length. If the deal ends early he finds a new club at whatever he is worth by then.</li>
              <li>Score out of 100: growth 30 (against what his age says should happen), minutes 25, trophies 25, money 20.</li>
              <li>The daily deal is the same player and the same offers for everyone, once a day. Free play deals a new one every time.</li>
              <li>Every player and every club is made up. No real names.</li>
            </ul>
            <p className="font-semibold text-foreground">Worked example:</p>
            <p>A 19 year old rated 74 with potential 88. The title chasers offer €1.3M a year as a rotation player; a rebuild offers €2.0M and the starting spot. The rebuild's minutes grow him to 86 and pay more, but the title chasers win the league twice. Growth and money against trophies: that is the call.</p>
          </div>
        </RulesGate>

        <div ref={revealRef}>
          {g.phase === 'menu' && (
            <div className="max-w-md mx-auto space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <Stat label="played" value={g.save.played} />
                <Stat label="best" value={g.save.best} />
                <Stat label="average" value={avg} />
              </div>

              <div className="rounded-2xl border border-border bg-card p-4">
                <h2 className="text-base font-bold text-foreground mb-1">🗓️ Daily deal</h2>
                <p className="text-xs text-muted-foreground mb-3">One player, one set of offers, the same for everyone. You get one signature a day.</p>
                {g.dailyPlayed ? (
                  <div className="rounded-xl border border-border bg-background/40 p-3 text-sm">
                    <div className="font-bold text-foreground">{g.dailyPlayed.verdict}: {g.dailyPlayed.score}/100</div>
                    <div className="text-muted-foreground">You signed at {g.dailyPlayed.club}. A new player tomorrow.</div>
                  </div>
                ) : (
                  <button
                    onClick={() => g.start('daily')}
                    className="w-full rounded-xl py-3 min-h-[44px] bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity"
                  >
                    Open today's offers
                  </button>
                )}
              </div>

              <div className="rounded-2xl border border-border bg-card p-4">
                <h2 className="text-base font-bold text-foreground mb-1">♾️ Free play</h2>
                <p className="text-xs text-muted-foreground mb-3">A new player and new offers every time.</p>
                <button
                  onClick={() => g.start('free')}
                  className="w-full rounded-xl py-3 min-h-[44px] bg-secondary text-foreground border border-border font-bold hover:bg-secondary/70 transition-colors"
                >
                  Deal me a client
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground text-center">Plays count toward your streak. There is no leaderboard score here yet.</p>
            </div>
          )}

          {deal && (g.phase === 'deal' || g.phase === 'offer') && (
            <div className="max-w-md mx-auto space-y-3">
              {g.phase === 'deal' && (
                <>
                  <PlayerCard deal={deal} />
                  <p className="text-xs text-muted-foreground text-center">{dealNote(deal.note)} Tap an offer to read it.</p>
                  <div className="grid grid-cols-2 gap-2">
                    {deal.offers.map((o, i) => (
                      <button
                        key={o.fa.team}
                        onClick={() => g.open(i)}
                        className={cn(
                          'rounded-xl border p-3 text-left min-h-[96px] transition-colors',
                          o.fa.gone ? 'border-border bg-background/30 opacity-60' : 'border-border bg-card hover:border-primary/60',
                        )}
                      >
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{o.fa.incumbent ? 'Your club' : AMBITION_WORD[o.fa.tier]}</div>
                        <div className="text-sm font-bold text-foreground leading-tight">{o.fa.label}</div>
                        <div className="text-xs text-foreground tabular-nums mt-1">{fmtM(o.fa.salary)} a year, {o.fa.years} {o.fa.years === 1 ? 'year' : 'years'}</div>
                        <div className="text-[11px] text-muted-foreground">{ROLE_WORD[o.role]}{o.fa.gone ? ', walked away' : o.fa.pushed ? ', pushed' : ''}</div>
                      </button>
                    ))}
                  </div>
                </>
              )}
              {g.phase === 'offer' && deal.offers[g.focus] && (
                <OfferDetail
                  offer={deal.offers[g.focus]}
                  player={`${deal.player.name}, ${deal.player.age}, rated ${deal.player.ovr}, potential ${deal.player.pot}`}
                  ovr={deal.player.ovr}
                  line={g.talk[g.focus]}
                  onBack={g.back}
                  onPush={() => g.push(g.focus)}
                  onSign={() => g.sign(g.focus)}
                />
              )}
            </div>
          )}

          {deal && mine && g.phase === 'career' && (
            <div className="max-w-md mx-auto space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-bold text-foreground">Season {g.revealed} of {HORIZON}</h2>
                <button onClick={g.finish} className="text-xs text-primary hover:underline min-h-[32px] px-2">Skip to the verdict</button>
              </div>
              <button
                onClick={g.nextSeason}
                className="w-full rounded-xl py-3 min-h-[44px] bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity"
              >
                {g.revealed >= HORIZON ? 'See the verdict' : 'Play the next season'}
              </button>
              {mine.seasons.slice(0, g.revealed).reverse().map(s => (
                <div key={s.n} className="rounded-xl border border-border bg-card p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-foreground">Season {s.n}, age {s.age}</span>
                    <span className="tabular-nums text-muted-foreground">rated {s.ovrStart} to {s.ovr}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{s.club}, {ROLE_WORD[s.role].toLowerCase()}, played {Math.round(s.minutes * 100)}% of the minutes, earned {fmtM(s.earned)}</div>
                  {s.lines.length > 0 && (
                    <ul className="mt-1 space-y-0.5 text-xs text-foreground">
                      {s.lines.map(l => <li key={l}>{l}</li>)}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}

          {deal && mine && g.signed !== null && g.phase === 'done' && (
            <div className="max-w-md mx-auto">
              <ResultScreen
                won={mine.score >= 55}
                outcomeEmoji={mine.score >= 85 ? '🤑' : mine.score >= 55 ? '📝' : '🌪️'}
                headline={mine.verdict}
                statLine={<span className="tabular-nums">{mine.score}/100 for {deal.player.name} at {deal.offers[g.signed].fa.label}</span>}
                statRow={[
                  { label: 'growth', value: `${mine.parts.growth}/30` },
                  { label: 'minutes', value: `${mine.parts.minutes}/25` },
                  { label: 'trophies', value: `${mine.parts.trophies}/25` },
                  { label: 'money', value: `${mine.parts.money}/20` },
                ]}
                emojiGrid={`📝 Contract Chaos ${mine.score}/100\n${mine.seasons.map(s => (s.titles || s.cups ? '🏆' : s.minutes >= 0.6 ? '🟩' : s.minutes >= 0.3 ? '🟨' : '🟥')).join('')}`}
                share={{
                  score: `${mine.score}/100 on Contract Chaos`,
                  gameName: 'Contract Chaos',
                  gamePath: '/contract-chaos',
                  customText: shareText(deal, g.signed, mine, g.mode === 'daily' ? g.today : null),
                }}
                onPlayAgain={g.mode === 'free' ? () => g.start('free') : undefined}
                playAgainLabel="Deal me another client"
                playNext={
                  <div className="space-y-2">
                    {g.mode === 'daily' && <p className="text-sm text-muted-foreground">A new player tomorrow.</p>}
                    <button onClick={g.toMenu} className="text-sm text-primary hover:underline min-h-[32px]">Back to the menu</button>
                  </div>
                }
              >
                <div className="mt-3 rounded-xl border border-border bg-card p-3 text-left">
                  <h3 className="text-sm font-bold text-foreground mb-1">The roads not taken</h3>
                  <ul className="space-y-1 text-xs">
                    {g.outcomes
                      .map((o, i) => ({ o, i }))
                      .sort((a, b) => b.o.score - a.o.score)
                      .map(({ o, i }) => (
                        <li key={deal.offers[i].fa.team} className={cn('flex justify-between gap-2', i === g.signed ? 'font-bold text-foreground' : 'text-muted-foreground')}>
                          <span>{deal.offers[i].fa.label}{i === g.signed ? ' (your pick)' : ''}</span>
                          <span className="tabular-nums">{o.score}/100, {o.titles + o.cups} {o.titles + o.cups === 1 ? 'trophy' : 'trophies'}, rated {o.finalOvr}</span>
                        </li>
                      ))}
                  </ul>
                </div>
              </ResultScreen>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Want the whole career, not just the deal? Try <Link to="/soccer-career" className="text-primary hover:underline">Soccer Career</Link> or grow kids in <Link to="/wonderkid-factory" className="text-primary hover:underline">Wonderkid Factory</Link>.
        </p>

        <GameSeoContent
          pageHasOwnH1
          title="Contract Chaos | DoUKnowBall"
          description="A soccer agent game. Compare contract offers for a generated footballer on wages, years, role, bonuses, release clauses and club ambition, sign one and watch five seasons decide whether you got it right."
          howToPlay={[
            'Read the player: age, rating and potential',
            'Tap each offer to read the full terms',
            'Push one offer for more money if you dare, once each',
            'Sign one deal and play out five seasons',
            'Score out of 100 from growth, minutes, trophies and money',
          ]}
        />

        <AdBanner slot="7540487748" format="horizontal" className="mt-8" />
        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="contract-chaos" gameContext={{ mode: g.mode, phase: g.phase, player: deal?.player.name ?? null }} />
        </div>
        <GameNav />
      </GameShell>
    </>
  );
};

/* The shared engine's header lines are written for the US careers; say the
   same thing in football words. */
function dealNote(note: string): string {
  if (note.startsWith('Everyone')) return 'Everyone wants him. Make them pay for it.';
  if (note.startsWith('Real')) return 'Real interest, real numbers.';
  return 'The phone is quieter than it used to be.';
}

function PlayerCard({ deal }: { deal: NonNullable<ReturnType<typeof useContractChaos>['deal']> }) {
  const p = deal.player;
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Your client, generated</div>
      <div className="text-lg font-bold text-foreground leading-tight">{p.name}</div>
      <div className="text-xs text-muted-foreground">{p.position} from {p.nation}, age {p.age}</div>
      <div className="grid grid-cols-3 gap-2 mt-2 text-center">
        <Stat label="rating" value={p.ovr} />
        <Stat label="potential" value={p.pot} />
        <div className="rounded-xl border border-border bg-card px-2 py-1.5">
          <div className="text-base font-bold text-foreground tabular-nums">{fmtM(deal.market)}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">worth a year</div>
        </div>
      </div>
    </div>
  );
}

function OfferDetail({ offer: o, player, ovr, line, onBack, onPush, onSign }: {
  offer: CcOffer; player: string; ovr: number; line?: string; onBack: () => void; onPush: () => void; onSign: () => void;
}) {
  const rows: [string, string][] = [
    ['Wage', `${fmtM(o.fa.salary)} a year`],
    ['Length', `${o.fa.years} ${o.fa.years === 1 ? 'year' : 'years'}`],
    ['Signing bonus', fmtM(o.signingBonus)],
    ['Trophy bonus', `${fmtM(o.trophyBonus)} a trophy`],
    ['Release clause', o.releaseClause === null ? 'None' : fmtM(o.releaseClause)],
    ['Promised role', ROLE_WORD[o.role]],
    ["Manager's seat", SEAT_WORD[o.seat]],
    ['Where', `${o.home ? 'Home' : 'Abroad'}, ${CITY_WORD[o.city].toLowerCase()}`],
    ['Ambition', AMBITION_WORD[o.fa.tier]],
    ['Squad strength', `${o.fa.quality} (he is ${ovr})`],
    ['Total value', `${fmtM(totalValue(o))} with the bonus`],
  ];
  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground min-h-[32px]">
        <ArrowLeft className="w-4 h-4" aria-hidden="true" /> All offers
      </button>
      <p className="text-[11px] text-muted-foreground">For {player}</p>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{o.fa.incumbent ? 'Your club wants you back' : AMBITION_WORD[o.fa.tier]}</div>
        <h2 className="text-lg font-bold text-foreground leading-tight">{o.fa.label}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{o.pitch}</p>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="text-foreground text-right tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      {line && <p className="text-sm font-semibold text-foreground">{line}</p>}
      {o.fa.gone ? (
        <p className="text-sm text-muted-foreground">This offer is off the table.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onPush}
            disabled={o.fa.pushed}
            className="rounded-xl py-3 min-h-[44px] border border-border bg-secondary text-foreground font-bold disabled:opacity-50 hover:bg-secondary/70 transition-colors"
          >
            {o.fa.pushed ? 'Already pushed' : 'Push for more'}
          </button>
          <button
            onClick={onSign}
            className="rounded-xl py-3 min-h-[44px] bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity"
          >
            Sign here
          </button>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card px-2 py-1.5">
      <div className="text-base font-bold text-foreground tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

export default ContractChaos;
