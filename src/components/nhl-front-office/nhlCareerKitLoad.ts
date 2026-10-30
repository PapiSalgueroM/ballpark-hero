/**
 * Round 1559: the one door to the NHL board's career kit (nhlCareerKit.ts), the NFL's loader with the NHL's import
 * (the fetch once rule is careerKitLoader.ts, every sport's). The kit is fetched once per page and kept; a failed
 * fetch is forgotten, so the next ask tries again. Nothing about the kit is saved (it is code, never localStorage).
 *
 * Never imported by value from the kit: only its type, so this file stays in the page and the kit stays out. The
 * literal import of the kit stays in this file (scripts/simFoLazyDesk.mjs reads that dynamic edge by file).
 * careerKitLoader.ts is a leaf with no imports, so the module level call below evaluates nothing imported.
 *
 * Round 1561 bound the NHL board to it: NhlFrontOfficeBoard.tsx asks through the shared hook (useGmCareerKit).
 */
import { makeCareerKitLoader } from '@/components/front-office-shared/careerKitLoader';

export type NhlCareerKit = typeof import('./nhlCareerKit');

export const nhlCareerKitLoader = makeCareerKitLoader<NhlCareerKit>(() => import('./nhlCareerKit'));
