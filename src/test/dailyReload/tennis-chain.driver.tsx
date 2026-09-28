/** /tennis-chain for scripts/simDailyReload.mjs; the logic is shared with
 *  the NASCAR and Combat rows in ./chainShared. A link is a fixture name the
 *  stubbed tennis-chain-validate accepts. */
import './mocks';
import { defineDriver } from './driver';
import { chainDriver, networkChain } from './chainShared';
import TennisChain from '@/pages/TennisChain';

export default defineDriver(chainDriver(networkChain('tennis-chain', '/tennis-chain', <TennisChain />, 'tennis-chain-validate', 'guessedPlayer', 'currentPlayer')));
