/**
 * The 2026 World Cup knockout bracket as FIFA drew it. Round 396.
 *
 * Until this round the bracket page paired the round of 32 from a template
 * of its own (group winners A to H against thirds, I to L against each
 * other) and handed the thirds to those slots in ranking order. Neither is
 * how the real bracket works, so a player could not rebuild the tournament
 * as played and the page's advertised score was not reachable.
 *
 * What is true, from the tournament as played (the bracket in Wikipedia's
 * knockout-stage article and ESPN's feed, compared programmatically in
 * Round 395) and the article's format section:
 *   - the round of 32 has eight fixed pairings between group winners and
 *     runners-up and eight pairings of a group winner (A, B, D, E, G, I, K
 *     and L) against a third-placed team;
 *   - which third meets which winner depends on WHICH eight groups' thirds
 *     qualified, per Annex C of the regulations, 495 outcomes;
 *   - the bracket order below is the real one: consecutive round-of-32
 *     matches meet in the round of 16, and so on to the final.
 *
 * All 495 outcomes come from Annex C of the May 2026 tournament regulations. Each
 * compact row is the opponent group for winners A, B, D, E, G, I, K and L,
 * in that order. The source matrix was cross-checked cell for cell against the
 * full secondary table. An absent or malformed row fails closed with unresolved
 * third-place slots. Nothing here reads the clock or storage.
 */

export type SeedLabel =
  | `1${string}`
  | `2${string}`
  | { third: number };

/** A round-of-32 match in bracket order: consecutive entries meet in the round of 16. */
export interface R32Slot {
  a: string;
  b: string;
}

export interface PageBracketMatch {
  id: string;
  teamA: string;
  teamB: string;
  winner: string;
}

/**
 * The real bracket order. `3rd` entries are the eight third-place matches; the
 * group letter names the winner they meet, and the third they meet comes from
 * the allocation below.
 */
export const R32_ORDER_2026: [string, string][] = [
  ['1E', '3E'], // match 74
  ['1I', '3I'], // 77
  ['2A', '2B'], // 73
  ['1F', '2C'], // 75
  ['2K', '2L'], // 83
  ['1H', '2J'], // 84
  ['1D', '3D'], // 81
  ['1G', '3G'], // 82
  ['1C', '2F'], // 76
  ['2E', '2I'], // 78
  ['1A', '3A'], // 79
  ['1L', '3L'], // 80
  ['1J', '2H'], // 86
  ['2D', '2G'], // 88
  ['1B', '3B'], // 85
  ['1K', '3K'], // 87
];

/** Winners who face a third-placed team, in Annex C column order. */
export const THIRD_HOSTS = ['A', 'B', 'D', 'E', 'G', 'I', 'K', 'L'] as const;

/**
 * FIFA World Cup 26 Regulations, May 2026, Annex C, options 1 through 495:
 * https://digitalhub.fifa.com/m/636f5c9c6f29771f/original/FWC2026_regulations_EN.pdf
 *
 * Secondary full-table cross-check, 495 of 495 rows equal on 2026-09-01:
 * https://en.wikipedia.org/wiki/Template:2026_FIFA_World_Cup_third-place_table
 *
 * Each eight-letter token is one option in source order. Its letters map to
 * THIRD_HOSTS by position. Keeping the source option order makes the compact
 * corpus auditable against the numbered source table.
 */
