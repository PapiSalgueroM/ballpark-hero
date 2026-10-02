import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlayerSearch } from '@/components/game/PlayerSearch';
import type { Player } from '@/types/game';

// Fictional search fixtures, not sports records.
function player(name: string): Player {
  return { name, club: 'Fixture Club', nationality: 'Fixture Nation', league: 'Other', goals: 0, assists: 0, position: 'CM', kitNumber: null, age: 25, marketValue: 0, difficulty: 'easy' };
}
const pool = [player('Tamon Fixture'), player('Morgan Fixture'), player('Morris Fixture')];
const ranked = [pool[1], pool[2], pool[0]];

afterEach(() => cleanup());

function mount(players = pool, guessedNames: string[] = []) {
  const selected = vi.fn<(choice: Player) => void>();
  function Host() {
    const [guessed, setGuessed] = useState(guessedNames);
    return <>
      <PlayerSearch players={players} guessedNames={guessed} onSelect={choice => {
        selected(choice);
        setGuessed(prev => [...prev, choice.name]);
      }} />
      <output data-testid="submitted-guesses">{guessed.length - guessedNames.length}</output>
    </>;
  }
  const view = render(<Host />);
  const input = screen.getByLabelText('Search for a player') as HTMLInputElement;
  const options = () => [...view.container.querySelectorAll<HTMLButtonElement>('button')];
  const search = (query: string) => {
    input.focus();
    fireEvent.change(input, { target: { value: query } });
  };
  const key = (value: string) => fireEvent.keyDown(input, { key: value });
  return { ...view, input, selected, options, search, key };
}

