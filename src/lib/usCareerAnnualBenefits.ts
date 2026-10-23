import { raiseWithinPotential } from './careerHeadroom';

type Sport = 'nfl' | 'nba' | 'mlb' | 'nhl';
type SupportedCareer = {
  age: number; health: number; morale: number; fanbase: number; ovr: number; pot: number;
  purchased?: string[]; yearlyCosts?: number;
};
type SpendItem = { id: string; category: string; yearly?: number };

/** The recurring support explicitly promised by each sport's shop. */
export function applyUsCareerAnnualBenefits(c: SupportedCareer, sport: Sport, seasonAge: number): string | null {
  const owned = new Set(c.purchased ?? []);
  const nfl = sport === 'nfl';
  const has = (id: string) => owned.has(id) ? 1 : 0;
  const young = seasonAge <= (nfl || sport === 'mlb' ? 26 : 25);
  const health = 6 * has(nfl ? 'private_gym' : 'home_court') + 4 * has(nfl ? 'private_chef' : `chef_${sport}`);
  const rating = (young ? has(nfl ? 'speed_coach' : 'shot_doctor') : 0) + (nfl ? 0 : has('film_room'));
  const morale = 6 * has(nfl ? 'family_thanksgiving' : 'road_family')
    + (nfl ? 0 : 4 * has('barber_chair')) + (sport === 'nhl' ? 4 * has('skate_sharpener') : 0);
  const fanbase = 10 * has(nfl ? 'foundation' : `foundation_${sport}`)
    + (nfl ? 0 : 6 * has('media_company') + 5 * has('tunnel_fits') + 6 * has('courtside_seats'))
    + (sport === 'nhl' ? 5 * has('beer_league') : 0);
  if (!(health || rating || morale || fanbase)) return null;

  const before = { health: c.health, ovr: c.ovr, morale: c.morale, fanbase: c.fanbase };
  c.health = Math.max(c.health, Math.min(100, c.health + health));
  c.ovr = raiseWithinPotential(c.ovr, c.pot, rating);
  c.morale = Math.max(c.morale, Math.min(100, c.morale + morale));
  c.fanbase = Math.max(c.fanbase, Math.min(100, c.fanbase + fanbase));
  const gains = [
    ['health', c.health - before.health], ['rating', c.ovr - before.ovr],
    ['morale', c.morale - before.morale], ['fanbase', c.fanbase - before.fanbase],
  ].filter(([, gain]) => Number(gain) > 0).map(([label, gain]) => `${label} +${gain}`);
  return gains.length ? `Yearly support: ${gains.join(', ')}.` : null;
}

const permanentReceipts = new Set([
  'hometown_field', 'hometown_court', 'minority_stake', 'team_stake', 'junior_stake',
  'music_video', 'shoe_line', 'album', 'signature_shoe',
]);

/** Cancel ongoing support and sell lifestyle assets without undoing earned skills or gifts. */
export function liquidateUsCareerPurchases(c: Pick<SupportedCareer, 'purchased' | 'yearlyCosts'>, items: readonly SpendItem[]): void {
  const catalog = new Map(items.map(item => [item.id, item]));
  if (c.purchased) c.purchased = c.purchased.filter(id => {
    const item = catalog.get(id);
    if (!item) return true;
    if ((item.yearly ?? 0) > 0) return false;
    return item.category === 'body' || item.category === 'family' || permanentReceipts.has(id);
  });
  c.yearlyCosts = 0;
}