export const ANNEX_C_ROWS = `
EJIFHGLK HGIDJFLK EJIDHGLK EJIDHFLK EGIDJFLK EGJDHFLK EGIDHFLK EGJDHFLI EGJDHFIK HGICJFLK EJICHGLK EJICHFLK EGICJFLK EGJCHFLK EGICHFLK
EGJCHFLI EGJCHFIK HGICJDLK CJIDHFLK CGIDJFLK CGJDHFLK CGIDHFLK CGJDHFLI CGJDHFIK EJICHDLK EGICJDLK EGJCHDLK EGICHDLK EGJCHDLI EGJCHDIK
CJEDIFLK CJEDHFLK CEIDHFLK CJEDHFLI CJEDHFIK CGEDJFLK CGEDIFLK CGEDJFLI CGEDJFIK CGEDHFLK CGJDHFLE CGJDHFEK CGEDHFLI CGEDHFIK CGJDHFEI
HJBFIGLK EJIBHGLK EJBFIHLK EJBFIGLK EJBFHGLK EGBFIHLK EJBFHGLI EJBFHGIK HJBDIGLK HJBDIFLK IGBDJFLK HGBDJFLK HGBDIFLK HGBDJFLI HGBDJFIK
EJBDIHLK EJBDIGLK EJBDHGLK EGBDIHLK EJBDHGLI EJBDHGIK EJBDIFLK EJBDHFLK EIBDHFLK EJBDHFLI EJBDHFIK EGBDJFLK EGBDIFLK EGBDJFLI EGBDJFIK
EGBDHFLK HGBDJFLE HGBDJFEK EGBDHFLI EGBDHFIK HGBDJFEI HJBCIGLK HJBCIFLK IGBCJFLK HGBCJFLK HGBCIFLK HGBCJFLI HGBCJFIK EJBCIHLK EJBCIGLK
EJBCHGLK EGBCIHLK EJBCHGLI EJBCHGIK EJBCIFLK EJBCHFLK EIBCHFLK EJBCHFLI EJBCHFIK EGBCJFLK EGBCIFLK EGBCJFLI EGBCJFIK EGBCHFLK HGBCJFLE
HGBCJFEK EGBCHFLI EGBCHFIK HGBCJFEI HJBCIDLK IGBCJDLK HGBCJDLK HGBCIDLK HGBCJDLI HGBCJDIK CJBDIFLK CJBDHFLK CIBDHFLK CJBDHFLI CJBDHFIK
CGBDJFLK CGBDIFLK CGBDJFLI CGBDJFIK CGBDHFLK CGBDHFLJ HGBCJFDK CGBDHFLI CGBDHFIK HGBCJFDI EJBCIDLK EJBCHDLK EIBCHDLK EJBCHDLI EJBCHDIK
EGBCJDLK EGBCIDLK EGBCJDLI EGBCJDIK EGBCHDLK HGBCJDLE HGBCJDEK EGBCHDLI EGBCHDIK HGBCJDEI CJBDEFLK CEBDIFLK CJBDEFLI CJBDEFIK CEBDHFLK
CJBDHFLE CJBDHFEK CEBDHFLI CEBDHFIK CJBDHFEI CGBDEFLK CGBDJFLE CGBDJFEK CGBDEFLI CGBDEFIK CGBDJFEI CGBDHFLE CGBDHFEK HGBCJFDE CGBDHFEI
HJIFAGLK EJIAHGLK EJIFAHLK EJIFAGLK EGJFAHLK EGIFAHLK EGJFAHLI EGJFAHIK HJIDAGLK HJIDAFLK IGJDAFLK HGJDAFLK HGIDAFLK HGJDAFLI HGJDAFIK
EJIDAHLK EJIDAGLK EGJDAHLK EGIDAHLK EGJDAHLI EGJDAHIK EJIDAFLK HJEDAFLK HEIDAFLK HJEDAFLI HJEDAFIK EGJDAFLK EGIDAFLK EGJDAFLI EGJDAFIK
HGEDAFLK HGJDAFLE HGJDAFEK HGEDAFLI HGEDAFIK HGJDAFEI HJICAGLK HJICAFLK IGJCAFLK HGJCAFLK HGICAFLK HGJCAFLI HGJCAFIK EJICAHLK EJICAGLK
EGJCAHLK EGICAHLK EGJCAHLI EGJCAHIK EJICAFLK HJECAFLK HEICAFLK HJECAFLI HJECAFIK EGJCAFLK EGICAFLK EGJCAFLI EGJCAFIK HGECAFLK HGJCAFLE
HGJCAFEK HGECAFLI HGECAFIK HGJCAFEI HJICADLK IGJCADLK HGJCADLK HGICADLK HGJCADLI HGJCADIK CJIDAFLK HJFCADLK HFICADLK HJFCADLI HJFCADIK
CGJDAFLK CGIDAFLK CGJDAFLI CGJDAFIK HGFCADLK CGJDAFLH HGJCAFDK HGFCADLI HGFCADIK HGJCAFDI EJICADLK HJECADLK HEICADLK HJECADLI HJECADIK
EGJCADLK EGICADLK EGJCADLI EGJCADIK HGECADLK HGJCADLE HGJCADEK HGECADLI HGECADIK HGJCADEI CJEDAFLK CEIDAFLK CJEDAFLI CJEDAFIK HEFCADLK
HJFCADLE HJECAFDK HEFCADLI HEFCADIK HJECAFDI CGEDAFLK CGJDAFLE CGJDAFEK CGEDAFLI CGEDAFIK CGJDAFEI HGFCADLE HGECAFDK HGJCAFDE HGECAFDI
HJBAIGLK HJBAIFLK IJBFAGLK HJBFAGLK HGBAIFLK HJBFAGLI HJBFAGIK EJBAIHLK EJBAIGLK EJBAHGLK EGBAIHLK EJBAHGLI EJBAHGIK EJBAIFLK EJBFAHLK
EIBFAHLK EJBFAHLI EJBFAHIK EJBFAGLK EGBAIFLK EJBFAGLI EJBFAGIK EGBFAHLK HJBFAGLE HJBFAGEK EGBFAHLI EGBFAHIK HJBFAGEI IJBDAHLK IJBDAGLK
HJBDAGLK IGBDAHLK HJBDAGLI HJBDAGIK IJBDAFLK HJBDAFLK HIBDAFLK HJBDAFLI HJBDAFIK FJBDAGLK IGBDAFLK FJBDAGLI FJBDAGIK HGBDAFLK HGBDAFLJ
HGBDAFJK HGBDAFLI HGBDAFIK HGBDAFIJ EJBAIDLK EJBDAHLK EIBDAHLK EJBDAHLI EJBDAHIK EJBDAGLK EGBAIDLK EJBDAGLI EJBDAGIK EGBDAHLK HJBDAGLE
HJBDAGEK EGBDAHLI EGBDAHIK HJBDAGEI EJBDAFLK EIBDAFLK EJBDAFLI EJBDAFIK HEBDAFLK HJBDAFLE HJBDAFEK HEBDAFLI HEBDAFIK HJBDAFEI EGBDAFLK
EGBDAFLJ EGBDAFJK EGBDAFLI EGBDAFIK EGBDAFIJ HGBDAFLE HGBDAFEK HGBDAFEJ HGBDAFEI IJBCAHLK IJBCAGLK HJBCAGLK IGBCAHLK HJBCAGLI HJBCAGIK
IJBCAFLK HJBCAFLK HIBCAFLK HJBCAFLI HJBCAFIK CJBFAGLK IGBCAFLK CJBFAGLI CJBFAGIK HGBCAFLK HGBCAFLJ HGBCAFJK HGBCAFLI HGBCAFIK HGBCAFIJ
EJBAICLK EJBCAHLK EIBCAHLK EJBCAHLI EJBCAHIK EJBCAGLK EGBAICLK EJBCAGLI EJBCAGIK EGBCAHLK HJBCAGLE HJBCAGEK EGBCAHLI EGBCAHIK HJBCAGEI
EJBCAFLK EIBCAFLK EJBCAFLI EJBCAFIK HEBCAFLK HJBCAFLE HJBCAFEK HEBCAFLI HEBCAFIK HJBCAFEI EGBCAFLK EGBCAFLJ EGBCAFJK EGBCAFLI EGBCAFIK
EGBCAFIJ HGBCAFLE HGBCAFEK HGBCAFEJ HGBCAFEI IJBCADLK HJBCADLK HIBCADLK HJBCADLI HJBCADIK CJBDAGLK IGBCADLK CJBDAGLI CJBDAGIK HGBCADLK
HGBCADLJ HGBCADJK HGBCADLI HGBCADIK HGBCADIJ CJBDAFLK CIBDAFLK CJBDAFLI CJBDAFIK HFBCADLK CJBDAFLH HJBCAFDK HFBCADLI HFBCADIK HJBCAFDI
CGBDAFLK CGBDAFLJ CGBDAFJK CGBDAFLI CGBDAFIK CGBDAFIJ CGBDAFLH HGBCAFDK HGBCAFDJ HGBCAFDI EJBCADLK EIBCADLK EJBCADLI EJBCADIK HEBCADLK
HJBCADLE HJBCADEK HEBCADLI HEBCADIK HJBCADEI EGBCADLK EGBCADLJ EGBCADJK EGBCADLI EGBCADIK EGBCADIJ HGBCADLE HGBCADEK HGBCADEJ HGBCADEI
CEBDAFLK CJBDAFLE CJBDAFEK CEBDAFLI CEBDAFIK CJBDAFEI HFBCADLE HEBCAFDK HJBCAFDE HEBCAFDI CGBDAFLE CGBDAFEK CGBDAFEJ CGBDAFEI HGBCAFDE
`.trim().split(/\s+/);

