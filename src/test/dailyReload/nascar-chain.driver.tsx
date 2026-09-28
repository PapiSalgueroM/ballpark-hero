/** /nascar-chain for scripts/simDailyReload.mjs; the logic is shared with
 *  the Tennis and Combat rows in ./chainShared. A link is a fixture name the
 *  stubbed nascar-chain-validate accepts. */
import './mocks';
import { defineDriver } from './driver';
import { chainDriver, networkChain } from './chainShared';
import NascarChain from '@/pages/NascarChain';

export default defineDriver(chainDriver(networkChain('nascar-chain', '/nascar-chain', <NascarChain />, 'nascar-chain-validate', 'guessedDriver', 'currentDriver')));
