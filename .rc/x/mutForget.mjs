// Reviewer's runner mutation, in the runner's checkout only (the request line restores src afterwards):
// a reload FORGETS a push whose wheel has been seen, so the one push can be asked again after a reload.
// That is the reroll the saved talks exist to stop. The question: which checks see it?
import { readFileSync, writeFileSync } from 'node:fs';
const FILE = 'src/components/us-career/UsCareerBoard.tsx';
const src = readFileSync(FILE, 'utf8');
const from = "      setMarketTalk(heldTalk);\n      extDeclinedRef.current = heldTalk?.kind === 'extension' && heldTalk.declined;";
const to = [
  "      const forgetful = heldTalk && heldTalk.wheel && heldTalk.wheel.seen",
  "        ? (heldTalk.kind === 'extension'",
  "          ? { ...heldTalk, wheel: undefined, talk: { ...heldTalk.talk, pushed: false } }",
  "          : { ...heldTalk, wheel: undefined, window: { ...heldTalk.window, offers: heldTalk.window.offers.map(o => ({ ...o, pushed: false })) } })",
  "        : heldTalk;",
  "      setMarketTalk(forgetful as typeof heldTalk);",
  "      extDeclinedRef.current = heldTalk?.kind === 'extension' && heldTalk.declined;",
].join('\n');
if (src.split(from).length !== 2) { console.log('mutForget: ABORT, the anchor does not stand exactly once'); process.exit(3); }
writeFileSync(FILE, src.replace(from, to));
console.log('mutForget: applied (a reload forgets a seen push)');