const THIRD_ALLOWED: Record<(typeof THIRD_HOSTS)[number], string> = {
  A: 'CEFHI', B: 'EFGIJ', D: 'BEFIJ', E: 'ABCDF',
  G: 'AEHIJ', I: 'CDFGH', K: 'DEIJL', L: 'EHIJK',
};

/** Exact allocations keyed by the sorted set of eight qualifying groups. */
export const THIRD_ALLOCATIONS: Record<string, Record<string, string>> = {};
for (const row of ANNEX_C_ROWS) {
  const groups = [...row];
  if (groups.length !== 8 || new Set(groups).size !== 8) continue;
  if (THIRD_HOSTS.some((host, index) => !THIRD_ALLOWED[host].includes(groups[index]))) continue;
  const key = [...groups].sort().join('');
  if (THIRD_ALLOCATIONS[key]) continue;
  THIRD_ALLOCATIONS[key] = Object.fromEntries(THIRD_HOSTS.map((host, index) => [host, groups[index]]));
}

export interface ThirdEntry { team: string; group: string }
export interface GroupSeedLike { first: string; second: string }

export interface BuiltR32 {
  slots: R32Slot[];
  /** 'official' for an Annex C allocation, else fail closed as 'unverified'. */
  allocation: 'official' | 'unverified';
  /** winner letter to the group letter of the third it meets */
  thirds: Record<string, string>;
}