describe('Footle search keyboard choices', () => {
  it('visible Enter submits the highlighted Player once and restores search focus', () => {
    const game = mount();
    game.search('mo');
    expect(game.options().map(option => option.textContent)).toEqual(ranked.map(choice => `${choice.name}Fixture Club · Other`));
    game.key('Enter');
    game.key('Enter');
    expect(game.selected).toHaveBeenCalledTimes(1);
    expect(game.selected).toHaveBeenCalledWith(ranked[0]);
    expect(screen.getByTestId('submitted-guesses')).toHaveTextContent('1');
    expect(game.input).toHaveValue('');
    expect(game.options()).toHaveLength(0);
    expect(game.input).toHaveFocus();
  });

  it('visible arrow keys preserve bounded selection and exact player identity', () => {
    const game = mount();
    game.search('mo');
    game.key('ArrowUp');
    for (let i = 0; i < 6; i += 1) game.key('ArrowDown');
    game.key('ArrowUp');
    game.key('Enter');
    expect(game.selected).toHaveBeenCalledTimes(1);
    expect(game.selected).toHaveBeenCalledWith(ranked[1]);
  });

  it('pointer choice submits its exact Player once', () => {
    const game = mount();
    game.search('mo');
    fireEvent.click(game.options()[2]);
    expect(game.selected).toHaveBeenCalledTimes(1);
    expect(game.selected).toHaveBeenCalledWith(ranked[2]);
    expect(game.input).toHaveFocus();
    expect(game.options()).toHaveLength(0);
  });

  it('Escape followed by Enter cannot consume a hidden guess', () => {
    const game = mount();
    game.search('mo');
    expect(game.options()).toHaveLength(3);
    game.key('Escape');
    expect(game.options()).toHaveLength(0);
    game.key('Enter');
    expect(screen.getByTestId('submitted-guesses')).toHaveTextContent('0');
    expect(game.selected).not.toHaveBeenCalled();
    expect(game.input).toHaveValue('mo');
  });

  for (const arrow of ['ArrowDown', 'ArrowUp']) {
    it(`${arrow} deliberately reopens canceled suggestions before selection`, () => {
      const game = mount();
      game.search('mo');
      game.key('Escape');
      expect(game.options()).toHaveLength(0);
      game.key(arrow);
      expect(game.options()).toHaveLength(3);
      expect(game.selected).not.toHaveBeenCalled();
      game.key('Enter');
      expect(game.selected).toHaveBeenCalledTimes(1);
      expect(game.selected).toHaveBeenCalledWith(ranked[0]);
    });
  }

  it('empty and one-character searches cannot submit any player', () => {
    const game = mount();
    for (const query of ['', 'm']) {
      game.search(query);
      for (const key of ['ArrowDown', 'ArrowUp', 'Enter']) game.key(key);
      expect(game.options()).toHaveLength(0);
    }
    expect(game.selected).not.toHaveBeenCalled();
    expect(screen.getByTestId('submitted-guesses')).toHaveTextContent('0');
  });

  it('unmatched queries stay invalid with arrows and Enter', () => {
    const game = mount();
    game.search('zzqxyz');
    expect(screen.getByText('No players found')).toBeVisible();
    for (const key of ['ArrowDown', 'ArrowUp', 'Enter', 'Escape', 'Enter']) game.key(key);
    expect(game.options()).toHaveLength(0);
    expect(game.selected).not.toHaveBeenCalled();
  });

  it('already guessed names are excluded without changing ranking', () => {
    const game = mount(pool, ['mOrGaN fIxTuRe', 'MORRIS FIXTURE']);
    game.search('mo');
    expect(game.options()).toHaveLength(1);
    expect(game.options()[0]).toHaveTextContent(ranked[2].name);
    game.key('Enter');
    expect(game.selected).toHaveBeenCalledWith(ranked[2]);
    game.search('mo');
    expect(game.options()).toHaveLength(0);
    game.key('Enter');
    expect(game.selected).toHaveBeenCalledTimes(1);
  });

  it('matching remains ranked with a ten-result limit', () => {
    const matching = Array.from({ length: 11 }, (_, i) => player(`Morgan Fixture ${i}`));
    const game = mount([pool[0], ...matching, player('Unrelated Fixture')]);
    game.search('mo');
    expect(game.options()).toHaveLength(10);
    expect(game.options().map(option => option.textContent)).toEqual(matching.slice(0, 10).map(choice => `${choice.name}Fixture Club · Other`));
    game.search('Morgan 10');
    expect(game.options()).toHaveLength(1);
    game.key('Enter');
    expect(game.selected).toHaveBeenCalledTimes(1);
    expect(game.selected).toHaveBeenCalledWith(matching[10]);
  });

  it('changing the query resets selection to a real current option', () => {
    const game = mount();
    game.search('mo');
    game.key('ArrowDown');
    game.key('ArrowDown');
    game.search('morg');
    expect(game.options()).toHaveLength(1);
    game.key('Enter');
    expect(game.selected).toHaveBeenCalledTimes(1);
    expect(game.selected).toHaveBeenCalledWith(ranked[0]);
  });

  it('combobox announces only visible results and its selected option', () => {
    const game = mount();
    expect(game.input).toHaveAttribute('role', 'combobox');
    expect(game.input).toHaveAttribute('aria-expanded', 'false');
    expect(game.input).not.toHaveAttribute('aria-activedescendant');
    game.search('mo');
    const listbox = screen.getByRole('listbox', { name: 'Player suggestions' });
    const options = screen.getAllByRole('option');
    expect(game.input).toHaveAttribute('aria-controls', listbox.id);
    expect(game.input).toHaveAttribute('aria-expanded', 'true');
    expect(game.input).toHaveAttribute('aria-autocomplete', 'list');
    expect(game.input).toHaveAttribute('aria-activedescendant', options[0].id);
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    game.key('ArrowDown');
    expect(game.input).toHaveAttribute('aria-activedescendant', options[1].id);
    expect(options[0]).toHaveAttribute('aria-selected', 'false');
    expect(options[1]).toHaveAttribute('aria-selected', 'true');
    game.key('Escape');
    expect(game.input).toHaveAttribute('aria-expanded', 'false');
    expect(game.input).not.toHaveAttribute('aria-controls');
    expect(game.input).not.toHaveAttribute('aria-activedescendant');
    expect(game.selected).not.toHaveBeenCalled();
  });
});
