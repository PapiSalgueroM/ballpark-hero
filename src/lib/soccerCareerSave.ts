const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const text = (v: unknown) => typeof v === 'string';
const number = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
const list = (v: unknown, check: (item: unknown) => boolean): v is unknown[] => Array.isArray(v) && v.every(check);
const fields = (v: Record<string, unknown>, names: string[], check: (item: unknown) => boolean) => names.every(name => check(v[name]));
const phases = ['youth', 'contract_offer', 'playing', 'newspaper', 'season_summary', 'transfer_window', 'random_events', 'international_debut', 'world_cup', 'rivalry_event', 'ballon_dor', 'retirement_ceremony', 'retirement_suggestion', 'post_retirement', 'manager_season', 'pundit_season', 'owner_season', 'social_media_action', 'moral_dilemma', 'red_card_appeal_result', 'rehab_choice', 'retired'];

const season = (v: unknown) => record(v)
  && fields(v, ['club', 'clubCountry', 'type'], text)
  && fields(v, ['year', 'age', 'clubTier', 'apps', 'goals', 'assists', 'cleanSheets', 'yellowCards', 'redCards', 'rating'], number);
const offer = (v: unknown) => record(v) && record(v.club)
  && fields(v.club, ['name', 'country', 'color', 'league'], text) && number(v.club.tier)
  && fields(v, ['contractYears', 'wage'], number);
const event = (v: unknown) => record(v) && number(v.id) && fields(v, ['title', 'description'], text)
  && list(v.choices, choice => record(choice) && fields(choice, ['label', 'consequence'], text)) && v.choices.length > 0;

/* Check the core data the page reads before its optional-field migration.
   Do not fill lost history or require newer phone, money or injury fields.
   Serialized event choices intentionally have no executable apply function. */
const integer = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v);
const generatedGoals = new Map<string, [number, number]>([
  ['ST', [18, 40]], ['LW', [10, 28]], ['RW', [10, 28]], ['CAM', [8, 22]],
  ['CM', [4, 14]], ['CDM', [2, 8]], ['CB', [1, 5]],
]);
const generatedBallonPool = (v: unknown, lastYear: number): boolean => {
  if (!record(v) || v.version !== 1 || !integer(v.year) || v.year < 0 || v.year > lastYear
    || !integer(v.nextId) || !Array.isArray(v.entries) || v.entries.length === 0 || v.nextId !== v.entries.length) return false;
  const poolYear = v.year, names = new Set<string>(), activeSlots = new Set<string>();
  for (let index = 0; index < v.entries.length; index++) {
    const entry: unknown = v.entries[index];
    if (!record(entry)) return false;
    const goals = typeof entry.position === 'string' ? generatedGoals.get(entry.position) : undefined;
    if (entry.id !== index || (entry.role !== 'primary' && entry.role !== 'filler')
      || !integer(entry.slot) || entry.slot < 0 || entry.slot >= (entry.role === 'primary' ? 15 : 20)
      || !integer(entry.seed) || entry.seed < 0 || !integer(entry.firstYear) || entry.firstYear < 0 || entry.firstYear > poolYear
      || !integer(entry.entryAge) || entry.entryAge < 19 || entry.entryAge > 28
      || typeof entry.name !== 'string' || entry.name.trim().length === 0 || names.has(entry.name)
      || typeof entry.nationality !== 'string' || entry.nationality.trim().length === 0
      || typeof entry.club !== 'string' || entry.club.trim().length === 0 || !goals
      || !Array.isArray(entry.baseGoals) || entry.baseGoals.length !== 2
      || entry.baseGoals[0] !== goals[0] || entry.baseGoals[1] !== goals[1]) return false;
    names.add(entry.name);
    if (entry.retiredYear === null) {
      const slot = entry.role + ':' + entry.slot;
      if (entry.entryAge + poolYear - entry.firstYear >= 37 || activeSlots.has(slot)) return false;
      activeSlots.add(slot);
    } else if (!integer(entry.retiredYear) || entry.retiredYear > poolYear
      || entry.retiredYear !== entry.firstYear + 37 - entry.entryAge) return false;
  }
  return true;
};

export function isSoccerCareerSave(value: unknown): boolean {
  if (!record(value)) return false;
  if (!fields(value, ['playerName', 'nationality', 'position', 'era', 'currentClub', 'currentClubCountry', 'currentClubColor', 'currentLeague', 'lifestyleLevel'], text)
    || !fields(value, ['age', 'currentClubTier', 'contractYearsLeft', 'weeklyWage', 'marketValue', 'pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical', 'reflexes', 'overall', 'netWorth', 'socialMediaFollowers', 'popularity', 'morale'], number)
    || typeof value.retired !== 'boolean' || !phases.includes(value.phase as string)) return false;
  if (!list(value.seasons, season) || value.seasons.length === 0
    || !list(value.events, text) || !list(value.pendingEvents, event)
    || !list(value.pendingOffers, offer)
    || !list(value.pendingNews, row => record(row) && fields(row, ['newspaper', 'headline', 'body'], text))
    || !list(value.awards, row => record(row) && number(row.year) && fields(row, ['name', 'emoji'], text))
    || !list(value.properties, text) || !list(value.investments, text)) return false;
  if (!record(value.family) || !number(value.family.children)
    || typeof value.family.isMarried !== 'boolean' || typeof value.family.isDivorced !== 'boolean'
    || !record(value.intStats) || !fields(value.intStats, ['caps', 'goals', 'assists'], number)) return false;
  if (value.pendingSummary != null && !season(value.pendingSummary)) return false;
  if (value.legacy != null && (!record(value.legacy) || !number(value.legacy.score) || !text(value.legacy.tier)
    || !list(value.legacy.breakdown, row => record(row) && text(row.label) && number(row.points)))) return false;
  for (const name of ['managerState', 'ownerState']) {
    const tail = value[name];
    if (tail != null && (!record(tail) || !text(tail.club) || !fields(tail, ['clubTier', 'season', 'trophies', 'promotions'], number)
      || !list(tail.seasonResults, row => record(row) && fields(row, ['club', 'result'], text) && number(row.year)))) return false;
  }
  if (value.ownerState != null && (!record(value.ownerState) || !number(value.ownerState.budget))) return false;
  if (value.punditState != null && (!record(value.punditState) || !fields(value.punditState, ['season', 'controversies'], number)
    || !list(value.punditState.predictions, row => record(row) && text(row.prediction) && typeof row.cameTrue === 'boolean'))) return false;
  if (value.generatedBallonPool !== undefined
    && !generatedBallonPool(value.generatedBallonPool, (value.seasons[value.seasons.length - 1] as { year: number }).year)) return false;
  return true;
}
