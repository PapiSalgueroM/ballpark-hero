import { afterEach, expect, it, vi } from 'vitest';
import {
  buildMarket, finishSeason, loanOutPlayer, makeOffer, money, offerTerms,
  startCareer, startNegotiation, startNextSeason,
} from '@/lib/clubManager';
import { closeLedger } from '@/lib/clubManagerFinances';

const sellOnPct = 25;

function seedRandom(seed: number) {
  let n = seed;
  return () => {
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
    return n / 4294967296;
  };
}

afterEach(() => vi.restoreAllMocks());

it('pays the negotiated sell-on when the loan club buys the player', () => {
  const random = vi.spyOn(Math, 'random').mockImplementation(seedRandom(927));
  const base = startCareer('Brentford');
  let signed;
  for (const player of [...buildMarket(base)].sort((a, b) => a.price - b.price)) {
    if (player.age > 21 || player.position === 'GK' || player.price < 5) continue;
    const open = startNegotiation(base, player);
    if (!open?.negotiation) continue;
    if (open.negotiation.theirAsk > base.budget * 0.5) break;
    const fee = makeOffer(open, open.negotiation.theirAsk, { sellOnPct });
    const want = fee?.negotiation?.terms?.want;
    if (!fee || !want) continue;
    signed = offerTerms(fee, want);
    if (signed?.negotiation?.status === 'agreed') break;
  }
  expect(signed?.negotiation?.status).toBe('agreed');
  if (!signed) throw new Error('No signing on the test seed');
  const player = signed.squad.find(p => p.sellOnOwed?.pct === sellOnPct);
  expect(player).toBeDefined();
  const clause = player?.sellOnOwed;
  if (!player || !clause) throw new Error('The negotiated sell-on is missing');
  const loan = loanOutPlayer(signed, player.id);
  expect(loan).not.toBeNull();
  if (!loan) throw new Error('The signed player could not go out on loan');
  const season = finishSeason({ ...loan, week: loan.calendar.length }).state;
  const [entry] = season.loanedOut ?? [];
  if (entry?.optionFee === undefined) throw new Error('The loan option is missing');
  const gross = entry.optionFee;
  const cut = Math.round(gross * sellOnPct / 10) / 10;
  expect(cut).toBeGreaterThan(0);

  const ordinary = {
    ...season,
    loanedOut: [{ ...entry, player: { ...entry.player, sellOnOwed: undefined } }],
  };
  const roll = (career: typeof season) => {
    random.mockImplementation(seedRandom(1788458060));
    return startNextSeason(career);
  };
  const withoutClause = roll(ordinary);
  const withClause = roll(season);
  const sale = { name: player.name, from: base.clubName, to: entry.club, fee: gross, season: season.season + 1, week: 0 };
  expect(withoutClause.transferLog).toContainEqual(sale);
  expect(withClause.transferLog).toContainEqual(sale);
  expect(withClause.squad.some(p => p.id === player.id)).toBe(false);

  expect(Math.round((withoutClause.budget - withClause.budget) * 10) / 10).toBe(cut);
  expect(closeLedger(withClause).transferIn).toBeCloseTo(gross - cut, 1);
  expect(withClause.aiHeadlines.some(line => line.includes(clause.club) && line.includes(money(cut)))).toBe(true);
  expect(closeLedger(withoutClause).transferIn).toBe(gross);
});
