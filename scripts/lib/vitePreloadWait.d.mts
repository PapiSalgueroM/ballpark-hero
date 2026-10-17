/* Types for scripts/lib/vitePreloadWait.mjs, which vite.config.ts imports (Round 1338). */
import type { Plugin } from 'vite';
export declare const PRELOAD_HELPER_ID: string;
export declare const WAIT_STATEMENT: string;
export declare const DISPATCH_RE: RegExp;
export declare const WAIT_RE: RegExp;
export declare function patchPreloadHelper(code: string): string;
export declare function wrapperState(code: string): { dispatches: number; waits: number; snippet: string };
export declare function preloadWait(): Plugin;
