/* A snapshot must not change just because the machine building it has a
   different date. The three samples still expose date-driven page content,
   but their anchor and random sequence stay identical on every build. */
export const SAMPLE_DAYS = [0, 5, 11];
export const SNAPSHOT_EPOCH_MS = Date.UTC(2026, 7, 24, 18, 0, 0);
export const RANDOM_SEED = 284;

export function clockScript(days, { setPrerenderFlag = true } = {}) {
  return `(() => {
  ${setPrerenderFlag ? 'window.__DUKB_PRERENDER__ = true;' : ''}
  (function () {
    let s = ${RANDOM_SEED} | 0;
    Math.random = function () {
      s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  })();
  const RealDate = Date;
  const NOW = ${SNAPSHOT_EPOCH_MS} + ${days} * 86400000;
  const D = function (...a) {
    if (!new.target) return new RealDate(NOW).toString();
    return a.length ? new RealDate(...a) : new RealDate(NOW);
  };
  D.now = () => NOW;
  D.parse = RealDate.parse;
  D.UTC = RealDate.UTC;
  D.prototype = RealDate.prototype;
  globalThis.Date = D;
})();`;
}
