/* Round 908: the re-sign desk, one screen for all four GM games. Renders the
   DeskCase list from src/lib/gmContracts.ts as small tiles; tapping one opens
   that man's table with a back button. Every button here maps to exactly one
   function in gmContracts.ts and its label says what that function applies,
   so the screen cannot promise something the engine does not do.

   It holds no game state of its own beyond what is typed into the offer box:
   the board that mounts it owns the league and the ledger, calls the desk
   functions in the handlers, and hands the results back in as props. */

import { useMemo, useState, type ReactNode } from 'react';
import { HowToPlayPopover } from '@/components/game/HowToPlayPopover';
import { cn } from '@/lib/utils';
import {
  minYearsOf, readOffer, topSalary, type DeskCase, type GmDecision, type GmTerms, type PushResult,
} from '@/lib/gmContracts';
import { contractRulesFor, contractRulesNote, type GmSportKey } from '@/lib/gmContractRules';

const m = (n: number) => `$${n.toFixed(1)}M`;
const yrs = (n: number) => `${n} season${n === 1 ? '' : 's'}`;

const CLASS_LABEL: Record<DeskCase['cls'], string> = {
  veteran: 'Free agent',
  'fifth-year-option': 'Rookie deal, option year available',
  'pre-arbitration': 'Pre arbitration, club controlled',
  arbitration: 'Arbitration year, club controlled',
  'free-agent': 'Free agent',
  restricted: 'Restricted free agent',
  'bird-full': 'Full Bird rights',
  'bird-early': 'Early Bird rights',
  'bird-non': 'Non-Bird rights',
};

const DECISION_LABEL: Record<GmDecision['kind'], string> = {
  keep: 'Re-signed',
  release: 'Let go',
  walkout: 'Walked out',
  option: 'Option picked up',
  tender: 'Tendered',
  'qualify-accepted': 'Took the qualifying offer',
  'qualify-rejected': 'Turned down the qualifying offer',
  match: 'Sheet matched',
  'take-picks': 'Gone to the rival on its sheet, picks coming',
};

/* Round 1018: the NBA keeps restricted free agency beside a man's Bird
   rights, so its tile names both; and a sheet that paid nothing says so
   rather than promising picks. */
const classLabel = (c: DeskCase): string => {
  const label = CLASS_LABEL[c.cls];
  /* Only the first letter drops, so Bird keeps its capital. */
  return c.restricted && c.cls !== 'restricted' ? `Restricted free agent, ${label.charAt(0).toLowerCase()}${label.slice(1)}` : label;
};
const decisionLabel = (d: GmDecision): string =>
  d.kind === 'take-picks' && !d.picks?.length ? 'Gone to the rival on its sheet' : DECISION_LABEL[d.kind];

export interface GmResignDeskProps {
  sport: GmSportKey;
  cases: DeskCase[];
  /** This winter's decision per man id, from decisionFor. */
  decisions: Record<string, GmDecision | undefined>;
  /** The answer to the one push per man id, from pushFor. */
  pushes: Record<string, PushResult | undefined>;
  onKeep: (c: DeskCase) => void;
  onPush: (c: DeskCase, offer: GmTerms) => void;
  onAcceptFinal: (c: DeskCase) => void;
  onLetGo: (c: DeskCase) => void;
  onOption: (c: DeskCase) => void;
  onTender: (c: DeskCase) => void;
  onQualify: (c: DeskCase) => void;
  onMatch: (c: DeskCase) => void;
  onTakePicks: (c: DeskCase) => void;
  /** Run the offseason. Only offered once every man has a decision. Round 987: absent on a board
      whose offseason runs elsewhere (the NHL runs it after the draft), and then no button is drawn. */
  onDone?: () => void;
  /** Round 987: one line under the tiles, for what the board does with a man left open. */
  footnote?: string;
}