/**
 * Builds the round of 32 from group seeds and the eight qualified thirds.
 * @param seeds group letter to first and second
 * @param thirds the eight qualified third-placed teams with their group
 *   letters, in ranking order (best first)
 */
export function buildRound32(seeds: Record<string, GroupSeedLike>, thirds: ThirdEntry[]): BuiltR32 {
  const eight = thirds.slice(0, 8);
  const key = eight.map(t => t.group).sort().join('');
  const exact = eight.length === 8 && new Set(eight.map(t => t.group)).size === 8
    ? THIRD_ALLOCATIONS[key]
    : undefined;
  const byGroup = new Map(eight.map(t => [t.group, t.team]));
  const map: Record<string, string> = {};
  if (exact) {
    for (const host of THIRD_HOSTS) map[host] = exact[host];
  }
  const resolve = (label: string): string => {
    const pos = label[0];
    const group = label.slice(1);
    if (pos === '3') { const g = map[group]; return (g && byGroup.get(g)) || 'TBD'; }
    const seed = seeds[group];
    if (!seed) return 'TBD';
    return (pos === '1' ? seed.first : seed.second) || 'TBD';
  };
  return {
    slots: R32_ORDER_2026.map(([a, b]) => ({ a: resolve(a), b: resolve(b) })),
    allocation: exact ? 'official' : 'unverified',
    thirds: map,
  };
}

/** A stored pick only counts while it is one of the two teams in its slot. */
export function validPick(pick: string | undefined, teamA: string, teamB: string): string {
  if (!pick || !teamA || !teamB || teamA === 'TBD' || teamB === 'TBD') return '';
  return pick === teamA || pick === teamB ? pick : '';
}

/** Builds the same six round arrays the bracket page renders and scores. */
export function buildKnockoutRounds(
  round32: R32Slot[],
  picks: Record<string, string>,
): PageBracketMatch[][] {
  const rounds: PageBracketMatch[][] = [];
  const first = round32.map((slot, index) => {
    const id = `r32-${index}`;
    return { id, teamA: slot.a, teamB: slot.b, winner: validPick(picks[id], slot.a, slot.b) };
  });
  rounds.push(first);

  const prefixes = ['r16', 'qf', 'sf'] as const;
  let previous = first;
  for (const prefix of prefixes) {
    const next: PageBracketMatch[] = [];
    for (let index = 0; index < previous.length; index += 2) {
      const teamA = previous[index]?.winner || '';
      const teamB = previous[index + 1]?.winner || '';
      const id = `${prefix}-${index / 2}`;
      next.push({ id, teamA, teamB, winner: validPick(picks[id], teamA, teamB) });
    }
    rounds.push(next);
    previous = next;
  }

  const semiFinals = rounds[3];
  const semiFinalLoser = (match: PageBracketMatch | undefined) => {
    if (!match?.winner) return '';
    return match.winner === match.teamA ? match.teamB : match.teamA;
  };
  const thirdA = semiFinalLoser(semiFinals[0]);
  const thirdB = semiFinalLoser(semiFinals[1]);
  rounds.push([{
    id: 'tp-0',
    teamA: thirdA,
    teamB: thirdB,
    winner: validPick(picks['tp-0'], thirdA, thirdB),
  }]);

  const finalA = semiFinals[0]?.winner || '';
  const finalB = semiFinals[1]?.winner || '';
  rounds.push([{
    id: 'f-0',
    teamA: finalA,
    teamB: finalB,
    winner: validPick(picks['f-0'], finalA, finalB),
  }]);

  return rounds;
}
