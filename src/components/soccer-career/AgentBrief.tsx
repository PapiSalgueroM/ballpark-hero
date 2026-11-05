import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { projectLeagueApps, transferBriefPreview, type CareerState, type ClubData } from '@/lib/soccerCareerEngine';
import { readTransferBrief, setTransferBrief, type TransferBriefPriority, type TransferBriefMinimum } from '@/lib/soccerCareerTransferBrief';
/* Release AW: a club that broke its appearance promise always answers a transfer request (the season plan's
   rule, kept on the brief's path too), so the rules below may not promise a coin toss to that player. */
import { programmePromiseBroken } from '@/lib/soccerCareerProgramme';

const HELP_KEY = 'soccer-transfer-brief-help-v1';
const descriptions: Record<TransferBriefPriority, string> = {
  minutes: 'Target the best projected league minutes among clubs interested in your level.',
  level: 'Target the highest club level available to this player.',
  home: 'Target eligible clubs in your nationality country.',
};

export default function AgentBrief({ career, clubs, onCareer }: {
  career: CareerState;
  clubs: ClubData[];
  onCareer: (fn: (previous: CareerState) => CareerState) => void;
}) {
  const [open, setOpen] = useState(false);
  const [help, setHelp] = useState(true);
  const [priority, setPriority] = useState<TransferBriefPriority | null>(null);
  const [minimumApps, setMinimumApps] = useState<TransferBriefMinimum>(0);
  const [preferredLeague, setPreferredLeague] = useState<string | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const saving = useRef(false);
  const preview = transferBriefPreview(career, clubs, open && !help ? minimumApps : undefined, open && !help ? preferredLeague : undefined);
  const brief = readTransferBrief(career, projectLeagueApps);
  if (preview.blockedReason) return <p role="alert" className="rounded-xl border border-border p-3 text-sm">{preview.blockedReason}</p>;
  if (!preview.eligible) return null;

  const changeOpen = (next: boolean) => {
    if (next) {
      saving.current = false;
      setPriority(brief?.priority ?? null);
      setMinimumApps(brief?.minimumApps ?? 0);
      setPreferredLeague(brief?.preferredLeague ?? null);
      try { setHelp(localStorage.getItem(HELP_KEY) !== '1'); } catch { setHelp(true); }
    }
    setOpen(next);
  };
  const finishHelp = () => {
    try { localStorage.setItem(HELP_KEY, '1'); } catch { /* The guide stays usable without storage. */ }
    setHelp(false);
  };
  const save = (next: TransferBriefPriority | null) => {
    if (saving.current) return;
    saving.current = true;
    onCareer(previous => setTransferBrief(previous, next, minimumApps, preferredLeague));
    changeOpen(false);
  };
  const selected = preview.options.find(option => option.id === brief?.priority);

  return <div data-transfer-brief-selection className="rounded-xl border border-border bg-card p-3 text-sm">
    <p className="font-semibold">Transfer search: {selected?.label ?? 'Normal search'}</p>
    <p className="mt-1 text-xs text-muted-foreground">Choose a target before requesting a transfer. A brief lasts for this window.</p>
    {brief?.preferredLeague && <p className="mt-1 text-xs">League: {brief.preferredLeague}</p>}
    {brief?.preferredLeague && selected?.matchingCount === 0 && <p role="status" className="mt-2 text-xs text-amber-400">No eligible club matches this league and brief. Change the league, lower the minimum or use normal search before requesting a move.</p>}
    {brief?.minimumApps && <p className="mt-1 text-xs">Minimum: {brief.minimumApps} projected league appearances. Not guaranteed starts.</p>}
    {brief?.minimumApps && selected?.matchingCount === 0 && <p role="status" className="mt-2 text-xs text-amber-400">No eligible club meets this projected appearance minimum. Lower the minimum or use normal search before requesting a move.</p>}
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button ref={trigger} data-transfer-brief-open variant="outline" className="mt-3 min-h-11 w-full whitespace-normal">Set transfer priority</Button>
      </DialogTrigger>
      <DialogContent data-transfer-brief className="flex max-h-[calc(100dvh_-_2rem)] w-[calc(100vw_-_2rem)] max-w-md flex-col gap-3 rounded-xl p-4 [&>button:last-child]:h-11 [&>button:last-child]:w-11 [&>button:last-child]:opacity-100"
        onOpenAutoFocus={event => { event.preventDefault(); heading.current?.focus({ preventScroll: true }); }}
        onCloseAutoFocus={event => { event.preventDefault(); trigger.current?.focus({ preventScroll: true }); }}>
        <DialogTitle ref={heading} tabIndex={-1} className="pr-12 text-base">Your transfer brief</DialogTitle>
        <DialogDescription>What matters most in your next move?</DialogDescription>
        <div className="min-h-0 space-y-3 overflow-y-auto text-xs leading-relaxed">
          {help ? <div data-transfer-brief-help className="space-y-3">
            <p>Pick a priority, save the brief, then use Request transfer in the window. Saving a brief does not request a move.</p>
            <p>{programmePromiseBroken(career) ? 'Your club broke its appearance promise, so this request gets a response for sure.' : 'The response chance stays 50%.'} The search uses clubs already eligible for your age and rating in this save's next season.</p>
            <p>Minutes uses the same league appearance bands as the season engine. Club level uses the game's tiers, with tier 1 the highest. Home uses your nationality country.</p>
            <p>Example: two eligible clubs project 8 to 16 and 20 to 30 league games. Minutes targets the second club. Injuries and selection can still change your season.</p>
            <p>No matching clubs means no offer. A saved response cannot be rolled again by reloading. Club-arranged sales and loans still follow the club's decision.</p>
            <p>A minimum uses the bottom of the projected league-appearance band. A band of 20 to 30 does not meet a 26-appearance minimum; 26 to 34 does. A higher minimum can mean a lower club level or no matches. It is not a contract promise.</p>
            <p>Choose Any league or one from the eligible pool. Example: choosing one league can mean a lower club level or no matches. Home also needs a club in your nationality country. If no club matches your league and brief, no request is sent and your existing offer stays unchanged.</p>
            <p>If no club meets an active minimum, no request is sent, even after a broken appearance promise. Your existing offer stays unchanged and no response is rolled.</p>
          </div> : <div data-transfer-brief-preview className="space-y-2">
            <label className="block space-y-1 font-semibold">Preferred league
              <select aria-label="Preferred league" value={preferredLeague ?? ''} onChange={event => setPreferredLeague(event.target.value || null)} className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-xs">
                <option value="">Any league</option>
                {preferredLeague && !preview.leagues.includes(preferredLeague) && <option value={preferredLeague}>{preferredLeague} (unavailable)</option>}
                {preview.leagues.map(league => <option key={league} value={league}>{league}</option>)}
              </select>
            </label>
            <label className="block space-y-1 font-semibold">Minimum projected league appearances
              <select aria-label="Minimum projected league appearances" value={minimumApps} onChange={event => setMinimumApps(Number(event.target.value) as TransferBriefMinimum)} className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-xs">
                <option value="0">Any</option><option value="18">18 or more</option><option value="26">26 or more</option>
              </select>
            </label>
            {preview.options.map(option => <Button key={option.id} type="button" data-transfer-priority={option.id} variant="outline"
              aria-pressed={priority === option.id} onClick={() => setPriority(option.id)}
              className={`h-auto min-h-11 w-full flex-col items-start whitespace-normal p-3 text-left text-xs ${priority === option.id ? 'border-emerald-500 bg-emerald-500/10' : ''}`}>
              <span className="font-bold">{option.label}</span>
              <span className="mt-1 font-normal text-muted-foreground">{descriptions[option.id]}</span>
              <span className="mt-1 font-normal">{option.matchingCount} matching club{option.matchingCount === 1 ? '' : 's'}{option.projection ? ` · about ${option.projection.min} to ${option.projection.max} league games` : ''}</span>
            </Button>)}
            <p className="pt-1 text-muted-foreground">{preview.options[0]?.eligibleCount ?? 0} eligible clubs before your league, priority and minimum. These are projections, not offers or guaranteed starts.</p>
          </div>}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button data-transfer-brief-back variant="outline" className="min-h-11 flex-1 whitespace-normal px-2 text-xs" onClick={() => help ? finishHelp() : changeOpen(false)}>{help ? 'Back to brief' : 'Back'}</Button>
          <Button data-transfer-brief-help-open variant="outline" className="h-11 w-11 shrink-0 p-0" aria-label="Transfer brief help" aria-expanded={help} onClick={() => help ? finishHelp() : setHelp(true)}>?</Button>
          {help ? <Button className="min-h-11 flex-1 whitespace-normal px-2 text-xs" onClick={finishHelp}>Choose a priority</Button>
            : <Button data-transfer-brief-save disabled={!priority} className="min-h-11 flex-1 whitespace-normal px-2 text-xs" onClick={() => priority && save(priority)}>Save brief</Button>}
        </div>
        {!help && <Button data-transfer-brief-clear variant="ghost" className="min-h-11 shrink-0 whitespace-normal text-xs" onClick={() => save(null)}>Use normal search</Button>}
      </DialogContent>
    </Dialog>
  </div>;
}
