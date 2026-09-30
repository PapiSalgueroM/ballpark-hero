/* Types for scripts/genSeoMetaParts.mjs, which vite.config.ts imports (Round 700). */
export declare const PART_COUNT: number;
export declare const PART_DIR: string;
export declare const partOf: (path: string) => number;
export declare function seoMetaPartFiles(root: string): Promise<Map<string, string>>;
export declare function writeSeoMetaParts(root: string, options?: { check?: boolean }): Promise<string[]>;
