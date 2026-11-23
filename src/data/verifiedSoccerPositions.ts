import type { Position } from '@/types/game';

/** Sourced position history for cases not yet covered by the curated table. */
export function verifiedPositionFallback(name: string, primary: Position, club: string | null | undefined): Position[] {
  // Kimmich started at right-back against Chelsea in Bayern's 2019/20 knockout run.
  // https://fcbayern.com/en/news/matchreports/2020/08/match-report-champions-league-r16-fc-bayern-vs-chelsea
  // https://www.uefa.com/newsfiles/UCL/2020/2027132_LU.pdf
  return name === 'Joshua Kimmich' && primary === 'CDM' && (club === 'Bayern Munich' || club === 'FC Bayern Munich')
    ? ['RB']
    : [];
}
