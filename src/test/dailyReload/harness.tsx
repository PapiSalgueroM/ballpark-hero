/**
 * Render helpers shared by the daily reload drivers. A page is mounted
 * under the two providers every game page needs (Helmet for PageSeo and
 * GameSeoContent, a MemoryRouter for GameNav, GameNavbar and GameHelp);
 * the auth context, the completion recorder and the Supabase client are
 * mocked by ./mocks, which every driver imports first.
 */
import type { ReactElement } from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

export interface MountedPage {
  container: HTMLElement;
  unmount: () => void;
}

export function mountPage(element: ReactElement, path: string): MountedPage {
  const rendered = render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>{element}</MemoryRouter>
    </HelmetProvider>,
  );
  return { container: rendered.container, unmount: rendered.unmount };
}

export function findButton(root: ParentNode, text: RegExp): HTMLButtonElement | null {
  return Array.from(root.querySelectorAll('button')).find(b => text.test((b.textContent ?? '').trim())) ?? null;
}

export function button(root: ParentNode, text: RegExp): HTMLButtonElement {
  const b = findButton(root, text);
  if (!b) throw new Error(`no button matching ${text} on the page`);
  return b;
}

export async function click(el: Element): Promise<void> {
  await act(async () => { fireEvent.click(el); });
}

/** Round 674 fix: end a live guess board the way a player walks away from a
 *  free run: its Give Up button, and the confirmation when the board asks. */
function giveUpButton(root: ParentNode): HTMLButtonElement | null {
  return Array.from(root.querySelectorAll('button')).find(b => {
    const t = (b.textContent ?? '').trim();
    return /Give Up$/.test(t) && !/^Yes/.test(t);
  }) ?? null;
}

export async function giveUp(root: ParentNode): Promise<void> {
  const give = giveUpButton(root);
  if (!give) throw new Error('no Give Up button on the live board');
  await click(give);
  const yes = findButton(root, /^Yes, Give Up$/);
  if (yes) await click(yes);
}

/** Round 674 fix: the free run pair (see enterFree in ./driver) for a board
 *  whose menu has an Unlimited button and whose live board has a Give Up.
 *  Some boards offer Give Up only after a first guess: `firstGuess` makes
 *  one (a guess of a real name, which may even be right and end the run),
 *  and the run is given up if it is still live. */
export function unlimitedGiveUp(status: (m: MountedPage) => 'playing' | 'finished', label: RegExp = /Unlimited/, firstGuess?: (m: MountedPage) => Promise<void>) {
  return {
    async enterFree(m: MountedPage): Promise<void> {
      await click(button(m.container, label));
      await waitFor(() => { if (status(m) !== 'playing') throw new Error('no live free play board yet'); });
    },
    async finishFree(m: MountedPage): Promise<void> {
      if (firstGuess && !giveUpButton(m.container)) await firstGuess(m);
      if (status(m) === 'playing') await giveUp(m.container);
      await waitFor(() => { if (status(m) !== 'finished') throw new Error('the free run has not finished'); });
    },
  };
}

export async function typeInto(input: Element, value: string): Promise<void> {
  await act(async () => { fireEvent.change(input, { target: { value } }); });
}

/** The shared end of game card (src/components/game/ResultScreen.tsx),
 *  which carries role="status". */
export function resultCard(root: ParentNode): Element | null {
  return root.querySelector('[role="status"]');
}

/** Every number and line on a ResultScreen: the headline, the stat line,
 *  the stat row, the emoji grid and whatever the page renders inside it,
 *  with the buttons (share, play again) left out. */
export function resultText(card: Element): string {
  const clone = card.cloneNode(true) as Element;
  for (const b of Array.from(clone.querySelectorAll('button'))) b.remove();
  return (clone.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/** Shorten every window.setTimeout of half a second or more to a few
 *  milliseconds, for a page whose reveal animation gates a button behind a
 *  timer (Minefield, Pack Battle). Returns the undo. The animation gates a
 *  control, not the game, so nothing under test moves. */
export function shortenTimeouts(): () => void {
  const real = window.setTimeout;
  const quick = ((fn: TimerHandler, ms?: number, ...rest: unknown[]) =>
    real(fn, typeof ms === 'number' && ms >= 500 ? 5 : ms, ...rest)) as typeof window.setTimeout;
  window.setTimeout = quick;
  return () => { if (window.setTimeout === quick) window.setTimeout = real; };
}
