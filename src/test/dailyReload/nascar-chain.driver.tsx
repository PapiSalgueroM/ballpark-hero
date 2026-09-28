/** /nascar-chain for scripts/simDailyReload.mjs; the logic is shared with
 *  the Tennis and Combat rows in ./chainShared. A link is a real Cup champion
 *  (never a starter) that the stubbed nascar-chain-validate accepts. */
import './mocks';
import { defineDriver } from './driver';
import { chainDriver, networkChain } from './chainShared';
import NascarChain from '@/pages/NascarChain';
import nascarChampionNames from '@/data/nascarChampionNames.json';
import { NASCAR_CHAIN_STARTERS } from '@/types/nascarChain';

const pick = () => nascarChampionNames.names.find(n => !NASCAR_CHAIN_STARTERS.includes(n)) ?? 'no champion outside the starters';

export default defineDriver(chainDriver(networkChain('nascar-chain', '/nascar-chain', <NascarChain />, 'nascar-chain-validate', 'guessedDriver', 'currentDriver', pick)));
