import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";

/**
 * Round 275: put the real asset tags into every prerendered snapshot at build
 * time, so a page arriving from a search result does not spend two extra round
 * trips finding out where its own JavaScript is.
 *
 * WHAT ROUND 257 BUILT AND WHAT IT COSTS. The snapshots in public/ carry no
 * hashed paths on purpose: they are committed once and copied into every future
 * build, and each build names its bundle differently, so a hashed path baked
 * into one goes stale and the app never starts. Instead each snapshot loads
 * /prerender-boot.js, which fetches the home page, reads the current asset tags
 * out of its head and injects them.
 *
 * MEASURED on a phone at slow 4G with the font CDN answering normally,
 * /soccer-career: the snapshot HTML lands at 591ms, the boot script at 1231ms,
 * the home page it fetches at 1837ms, and the stylesheet only starts at 1878ms.
 * Three serial round trips before the first byte of CSS, on a document the
 * browser has had complete since 591ms.
 *
 * WHY THIS IS SAFE. It runs on the machine that builds the site, after the
 * bundle is written, so it knows the real hashes, and it rewrites the copies in
 * dist/ ONLY. The committed snapshots in public/ stay hash free, so Round 257's
 * guarantee is untouched: nothing in the repo can go stale. The hashes in dist/
 * are correct by construction because they are read out of the same build that
 * produced them.
 *
 * The fallback is automatic and was already written. prerender-boot.js begins
 * with "nothing to do if a build ever does inject them here" and returns early
 * when it finds a module script pointing at /assets/. So if this plugin is
 * removed, fails, or finds nothing, every page behaves exactly as it did
 * before. That is why the boot script is deliberately LEFT in the snapshot
 * rather than stripped out.
 *
 * Guarded by scripts/simSnapshotAssets.mjs.
 */
const inlineSnapshotAssets = (root: string) => ({
  name: "dukb-inline-snapshot-assets",
  apply: "build" as const,
  /* closeBundle, not writeBundle: publicDir is copied during the write phase,
     and a snapshot that has not been copied yet cannot be rewritten. */
  closeBundle() {
    const dist = path.resolve(root, "dist");
    let indexHtml: string;
    try {
      indexHtml = fs.readFileSync(path.join(dist, "index.html"), "utf8");
    } catch {
      console.log("[dukb] no dist/index.html, snapshots stay on the boot script");
      return;
    }
    const styles = [...indexHtml.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="(\/assets\/[^"]+)"[^>]*>/g)].map(m => m[1]);
    const modules = [...indexHtml.matchAll(/<script[^>]+type="module"[^>]+src="(\/assets\/[^"]+)"[^>]*>/g)].map(m => m[1]);
    if (!modules.length) {
      console.log("[dukb] no module script in dist/index.html, snapshots stay on the boot script");
      return;
    }
    /* THE STYLESHEET IS DELIBERATELY NOT RENDER BLOCKING, and this was measured
       the hard way. The first version injected a plain <link rel="stylesheet">,
       which made the browser wait for 158 KB of CSS before painting anything:
       measured on a phone at slow 4G, three runs a side, first contentful paint
       went from 740ms to 2860ms while time to playable improved from 14519ms to
       13353ms. Trading two seconds of "I can see the page" for one second of
       "I can use the page" is a bad trade on a document whose whole purpose is
       that its words are already there. media=print downloads it without
       blocking and the onload swap applies it the moment it lands; the
       snapshot's own inline boot style holds the page until then, which is
       exactly what it was written for. The noscript copy is for a browser that
       never runs the swap. */
    /* Round 314: the calm boot. The snapshot's readable copy used to show as
       a full wall of raw text until React mounted (Anthony filmed the flash).
       One dimmed screenful reads as the site loading; the noscript lifts the
       cap so a browser that will never boot the app gets the whole page, and
       crawlers read the DOM either way. Injected here so every build applies
       it to every snapshot without rewriting the committed files. */
    const calmBoot =
      `<style>#dukb-snapshot{max-height:100vh;overflow:hidden;opacity:.45}</style>` +
      `<noscript><style>#dukb-snapshot{max-height:none;overflow:visible;opacity:1}</style></noscript>`;
    const inject =
      calmBoot + "\n    " +
      styles.map(h => `<link rel="stylesheet" crossorigin href="${h}" media="print" onload="this.media='all'">`).join("\n    ") +
      (styles.length ? `\n    <noscript>${styles.map(h => `<link rel="stylesheet" href="${h}">`).join("")}</noscript>\n    ` : "") +
      modules.map(sr => `<script type="module" crossorigin src="${sr}"></script>`).join("\n    ");

    let touched = 0;
    let skipped = 0;
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const f = path.join(dir, entry.name);
        if (entry.isDirectory()) { walk(f); continue; }
        if (entry.name !== "index.html") continue;
        if (path.dirname(f) === dist) continue;
        let html: string;
        try { html = fs.readFileSync(f, "utf8"); } catch { continue; }
        if (!html.includes("/prerender-boot.js")) { skipped += 1; continue; }
        if (html.includes("/assets/")) { skipped += 1; continue; }
        const out = html.replace("</head>", `  ${inject}\n  </head>`);
        if (out === html) { skipped += 1; continue; }
        fs.writeFileSync(f, out);
        touched += 1;
      }
    };
    try { walk(dist); } catch (e) {
      console.log("[dukb] snapshot rewrite failed, pages fall back to the boot script: " + String(e).slice(0, 80));
      return;
    }
    console.log(`[dukb] inlined ${styles.length} stylesheet(s) and ${modules.length} module(s) into ${touched} snapshots (${skipped} left alone)`);
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger(), inlineSnapshotAssets(__dirname)].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom"],
  },
}));
