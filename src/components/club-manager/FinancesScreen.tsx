import { cn } from '@/lib/utils';
import { TICKET_TIERS, gatePricePerFan, money } from '@/lib/clubManager';
import type { CareerState } from '@/lib/clubManager';
import {
  CONCESSION_TIERS, booksOf, concessionPerFan, concessionReaction, projectFinances,
  sponsorTable, ticketPerFan, ticketReaction,
} from '@/lib/clubManagerFinances';
/* The one word about the fans anywhere on the game, the same one the header
   meter prints. This desk used to print a second one from its own stored
   number and the two disagreed on screen. */
import { fanMeter } from '@/lib/clubManagerMeters';
import type { ConcessionTier, ProjectionLine } from '@/lib/clubManagerFinances';

/* ─── Round 467: the finances desk. ───
   The projection first, because it is the screen he asked for and it has to
   sit on a phone's first screen. Then prices with the reactions written
   beside them, then the sponsor desk (three shapes with a push, and the bad
   brand set apart), then Round 171's books card.

   The sponsor desk keeps the shape scripts/playSponsors.mjs pins: exactly
   three [data-sponsor-offer] cards, each with exactly one button inside it
   that signs at the printed fee. The push control and the bad brand's card
   live outside those elements on purpose. */

interface FinancesScreenProps {
  career: CareerState;
  onTickets: (tier: 0 | 1 | 2) => void;
  onConcessions: (tier: ConcessionTier) => void;
  onSponsor: (offerId: string) => void;
  onPush: (offerId: string) => void;
}

function Row({ line, tone }: { line: ProjectionLine; tone: 'in' | 'out' }) {
  return (
    <tr data-projection-line={line.id}>
      <td className="py-0.5 pr-1 text-foreground">
        {line.label}
        {line.note && <span className="text-muted-foreground"> · {line.note}</span>}
      </td>
      <td className="py-0.5 text-right tabular-nums text-muted-foreground">{money(line.actual)}</td>
      <td className={cn('py-0.5 pl-2 text-right tabular-nums font-bold', tone === 'in' ? 'text-emerald-400' : 'text-foreground')}>{money(line.projected)}</td>
    </tr>
  );
}

const BONUS_FOR: Record<string, string> = { title: 'winning the league', europe: 'reaching Europe', topHalf: 'a top half finish' };

