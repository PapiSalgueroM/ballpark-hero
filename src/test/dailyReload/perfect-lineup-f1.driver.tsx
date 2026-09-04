/** /perfect-lineup-f1 for scripts/simDailyReload.mjs; the logic is shared
 *  with the NBA and NHL rows in ./perfectLineupShared. */
import './mocks';
import { defineDriver } from './driver';
import { perfectLineupDriver } from './perfectLineupShared';
import PerfectLineupF1 from '@/pages/PerfectLineupF1';

export default defineDriver(perfectLineupDriver('perfect-lineup-f1', '/perfect-lineup-f1', <PerfectLineupF1 />));
