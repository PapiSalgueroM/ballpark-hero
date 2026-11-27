// @vitest-environment node
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { afterEach, expect, it } from 'vitest';
import viteConfig from '../../vite.config';
import { COOKIE_CHOICE_INTRO } from '../lib/cookieChoiceCopy';

const template = readFileSync('index.html', 'utf8');
const marker = /<script data-dukb-host-analytics-default(?:="")?>([\s\S]*?)<\/script>/g;
const sdk = '<script defer src="/__l5e/events.fixture.js"></script>';
const oldBanner = 'Analytics is paused. Google Analytics is off while we check its privacy settings.';
const pausedBanner = 'Google Analytics is paused. Lovable still measures basic visits.';
const oldIntro = 'Essential storage keeps games working. Advertising is optional.';
const adIntro = 'Ads help keep DoUKnowBall free. Accepting advertising helps support the site. You can still play if you reject.';
const readyIntro = 'Ads help keep DoUKnowBall free. Google Analytics helps us see which pages people visit. You choose each separately and can still play if you reject both.';
const notice = (intro: string, status?: string) => `<p>${intro} We ask again in 180 days. <a href="/privacy">Learn more</a></p>${status ? '\n<p>' + status + '</p>' : ''}`;
const temp = mkdtempSync(path.join(tmpdir(), 'dukb-host-consent-'));
afterEach(() => rmSync(temp, { recursive: true, force: true }));

it('queues only denied host analytics consent before the deferred SDK on every emitted HTML page', () => {
  const documents = {
    'index.html': template.replace('</head>', '<script type="module" crossorigin src="/assets/entry.js"></script>\n</head>'),
    'privacy/index.html': readFileSync('public/privacy/index.html', 'utf8'),
    'profile/index.html': readFileSync('public/profile/index.html', 'utf8'),
    'legacy-banner/index.html': `<html><head></head><body>${notice(oldIntro, oldBanner)}</body></html>`,
    'ad-banner/index.html': `<html><head></head><body>${notice(adIntro, pausedBanner)}</body></html>`,
    'analytics-banner/index.html': `<html><head></head><body>${notice(readyIntro)}</body></html>`,
    'old/index.html': '<html><head><title>Retired route</title></head><body>Retired text</body></html>',
    'other.html': '<html><head><title>Another route</title></head><body>Route text</body></html>',
  };
  for (const [name, html] of Object.entries(documents)) {
    const file = path.join(temp, name);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, html);
  }
  const config = typeof viteConfig === 'function' ? viteConfig({ command: 'build', mode: 'production' }) : viteConfig;
  const plugin = config.plugins?.flat().find(item => item && !Array.isArray(item) && 'name' in item && item.name === 'dukb-inline-snapshot-assets');
  if (!plugin || !('configResolved' in plugin) || !('closeBundle' in plugin)) throw new Error('Snapshot build plugin is missing');
  const { configResolved, closeBundle } = plugin;
  if (typeof configResolved !== 'function' || typeof closeBundle !== 'function') throw new Error('Snapshot hooks are missing');
  configResolved({ build: { outDir: temp } } as never);
  closeBundle.call({} as never);
  closeBundle.call({} as never);

  for (const [name, original] of Object.entries(documents)) {
    const html = readFileSync(path.join(temp, name), 'utf8').replace('</head>', sdk + '</head>');
    const matches = [...html.matchAll(marker)];
    expect(matches, name).toHaveLength(1);
    expect(matches[0].index, name).toBeLessThan(html.indexOf(sdk));
    const body = original.split('<body>')[1];
    const builtBody = html.split('<body>')[1];
    const priorBody = body.includes('id="dukb-boot"') ? builtBody : builtBody.replace(/\n<div id="dukb-boot"[^>]*><img[^>]+><\/div>/, '');
    const expected = body.replace(notice(oldIntro, oldBanner), notice(COOKIE_CHOICE_INTRO))
      .replace(notice(oldIntro, pausedBanner), notice(COOKIE_CHOICE_INTRO))
      .replace(notice(adIntro, pausedBanner), notice(COOKIE_CHOICE_INTRO))
      .replace(notice(readyIntro), notice(COOKIE_CHOICE_INTRO));
    expect(priorBody, name).toBe(expected);
    const window: { dataLayer?: unknown[]; gtag?: unknown; __DUKB_HOST_ANALYTICS_DEFAULT__?: unknown } = { dataLayer: [{ unrelated: true }] };
    vm.runInNewContext(matches[0][1], { window });
    expect(window.dataLayer?.[0]).toEqual({ unrelated: true });
    expect(Array.from(window.dataLayer?.[1] as ArrayLike<unknown>)).toEqual(['consent', 'default', { analytics_storage: 'denied' }]);
    expect(window.dataLayer).toHaveLength(2);
    expect(window.__DUKB_HOST_ANALYTICS_DEFAULT__).toBe(window.dataLayer?.[1]);
    expect(window.gtag).toBeUndefined();
  }
});
