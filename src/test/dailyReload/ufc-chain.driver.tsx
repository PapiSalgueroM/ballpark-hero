/** /ufc-chain (Combat Chain) for scripts/simDailyReload.mjs; the logic is
 *  shared with the NASCAR and Tennis rows in ./chainShared. The menu's daily
 *  button reads "Daily" over "Same fighter for everyone". */
import './mocks';
import { defineDriver } from './driver';
import { chainDriver } from './chainShared';
import UfcChain from '@/pages/UfcChain';

export default defineDriver(chainDriver('ufc-chain', '/ufc-chain', <UfcChain />, /Daily/));
