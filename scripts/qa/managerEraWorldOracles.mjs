// The observed fields and name membership used by the full era harness.
export function startingWorldFacts(world, source) {
  const clubs = Object.keys(source);
  let players = 0, mismatch = 0;
  for (const club of clubs) {
    const held = source[club], projected = world[club];
    if (!projected || projected.length !== held.length) { mismatch += 1; continue; }
    for (let i = 0; i < held.length; i++) {
      players += 1;
      const b = held[i], p = projected[i];
      if (p.n !== b.n || p.p !== b.p || p.a !== b.a || p.r !== b.r || p.v !== b.v || p.g) mismatch += 1;
    }
  }
  return { clubs: clubs.length, players, mismatch,
    expectedPlayers: Object.values(source).reduce((sum, rows) => sum + rows.length, 0) };
}

export function bakedRosterFacts(source, metadata) {
  return { clubs: Object.keys(source).length,
    players: Object.values(source).reduce((sum, rows) => sum + rows.length, 0),
    metadataClubs: metadata.clubs, metadataPlayers: metadata.players };
}

export const realRosterNames = source => new Set(Object.values(source).flat().map(p => p.n));

export function realNameFacts(world, realNames) {
  let generated = 0, unflaggedReal = 0;
  const generatedRealNames = [];
  for (const p of Object.values(world).flat()) {
    if (p.g) {
      generated += 1;
      if (realNames.has(p.n)) generatedRealNames.push(p.n);
    } else if (!realNames.has(p.n)) unflaggedReal += 1;
  }
  return { generated, unflaggedReal, generatedRealNames };
}

export function eraWorldOracleFailures(observation) {
  const failures = [];
  const starting = startingWorldFacts(observation.world0, observation.joined);
  const baked = bakedRosterFacts(observation.baked, observation.bakedMetadata);
  const names = realNameFacts(observation.world5, new Set(observation.realNames));
  if (starting.mismatch) failures.push('year0-identity');
  if (starting.players !== starting.expectedPlayers) failures.push('year0-player-count');
  if (names.unflaggedReal) failures.push('real-name-membership');
  if (names.generatedRealNames.length) failures.push('generated-real-name');
  if (baked.players !== baked.metadataPlayers) failures.push('baked-player-count');
  if (baked.clubs !== baked.metadataClubs) failures.push('baked-club-count');
  return failures;
}
