/** Existing match bans reduce the next club season, never a completed row. */
export function serveClubSuspension(apps: number, leagueApps: number, pending?: number) {
  const ban = Number.isFinite(pending) && pending! > 0 ? Math.floor(pending!) : 0;
  const served = Math.min(ban, Math.max(0, apps));
  return { apps: apps - served, leagueApps: Math.max(0, leagueApps - served), served, remaining: ban - served };
}

/** Saved cards in league games and the cups bucket use the same words. */
export function soccerCardLine(yellow: number, red: number): string {
  return [
    yellow > 0 ? `🟨 ${yellow} yellow card${yellow === 1 ? '' : 's'}` : '',
    red > 0 ? `🟥 ${red} red card${red === 1 ? '' : 's'}` : '',
  ].filter(Boolean).join(' · ');
}
