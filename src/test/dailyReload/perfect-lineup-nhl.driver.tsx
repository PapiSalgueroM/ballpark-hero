/** /perfect-lineup-nhl for scripts/simDailyReload.mjs; the logic is shared
 *  with the NBA and F1 rows in ./perfectLineupShared. */
import './mocks';
import { defineDriver } from './driver';
import { perfectLineupDriver } from './perfectLineupShared';
import PerfectLineupNhl from '@/pages/PerfectLineupNhl';

export default defineDriver(perfectLineupDriver('perfect-lineup-nhl', '/perfect-lineup-nhl', <PerfectLineupNhl />));
