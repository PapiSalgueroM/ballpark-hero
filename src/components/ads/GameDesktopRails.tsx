import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { normalizeRoutePath } from '@/lib/routePath';
import { isGameRoute } from '@/components/StorageNotice';
import AdBanner, { AD_CONTROL_GAP_PX, AD_RAIL_HEIGHT_PX, AD_RAIL_LABEL_PX } from './AdBanner';
import { usePublicAdEligibility } from './usePublicAdEligibility';
import { DESKTOP_RAIL_MEDIA } from './publicAdEligibility';
import styles from './GameDesktopRails.module.css';
export { isPublicDesktopRailRoute } from './publicAdEligibility';

const playTargets = [
  'a[href], button, input, select, textarea, summary, form, [role="button"], [contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"]), [draggable="true"], .cursor-pointer',
  'canvas, video, svg[viewBox], table, [role="grid"], [role="application"], [class*="aspect-"]',
  '[data-cm-pitch], [data-drill-board], [data-first-touch-board], [data-through-ball-board], [data-soccer-moment-board]',
].join(', ');
const menuTrigger = 'button[aria-label="Open site menu"]';
const menuPanel = '[role="dialog"][data-site-chrome]';

function safeRailOffset(frame: HTMLElement, content: HTMLElement): number | null {
  const left = frame.querySelector('[data-rail-edge="left"]')?.getBoundingClientRect();
  const right = frame.querySelector('[data-rail-edge="right"]')?.getBoundingClientRect();
  const main = content.querySelector('main, [role="main"], #dukb-main');
  if (!main || !left || !right || Math.min(left.width, right.width) < 120 || content.scrollWidth > content.clientWidth + 1) return null;
  if (content.querySelector('[data-game-help-pending], [data-seo-content="loading"], [aria-busy="true"]')) return null;
  const frameTop = frame.getBoundingClientRect().top;
  const nav = content.querySelector('nav[data-site-chrome]');
  const navBottom = Math.max(frameTop, nav?.getBoundingClientRect().bottom ?? frameTop);
  const belowNav = navBottom + AD_CONTROL_GAP_PX;
  let top = belowNav;
  let hasControl = false;
  const near: { box: DOMRect; horizontal: number }[] = [];
  const pinned = new Map<Element, boolean>();
  const scrollsWithPage = (el: Element | null): boolean => {
    if (!el || el === content) return true;
    if (!pinned.has(el)) {
      const position = getComputedStyle(el).position;
      pinned.set(el, position === 'fixed' || position === 'sticky' || !scrollsWithPage(el.parentElement));
    }
    return !pinned.get(el);
  };
  for (const target of content.querySelectorAll(playTargets)) {
    if (target.closest('[data-site-chrome]')) continue;
    const box = target.getBoundingClientRect();
    if (box.width <= 1 || box.height <= 1 || getComputedStyle(target).visibility === 'hidden') continue;
    if (!target.closest('[data-seo-content]')) hasControl = true;
    const horizontal = Math.max(0, Math.min(box.left - left.right, right.left - box.right));
    if (horizontal >= AD_CONTROL_GAP_PX) continue;
    // A fixed or sticky target can pass the full rail as the player scrolls.
    if (!scrollsWithPage(target)) return null;
    // Start below near-edge controls in the navigation band, including Help.
    if (box.top >= navBottom - 1 && box.bottom <= belowNav) top = Math.max(top, box.bottom + AD_CONTROL_GAP_PX);
    near.push({ box, horizontal });
  }
  const height = AD_RAIL_LABEL_PX + AD_RAIL_HEIGHT_PX;
  const contentBottom = content.getBoundingClientRect().bottom;
  if (!hasControl || contentBottom < top + height) return null;
  // Each control rules out one interval of possible rail tops. Move just past
  // each conflict once, keeping both units in the same normal-flow row.
  const blocked = near.map(({box, horizontal}) => {
    const clearance = Math.sqrt(AD_CONTROL_GAP_PX ** 2 - horizontal ** 2);
    return { start: box.top - height - clearance, end: box.bottom + clearance };
  }).sort((a,b) => a.start - b.start);
  const preferred = top;
  for (const interval of blocked) {
    if (top > interval.start && top < interval.end) top = Math.ceil(interval.end - frameTop) + frameTop;
  }
  if (top !== preferred) {
    if (!frame.hasAttribute('data-playable-route')) return null;
    const guide = content.querySelector('[data-seo-content]');
    const playBottom = guide?.getBoundingClientRect().top ?? main.getBoundingClientRect().bottom;
    // An alternate must begin alongside play and within the first screen,
    // with room for at least one full-size control before either ends.
    if (top + 44 > Math.min(playBottom, frameTop + window.innerHeight) || top + height + AD_CONTROL_GAP_PX > contentBottom) return null;
  }
  return top - frameTop;
}

