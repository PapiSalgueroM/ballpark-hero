/** /perfect-lineup-nba for scripts/simDailyReload.mjs; the logic is shared
 *  with the NHL and F1 rows in ./perfectLineupShared. */
import './mocks';
import { defineDriver } from './driver';
import { perfectLineupDriver } from './perfectLineupShared';
import PerfectLineupNba from '@/pages/PerfectLineupNba';

export default defineDriver(perfectLineupDriver('perfect-lineup-nba', '/perfect-lineup-nba', <PerfectLineupNba />));
