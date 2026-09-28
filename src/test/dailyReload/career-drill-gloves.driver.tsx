/**
 * The Soccer Career glove save drill for scripts/simDailyReload.mjs.
 *
 * Round 645 part three fix. A keeper's drill, the third on the board the fix
 * pass changed for all three (see ./career-drill-tackle.driver.tsx). Shared
 * driver: ./drillShared. Every dive is made from where the hands start, at
 * the moment the round starts.
 */
import './mocks';
import { drillDriver } from './drillShared';

export default drillDriver({ kind: 'gloves', position: 'GK', press: /^Dive now$/ });
