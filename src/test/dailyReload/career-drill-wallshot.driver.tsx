/**
 * The Soccer Career wall shot drill for scripts/simDailyReload.mjs.
 *
 * Round 645 part three. A striker's drill, and the one drill that draws from
 * the arcade spray stream, so it is the row the restream control reaches. The
 * driver itself is shared with the other two drills (./drillShared, which
 * says why each drill carries a row): every shot is taken at the moment the
 * round starts, with the board's opening aim and power.
 */
import './mocks';
import { drillDriver } from './drillShared';

export default drillDriver({ kind: 'wallshot', position: 'ST', press: /^Shoot now$/ });
