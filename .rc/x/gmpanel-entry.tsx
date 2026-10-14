// Round 1332 review walk harness (never committed): GmInboxPanel on a desk the real engine dealt, with the NFL
// pack's first card given an expiry and a neutral option (no shipped GM card expires, and no route mounts the
// panel). One copy of that card is left open until the staff settle it, one dealt card the manager answers, and
// a second expiring copy sits open so the full desk sentence names the assistant.
import { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { GmInboxPanel } from '@/components/front-office-shared/GmInboxPanel';
import { GM_INBOX_PACKS } from '@/data/gmInbox';
import { answerGmInbox, bindGmInbox, gmInboxWeek, gmSeasonWeeks } from '@/lib/gmInbox';
import type { GmInboxPack, GmInboxMessage } from '@/lib/gmInbox';
import { keyedRng } from '@/lib/keyedRng';

const base = GM_INBOX_PACKS.nfl;
const e0 = base.events[0];
const neutral = { label: 'Leave it with the staff', reply: 'The staff will handle it.', karma: 0 };
const pack: GmInboxPack = { ...base, events: base.events.map(e => (e.id === e0.id ? { ...e, expires: 2, choices: [...e.choices, neutral] } : e)) };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Desk = any;
const s: Desk = { morale: 50, trust: 50, fans: 50, cash: 10, year: 2030, recruit: 50, out: {}, rating: {} };
const seat = bindGmInbox<Desk>(pack, {
  moodOf: d => d.trust, setMood: (d, v) => { d.trust = v; }, addPopularity: (d, v) => { d.fans += v; },
  addCash: (d, v) => { d.cash += v; }, yearOf: d => d.year,
  setOut: (d, who, w) => { d.out[who] = (d.out[who] ?? 0) + w; }, addRating: (d, who, v) => { d.rating[who] = (d.rating[who] ?? 0) + v; },
  addRecruit: (d, v) => { d.recruit += v; },
});
const weeks = gmSeasonWeeks(pack);
const rng = keyedRng('walk1332|deck');
const fr = keyedRng('walk1332|facts');
const facts = () => Object.fromEntries(Object.entries(pack.facts).map(([k, sp]) =>
  [k, sp.kind === 'bool' ? fr() < sp.p : Math.round(sp.min + fr() * (sp.max - sp.min))]));
const pe0 = pack.events.find(e => e.id === e0.id)!;
const mk = (clock: number): GmInboxMessage => ({ id: `${e0.id}-2030-w${clock}`, defId: e0.id, from: pe0.from, emoji: pe0.emoji, text: pe0.text,
  year: 2030, choices: pe0.choices, beat: pe0.beat, w: clock });
s.phoneInbox = [mk(0)];
const settledList: GmInboxMessage[] = [];
let clock = 0;
for (; clock < 16; clock++) gmInboxWeek(s, seat, weeks[clock % weeks.length], facts(), clock, rng, settledList);
const firstOpen = (s.phoneInbox as GmInboxMessage[]).find(m => m.answered === undefined && m.defId !== e0.id);
if (firstOpen) answerGmInbox(s, firstOpen.id, 0, seat);
s.phoneInbox.push(mk(clock));
const all = s.phoneInbox as GmInboxMessage[];
(window as unknown as Record<string, unknown>).__walk = {
  settledId: all.find(m => m.auto)?.id ?? null, answeredId: firstOpen?.id ?? null, openExpId: mk(clock).id,
  open: all.filter(m => m.answered === undefined).length, total: all.length, settledByEngine: settledList.length,
};

function App() {
  const [msgs, setMsgs] = useState<GmInboxMessage[]>(() => [...all]);
  const seen = useMemo(() => new Set<string>(), []);
  return (
    <div className="mx-auto max-w-2xl px-4 py-4">
      <GmInboxPanel pack={pack} messages={msgs} seen={seen} onAnswer={(id, i) => { answerGmInbox(s, id, i, seat); setMsgs([...s.phoneInbox]); }} />
    </div>
  );
}
createRoot(document.getElementById('harness')!).render(<App />);
