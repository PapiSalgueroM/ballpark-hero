# Development dependency audit, September 8, 2026

Read-only preparation at Round 519. No dependency or server setting changed.
The installed tree reports five affected packages covering eight advisories.
The audit found no vulnerable browser-runtime import path and no evidence of
exploitation. Severity alone is not reachability evidence.

| Installed package | Observed use | Target to verify in a separate round |
| --- | --- | --- |
| @humanfs/node 0.16.6 | ESLint directory checks/walking, no affected copy calls found | 0.16.8 within current range |
| browserslist 4.25.1 | Build processing, no user-controlled queries/custom stats found | 4.28.7 within current range |
| postcss-selector-parser 6.1.2 | Tailwind/PostCSS build processing, including animate peer chain | 6.1.3 within current ranges |
| esbuild 0.21.5 | Vite and scripts, no serve() call found | Resolve through supported Vite update |
| Vite 5.4.21 | Windows development server binds host :: and mounts editor middleware | 6.4.3 covers reported advisories |

Registry peer metadata checked by the audit accepts Vite 6 for the current React
plugin, tagger and Vitest. The suggested audit fix to Vite 8.2.2 would exceed
current tagger/Vitest ranges and is not the proposed plan. Vite 6.4.3 depends on
esbuild ^0.25.0. Recheck versions, support and migration notes immediately before
implementation. Preserve the existing previews and SDK patch, make targeted
lock changes in a new worktree, and run install/type/build/browser/SEO gates.
Loopback-only hosting reduces exposure but is not a substitute for the editor
security fix. Do not reconfigure another lane's running servers.

Primary references supplied by the independent audit:

- https://github.com/humanwhocodes/humanfs/security/advisories/GHSA-p498-v437-472g
- https://github.com/advisories/GHSA-c83g-rgw3-j3cx
- https://github.com/advisories/GHSA-73wf-gq98-2v4g
- https://github.com/postcss/postcss-selector-parser/releases/tag/6.1.3
- https://github.com/advisories/GHSA-67mh-4wv8-2f99
- https://github.com/vitejs/vite/security/advisories/GHSA-fx2h-pf6j-xcff
- https://github.com/vitejs/launch-editor/security/advisories/GHSA-v6wh-96g9-6wx3
- https://vite.dev/releases
