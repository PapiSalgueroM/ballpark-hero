import { useMemo, useState } from 'react';
import { FORMATIONS, FIT_PENALTY } from '@/lib/clubManager';
import { beginNationalCampaign, finishNationalCampaignAutomatically, nationalCoachView, playNationalFixture, setNationalSquad, setNationalXi } from '@/lib/clubManagerNationalCampaign';
import type { CareerState } from '@/lib/clubManager';
import { gradeFit } from '@/lib/positionFit';

export default function ClubManagerNationalPanel({ career, updateCareer, onBack }: {
  career: CareerState; updateCareer(update: (state: CareerState) => CareerState): void; onBack(): void;
}) {
  const [tab, setTab] = useState<'squad' | 'xi' | 'match'>(() => career.nationJob?.campaign?.results.length ? 'match' : 'squad');
  const [query, setQuery] = useState('');
  const [rules, setRules] = useState(false);
  const view = useMemo(() => nationalCoachView(career), [career]);
  if (!view) return <div className="space-y-3"><p>This national team is not available in this save.</p><button className="min-h-11 px-4" onClick={onBack}>Back to season summary</button></div>;
  const campaign = view.campaign;
  const selected = campaign ? view.players.filter(p => campaign.squadKeys.includes(p.key)) : [];
  const matches = view.players.filter(p => p.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
    .sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name));
  const formation = FORMATIONS[campaign?.formationIndex ?? 0];
  const xi = campaign?.xiKeys.length === 11 ? campaign.xiKeys : Array<string>(11).fill('');
  const button = 'min-h-11 rounded-lg border border-border px-3 py-2 text-xs font-bold';
  return <section aria-label="National team coaching" className="space-y-3 rounded-xl border border-border bg-card p-3">
    <div className="flex items-center justify-between gap-2">
      <button className={button} onClick={onBack}>Back to season summary</button>
      <h2 className="text-sm font-bold">{view.nation} national team</h2>
      <button className={button} aria-label="National team rules" onClick={() => setRules(value => !value)}>?</button>
    </div>
    <p className="text-xs">Simulated tournament for {view.year}. You choose players from your save and play one fixture at a time.</p>
    <p className="text-[11px] text-muted-foreground">Players with missing nationality details cannot be called up ({view.unknown} excluded).</p>
    {(rules || !campaign?.squadKeys.length) && <div className="space-y-2 rounded-lg bg-secondary p-3 text-xs">
      <p>Choose up to 23 known current-year players, then fill eleven different shirts. Only a goalkeeper can take the keeper shirt. Other position penalties use the club game's rules and are shown below.</p>
      <p>Your choices affect the next match. Each tap plays one fixture and saves its result. A finished result cannot be rerolled by changing the XI or reopening the save. Finish this tournament to start the next club season.</p>
      <p>Example: call up a fictional keeper and ten different outfield players. Put the keeper in GK, fill the other shirts, then play the named next opponent.</p>
    </div>}
    {!campaign ? view.hasXI ? (
      <button className={button + ' bg-primary text-primary-foreground'}
        onClick={() => updateCareer(beginNationalCampaign)}>Choose the squad</button>
    ) : <p role="status" className="text-xs">Your save has too few eligible players for a starting eleven. The national team will play automatically when you continue.</p> : <>
      {!view.hasXI && !campaign.complete && campaign.next && <div className="space-y-2 rounded-lg bg-secondary p-3 text-xs">
        <p>Your save has too few eligible players for a starting eleven. You can finish the remaining fixtures automatically and keep the results already played.</p>
        <button className={button} onClick={() => updateCareer(state => finishNationalCampaignAutomatically(state, campaign.next!.id, campaign.revision))}>
          Finish remaining fixtures automatically
        </button>
      </div>}
      <div className="grid grid-cols-3 gap-2">
        {(['squad', 'xi', 'match'] as const).map((name, i) => <button key={name} aria-pressed={tab === name} className={button}
          onClick={() => setTab(name)}>{['Squad', 'Starting XI', 'Next match'][i]}</button>)}
      </div>
      {tab === 'squad' && <div className="space-y-2">
        <p className="text-xs">{campaign.squadKeys.length}/23 called up, {view.players.length} players to choose from.</p>
        <section aria-label="Called-up national squad" className="space-y-1">
          {campaign.selected.map(snapshot => {
            const available = view.players.some(player => player.key === snapshot.key);
            return <div key={snapshot.key} className="flex items-center justify-between gap-2 rounded border border-border p-2 text-xs">
              <span>{snapshot.name}{available ? '' : ', unavailable for this selection'}</span>
              <button className={button} disabled={campaign.complete} aria-label={'Remove called-up ' + snapshot.name}
                onClick={() => updateCareer(state => setNationalSquad(state, campaign.squadKeys.filter(key => key !== snapshot.key), campaign.revision))}>Remove</button>
            </div>;
          })}
        </section>
        <label className="block text-xs">Find a player<input className="mt-1 min-h-11 w-full rounded border border-border bg-background px-3"
          value={query} onChange={event => setQuery(event.target.value)} /></label>
        <p className="text-[11px] text-muted-foreground">Showing {Math.min(50, matches.length)} of {matches.length} name matches.</p>
        <ul className="max-h-80 overflow-y-auto space-y-1">
          {matches.slice(0, 50).map(p => {
            const called = campaign.squadKeys.includes(p.key);
            return <li key={p.key} className="flex items-center justify-between gap-2 rounded border border-border p-2">
              <span className="min-w-0 text-xs"><strong>{p.name}</strong><br />{p.position}, {p.age}, {p.rating} OVR. Club: {p.employer ?? 'none recorded'}.</span>
              <button className={button} disabled={campaign.complete || !called && campaign.squadKeys.length >= 23}
                aria-label={(called ? 'Remove ' : 'Call up ') + p.name}
                onClick={() => updateCareer(state => setNationalSquad(state, called ? campaign.squadKeys.filter(key => key !== p.key) : [...campaign.squadKeys, p.key], campaign.revision))}>
                {called ? 'Remove' : 'Call up'}
              </button>
            </li>;
          })}
        </ul>
      </div>}
      {tab === 'xi' && <div className="space-y-2">
        <label className="block text-xs">Formation<select className="ml-2 min-h-11 rounded border border-border bg-background px-2"
          disabled={campaign.complete} value={campaign.formationIndex}
          onChange={event => {
            const formationIndex = Number(event.target.value);
            const keys = xi.map((key, i) => {
              const player = selected.find(p => p.key === key);
              return player && FORMATIONS[formationIndex].slots[i].allowed.includes('GK') === (player.position === 'GK') ? key : '';
            });
            updateCareer(state => setNationalXi(state, formationIndex, keys, campaign.revision));
          }}>
          {FORMATIONS.map((shape, i) => <option key={shape.name} value={i}>{shape.name}</option>)}
        </select></label>
        {formation.slots.map((slot, index) => {
          const picked = selected.find(p => p.key === xi[index]);
          const penalty = picked ? FIT_PENALTY[gradeFit([picked.position, ...(picked.secondaryPositions ?? [])], slot.allowed)] : 0;
          return <label key={index} className="block text-xs">{slot.label} {picked ? '(' + penalty + ' rating penalty)' : ''}
            <select className="mt-1 min-h-11 w-full rounded border border-border bg-background px-2" value={xi[index]} disabled={campaign.complete}
              aria-label={'National shirt ' + (index + 1) + ' ' + slot.label}
              onChange={event => { const keys = [...xi]; keys[index] = event.target.value; updateCareer(state => setNationalXi(state, campaign.formationIndex, keys, campaign.revision)); }}>
              <option value="">Choose a called-up player</option>
              {xi[index] && !picked && <option value={xi[index]} disabled>Unavailable player</option>}
              {selected.filter(p => slot.allowed.includes('GK') === (p.position === 'GK'))
                .map(p => <option key={p.key} value={p.key} disabled={xi.includes(p.key) && xi[index] !== p.key}>{p.name}, {p.position}, {p.rating}</option>)}
            </select>
          </label>;
        })}
      </div>}
      {tab === 'match' && <div className="space-y-3">
        {campaign.next && <div className="rounded-lg border border-border p-3 text-sm">
          <p>{campaign.format.name}, {campaign.next.round}</p>
          <p className="font-bold">{campaign.next.home} vs {campaign.next.away}</p>
          <button className={button + ' mt-2 w-full bg-primary text-primary-foreground'} disabled={!view.canPlay}
            onClick={() => updateCareer(state => playNationalFixture(state, campaign.next!.id, campaign.revision))}>Play next match</button>
          {!view.canPlay && <p className="mt-2 text-xs">Choose eleven different current eligible players, including a goalkeeper, before kickoff.</p>}
        </div>}
        {campaign.complete && <p role="status" className="text-sm font-bold">{campaign.format.name}: {campaign.result}.
          {campaign.result === 'Did Not Qualify' ? ' The federation will end the job when the club season rolls over.' : ' This summer is settled.'}</p>}
        <ol className="space-y-1 text-xs">{campaign.results.map(result => <li key={result.id} className="rounded border border-border p-2">
          {result.round}: {result.home} {result.homeGoals} to {result.awayGoals} {result.away}
          {result.pens ? ', ' + result.winner + ' won on penalties' : ''}
        </li>)}</ol>
      </div>}
    </>}
  </section>;
}
