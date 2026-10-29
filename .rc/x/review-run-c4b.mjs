// Reviewer (run lens) for Round 1570. Usage: node .rc/x/review-run-c4b.mjs
// Inserts ONE new board case, C4b, into src/test/usCareerHallWall.test.tsx on the runner (restored by the request line):
// a stored v1 wall already holds ANOTHER plaque, every wall write is refused, and this career retires.
// The prompt must keep 1569's "goes too" (this career is not on the wall), and after New career the create opener
// must read "Hall wall (1)" (the other plaque is still up). The real code should pass it; the hallKeptAny mutation
// (hallKept true for ANY plaque) should fail it. Exit 7 when the anchor is not in the file exactly once.
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = 'src/test/usCareerHallWall.test.tsx';
const ANCHOR = "  it('C7: with no Hall bound (the parity replay) the wall is never read, written or drawn', async () => {";
const CASE = `  it('C4b: a refused wall write with another plaque already up: the prompt says the card goes, the opener reads 1', async () => {
    const other = hallWallEntry(sport, retiredCareer(sport, 1700))!;
    localStorage.setItem(wallKey(sport), JSON.stringify({ v: 1, entries: [{ ...other, key: 'stored-other', name: 'Stored Other' }] }));
    save(sport, retiredCareer(sport, 1571), null, 'retired');
    const real = Storage.prototype.setItem;
    let refused = 0;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
      if (key.endsWith('-my-career-hall-v1')) { refused += 1; throw new DOMException('Controlled quota refusal', 'QuotaExceededError'); }
      real.call(this, key, value);
    });
    mountBoard(sport);
    await waitFor(() => expect(refused, 'the keep effect tried its write').toBeGreaterThan(0), { timeout: 15000 });
    await settle();
    await promptSays(label, 'New career', GONE);
    await promptSays(label, 'Start over', GONE);
    expect(JSON.parse(localStorage.getItem(wallKey(sport))!).entries.map((e: HallWallEntry) => e.key)).toEqual(['stored-other']);
    await restart('New career');
    await waitFor(() => expect(document.querySelector('[data-career-hall-wall-opener="create"]')?.textContent).toContain('Hall wall (1)'), { timeout: 15000 });
  }, 30000);

`;

const src = readFileSync(FILE, 'utf8');
const hits = src.split(ANCHOR).length - 1;
if (hits !== 1) { console.error(`review-run-c4b: anchor found ${hits} times, not once: REFUSED`); process.exit(7); }
writeFileSync(FILE, src.replace(ANCHOR, CASE + ANCHOR));
console.log('review-run-c4b: C4b inserted before C7');
