import { useEffect, useState } from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute } from 'node:path';
import AppearanceBuilder from '@/components/soccer-career/AppearanceBuilder';
import { careerAppearanceCopy, type AppearanceSport } from '@/lib/careerAppearanceCopy';
import { FACIAL_HAIR, HAIR_COLORS, HAIRSTYLES, SKIN_TONES, SOCCER_FACIAL_HAIR, SOCCER_HAIRSTYLES,
  type AppearanceOption, type PlayerAppearance } from '@/lib/soccerCareerAppearance';

const SPORTS = ['soccer', 'nfl', 'nba', 'mlb', 'nhl'] as const;
const TARGETS = ['category', 'skinTone', 'hairstyle', 'hairColor', 'facialHair', 'boots', 'accessory', 'celebration'] as const;
type Target = typeof TARGETS[number];
type Field = Exclude<Target, 'category'>;
type View = ReturnType<typeof render>;
const CATEGORY_IDS = ['face', 'hair', 'beard', 'boots', 'extras', 'celebration'] as const;
const FIELD_TAB: Record<Field, number> = { skinTone: 0, hairstyle: 1, hairColor: 1, facialHair: 2, boots: 3, accessory: 4, celebration: 5 };
const LOOK: PlayerAppearance = Object.freeze({ skinTone: 'honey', hairstyle: 'braids', hairColor: 'purple', facialHair: 'goatee',
  celebration: 'knee_slide', boots: 'vortex_strike', accessory: 'chain' });
const CAUSE = 'ACCESSIBLE_APPEARANCE_SELECTION';
const titleFor = (sport: AppearanceSport, target: Target) => `${sport} appearance ${target} exposes its selected button`;
const caseTitles = SPORTS.flatMap(sport => TARGETS.map(target => titleFor(sport, target)));
const observations: Record<string, Record<string, unknown>> = {};
let draws: number[] = [];
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

function stores() {
  const read = (storage: Storage) => Object.fromEntries(Array.from({ length: storage.length }, (_, index) => storage.key(index)!)
    .sort().map(key => [key, storage.getItem(key)]));
  return { local: read(localStorage), session: read(sessionStorage) };
}

function Editor({ sport, saved, onEdit }: {
  sport: AppearanceSport; saved: PlayerAppearance; onEdit: (next: PlayerAppearance) => void;
}) {
  const [appearance, setAppearance] = useState(saved);
  useEffect(() => { setAppearance(saved); }, [saved]);
  return <>
    <AppearanceBuilder appearance={appearance} sport={sport} onChange={next => { onEdit(next); setAppearance(next); }} />
    <output data-testid="selected-appearance">{JSON.stringify(appearance)}</output>
  </>;
}

const editor = (view: View) => view.container.firstElementChild as HTMLElement;
const savedJSON = (view: View) => view.getByTestId('selected-appearance').textContent!;
const buttons = (view: View) => Array.from(editor(view).querySelectorAll<HTMLButtonElement>('button'));
const categories = (view: View) => buttons(view).slice(1, 7);
const categoryLabels = (sport: AppearanceSport) => ['Skin', 'Hair', 'Beard', careerAppearanceCopy(sport).gearLabel, 'Extras', 'Celebration'];
function choices(sport: AppearanceSport, field: Field): readonly AppearanceOption[] {
  const copy = careerAppearanceCopy(sport);
  switch (field) {
    case 'skinTone': return SKIN_TONES;
    case 'hairstyle': return sport === 'soccer' ? SOCCER_HAIRSTYLES : HAIRSTYLES;
    case 'hairColor': return HAIR_COLORS;
    case 'facialHair': return sport === 'soccer' ? SOCCER_FACIAL_HAIR : FACIAL_HAIR;
    case 'boots': return copy.boots;
    case 'accessory': return copy.accessories;
    case 'celebration': return copy.celebrations;
  }
}
function fieldButtons(view: View, sport: AppearanceSport, field: Field) {
  const options = choices(sport, field), hair = FIELD_TAB[field] === 1;
  const all = buttons(view);
  const hairstyles = choices(sport, 'hairstyle');
  expect(all).toHaveLength(7 + (hair ? hairstyles.length + HAIR_COLORS.length : options.length));
  const start = 7 + (field === 'hairColor' ? hairstyles.length : 0);
  const group = all.slice(start, start + options.length);
  group.forEach((button, index) => {
    const option = options[index];
    if (field === 'skinTone' || field === 'hairColor') expect(button).toHaveAccessibleName(option.label);
    else expect(button).toHaveTextContent(option.label);
  });
  return group;
}

function capture(view: View, label: string, options: readonly { id: string; label: string }[], group: HTMLElement[],
  selectedId: string, callbackCount: number) {
  expect(group).toHaveLength(options.length);
  const states = group.map((button, index) => ({ id: options[index].id, label: options[index].label,
    text: button.textContent, pressed: button.getAttribute('aria-pressed') }));
  const selectionCorrect = states.filter(state => state.pressed === 'true').length === 1
    && states.every(state => state.pressed === (state.id === selectedId ? 'true' : 'false'));
  return { label, selectedId, stateJSON: savedJSON(view), callbackCount, buttons: states, selectionCorrect };
}

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('fixture-appearance-local', 'unchanged');
  sessionStorage.setItem('fixture-appearance-session', 'unchanged');
  draws = [];
  vi.spyOn(Math, 'random').mockImplementation(() => { draws.push(0.4); return 0.4; });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
