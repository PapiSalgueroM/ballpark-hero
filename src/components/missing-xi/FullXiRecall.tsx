import { useEffect, useState } from 'react';
import { GiveUpButton } from '@/components/game/GiveUpButton';
import { HELD_LINEUP_IDS, LINEUPS, type Lineup } from '@/lib/missingXi';
import { closeRecallSheet, newRecallSheet, readRecallSheet, recallStarter, unassistedCount, type RecallSheet } from '@/lib/missingXiRecall';
import { normalizeName } from '@/lib/playerSearch';
import { safeLocalStorage, safeSessionStorage, safeSetItem } from '@/lib/safeStorage';

const selectionKey = 'missing-xi-full-match';
const action = 'min-h-11 rounded-xl border border-border px-4 py-2 text-sm font-semibold';
const field = 'min-h-11 w-full min-w-0 rounded-xl border border-border bg-background px-3 text-base';

export default function FullXiRecall() {
  const [active, setActive] = useState(() => safeSessionStorage.getItem(selectionKey));
  const [query, setQuery] = useState('');
  const [selection, setSelection] = useState('');
  const available = LINEUPS.filter(l => !HELD_LINEUP_IDS.has(l.id));
  const current = available.find(l => l.id === active);
  const terms = normalizeName(query).split(' ').filter(Boolean);
  const options = available.filter(l => {
    const label = normalizeName([l.dateLabel, l.team, l.opponent, l.competition, l.matchDate].join(' '));
    return terms.every(t => label.includes(t));
  });
  const chosen = options.find(l => l.id === selection) ?? options[0];
  function open(id: string | null) {
    if (id) safeSessionStorage.setItem(selectionKey, id);
    else safeSessionStorage.removeItem(selectionKey);
    setActive(id);
  }
  if (current) return <TeamSheet key={current.id} lineup={current} onBack={() => open(null)} />;
  return <section aria-label="Match archive" className="mx-auto max-w-md space-y-3">
    <h2 className="text-xl font-bold">Pick a team sheet</h2>
    <p className="text-sm text-muted-foreground">Name all eleven starters from memory. Each match keeps your best unassisted total on this device.</p>
    <label className="block text-sm font-semibold">Find a match
      <input type="search" className={field + ' mt-1'} value={query} onChange={e => setQuery(e.target.value)} placeholder="Team, tournament or year" /></label>
    {chosen ? <>
      <label className="block text-sm font-semibold">Match and team
        <select className={field + ' mt-1'} value={chosen.id} onChange={e => setSelection(e.target.value)}>
          {options.map(l => <option key={l.id} value={l.id}>{l.dateLabel} · {l.team} v {l.opponent}</option>)}
        </select></label>
      <button type="button" className={action + ' w-full bg-primary text-primary-foreground'} onClick={() => open(chosen.id)}>Open team sheet</button>
    </> : <p role="status" className="text-sm">No matches found. Try a different team or year.</p>}
  </section>;
}

function TeamSheet({ lineup, onBack }: { lineup: Lineup; onBack: () => void }) {
  const key = 'missing-xi-full-v1-' + lineup.id;
  const [raw, setRaw] = useState(() => safeLocalStorage.getItem(key));
  const [text, setText] = useState('');
  const [message, setMessage] = useState('');
  const sheet = readRecallSheet(raw) ?? newRecallSheet(lineup);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === key || event.key === null) {
        setRaw(safeLocalStorage.getItem(key)); setMessage('Team sheet updated.');
      }
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [key]);
  function save(next: RecallSheet, notice: string) {
    const latest = safeLocalStorage.getItem(key);
    if (latest !== raw) {
      setRaw(latest); setMessage('Another tab updated this sheet. Try your move again.'); return false;
    }
    const data = JSON.stringify(next);
    if (!safeSetItem(key, data)) { setMessage('This move could not be saved. Try again.'); return false; }
    setRaw(data); setMessage(notice); return true;
  }
  return <section aria-label="Full XI team sheet" className="mx-auto max-w-lg space-y-3">
    <header>
      <button type="button" onClick={onBack} className="min-h-11 text-sm font-semibold text-primary">‹ Match archive</button>
      <h2 className="text-xl font-bold">{lineup.team} v {lineup.opponent}</h2>
      <p className="text-sm text-muted-foreground">{lineup.dateLabel} · {lineup.team} starters</p>
    </header>
    <p className="rounded-xl border border-border bg-card px-3 py-2 text-sm">
      <strong>{sheet.found.length}/11 named</strong> · {unassistedCount(sheet)} unassisted
      {sheet.best !== null && <span className="block text-muted-foreground">Personal best · {sheet.best}/11 unassisted</span>}
    </p>
    {!sheet.finished && <form onSubmit={event => {
      event.preventDefault();
      const result = recallStarter(sheet, text);
      if (result.sheet === sheet) setMessage(result.message);
      else if (save(result.sheet, result.message)) setText('');
    }}>
      <label className="text-sm font-semibold" htmlFor="full-xi-name">Name a starter</label>
      <div className="mt-1 flex gap-2"><input id="full-xi-name" className={field} value={text} autoComplete="off" maxLength={100}
        placeholder="Full name or surname" onChange={e => setText(e.target.value)} />
        <button className={action + ' bg-primary text-primary-foreground'} disabled={!text.trim()}>Guess</button></div>
    </form>}
    <p role="status" className="text-sm text-muted-foreground">{message || (sheet.finished ? 'Final team sheet' : 'Tap a blank position for a first-letter hint.')}</p>
    <ol className="grid grid-cols-2 gap-1.5">
      {sheet.starters.map((p, i) => {
        const found = sheet.found.includes(i), hint = sheet.hinted.includes(i);
        return <li key={i} className="min-w-0 rounded-lg border border-border bg-card text-sm">
          {!sheet.finished && !found && !hint ? <button type="button" aria-label={'Hint for ' + p.position + ', starter ' + (i + 1)}
            className="min-h-11 w-full px-3 py-2 text-left" onClick={() => save({ ...sheet, hinted: [...sheet.hinted, i] }, 'The ' + p.position + ' name starts with ' + p.name[0] + '.')}>
            <strong>{p.position}</strong><span className="ml-2 text-muted-foreground">Hint</span>
          </button> : <div className="px-3 py-2">
            <span className="block text-xs text-muted-foreground">{p.position}{found ? hint ? ' · With hint' : ' · Named' : sheet.finished ? ' · Revealed' : ' · Hint'}</span>
            <strong className="break-words">{found || sheet.finished ? p.name : p.name[0] + '…'}</strong>
          </div>}
        </li>;
      })}
    </ol>
    {sheet.finished ? <button type="button" className={action} onClick={() => { if (save(newRecallSheet(lineup, sheet.best), 'New attempt.')) setText(''); }}>Try this XI again</button>
      : <GiveUpButton label="Reveal remaining starters" onGiveUp={() => save(closeRecallSheet(sheet), 'Final team sheet')} />}
  </section>;
}
