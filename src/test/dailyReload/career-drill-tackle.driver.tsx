/**
 * The Soccer Career tackle drill for scripts/simDailyReload.mjs.
 *
 * Round 645 part three fix. A centre back's drill. The fix pass moved the
 * drills' save from where the round lands to where it is decided, for all
 * three drills, and the review found only the wall shot had a row, so the
 * tackle and the glove save carried the change unwatched. Shared driver:
 * ./drillShared. Every tackle goes in at the marker where the board opens it,
 * at the moment the round starts.
 */
import './mocks';
import { drillDriver } from './drillShared';

export default drillDriver({ kind: 'tackle', position: 'CB', press: /^Go in at the marker$/ });
