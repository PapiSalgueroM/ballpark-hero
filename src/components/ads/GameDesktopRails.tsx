import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { normalizeRoutePath } from '@/lib/routePath';
import { isGameRoute } from '@/components/StorageNotice';
import AdBanner, { AD_CONTROL_GAP_PX } from './AdBanner';
import { usePublicAdEligibility } from './usePublicAdEligibility';
import styles from './GameDesktopRails.module.css';
export { isPublicDesktopRailRoute } from './publicAdEligibility';

const playTargets = 'canvas, [role="grid"], form, table, a[href], button, input, select, textarea, summary, [role="button"], [contenteditable="true"]';
const outsideGame = '[data-site-chrome], [data-seo-content]';

function gameFitsBetweenRails(frame: HTMLElement, content: HTMLElement): boolean {
  const left = frame.querySelector('[data-rail-edge="left"]')?.getBoundingClientRect();
  const right = frame.querySelector('[data-rail-edge="right"]')?.getBoundingClientRect();
  const main = content.querySelector('main, [role="main"], #dukb-main');
  if (!main || !left || !right || left.width < 120 || right.width < 120 || content.scrollWidth > content.clientWidth + 1) return false;
  if (content.querySelector('[data-seo-content="loading"], [aria-busy="true"]')) return false;
  const clear = (box: DOMRect) => box.left - left.right >= AD_CONTROL_GAP_PX && right.left - box.right >= AD_CONTROL_GAP_PX;
  const mainBox = main.getBoundingClientRect();
  let bounded = mainBox.width > 1 && mainBox.width < content.clientWidth - 1;
  if (bounded && !clear(mainBox)) return false;
  // The Help strip already has its final width while its button is downloading.
  for (const area of content.querySelectorAll('[data-game-play-area], .mx-auto[class*="max-w-"]')) {
    if (area.closest(outsideGame)) continue;
    const box = area.getBoundingClientRect();
    if (box.width <= 1) continue;
    bounded = true;
    if (!clear(box)) return false;
  }
  if (!bounded) return false;
  let hasControl = false;
  for (const target of content.querySelectorAll(playTargets)) {
    if (target.closest(outsideGame)) continue;
    const box = target.getBoundingClientRect();
    if (box.width <= 1 || box.height <= 1 || getComputedStyle(target).visibility === 'hidden') continue;
    hasControl = true;
    if (!clear(box)) return false;
  }
  return hasControl;
}

export function GameDesktopRails({ active, children }: { active: boolean; children: ReactNode }) {
  const { pathname } = useLocation();
  const path = normalizeRoutePath(pathname);
  const playable = isGameRoute(path);
  const eligible = usePublicAdEligibility('(min-width: 1280px)');
  const frame = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [fits, setFits] = useState(false);
  const [clearPath, setClearPath] = useState<string | null>(null);
  useLayoutEffect(() => {
    const element = frame.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    setFits(element.clientWidth >= 1280);
    const observer = new ResizeObserver(([entry]) => setFits(entry.contentRect.width >= 1280));
    observer.observe(element);
    return () => observer.disconnect();
  }, [active]);

  useLayoutEffect(() => {
    const container = frame.current, game = content.current;
    if (!eligible || !fits || !playable || !container || !game) {
      setClearPath(null);
      return;
    }
    const measure = () => {
      const nav = game.querySelector('nav[data-site-chrome]');
      const navBottom = nav ? nav.getBoundingClientRect().bottom - container.getBoundingClientRect().top : 0;
      container.style.setProperty('--rail-start', Math.max(0, navBottom) + AD_CONTROL_GAP_PX + 'px');
      setClearPath(gameFitsBetweenRails(container, game) ? path : null);
    };
    let pending = 0;
    const schedule = () => {
      if (!pending) pending = requestAnimationFrame(() => { pending = 0; measure(); });
    };
    const resized = new ResizeObserver(schedule);
    resized.observe(game);
    const changed = new MutationObserver(schedule);
    changed.observe(game, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'style', 'hidden', 'open', 'aria-busy', 'data-seo-content'] });
    game.addEventListener('scroll', schedule, true);
    measure();
    return () => {
      cancelAnimationFrame(pending);
      resized.disconnect();
      changed.disconnect();
      game.removeEventListener('scroll', schedule, true);
      container.style.removeProperty('--rail-start');
    };
  }, [eligible, fits, playable, path]);

  if (!active) return children;
  const showRails = eligible && fits && (!playable || clearPath === path);
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
