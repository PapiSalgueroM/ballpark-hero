/* Round 295: every browser harness and the prerenderer imported playwright
   from one absolute path, /home/claude/.npm-global/..., which is the desktop
   Cowork sandbox's global install and exists on no other machine. The first
   cloud round died on it. Resolve the package the normal way first (a cloud
   session runs npm install --no-save playwright, see the bootstrap section
   of CLAUDE.md), and keep the old absolute path as a fallback so the desktop
   sandbox, which has no local install, still works unchanged. */
import fs from 'node:fs';

let pw;
try {
  pw = (await import('playwright')).default;
} catch {
  pw = (await import('/home/claude/.npm-global/lib/node_modules/playwright/index.js')).default;
}

/* Second half of the same portability problem: a locally installed playwright
   pins a browser BUILD (chromium-1234 style) that a machine with preinstalled
   browsers does not have, and 40 harnesses died on "Executable doesn't exist"
   the first time the board ran with a local install. The machines this runs
   on keep a real chromium under PLAYWRIGHT_BROWSERS_PATH (usually
   /opt/pw-browsers/chromium, a symlink into the newest build dir), so when a
   harness names no executable and playwright's own default is missing on
   disk, launch with the machine's chromium instead. A harness that sets
   executablePath itself, like prerender.mjs, is left alone. */
function systemChromium() {
  const candidates = [process.env.CHROME_PATH];
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  candidates.push(`${base}/chromium`);
  try {
    for (const d of fs.readdirSync(base).filter(n => /^chromium-\d+$/.test(n)).sort().reverse()) {
      candidates.push(`${base}/${d}/chrome-linux/chrome`);
    }
  } catch { /* no browsers dir on this machine: nothing to offer */ }
  return candidates.find(p => { try { return p && fs.existsSync(p); } catch { return false; } }) || null;
}

if (pw?.chromium?.launch) {
  const fallback = systemChromium();
  if (fallback) {
    const patch = (obj, method) => {
      const orig = obj[method].bind(obj);
      obj[method] = (...args) => {
        const optIndex = method === 'launchPersistentContext' ? 1 : 0;
        const opts = { ...(args[optIndex] || {}) };
        if (!opts.executablePath) {
          let def = null;
          try { def = obj.executablePath(); } catch { /* unresolvable default */ }
          if (!def || !fs.existsSync(def)) opts.executablePath = fallback;
        }
        args[optIndex] = opts;
        return orig(...args);
      };
    };
    patch(pw.chromium, 'launch');
    patch(pw.chromium, 'launchPersistentContext');
  }
}

export default pw;
export const chromium = pw.chromium;
export const firefox = pw.firefox;
export const webkit = pw.webkit;