export function GmResignDesk(props: GmResignDeskProps) {
  const { sport, cases, decisions, onDone } = props;
  const [openId, setOpenId] = useState<string | null>(null);
  const [offer, setOffer] = useState<GmTerms | null>(null);
  const open = useMemo(() => cases.find(c => c.man.id === openId) ?? null, [cases, openId]);
  const waiting = cases.filter(c => !decisions[c.man.id]).length;

  const help = (
    <HowToPlayPopover title="How the re-sign desk works" triggerSide="right">
      <div className="space-y-2 text-sm">
        <p>Every player whose deal runs out this winter is on a tile. Nobody leaves on a coin flip: you decide every one before the offseason runs.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li><b>Keep him</b> pays exactly what he asked for.</li>
          <li><b>Push once</b> sends your own number. You get one answer: yes, a last word part way down, his ask back with no movement, or he walks.</li>
          <li><b>Let him go</b> sends him to the free agent pool, priced at what he is worth now, not what he was paid. His deal ran out, so there is no dead money.</li>
        </ul>
        <p><b>Worked example.</b> Your 27 year old guard asks for 3 seasons at $12.0M. You push 3 seasons at $10.3M, which is 86 percent of the ask, so the meter sits at 73. His agent comes down 40 percent of the gap to $11.3M and that is the last word: sign it or let him go. Push $7.0M instead (58 percent) and he is insulted and goes back to $12.0M. Push $6.0M and he walks.</p>
        <p className="font-bold">This league's own rules</p>
        <ul className="list-disc space-y-1 pl-5">
          {contractRulesFor(sport).map(r => <li key={r.id}><b>{r.name}.</b> {r.plain} <span className="text-muted-foreground">{r.inGame}</span></li>)}
        </ul>
        <p className="text-muted-foreground">{contractRulesNote()}</p>
      </div>
    </HowToPlayPopover>
  );

  if (open) {
    return (
      <ResignTable
        {...props}
        c={open}
        offer={offer ?? { years: open.ask.years, salary: open.ask.salary }}
        setOffer={setOffer}
        onBack={() => { setOpenId(null); setOffer(null); }}
        help={help}
      />
    );
  }

  return (
    <div data-resign-desk className="relative space-y-3 rounded-xl border border-border p-3">
      {help}
      <p className="text-center text-sm font-bold text-foreground">Re-sign desk</p>
      <p className="text-center text-[11px] text-muted-foreground">
        {cases.length === 0 ? 'Nobody is out of contract this winter.' : waiting ? `${waiting} still waiting on you.` : 'Every call is made.'}
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {cases.map(c => {
          const d = decisions[c.man.id];
          return (
            <button
              key={c.man.id}
              type="button"
              data-resign-tile={d ? 'decided' : 'waiting'}
              onClick={() => { setOpenId(c.man.id); setOffer(null); }}
              className={cn('min-h-[44px] rounded-lg border p-2 text-left text-[11px]', d ? 'border-border bg-secondary/40' : 'border-primary bg-background')}
            >
              <span className="block break-words font-bold text-foreground">{c.man.name}</span>
              <span className="block text-muted-foreground">{c.man.pos} {c.man.ovr} overall, age {c.man.age}</span>
              <span className="block text-foreground">Asks {m(c.ask.salary)} for {yrs(c.ask.years)}</span>
              <span className="block text-muted-foreground">{d ? decisionLabel(d) : classLabel(c)}</span>
            </button>
          );
        })}
      </div>
      {onDone && <button
        type="button"
        disabled={waiting > 0}
        onClick={onDone}
        className="min-h-[44px] w-full rounded-full bg-primary px-4 py-1.5 text-[11px] font-bold text-primary-foreground disabled:opacity-40"
      >
        {waiting > 0 ? 'Decide every player to start the offseason' : 'Start the offseason'}
      </button>}
      {props.footnote && <p data-resign-footnote className="text-center text-[11px] text-muted-foreground">{props.footnote}</p>}
      <p className="text-center text-[10px] text-muted-foreground">{contractRulesNote()}</p>
    </div>
  );
}