afterAll(() => {
  const output = process.env.APPEARANCE_SELECTION_RAW;
  if (!output) return;
  if (!isAbsolute(output)) throw new Error('APPEARANCE_SELECTION_RAW must be absolute');
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify({ version: 1, caseTitles, cases: observations }, null, 2) + '\n', { flag: 'wx' });
});

describe('selected appearance on the actual controlled editor', () => {
  for (const sport of SPORTS) for (const target of TARGETS) {
    it(titleFor(sport, target), () => {
      const key = `${sport}_${target}`, title = titleFor(sport, target);
      const callbacks: PlayerAppearance[] = [], expectedCallbacks: PlayerAppearance[] = [];
      const inputJSON = JSON.stringify(LOOK), storesBefore = stores();
      const external: PlayerAppearance = Object.freeze({ ...LOOK, skinTone: SKIN_TONES[0].id, hairstyle: HAIRSTYLES[0].id,
        hairColor: HAIR_COLORS[0].id, facialHair: FACIAL_HAIR[0].id,
        boots: choices(sport, 'boots')[1].id, accessory: choices(sport, 'accessory')[1].id,
        celebration: choices(sport, 'celebration')[1].id });
      const externalJSON = JSON.stringify(external);
      const onEdit = (next: PlayerAppearance) => callbacks.push(clone(next));
      const view = render(<Editor sport={sport} saved={LOOK} onEdit={onEdit} />);
      const moments: ReturnType<typeof capture>[] = [];
      const row: Record<string, unknown> = { key, title, sport, target, inputJSON, externalJSON, storesBefore,
        callbacks, expectedCallbacks, moments };
      observations[key] = row;
      let expected: PlayerAppearance = LOOK;
      const healthy = () => {
        expect(JSON.parse(savedJSON(view))).toEqual(expected);
        expect(callbacks).toEqual(expectedCallbacks);
        expect(JSON.stringify(LOOK)).toBe(inputJSON);
        expect(JSON.stringify(external)).toBe(externalJSON);
        expect(Object.isFrozen(LOOK)).toBe(true); expect(Object.isFrozen(external)).toBe(true);
        expect(draws).toEqual([]); expect(stores()).toEqual(storesBefore);
      };
      const retain = () => {
        row.finalJSON = savedJSON(view); row.inputAfterJSON = JSON.stringify(LOOK);
        row.externalAfterJSON = JSON.stringify(external); row.storesAfter = stores(); row.draws = [...draws];
        row.selectionCorrect = moments.length > 0 && moments.every(moment => moment.selectionCorrect);
      };
      try {
        healthy();
        const labels = categoryLabels(sport), tabs = categories(view);
        expect(tabs).toHaveLength(6);
        tabs.forEach((button, index) => expect(button).toHaveTextContent(labels[index]));
        if (target === 'category') {
          const options = CATEGORY_IDS.map((id, index) => ({ id, label: labels[index] }));
          moments.push(capture(view, 'initial', options, categories(view), 'face', callbacks.length));
          for (let index = 0; index < CATEGORY_IDS.length; index++) {
            fireEvent.click(categories(view)[index]); healthy();
            moments.push(capture(view, `change:${CATEGORY_IDS[index]}`, options, categories(view), CATEGORY_IDS[index], callbacks.length));
            fireEvent.click(categories(view)[index]); healthy();
            moments.push(capture(view, `reselect:${CATEGORY_IDS[index]}`, options, categories(view), CATEGORY_IDS[index], callbacks.length));
          }
          view.rerender(<Editor sport={sport} saved={external} onEdit={onEdit} />);
          expected = external; healthy();
          moments.push(capture(view, 'saved-prop', options, categories(view), 'celebration', callbacks.length));
          expect(callbacks).toHaveLength(0);
        } else {
          fireEvent.click(categories(view)[FIELD_TAB[target]]); healthy();
          const options = choices(sport, target);
          moments.push(capture(view, 'initial', options, fieldButtons(view, sport, target), LOOK[target], callbacks.length));
          for (let index = 0; index < options.length; index++) {
            const option = options[index];
            expected = { ...expected, [target]: option.id };
            expectedCallbacks.push(clone(expected));
            fireEvent.click(fieldButtons(view, sport, target)[index]); healthy();
            moments.push(capture(view, `change:${option.id}`, options, fieldButtons(view, sport, target), option.id, callbacks.length));
            expectedCallbacks.push(clone(expected));
            fireEvent.click(fieldButtons(view, sport, target)[index]); healthy();
            moments.push(capture(view, `reselect:${option.id}`, options, fieldButtons(view, sport, target), option.id, callbacks.length));
          }
          expect(callbacks).toHaveLength(options.length * 2);
          view.rerender(<Editor sport={sport} saved={external} onEdit={onEdit} />);
          expected = external; healthy();
          moments.push(capture(view, 'saved-prop', options, fieldButtons(view, sport, target), external[target], callbacks.length));
          expect(callbacks).toHaveLength(options.length * 2);
        }
        healthy();
        retain();
        expect(row.selectionCorrect, CAUSE).toBe(true);
      } finally {
        retain();
      }
    });
  }
});
