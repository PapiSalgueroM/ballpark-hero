/** /tennis-chain for scripts/simDailyReload.mjs; the logic is shared with
 *  the NASCAR and Combat rows in ./chainShared. */
import './mocks';
import { defineDriver } from './driver';
import { chainDriver } from './chainShared';
import TennisChain from '@/pages/TennisChain';

export default defineDriver(chainDriver('tennis-chain', '/tennis-chain', <TennisChain />, /Daily Challenge/));
