/**
 * Render helpers shared by the daily reload drivers. A page is mounted
 * under the two providers every game page needs (Helmet for PageSeo and
 * GameSeoContent, a MemoryRouter for GameNav, GameNavbar and GameHelp);
 * the auth context, the completion recorder and the Supabase client are
 * mocked by ./mocks, which every driver imports first.
 */
import type { ReactElement } from 'react';
import { act, fireEvent, render } from '@testing-library/react';
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

export async function typeInto(input: Element, value: string): Promise<void> {
  await act(async () => { fireEvent.change(input, { target: { value } }); });
}