export function GameDesktopRails({ active, children }: { active: boolean; children: ReactNode }) {
  const { pathname } = useLocation();
  const path = normalizeRoutePath(pathname);
  const playable = isGameRoute(path);
  const eligible = usePublicAdEligibility(DESKTOP_RAIL_MEDIA);
  const frame = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [fits, setFits] = useState(false);
  const [clearPath, setClearPath] = useState<string | null>(null);
  const visit = useRef({ allocated: false, retired: false });
  useLayoutEffect(() => { visit.current = { allocated: false, retired: false }; }, [path]);
  useLayoutEffect(() => {
    if (clearPath === path && frame.current?.querySelector('[data-ad-rail] ins')) visit.current.allocated = true;
  }, [clearPath, eligible, fits, path]);
  useLayoutEffect(() => {
    const element = frame.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const media = window.matchMedia(DESKTOP_RAIL_MEDIA);
    const measure = (width: number) => {
      const pageWidth = document.documentElement.clientWidth;
      // A native scrollbar narrows the full page, including its rail frame.
      setFits(width >= 1280 || (media.matches && pageWidth > 0 && width >= pageWidth));
    };
    const check = () => measure(element.clientWidth);
    check();
    const observer = new ResizeObserver(([entry]) => measure(entry.contentRect.width));
    observer.observe(element);
    media.addEventListener('change', check);
    return () => { observer.disconnect(); media.removeEventListener('change', check); };
  }, [active]);

  useLayoutEffect(() => {
    const container = frame.current, game = content.current;
    if (!eligible || !fits || !container || !game) {
      if (visit.current.allocated) visit.current.retired = true;
      setClearPath(null);
      return;
    }
    const measure = (beforePaint = false) => {
      // The edge drawer covers a rail. Closing it must not buy another impression.
      if (document.querySelector(menuTrigger + '[aria-expanded="true"]')) visit.current.retired = true;
      const offset = visit.current.retired || document.querySelector(menuPanel) ? null : safeRailOffset(container, game);
      if (offset === null && visit.current.allocated) {
        visit.current.retired = true;
        if (beforePaint) {
          flushSync(() => setClearPath(null));
          return;
        }
      }
      if (offset !== null) container.style.setProperty('--rail-start', offset + 'px');
      setClearPath(offset !== null ? path : null);
    };
    let pending = 0;
    const schedule = () => {
      if (!pending) pending = requestAnimationFrame(() => { pending = 0; measure(); });
    };
    const resized = new ResizeObserver(schedule);
    resized.observe(game);
    const changed = new MutationObserver(() => {
      // A newly rendered board can cover a filled rail before the next animation frame.
      if (visit.current.allocated && !visit.current.retired) measure(true);
      else schedule();
    });
    changed.observe(game, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'style', 'hidden', 'open', 'aria-busy', 'data-seo-content'] });
    const menu = new MutationObserver(records => {
      if (records.some(record => (record.target instanceof Element && record.target.matches(menuTrigger)) ||
        [...record.addedNodes, ...record.removedNodes].some(node => node instanceof Element && node.matches(menuPanel)))) measure();
    });
    menu.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-expanded'] });
    // A document scroll translates the rails and normal-flow controls together.
    // Scrolling a container inside the game moves its controls independently.
    game.addEventListener('scroll', schedule, true);
    game.addEventListener('focusin', schedule);
    game.addEventListener('transitionend', schedule);
    measure();
    return () => {
      cancelAnimationFrame(pending);
      resized.disconnect();
      changed.disconnect();
      menu.disconnect();
      game.removeEventListener('scroll', schedule, true);
      game.removeEventListener('focusin', schedule);
      game.removeEventListener('transitionend', schedule);
      container.style.removeProperty('--rail-start');
    };
  }, [eligible, fits, path]);

  if (!active) return children;
  const showRails = eligible && fits && clearPath === path;
  return (
    <div ref={frame} className={styles.frame} data-desktop-room={fits ? '' : undefined} data-playable-route={playable ? '' : undefined}>
      <div ref={content} className={styles.game} data-game-desktop-rails="" google-side-rail-overlap="false">
        {children}
      </div>
      {(['left', 'right'] as const).map(side => (
        <div key={side} data-rail-edge={side} data-no-prerender="" className={styles.rail}>
          {showRails && <div key={path} data-ad-rail={side}>
            <AdBanner placement={side === 'left' ? 'left-rail' : 'right-rail'} slot="7540487748" format="vertical" />
          </div>}
        </div>
      ))}
    </div>
  );
}
