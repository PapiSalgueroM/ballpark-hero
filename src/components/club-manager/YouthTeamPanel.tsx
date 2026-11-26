import { useState } from 'react';
import { moneyIn, type CareerState } from '@/lib/clubManager';
import { YOUTH_ENTRY_COST, YOUTH_SECOND_PLACE_COST, secondPlaceRecord, YOUTH_FACILITY_LEVEL, YOUTH_MATCHES, YOUTH_TEAM_COST, youthCampaignRecord, youthDevelopment, youthNomineeAt, youthRotationBreak } from '@/lib/clubManagerYouthTeam';

export default function YouthTeamPanel({ career, onFound, onEnter, onRotate, onSecondPlace }: {
  onSecondPlace?: (club: string, season: number, id: string) => boolean;
  career: CareerState; onFound: () => void; onEnter: (id: string) => void; onRotate: (season: number, after: 2 | 4, id: string) => void;
}) {
  const [chosen, setChosen] = useState('');
  const [fundingNote, setFundingNote] = useState('');
  const academy = career.academy;
  if (!academy) return null;
  const money = moneyIn(career);
  const team = academy.youthTeam;
  const campaign = team?.campaign;
  const fixtures = campaign?.fixtures ?? [];
  const done = fixtures.length === YOUTH_MATCHES;
  const choices = academy.prospects.filter(p => p.age < 21);
  const selected = choices.some(p => p.id === chosen) ? chosen : choices[0]?.id ?? '';
  const nominee = campaign && youthNomineeAt(campaign, Math.min(fixtures.length, YOUTH_MATCHES - 1));
  const after = campaign ? youthRotationBreak(campaign) : null;
  const alternatives = choices.filter(p => p.id !== nominee?.prospectId && p.id !== campaign?.secondPlace?.prospectId);
  const available = alternatives.filter(p => p.rating < p.potential);
  const secondId = available.find(p => p.id === chosen)?.id ?? available[0]?.id;
  const second = campaign?.secondPlace;
  const secondRecord = campaign && secondPlaceRecord(campaign);
  const replacement = alternatives.some(p => p.id === chosen) ? chosen : alternatives[0]?.id ?? '';
  const fee = campaign ? YOUTH_ENTRY_COST : 0;
  const button = 'min-h-11 rounded-lg bg-primary px-3 text-sm font-bold text-primary-foreground disabled:opacity-50';
  return <details className="mt-2 rounded-xl border border-border bg-card px-3 text-sm">
    <summary className="min-h-11 cursor-pointer py-3 font-bold">{team ? career.clubName + ' U21' : 'Found a youth team'}</summary>
    <div className="space-y-2 pb-3">
      {!team ? <>
        <p>Found your U21 side for {money(YOUTH_TEAM_COST)}. Your first six-match campaign is included. Later entries cost {money(YOUTH_ENTRY_COST)} each.</p>
        <p>Academy facilities {academy.facilities}/20 · Level {YOUTH_FACILITY_LEVEL} required · Budget {money(career.budget)}</p>
        <button type="button" className={button} disabled={academy.facilities < YOUTH_FACILITY_LEVEL || career.budget < YOUTH_TEAM_COST} onClick={onFound}>Found U21 side · {money(YOUTH_TEAM_COST)}</button>
      </> : <>
        {campaign && <>
          <p className="font-semibold">{nominee?.name} · {fixtures.length}/{YOUTH_MATCHES} matches</p>
          <p>{youthDevelopment(campaign).map(p => `${p.name} +${p.gain}`).join(' · ') || 'No development recorded yet.'}</p>
          {second && secondRecord ? <p>Second place: {second.name} · {secondRecord.apps} appearances · +{secondRecord.gain} rating · {money(second.fee)} paid</p>
            : campaign.season === career.season && !fixtures.length && secondId && onSecondPlace && <details>
              <summary className="min-h-11 cursor-pointer py-3 font-semibold">Fund a second development place</summary>
              <p>Spend {money(YOUTH_SECOND_PLACE_COST)} on coaching for another prospect across these six matches. He can gain one rating point every two matches, up to his potential. Promoting him ends his U21 appearances.</p>
              <label htmlFor="u21-second" className="mt-2 block font-semibold">Second prospect</label>
              <select id="u21-second" className="min-h-11 w-full rounded-md border border-border bg-card px-2" value={secondId} onChange={e => setChosen(e.target.value)}>
                {available.map(p => <option key={p.id} value={p.id}>{p.name} · {p.position} · {p.rating} OVR</option>)}
              </select>
              <button type="button" className={button + ' mt-2'} disabled={career.budget < YOUTH_SECOND_PLACE_COST}
                onClick={() => setFundingNote(onSecondPlace(career.clubName, career.season, secondId) ? '' : 'The place could not be funded. Check the active save and budget.')}>Fund second place · {money(YOUTH_SECOND_PLACE_COST)}</button>
              {fundingNote && <p role="status">{fundingNote}</p>}
            </details>}
          {fixtures.length > 0 && <ol className="divide-y divide-border">{fixtures.map((m, index) => <li key={m.season + '/' + m.round} className="flex justify-between gap-2 py-1">
            <span>{m.opponent} U21</span><span className="tabular-nums">{m.gf}-{m.ga}{m.gain > 0 ? ` · ${youthNomineeAt(campaign, index).name} +1` : ''}</span>
          </li>)}</ol>}
          {!done && !choices.some(p => p.id === nominee?.prospectId) && <p>{nominee?.name} is unavailable for U21 development.</p>}
          {after !== null && replacement && <details className="border-t border-border">
            <summary className="min-h-11 cursor-pointer py-3 font-semibold">Rotate your prospect</summary>
            <p>Keep {nominee?.name} or give the next two league dates to another prospect. The next rating point on the main place goes to the selected player.</p>
            <label htmlFor="u21-rotation" className="mt-2 block font-semibold">Next two matches</label>
            <select id="u21-rotation" className="min-h-11 w-full rounded-md border border-border bg-card px-2" value={replacement} onChange={e => setChosen(e.target.value)}>
              {alternatives.map(p => <option key={p.id} value={p.id}>{p.name} · {p.position} · {p.rating} OVR</option>)}
            </select>
            <button type="button" className={button + ' mt-2'} onClick={() => onRotate(campaign.season, after, replacement)}>Confirm rotation</button>
          </details>}
          {done && <p>Campaign complete · {fixtures.reduce((pts, m) => pts + (m.gf === m.ga ? 1 : m.gf > m.ga ? 3 : 0), 0)} points</p>}
        </>}
        {(!campaign || (done && campaign.season < career.season)) && <>
          <p>Pick an academy prospect for the next six league dates. Every two youth matches can add one rating point, up to his potential. You can rotate your prospect after matches two and four. Promotion ends his U21 development.</p>
          {choices.length ? <>
            <label className="block font-semibold" htmlFor="u21-prospect">Featured prospect</label>
            <select id="u21-prospect" className="min-h-11 w-full rounded-md border border-border bg-card px-2" value={selected} onChange={e => setChosen(e.target.value)}>
              {choices.map(p => <option key={p.id} value={p.id}>{p.name} · {p.position} · {p.rating} OVR</option>)}
            </select>
            <button type="button" className={button} disabled={career.budget < fee} onClick={() => onEnter(selected)}>{fee ? 'Enter next campaign · ' + money(fee) : 'Enter first campaign'}</button>
          </> : <p>Send a scout or wait for your next academy intake to register a prospect.</p>}
        </>}
        {done && campaign.season === career.season && <p>Registration opens again next season.</p>}
        {!!team.history?.length && <details className="border-t border-border">
          <summary className="min-h-11 cursor-pointer py-3 font-semibold">Past U21 campaigns ({team.history.length})</summary>
          <ol className="space-y-2">{[...team.history].reverse().map(past => {
            const record = youthCampaignRecord(past);
            return <li key={past.season} className="rounded-md bg-secondary/40 px-2 py-1">
              <p className="font-semibold">Season {past.season} · {past.name}</p>
              <p>{record.wins}W {record.draws}D {record.losses}L · {record.wins * 3 + record.draws} pts · {record.gf} for, {record.ga} against</p>
              <p>Development: +{record.gain} rating</p>
              {past.secondPlace && <p>Second place: {past.secondPlace.name} · {secondPlaceRecord(past).apps} appearances · +{secondPlaceRecord(past).gain} rating · {money(past.secondPlace.fee)} paid</p>}
              {!!past.rotations?.length && <p>{youthDevelopment(past).map(p => `${p.name} +${p.gain}`).join(' · ')}</p>}
            </li>;
          })}</ol>
        </details>}
      </>}
    </div>
  </details>;
}
