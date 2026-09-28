/** /nascar-chain for scripts/simDailyReload.mjs; the logic is shared with
 *  the Tennis and Combat rows in ./chainShared. */
import './mocks';
import { defineDriver } from './driver';
import { chainDriver } from './chainShared';
import NascarChain from '@/pages/NascarChain';

export default defineDriver(chainDriver('nascar-chain', '/nascar-chain', <NascarChain />, /Daily Challenge/));
