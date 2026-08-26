/* Round 295: every browser harness and the prerenderer imported playwright
   from one absolute path, /home/claude/.npm-global/..., which is the desktop
   Cowork sandbox's global install and exists on no other machine. The first
   cloud round died on it. Resolve the package the normal way first (a cloud
   session runs npm install --no-save playwright, see the bootstrap section
   of CLAUDE.md), and keep the old absolute path as a fallback so the desktop
   sandbox, which has no local install, still works unchanged. */
let pw;
try {
  pw = (await import('playwright')).default;
} catch {
  pw = (await import('/home/claude/.npm-global/lib/node_modules/playwright/index.js')).default;
}
export default pw;
export const chromium = pw.chromium;
export const firefox = pw.firefox;
export const webkit = pw.webkit;
