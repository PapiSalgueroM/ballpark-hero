(globalThis as any).localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const run = async () => {
  const { seedEmpires, statesOf } = await import('@/lib/imperialism');
  const { NFL_TEAMS } = await import('@/data/conquestData');
  const owners = seedEmpires();
  const total = Object.keys(owners).length;
  console.log('territories:', total);
  const landless = NFL_TEAMS.filter(t => statesOf(owners, t.id).length === 0).map(t => t.id);
  console.log('landless teams:', landless.length ? landless.join(',') : 'none');
  const byTeam: Record<string, string[]> = {};
  for (const [sid, t] of Object.entries(owners)) (byTeam[t] ??= []).push(sid);
  for (const t of Object.keys(byTeam).sort()) console.log(t.padEnd(4), byTeam[t].sort().join(' '));
};
run();
