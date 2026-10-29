import { useLayoutEffect, useRef, useState } from 'react';
import { lightSeasonPlayer, lightSeasonReservation, sameManKey, setIndividualLightSeason } from '@/lib/clubManager';
import type { CareerState, CMPlayer, IndividualLightSeasonRequest } from '@/lib/clubManager';
import { useRevealScroll } from '@/hooks/useRevealScroll';

type Props = { career: CareerState; onCommit?: (make: (current: CareerState) => CareerState | null) => boolean; onBack: () => void };
const button = 'min-h-11 border border-border rounded-lg px-3 text-xs font-bold';
const terms = (career: CareerState, p: CMPlayer) => ({ version: 1 as const, clubName: career.clubName, season: career.season, playerId: p.id, manKey: sameManKey(p), ...(typeof p.worldRosterKey === 'string' ? { worldRosterKey: p.worldRosterKey } : {}) });

export default function IndividualLightSeason({ career, onCommit, onBack }: Props) {
  const [request, setRequest] = useState<IndividualLightSeasonRequest | null>(null);
  const [help, setHelp] = useState(false), [note, setNote] = useState('');
  const heading = useRef<HTMLHeadingElement>(null), helpButton = useRef<HTMLButtonElement>(null), returnToHelp = useRef(false);
  const held = lightSeasonPlayer(career), reservation = lightSeasonReservation(career);
  const root = useRevealScroll<HTMLDivElement>(`individual-light:${help ? 'help' : held?.id ?? request?.player.id ?? 'pick'}`, { skipFirst: false });
  useLayoutEffect(() => {
    if (returnToHelp.current) { returnToHelp.current = false; helpButton.current?.focus({ preventScroll: true }); }
    else heading.current?.focus({ preventScroll: true });
  }, [help, request, held]);
  const back = () => { if (help) { returnToHelp.current = true; setHelp(false); } else if (request) { setRequest(null); setNote(''); } else onBack(); };
  const pool = reservation ? [] : career.squad.filter(p => lightSeasonPlayer({ ...career, individualLightSeason: terms(career, p) }) === p);
  const commit = () => {
    if (!request) return;
    if (onCommit?.(current => setIndividualLightSeason(current, request))) { setRequest(null); setNote('Light season saved.'); }
    else setNote('That choice expired or could not be saved. Back and choose again.');
  };
  return (
    <div ref={root} className="space-y-2 bg-card border border-border rounded-xl p-3" style={{ overflowAnchor: 'none' }} onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); back(); } }}>
      <div className="flex items-center gap-2">
        <button type="button" className={button} onClick={back}>Back</button>
        <h3 ref={heading} tabIndex={-1} className="flex-1 text-sm font-bold">{help ? 'Light season rules' : 'Light season'}</h3>
        {!help && <button ref={helpButton} type="button" className={button} aria-label="Light season rules" onClick={() => setHelp(true)}>?</button>}
      </div>
      {help ? <div className="space-y-2 text-xs">
        <p>Choose one player you own. His recovery uses the existing Light setting, and his positive development uses Light through this season's growth. He can still improve. Normal age decline stays the same.</p>
        <p>You cannot clear or replace a valid commitment before that growth settles. Changing team sessions cannot cancel its cost. Team focus and training knock checks stay the same.</p>
        <p>Loans keep their separate growth boost and buy options. If he returns to you, Light still applies to his normal positive year-end development.</p>
        <h4 className="font-bold">Worked example</h4>
        <p>A tired young player can recover more between matches, while improving more slowly at the end of the season. Everyone else follows the team plan. Choose nobody to leave individual Light season off.</p>
      </div> : <>
        <p className="text-xs text-muted-foreground">Light recovery for one player, with slower positive development. It lasts through this season's growth.</p>
        {reservation ? <div className="space-y-1 text-xs"><p className="font-bold">{held ? `${held.name}, ${held.position}` : "This season's choice is locked."}</p><p>Committed for season {career.season}. This cannot be cleared or replaced before growth settles.</p></div> : request ? <div className="space-y-2 text-xs">
          <p className="font-bold">{request.player.name}, {request.player.position}, age {request.player.age}</p>
          <p>Confirming locks this player into Light through this season's growth. A late team-plan change will not remove the slower positive development.</p>
          <button type="button" className={button + ' w-full bg-primary text-primary-foreground disabled:opacity-50'} disabled={!onCommit || request.source !== career} onClick={commit}>Confirm Light season</button>
          {request.source !== career && <p role="status">Your career changed. Back and choose again.</p>}
        </div> : <label className="block text-xs">Player for Light season
          <select className="mt-1 min-h-11 w-full bg-background border border-border rounded-lg px-2" value="" onChange={e => { const p = pool.find(p => p.id === e.target.value); if (p) setRequest({ source: career, player: p, data: terms(career, p) }); }}>
            <option value="">Follow team</option>
            {pool.map(p => <option key={p.id} value={p.id}>{p.name}, {p.position}</option>)}
          </select>
        </label>}
        {note && <p role="status" className="text-xs">{note}</p>}
      </>}
    </div>
  );
}
