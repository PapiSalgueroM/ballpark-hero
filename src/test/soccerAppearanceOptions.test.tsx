import { useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import AppearanceBuilder from '@/components/soccer-career/AppearanceBuilder';
import PlayerAvatar from '@/components/soccer-career/PlayerAvatar';
import { ACCESSORIES, FACIAL_HAIR, HAIR_COLORS, HAIRSTYLES, SKIN_TONES, defaultAppearance, getFacialHair, randomAppearance, type PlayerAppearance } from '@/lib/soccerCareerAppearance';
import type { AppearanceSport } from '@/lib/careerAppearanceCopy';

const HAIR = [
  ['texturedcrop', 'Textured Crop'], ['sidefringe', 'Side Fringe'], ['twists', 'Twists'],
  ['shortlocs', 'Short Locs'], ['halfup', 'Half Up'], ['afropuff', 'Afro Puff'],
] as const;
const BEARDS = [
  ['circlebeard', 'Circle Beard'], ['handlebar', 'Handlebar'],
  ['ducktail', 'Ducktail'], ['muttonchops', 'Mutton Chops'],
] as const;
const NEW = [...HAIR.map(([id, label]) => ({ id, label, field: 'hairstyle' as const, tab: 'Hair' })),
  ...BEARDS.map(([id, label]) => ({ id, label, field: 'facialHair' as const, tab: 'Beard' }))];
const LOOK: PlayerAppearance = { skinTone: 'honey', hairstyle: 'bald', hairColor: 'black', facialHair: 'none',
  celebration: 'heart_hands', boots: 'vortex_ghost', accessory: 'chain' };
const svg = (appearance: PlayerAppearance, size = 104) => renderToStaticMarkup(<PlayerAvatar appearance={appearance} size={size} clubColor="#10B981" />);
const legacySvgs = () => Object.fromEntries([32, 52, 104].flatMap(size => [
  ...HAIRSTYLES.map(option => [`${size}/hair/${option.id}`, svg({ ...LOOK, hairstyle: option.id }, size)]),
  ...FACIAL_HAIR.map(option => [`${size}/beard/${option.id}`, svg({ ...LOOK, facialHair: option.id }, size)]),
  ...ACCESSORIES.map(option => [`${size}/accessory/${option.id}`, svg({ ...LOOK, accessory: option.id }, size)]),
  ...SKIN_TONES.map(option => [`${size}/skin/${option.id}`, svg({ ...LOOK, skinTone: option.id }, size)]),
  ...HAIR_COLORS.map(option => [`${size}/colour/${option.id}`, svg({ ...LOOK, hairstyle: 'quiff', facialHair: 'boxed', hairColor: option.id }, size)]),
]));

function Editor({ sport = 'soccer' }: { sport?: AppearanceSport }) {
  const [look, setLook] = useState(LOOK);
  return <><AppearanceBuilder sport={sport} appearance={look} onChange={setLook} />
    <output data-testid="look">{JSON.stringify(look)}</output></>;
}
const saved = (view: ReturnType<typeof render>) => JSON.parse(view.getByTestId('look').textContent!) as PlayerAppearance;
const tab = (view: ReturnType<typeof render>, label: string) => fireEvent.click(view.getByRole('button', { name: new RegExp(`${label}$`) }));

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

if (process.env.APPEARANCE_OPTIONS_CAPTURE === '1') {
  it('captures the actual original avatar for every old option at all three sizes', () => {
    expect(HAIRSTYLES).toHaveLength(23); expect(FACIAL_HAIR).toHaveLength(14);
    const values = legacySvgs();
    expect(Object.keys(values)).toHaveLength(243);
    fs.writeFileSync(process.env.APPEARANCE_OPTIONS_SVG_BASELINE!, JSON.stringify(values));
  });
} else {
  describe('Soccer Career manual hair and beard choices', () => {
    it.each(NEW)('editor $id saves only its chosen field and updates its actual preview', option => {
      const view = render(<Editor />);
      const before = view.getByRole('img', { name: 'Player avatar' }).outerHTML;
      const stores = { ...localStorage };
      tab(view, option.tab);
      fireEvent.click(view.getByRole('button', { name: option.label, exact: true }));
      expect(saved(view)).toEqual({ ...LOOK, [option.field]: option.id });
      expect(view.getByRole('img', { name: 'Player avatar' }).outerHTML, `drawing ${option.id}`).not.toBe(before);
      tab(view, 'Skin'); tab(view, option.tab);
      expect(saved(view)).toEqual({ ...LOOK, [option.field]: option.id });
      expect({ ...localStorage }).toEqual(stores);
    });

    it.each(NEW)('drawing $id is visible and distinct at preview and header sizes', option => {
      for (const size of [32, 52, 104]) for (const skinTone of ['porcelain', 'ebony']) for (const hairColor of ['black', 'platinum']) {
        const base = { ...LOOK, skinTone, hairColor, accessory: 'none' };
        const actual = svg({ ...base, [option.field]: option.id }, size);
        expect(actual, `drawing ${option.id} at ${size}`).not.toBe(svg(base, size));
        const peers = option.field === 'hairstyle' ? HAIR : BEARDS;
        for (const [peer] of peers) if (peer !== option.id) expect(actual).not.toBe(svg({ ...base, [option.field]: peer }, size));
      }
    });

    it.each(['nfl', 'nba', 'mlb', 'nhl'] as const)('%s retains its old hair and beard choices without soccer additions', sport => {
      const view = render(<Editor sport={sport} />);
      for (const [label, choices] of [['Hair', HAIRSTYLES], ['Beard', FACIAL_HAIR]] as const) {
        tab(view, label);
        for (const option of choices) expect(view.getByRole('button', { name: option.label, exact: true })).toBeVisible();
        for (const option of NEW) expect(view.queryByRole('button', { name: option.label, exact: true })).not.toBeInTheDocument();
      }
      expect(saved(view)).toEqual(LOOK);
    });

    it('keeps every old option selectable with its existing saved ID', () => {
      const view = render(<Editor />);
      let expected = { ...LOOK };
      for (const [label, field, choices] of [['Hair', 'hairstyle', HAIRSTYLES], ['Beard', 'facialHair', FACIAL_HAIR]] as const) {
        tab(view, label);
        for (const option of choices) {
          fireEvent.click(view.getByRole('button', { name: option.label, exact: true }));
          expected = { ...expected, [field]: option.id };
          expect(saved(view)).toEqual(expected);
        }
      }
    });

    it('retains original defaults and the exact seven Surprise me draws in all five editors', () => {
      expect(defaultAppearance()).toEqual({ skinTone: 'olive', hairstyle: 'fade', hairColor: 'black', facialHair: 'none',
        celebration: 'knee_slide', boots: 'vortex_strike', accessory: 'none' });
      const random = vi.spyOn(Math, 'random').mockReturnValue(0.4);
      const expected = { skinTone: 'olive', hairstyle: 'mullet', hairColor: 'auburn', facialHair: 'chinstrap',
        celebration: 'binoculars', boots: 'pulse_venom', accessory: 'tape' };
      expect(randomAppearance()).toEqual(expected); expect(random).toHaveBeenCalledTimes(7);
      for (const sport of ['soccer', 'nfl', 'nba', 'mlb', 'nhl'] as const) {
        random.mockClear(); const view = render(<Editor sport={sport} />);
        expect(random).not.toHaveBeenCalled();
        fireEvent.click(view.getByRole('button', { name: /Surprise me/ }));
        expect(saved(view)).toEqual(expected); expect(random).toHaveBeenCalledTimes(7); cleanup();
      }
    });

    it('holds exact original SVG for every old choice at all three sizes', () => {
      const expected = JSON.parse(fs.readFileSync(process.env.APPEARANCE_OPTIONS_SVG_BASELINE!, 'utf8'));
      expect(legacySvgs()).toEqual(expected);
    });

    it('retains unknown-ID fallbacks and resolves every new beard before drawing', () => {
      expect(svg({ ...LOOK, hairstyle: 'unknown-hair' })).toBe(svg(LOOK));
      expect(svg({ ...LOOK, facialHair: 'unknown-beard' })).toBe(svg(LOOK));
      expect(getFacialHair('unknown-beard').id).toBe('none');
      for (const [id] of BEARDS) expect(getFacialHair(id).id).toBe(id);
    });
  });
}
