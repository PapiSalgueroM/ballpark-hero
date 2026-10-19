/**
 * Round 1513 review (2026-10-19): what the save points screen says when it
 * refuses. A point another tab removed is said to be gone (a rename said the
 * browser was out of room, a delete said it was still there), a damaged point
 * is named, and a restore with no room says nothing changed.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { SavePointsScreen } from '@/components/club-manager/SavePointsScreen';
import { BrokenSaveRestore } from '@/components/BrokenSaveRestore';
import { CONTINUE_SAVES } from '@/data/continueSaves';
import { SAVE_KEY, startCareer } from '@/lib/clubManager';
import { createPoint, pointText, stageCopy } from '@/lib/cmSavePoints';
import { runSaveKeeper } from '@/lib/saveKeeper';
import { pointKey, pointsIndexKey, readPointsIndex, writePointsIndex } from '@/lib/cmSavePointsStore';
import { DifficultyOption } from '@/components/club-manager/StartOptionsScreen';
import { activeSlot } from '@/lib/clubManagerSlots';

afterEach(() => { cleanup(); localStorage.clear(); });

function screenWithOnePoint(name: string) {
  const c = startCareer('Everton');
  const r = createPoint(1, c, name);
  if (!r.ok) throw new Error('the point was not made');
  const v = render(<SavePointsScreen career={c} slot={1} />);
  return { c, id: r.meta.id, v };
}

/** Another tab deletes the point while this screen still lists it. */
function goneBehindItsBack(id: string) {
  const idx = readPointsIndex(1)!;
  localStorage.setItem(pointsIndexKey(1), JSON.stringify({ ...idx, points: idx.points.filter(p => p.id !== id) }));
  localStorage.removeItem(pointKey(1, id));
}

const note = (v: ReturnType<typeof render>) => v.getByTestId('cm-point-note').textContent ?? '';

describe('the save points screen names the right cause', () => {
  it('a delete of a point another tab removed says it is gone, not still there', () => {
    const { id, v } = screenWithOnePoint('Before the derby');
    goneBehindItsBack(id);
    fireEvent.click(v.getByTestId('cm-point-delete'));
    fireEvent.click(v.getByTestId('cm-point-confirm'));
    expect(note(v)).toBe('That save point is not in this browser any more.');
    expect(v.queryAllByTestId('cm-point-row')).toHaveLength(0);
  });

  it('a rename of a point another tab removed says it is gone, not out of room', () => {
    const { id, v } = screenWithOnePoint('Before the derby');
    goneBehindItsBack(id);
    fireEvent.click(v.getByTestId('cm-point-rename'));
    fireEvent.change(v.getByTestId('cm-point-new-name'), { target: { value: 'After the derby' } });
    fireEvent.click(v.getByTestId('cm-point-confirm'));
    expect(note(v)).toBe('That save point is not in this browser any more.');
  });

  it('a rename the browser refuses still says it is out of room', () => {
    const { v } = screenWithOnePoint('Before the derby');
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function refuse() { throw new DOMException('full', 'QuotaExceededError'); };
    try {
      fireEvent.click(v.getByTestId('cm-point-rename'));
      fireEvent.change(v.getByTestId('cm-point-new-name'), { target: { value: 'After the derby' } });
      fireEvent.click(v.getByTestId('cm-point-confirm'));
    } finally {
      Storage.prototype.setItem = set;
    }
    expect(note(v)).toContain('out of room');
  });

  it('the restore confirm names the three kept aside cap only when a restore may drop one', () => {
    const { v } = screenWithOnePoint('Before the derby');
    fireEvent.click(v.getByTestId('cm-point-restore'));
    expect(v.queryByTestId('cm-point-crowded')).toBeNull();
    fireEvent.click(v.getByText('Cancel'));
    for (let i = 1; i <= 3; i += 1) localStorage.setItem(`dukb-club-manager-save.broken-${1700000000000 + i}`, `{"aside":${i}}`);
    fireEvent.click(v.getByTestId('cm-point-restore'));
    expect(v.getByTestId('cm-point-crowded').textContent).toContain('three newest kept aside saves');
  });

  it('a damaged point is named in the refusal, and nothing is staged', () => {
    const { id, v } = screenWithOnePoint('Before the derby');
    const packed = localStorage.getItem(pointKey(1, id))!;
    const mid = Math.floor(packed.length / 2);
    localStorage.setItem(pointKey(1, id), packed.slice(0, mid) + String.fromCharCode(packed.charCodeAt(mid) ^ 1) + packed.slice(mid + 1));
    fireEvent.click(v.getByTestId('cm-point-restore'));
    fireEvent.click(v.getByTestId('cm-point-confirm'));
    expect(note(v)).toBe('The save point "Before the derby" is damaged and will not open, so nothing changed. You can delete it.');
    expect(localStorage.getItem('dukb-save-pending')).toBeNull();
  });
});

describe('the Difficulty row\'s scores line asks the save points record too', () => {
  it('a season a restore landed in is told it posts no score; an unmarked one keeps the usual line', () => {
    const c = startCareer('Everton');
    const plain = render(<DifficultyOption career={c} />);
    expect(plain.container.querySelector('[data-cm-level-scores]')?.getAttribute('data-cm-level-scores')).toBe('on');
    cleanup();
    expect(writePointsIndex(activeSlot(), { v: 1, points: [], credited: [], blocked: [c.season] })).toBe(true);
    const line = render(<DifficultyOption career={c} />).container.querySelector('[data-cm-level-scores]');
    expect(line?.getAttribute('data-cm-level-scores')).toBe('season');
    expect(line?.textContent).toContain(`Season ${c.season} posts no leaderboard score`);
  });
});

describe('the card after the load says what a save point restore did', () => {
  const entry = CONTINUE_SAVES.find(e => e.saveKey === SAVE_KEY)!;
  const said = () => render(<BrokenSaveRestore pathname="/club-manager" />).getByRole('status').textContent ?? '';

  it('a point equal to the save being played says nothing needed keeping aside, not that it is the kept aside save', () => {
    const text = pointText(startCareer('Everton'));
    localStorage.setItem(SAVE_KEY, text);
    expect(stageCopy(entry, text, localStorage).ok).toBe(true);
    runSaveKeeper();
    const words = said();
    expect(words).toBe('Nothing needed keeping aside.');
    expect(words).not.toContain('This is the save that was kept aside');
  });

  it('a load that refuses the restore says the season still will not post', () => {
    const text = pointText(startCareer('Everton'));
    localStorage.setItem(SAVE_KEY, `${text} `);
    expect(stageCopy(entry, text, localStorage, new Date(Date.now() - 10 * 60 * 1000)).ok).toBe(true);
    runSaveKeeper();
    expect(localStorage.getItem(SAVE_KEY)).toBe(`${text} `);
    expect(said()).toContain('Its season still won\'t post a score.');
  });
});
