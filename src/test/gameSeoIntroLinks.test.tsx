import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { loadGameContent } from '@/data/gameContent/loader';
import type { GameContent } from '@/data/gameContent/types';

const fixture = vi.hoisted(() => ({ value: undefined as GameContent | undefined }));
vi.mock('@/data/gameContent/loader', async () => {
  const actual = await vi.importActual<typeof import('@/data/gameContent/loader')>('@/data/gameContent/loader');
  return {
    ...actual,
    peekGameContent: (route: string) => fixture.value ?? actual.peekGameContent(route),
    loadGameContent: (route: string) => fixture.value ? Promise.resolve(fixture.value) : actual.loadGameContent(route),
  };
});

let soccer: GameContent;
let academy: GameContent;
beforeAll(async () => {
  const career = await loadGameContent('/soccer-career');
  const kids = await loadGameContent('/wonderkid-factory');
  if (!career || !kids) throw new Error('The actual registered guides must load');
  soccer = career; academy = kids;
}, 30000);
afterEach(() => { cleanup(); fixture.value = undefined; });

function renderGuide(route: string, content?: GameContent) {
  fixture.value = content;
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[route]}>
        <GameSeoContent title="Existing guide" description="Existing guide" pageHasOwnH1 reportControl={false} />
      </MemoryRouter>
    </HelmetProvider>,
  );
}
function intro(container: HTMLElement) {
  const element = container.querySelector('section[data-seo-content="ready"] article > div');
  if (!(element instanceof HTMLElement)) throw new Error('The real ready intro must render');
  return element;
}
function escaped(paragraph: Element, text: string, phrase: string) {
  expect(paragraph.textContent).toBe(text);
  expect(paragraph.querySelectorAll('em,strong,script')).toHaveLength(0);
  expect([...paragraph.children].map(child => child.tagName)).toEqual(['A']);
  const link = paragraph.querySelector('a');
  expect(link).toHaveAttribute('href', '/wonderkid-factory');
  expect(link).toHaveTextContent(phrase);
}

describe('contextual links in the actual game guide', () => {
  it.each([
    { paragraph: 0, text: 'Wonderkid Factory', href: '/wonderkid-factory' },
    { paragraph: 1, text: 'Contract Chaos', href: '/contract-chaos' },
  ])('renders $text once inside its complete Soccer Career paragraph', target => {
    const { container } = renderGuide('/soccer-career');
    const paragraph = intro(container).children[target.paragraph];
    const links = [...paragraph.querySelectorAll('a')].filter(link => link.textContent === target.text);
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', target.href);
    expect(paragraph.textContent).toBe(soccer.intro[target.paragraph]);
  });

  it('keeps a real unannotated academy intro as plain original text', () => {
    const { container } = renderGuide('/wonderkid-factory');
    const paragraphs = [...intro(container).children];
    expect(paragraphs.map(paragraph => paragraph.textContent)).toEqual(academy.intro);
    expect(intro(container).querySelectorAll('a')).toHaveLength(0);
  });

  it('renders a missing phrase exactly like the same unannotated intro', () => {
    const content: GameContent = { ...soccer, intro: ['Plain & <em>literal</em> text.'], introLinks: undefined };
    const plain = renderGuide('/soccer-career', content);
    const expected = intro(plain.container).innerHTML;
    plain.unmount();
    const annotated = renderGuide('/soccer-career', { ...content, introLinks: [{ paragraph: 0, text: 'not present', to: '/wonderkid-factory' }] });
    expect(intro(annotated.container).innerHTML).toBe(expected);
    expect(intro(annotated.container).querySelectorAll('a,em')).toHaveLength(0);
  });

  it('escapes surrounding and linked literal tags while introducing one real anchor', () => {
    const phrase = '<strong>plain & safe</strong>', text = 'Before <em>literal</em> & ' + phrase + ' > after';
    const content: GameContent = { ...soccer, intro: [text], introLinks: [{ paragraph: 0, text: phrase, to: '/wonderkid-factory' }] };
    const { container } = renderGuide('/soccer-career', content);
    escaped(intro(container).children[0], text, phrase);
  });

  it('rejects a real injected element in the escaping observation and restores cleanly', () => {
    const phrase = '<strong>plain & safe</strong>', text = 'Before <em>literal</em> & ' + phrase + ' > after';
    const content: GameContent = { ...soccer, intro: [text], introLinks: [{ paragraph: 0, text: phrase, to: '/wonderkid-factory' }] };
    const first = renderGuide('/soccer-career', content), paragraph = intro(first.container).children[0];
    escaped(paragraph, text, phrase);
    const node = [...paragraph.childNodes].find(node => node.nodeType === Node.TEXT_NODE && node.textContent?.includes('<em>literal</em>'));
    if (!node || node.textContent === null) throw new Error('The literal escaping control anchor must exist');
    const [before, after] = node.textContent.split('<em>literal</em>');
    const fragment = document.createDocumentFragment(), em = document.createElement('em');
    em.textContent = 'literal'; fragment.append(before, em, after); node.replaceWith(fragment);
    expect(paragraph.querySelectorAll('em')).toHaveLength(1);
    expect(() => escaped(paragraph, text, phrase)).toThrow();
    first.unmount();
    const restored = renderGuide('/soccer-career', content);
    escaped(intro(restored.container).children[0], text, phrase);
  });
});
