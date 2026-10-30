// Review rBUG-rest (never committed, runner only): appends case C11b to src/test/usCareerHallWall.test.tsx.
// C11 plants a repair that CHANGES the plaque, so the board re-renders with a new career and the keep effect
// re-runs whatever its deps say. C11b plants the common case, a healthy save whose repair changes nothing:
// the hold must still lift and the plaque must go up exactly once, with the loaded name. Run on the head it
// should pass; run after rrmutdeps.mjs (intlRepairPending out of the effect's deps) it should fail.
import fs from 'node:fs';
const file = 'src/test/usCareerHallWall.test.tsx';
const src = fs.readFileSync(file, 'utf8');
for (const need of ["describe('Release BU: a loaded NBA save waits", 'const settle = ', 'function retiredCareer(', 'const mountBoard = ']) {
  if (!src.includes(need)) { console.log(`rrc11b: ABORT, the test file has no ${need}`); process.exit(3); }
}
const add = `

describe('review rBUG-rest: a loaded NBA save whose repair changes nothing', () => {
  it('C11b: the hold lifts on the face alone and the wall is written once, with the loaded plaque', async () => {
    const real = NBA_CAREER_SPORT.intl!;
    let open!: () => void;
    const gate = new Promise<void>(resolve => { open = resolve; });
    const sport: typeof NBA_CAREER_SPORT = {
      ...NBA_CAREER_SPORT,
      intl: { ...real, load: async () => { await gate; const face = await real.load(); return { ...face, repairOnLoad: () => false }; } },
    };
    const c = retiredCareer(NBA_CAREER_SPORT, 1572);
    c.intl = { v: 1, summers: [] };
    localStorage.setItem(sport.saveKey, JSON.stringify({ c, phase: 'retired', teamQuality: 80, coach: null }));
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    const wallWrites = () => writes.mock.calls.filter(([key]) => key === wallKey(sport))
      .map(([, value]) => JSON.parse(String(value)) as { entries: HallWallEntry[] });
    mountBoard(sport);
    await settle();
    await act(async () => { await import('@/lib/usCareerHallWall'); });
    await settle(); await settle();
    expect(wallWrites(), 'nothing goes up while the face is loading').toEqual([]);
    await act(async () => { open(); await gate; await new Promise(resolve => setTimeout(resolve, 50)); });
    await settle(); await settle(); await settle();
    const got = wallWrites();
    expect(got.length, 'the wall is written once after the face lands').toBe(1);
    expect(got[0].entries.map(e => e.name)).toEqual([c.name]);
    writes.mockRestore();
  }, 30000);
});
`;
fs.writeFileSync(file, src.replace(/\s*$/, '') + add);
console.log('rrc11b: appended C11b');
