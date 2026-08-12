(globalThis as any).localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const run = async () => {
  const { LINEUPS } = await import('@/lib/missingXi');
  console.log('lineups:', LINEUPS.length);
  const ids = ['wc-2022-final-argentina','wc-2018-final-france','cl-2013-final-bayern','cl-2020-final-bayern'];
  const news = LINEUPS.filter(l => ids.includes(l.id));
  if (news.length !== 4) throw new Error('missing new entries: ' + news.length);
  for (const l of news) {
    if (l.slots.length !== 11) throw new Error(l.id + ' slots ' + l.slots.length);
    for (const b of l.blankCandidates) {
      if (l.slots[b.slotIndex].name !== b.name) throw new Error(l.id + ' slotIndex mismatch for ' + b.name);
      if (/[—–]/.test(b.fact)) throw new Error(l.id + ' em-dash in fact');
    }
    const names = new Set(l.slots.map(s => s.name));
    if (names.size !== 11) throw new Error(l.id + ' duplicate names');
  }
  const allIds = new Set(LINEUPS.map(l => l.id));
  if (allIds.size !== LINEUPS.length) throw new Error('duplicate lineup ids');
  console.log('4 new XIs: 11 slots each, blanks point at their own slot, no dupes, no em-dashes');
};
run();