export function FinancesScreen({ career: c, onTickets, onConcessions, onSponsor, onPush }: FinancesScreenProps) {
  const books = booksOf(c);
  const p = projectFinances(c);
  const ticketTier = c.finance?.ticketTier ?? 1;
  const tReact = ticketReaction(ticketTier);
  const cReact = concessionReaction(books.concessionTier);
  const table = sponsorTable(c);
  const good = table.filter(o => o.rep === 'good');
  const bad = table.find(o => o.rep === 'bad');
  return (
    <div className="space-y-2">
      {/* Round 467: the projection. */}
      <div className="bg-card border border-border rounded-xl p-3" data-finance-projection>
        <div className="flex items-baseline justify-between gap-2 mb-1">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">📊 Projected to season end</div>
          <div className="text-[9px] text-muted-foreground tabular-nums">week {p.weeksPlayed}, {p.weeksLeft} left</div>
        </div>
        <table className="w-full text-[10px] leading-tight">
          <thead>
            <tr className="text-[9px] text-muted-foreground uppercase tracking-wider">
              <th className="text-left font-normal pb-0.5">In</th>
              <th className="text-right font-normal pb-0.5">so far</th>
              <th className="text-right font-normal pb-0.5 pl-2">season</th>
            </tr>
          </thead>
          <tbody>
            {p.income.map(l => <Row key={l.id} line={l} tone="in" />)}
            <tr className="border-t border-border" data-projection-total="income">
              <td className="py-0.5 font-bold text-foreground">Income</td>
              <td className="py-0.5 text-right tabular-nums text-muted-foreground">{money(p.incomeActual)}</td>
              <td className="py-0.5 pl-2 text-right tabular-nums font-bold text-emerald-400">{money(p.incomeProjected)}</td>
            </tr>
            <tr><td colSpan={3} className="pt-1 text-[9px] text-muted-foreground uppercase tracking-wider">Out</td></tr>
            {p.spend.map(l => <Row key={l.id} line={l} tone="out" />)}
            <tr className="border-t border-border" data-projection-total="spend">
              <td className="py-0.5 font-bold text-foreground">Spend</td>
              <td className="py-0.5 text-right tabular-nums text-muted-foreground">{money(p.spendActual)}</td>
              <td className="py-0.5 pl-2 text-right tabular-nums font-bold text-foreground">{money(p.spendProjected)}</td>
            </tr>
            <tr className="border-t border-border" data-projection-total="result">
              <td className="py-0.5 font-bold text-foreground">Season result</td>
              <td className={cn('py-0.5 text-right tabular-nums', p.resultActual < 0 ? 'text-red-400' : 'text-muted-foreground')}>{p.resultActual < 0 ? '-' : ''}{money(Math.abs(p.resultActual))}</td>
              <td className={cn('py-0.5 pl-2 text-right tabular-nums font-bold', p.resultProjected < 0 ? 'text-red-400' : 'text-emerald-400')}>{p.resultProjected < 0 ? '-' : ''}{money(Math.abs(p.resultProjected))}</td>
            </tr>
          </tbody>
        </table>
        <p className="text-[9px] text-muted-foreground mt-1.5">
          Tickets, food, the sponsor, deals, the builders and staff fees move the transfer kitty ({money(c.budget)} now). Wages and travel are the club's running costs: the board covers them and holds you to the wage ceiling on the contracts desk, so they never leave the kitty. {p.caveat}
          {p.possibleBonus > 0 && c.sponsor?.bonusFor ? ` A ${money(p.possibleBonus)} sponsor bonus pays at the summer for ${BONUS_FOR[c.sponsor.bonusFor]}, not counted until it is earned.` : ''}
        </p>
      </div>

      {/* Round 171's ticket policy, Round 467's food, and the reactions. */}
      <div className="bg-card border border-border rounded-xl p-3" data-pricing-desk>
        <div className="flex items-baseline justify-between gap-2 mb-1.5">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">🎟️ Prices</div>
          <div className="text-[9px] text-muted-foreground" data-fan-mood={fanMeter(c).shown}>Fans: <span className="font-bold text-foreground">{fanMeter(c).band}</span></div>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {TICKET_TIERS.map((tt, i) => (
            <button
              key={tt.label}
              onClick={() => onTickets(i as 0 | 1 | 2)}
              className={cn(
                'rounded-lg border p-1.5 text-left transition-colors',
                ticketTier === i ? 'border-primary bg-primary/10' : 'border-border bg-background/40 hover:border-primary',
              )}
            >
              <div className="text-[11px] font-bold text-foreground">{tt.emoji} {tt.label}</div>
              <div className="text-[9px] text-muted-foreground mt-0.5">{tt.blurb}</div>
            </button>
          ))}
        </div>
        <p className="text-[9px] text-muted-foreground mt-1">Tickets about £{ticketPerFan(c)} a head. {tReact.fans} {tReact.board}</p>
        <div className="grid grid-cols-3 gap-1.5 mt-1.5">
          {CONCESSION_TIERS.map((ct, i) => (
            <button
              key={ct.label}
              onClick={() => onConcessions(i as ConcessionTier)}
              className={cn(
                'rounded-lg border p-1.5 text-left transition-colors',
                books.concessionTier === i ? 'border-primary bg-primary/10' : 'border-border bg-background/40 hover:border-primary',
              )}
            >
              <div className="text-[11px] font-bold text-foreground">{ct.emoji} {ct.label}</div>
              <div className="text-[9px] text-muted-foreground mt-0.5">{ct.blurb}</div>
            </button>
          ))}
        </div>
        <p className="text-[9px] text-muted-foreground mt-1">Food and drink about £{concessionPerFan(c)} a head, lifted by the stadium level. {cReact.fans} {cReact.board} The mood also follows the last five results, and it moves your home crowd: 0.9x furious, 1.1x singing.</p>
      </div>

      {/* Round 200: the commercial desk. Round 467: reach, a push, and a bad brand. */}
      <div data-sponsor-desk className="bg-card border border-border rounded-xl p-3">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">🤝 Shirt sponsor</div>
        {c.sponsor ? (
          <>
            <p className="text-xs text-foreground">
              <span className="font-bold">{c.sponsor.brand}</span>
              {c.sponsor.reach ? ` (${c.sponsor.reach})` : ''} pay {money(c.sponsor.perSeason)} a season.
              {c.sponsor.bonus > 0 && c.sponsor.bonusFor
                ? ` Plus ${money(c.sponsor.bonus)} for ${BONUS_FOR[c.sponsor.bonusFor]}.`
                : ' No bonuses, just the cheque.'}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {c.sponsor.yearsLeft === 1 ? 'Final season of the deal.' : `${c.sponsor.yearsLeft} seasons left.`} Paid so far: <span className="font-bold text-foreground">{money(c.sponsor.paid)}</span>.
              {c.sponsor.rep === 'bad' ? ' The fans hate the shirt: 6 off the meter for as long as you wear it, and the ground thins out.' : ''}
            </p>
          </>
        ) : (
          <>
            <p className="text-[10px] text-muted-foreground mb-2">
              Offers on the table. The money lands in the same kitty as everything else, this season and every season the deal runs. Push for more and the brand comes up six percent, or walks.
            </p>
            <div className="space-y-1.5">
              {good.map(o => (
                <div key={o.id} className="rounded-lg border border-border bg-background/40 p-2">
                  <div data-sponsor-offer={o.id}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-foreground truncate">{o.brand} <span className="font-normal text-muted-foreground">({o.reach})</span></span>
                      <span className="text-[11px] font-bold text-gold tabular-nums shrink-0">{money(o.perSeason)}/season</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-0.5 leading-snug">
                      {o.pitch} {o.years} season{o.years === 1 ? '' : 's'}.
                      {o.bonus > 0 && o.bonusFor ? ` Bonus ${money(o.bonus)} for ${o.bonusFor === 'title' ? 'the title' : o.bonusFor === 'europe' ? 'Europe' : 'a top half finish'}.` : ''}
                      {o.pushed > 0 ? ` Pushed ${o.pushed === 1 ? 'once' : 'twice'}, up from ${money(o.basePerSeason)}.` : ''}
                    </p>
                    <button
                      onClick={() => onSponsor(o.id)}
                      className="mt-1.5 w-full py-1.5 rounded-lg text-[11px] font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                    >
                      Sign with {o.brand.split(' ')[0]}
                    </button>
                  </div>
                  <button
                    onClick={() => onPush(o.id)}
                    data-sponsor-push={o.id}
                    className="mt-1 w-full py-1 rounded-lg text-[10px] font-bold border border-border text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
                  >
                    Push for more
                  </button>
                </div>
              ))}
              {bad && (
                <div data-sponsor-bad={bad.id} className="rounded-lg border border-red-500/40 bg-red-500/5 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-foreground truncate">{bad.brand} <span className="font-normal text-red-400">(fans will hate it)</span></span>
                    <span className="text-[11px] font-bold text-gold tabular-nums shrink-0">{money(bad.perSeason)}/season</span>
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-0.5 leading-snug">
                    {bad.pitch} {bad.years} seasons, no bonus. Costs the fans 6 mood the day you sign and 8 off their target every week after, and buys a point with the board.
                    {bad.pushed > 0 ? ` Pushed ${bad.pushed === 1 ? 'once' : 'twice'}, up from ${money(bad.basePerSeason)}.` : ''}
                  </p>
                  <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                    <button
                      onClick={() => onSponsor(bad.id)}
                      className="py-1.5 rounded-lg text-[11px] font-bold bg-red-500/80 text-white hover:opacity-90 transition-opacity"
                    >
                      Take the money
                    </button>
                    <button
                      onClick={() => onPush(bad.id)}
                      data-sponsor-push={bad.id}
                      className="py-1.5 rounded-lg text-[10px] font-bold border border-border text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
                    >
                      Push for more
                    </button>
                  </div>
                </div>
              )}
              {books.walked.length > 0 && (
                <p className="text-[9px] text-muted-foreground">{books.walked.length === 1 ? 'One brand has' : `${books.walked.length} brands have`} walked this season after one push too many.</p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Round 171: the books card. */}
      <div className="bg-card border border-border rounded-xl p-3">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">💰 The books</div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-sm font-bold font-display text-foreground">{money(c.budget)}</div>
            <div className="text-[9px] text-muted-foreground">Transfer kitty</div>
          </div>
          <div>
            <div className="text-sm font-bold font-display text-emerald-400">{c.finance?.seasonGate ? money(c.finance.seasonGate) : money(0)}</div>
            <div className="text-[9px] text-muted-foreground">Matchday money this season</div>
          </div>
          <div>
            <div className="text-sm font-bold font-display text-foreground">{c.finance?.lastGate ? money(c.finance.lastGate) : '-'}</div>
            <div className="text-[9px] text-muted-foreground">Last home gate</div>
          </div>
        </div>
        <p className="text-[9px] text-muted-foreground mt-1.5">Every home crowd pays the kitty: attendance times about £{gatePricePerFan(c)} a head, tickets plus food and drink at your prices. Scouts, the academy, the facilities and the staff desk spend from the same kitty in their own tabs. What you have left in August rolls into next season on top of the board's new cheque, up to one more season's worth of it.</p>
      </div>
    </div>
  );
}
