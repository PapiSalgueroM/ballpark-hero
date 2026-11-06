/* Verified 2026 membership. New dots render sourced colour words with the
   site's decorative palette, never official RGB values. The four existing
   career colours stay as shipped. No real player or squad data is held here. */
export interface KLeagueClub {
  name: string;
  color: string;
  gameSince?: 2026;
  accessHeld?: true;
}

export const K_LEAGUE_2026 = {
  id: 'kleague1',
  label: 'K League 1',
  country: 'South Korea',
  membershipYear: 2026,
  modelOnlyRoster: true,
  clubs: [
    { name: 'Gangwon FC', color: '#f5a800', gameSince: 2026 },
    { name: 'Gwangju FC', color: '#f5d800', gameSince: 2026 },
    { name: 'Gimcheon Sangmu', color: '#d02128', gameSince: 2026, accessHeld: true },
    { name: 'Daejeon Hana Citizen', color: '#5c2d91', gameSince: 2026 },
    { name: 'Bucheon FC 1995', color: '#d02128', gameSince: 2026 },
    { name: 'FC Seoul', color: '#AC1A2F' },
    { name: 'FC Anyang', color: '#5c2d91', gameSince: 2026 },
    { name: 'Ulsan HD', color: '#0053A0' },
    { name: 'Incheon United', color: '#0057b8', gameSince: 2026 },
    { name: 'Jeonbuk Motors', color: '#0C6B3E' },
    { name: 'Jeju SK', color: '#f5a800', gameSince: 2026 },
    { name: 'Pohang Steelers', color: '#C8102E' },
  ] as readonly KLeagueClub[],
};

/** Membership is separate from the game's ordinary player and manager access. */
export function kLeagueMember(name: string): KLeagueClub | undefined {
  return K_LEAGUE_2026.clubs.find(club => club.name === name);
}
