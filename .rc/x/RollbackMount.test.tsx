/* Fixer rollback probe, step 2 (runner only, copied into a worktree of BASE c68bce039): every save the head wrote
   after a seat taken or a year out, mounted on BASE's board. Prints what BASE draws and whether it rewrote storage. */
import { describe, it, expect, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import fs from 'node:fs';
import type { ComponentType } from 'react';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

const DIR = process.env.ROLLBACK_DIR ?? '/tmp/rollback';
const files = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter(f => f.endsWith('.json')).sort() : [];

describe('BASE board mounts the saves the head wrote', () => {
  it('there are saves to mount', () => { expect(files.length).toBeGreaterThan(0); });
  for (const f of files) {
    it(f, async () => {
      const raw = fs.readFileSync(`${DIR}/${f}`, 'utf8');
      const sport = f.split('-')[0];
      const key = sport === 'nhl' ? 'nhl-front-office-save-v1' : 'front-office-save-v1';
      localStorage.clear();
      localStorage.setItem(key, raw);
      const errors: string[] = [];
      const spy = vi.spyOn(console, 'error').mockImplementation((...a: unknown[]) => { errors.push(String(a[0]).slice(0, 120)); });
      const mod = (sport === 'nhl'
        ? await import('@/components/nhl-front-office/NhlFrontOfficeBoard')
        : await import('@/components/front-office/FrontOfficeBoard')) as { default: ComponentType };
      const Board = mod.default;
      render(<Board />);
      await new Promise(r => setTimeout(r, 1500));
      const text = document.body.textContent ?? '';
      const buttons = Array.from(document.querySelectorAll('button')).map(b => (b.textContent ?? '').trim()).filter(Boolean);
      const after = localStorage.getItem(key);
      const s = JSON.parse(raw);
      console.log(`ROLLBACK|${f}|saved phase ${s.phase} fired ${!!s.fired} team ${s.myTeam}|${buttons.length} buttons: ${buttons.slice(0, 10).join(' / ').slice(0, 300)}`
        + `|storage ${after === raw ? 'byte equal' : after === null ? 'DELETED' : 'rewritten'}|console errors ${errors.length}${errors.length ? ': ' + errors.join(' ; ') : ''}`
        + `|Fired by ${/Fired by/.test(text)}|hub boxes ${/Roster/.test(text)}`);
      spy.mockRestore();
      cleanup();
      expect(buttons.length, 'BASE drew nothing').toBeGreaterThan(0);
    });
  }
});
