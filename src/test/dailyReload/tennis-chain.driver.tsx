/** /tennis-chain for scripts/simDailyReload.mjs; the logic is shared with
 *  the NASCAR and Combat rows in ./chainShared. A link is a real Grand Slam
 *  champion (never a starter) that the stubbed tennis-chain-validate accepts. */
import './mocks';
import { defineDriver } from './driver';
import { chainDriver, networkChain } from './chainShared';
import TennisChain from '@/pages/TennisChain';
import tennisChampionNames from '@/data/tennisChampionNames.json';
import { TENNIS_CHAIN_STARTERS } from '@/types/tennisChain';

const pick = () => tennisChampionNames.names.find(n => !TENNIS_CHAIN_STARTERS.includes(n)) ?? 'no champion outside the starters';

export default defineDriver(chainDriver(networkChain('tennis-chain', '/tennis-chain', <TennisChain />, 'tennis-chain-validate', 'guessedPlayer', 'currentPlayer', pick)));