function ResignTable({
  sport, c, decisions, pushes, offer, setOffer, onBack, help,
  onKeep, onPush, onAcceptFinal, onLetGo, onOption, onTender, onQualify, onMatch, onTakePicks,
}: GmResignDeskProps & {
  c: DeskCase;
  offer: GmTerms;
  setOffer: (o: GmTerms) => void;
  onBack: () => void;
  help: ReactNode;
}) {
  const d = decisions[c.man.id];
  const push = pushes[c.man.id];
  /* What is sent is what the meter reads: pushFor cuts an offer to what the
     rules allow and rounds it to a tenth, and fits the length to what his
     rights allow, so the meter reads exactly that figure too. */
  const top = topSalary(c);
  const minYears = minYearsOf(c);
  const fit = (y: number) => Math.max(minYears, Math.min(c.maxYears, Math.round(y)));
  const sendable: GmTerms = {
    years: fit(offer.years),
    salary: Math.round(Math.max(0, Math.min(offer.salary, top)) * 10) / 10,
  };
  const read = readOffer(c.ask, sendable);
  const capped = c.ceiling != null && c.ask.salary > c.ceiling;
  const finalAllowed = !!push?.final && !(c.ceiling != null && push.final.salary > c.ceiling);
  const btn = 'min-h-[44px] rounded-full px-4 py-1.5 text-[11px] font-bold';
  const main = cn(btn, 'bg-primary text-primary-foreground');
  const quiet = cn(btn, 'border border-border bg-background text-foreground');
  const sheet = c.restricted?.sheet ?? null;
  const yearsOptions = Array.from({ length: c.maxYears - minYears + 1 }, (_, i) => i + minYears);

  return (
    <div data-resign-table className="relative space-y-3 rounded-xl border border-border p-3">
      {help}
      <button type="button" onClick={onBack} className={quiet}>Back to the desk</button>
      <div className="text-center">
        <p className="break-words text-sm font-bold text-foreground">{c.man.name}</p>
        <p className="text-[11px] text-muted-foreground">{c.man.pos} {c.man.ovr} overall, age {c.man.age}, on {m(c.man.salary)} now</p>
        <p className="text-[11px] text-foreground">{classLabel(c)}</p>
        <p className="text-[11px] text-foreground">His agent asks {m(c.ask.salary)} a season for {yrs(c.ask.years)}.</p>
        {capped && (
          <p className="text-[11px] text-muted-foreground">
            You have no cap room for that, and his rights only let you pay him up to {m(c.ceiling as number)}.
          </p>
        )}
      </div>

      {d ? (
        <p data-resign-decided className="rounded-lg bg-secondary/40 px-2 py-2 text-center text-[11px] text-foreground">
          {decisionLabel(d)}{d.salary != null && d.years != null ? `: ${yrs(d.years)} at ${m(d.salary)}` : ''}
          {d.picks && d.picks.length
            ? `. Picks owed to you: round ${d.picks.join(', round ')}${d.kind === 'qualify-rejected' ? ', once another club signs him' : ''}.`
            : '.'}
        </p>
      ) : (
        <div className="space-y-2">
          {c.option && (
            <button type="button" className={main} onClick={() => onOption(c)}>
              Pick up the option: 1 guaranteed season at {m(c.option.salary)}
            </button>
          )}
          {c.tender && (
            <button type="button" className={main} onClick={() => onTender(c)}>
              Tender him: 1 season at {m(c.tender.salary)}
            </button>
          )}
          {c.qualifying && (
            <button type="button" className={quiet} onClick={() => onQualify(c)}>
              Qualifying offer, 1 season at {m(c.qualifying.salary)}: {c.qualifying.accepts
                ? 'he would take it'
                : `he would turn it down and leave, and you get a round ${c.qualifying.pick} pick once another club signs him`}
            </button>
          )}
          {c.restricted && !sheet && (
            <button type="button" className={quiet} onClick={() => onTender(c)}>
              Qualifying offer: 1 season at {m(c.restricted.qualifying.salary)}, and you keep his rights
            </button>
          )}
          {sheet && (
            <>
              <p className="text-center text-[11px] text-foreground">
                A rival club has signed him to an offer sheet: {yrs(sheet.years)} at {m(sheet.salary)}.
              </p>
              <button type="button" className={main} onClick={() => onMatch(c)}>
                Match it: {yrs(sheet.years)} at {m(sheet.salary)}
              </button>
              <button type="button" className={quiet} onClick={() => onTakePicks(c)}>
                {sheet.picks.length
                  ? `Let him go and take the picks: round ${sheet.picks.join(', round ')}`
                  : sport === 'nba' ? 'Let him go. In the NBA a sheet pays nothing back' : 'Let him go. A sheet this size pays no picks'}
              </button>
            </>
          )}

          {c.canNegotiate && !push && (
            <>
              {!capped && (
                <button type="button" className={main} onClick={() => onKeep(c)}>
                  Keep him: {yrs(fit(c.ask.years))} at {m(c.ask.salary)}
                </button>
              )}
              <div className="space-y-1 rounded-lg border border-border p-2">
                <p className="text-[11px] font-bold text-foreground">Push once</p>
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <label className="flex items-center gap-1">
                    $
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      min="0"
                      value={offer.salary}
                      onChange={e => setOffer({ ...offer, salary: Math.max(0, Number(e.target.value) || 0) })}
                      className="w-20 rounded border border-border bg-background px-1 py-1"
                      aria-label="Salary per season, in millions"
                    />
                    M a season
                  </label>
                  <select
                    value={sendable.years}
                    onChange={e => setOffer({ ...offer, years: Number(e.target.value) })}
                    className="rounded border border-border bg-background px-1 py-1"
                    aria-label="Seasons"
                  >
                    {yearsOptions.map(y => <option key={y} value={y}>{yrs(y)}</option>)}
                  </select>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary" aria-label={`Closeness ${read.closeness} of 100`}>
                  <div className="h-full bg-primary" style={{ width: `${read.closeness}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground">Closeness {read.closeness} of 100. At 100 he signs your terms.</p>
                {offer.salary > top && (
                  <p className="text-[10px] text-muted-foreground">The rules cap what you can send at {m(top)}, so that is what goes.</p>
                )}
                {minYears > 1 && (
                  <p className="text-[10px] text-muted-foreground">Early Bird rights only pay him on a deal of {yrs(minYears)} or more.</p>
                )}
                <button type="button" className={quiet} onClick={() => onPush(c, sendable)}>Send it. You only get one</button>
              </div>
            </>
          )}

          {push && (
            <div data-resign-push={push.verdict} className="space-y-2 rounded-lg bg-background p-2 text-center text-[11px] text-foreground">
              <p>{push.note}</p>
              {push.final && !finalAllowed && (
                <p>Their last word is {m(push.final.salary)}, which is more than his rights let you pay.</p>
              )}
              {push.final && finalAllowed && (
                <button type="button" className={main} onClick={() => onAcceptFinal(c)}>
                  Sign it: {yrs(fit(push.final.years))} at {m(push.final.salary)}
                </button>
              )}
            </div>
          )}

          {/* With a sheet on the table, letting him go is taking the picks, the button above. */}
          {!sheet && (
            <button type="button" className={quiet} onClick={() => onLetGo(c)}>
              Let him go. He joins the free agent pool at his market price, no dead money
            </button>
          )}
        </div>
      )}
      <p className="text-center text-[10px] text-muted-foreground">{contractRulesNote()}</p>
    </div>
  );
}
