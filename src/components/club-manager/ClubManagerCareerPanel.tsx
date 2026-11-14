import { lazy, Suspense, useState } from 'react';
import { formatNumber } from '@/lib/formatNumber';
import { Pencil, UserPlus } from 'lucide-react';
import { FlagImg } from '@/components/FlagImg';
import { MANAGER_BACKGROUNDS, CLUB_IDENTITIES, MANAGER_AGE_BANDS, MENTALITIES, money, managerLookOf } from '@/lib/clubManager';
import type { CareerState, nationOfferFor } from '@/lib/clubManager';
import type { useClubManager } from '@/hooks/useClubManager';
import JobHuntCard from '@/components/club-manager/JobHuntCard';
import ManagerAvatar from '@/components/club-manager/ManagerAvatar';
import EditManagerSheet from '@/components/club-manager/EditManagerSheet';
import { huntBusy } from '@/lib/clubManagerJobHunt';
import { BACKGROUND_TREE, TREE_INFO } from '@/lib/clubManagerXp';
import { highestScoringOf, scoringOutcome } from '@/lib/clubManagerRecords';
import CmRetireDoor from '@/components/club-manager/CmRetireDoor';
import type { IntlTableRow } from '@/lib/soccerInternational';
import { nationalSummerOf } from '@/lib/clubManagerNationalXI';

const NationalLineup = lazy(() => import('@/components/club-manager/ClubManagerNationalLineup').then(module => ({ default: module.ClubManagerNationalLineup })));

function CampaignTable({ label, rows, nation }: { label: string; rows: IntlTableRow[]; nation: string }) {
  return (
    <table className="w-full text-left text-xs tabular-nums">
      <caption className="pb-1 text-left font-semibold">{label}</caption>
      <thead>
        <tr><th scope="col">Team</th><th scope="col" className="text-right">Played</th><th scope="col" className="text-right"><abbr title="Goal difference">GD</abbr></th><th scope="col" className="text-right">Pts</th></tr>
      </thead>
      <tbody>
        {rows.map(row => (
          <tr key={row.nation} className={row.nation === nation ? 'text-primary font-bold' : 'text-muted-foreground'}>
            <th scope="row" className="py-0.5 pr-1 font-medium">{row.nation}</th>
            <td className="text-right">{row.played}</td>
            <td className="text-right">{row.gf - row.ga}</td>
            <td className="text-right">{row.points}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* Round 1325: a score printed low number first. The save has kept the worst
   defeat as the other side's goals first since Round 71, so "3-0 vs Manchester
   City" read like a win. A defeat the engine keeps is never a shootout, so our
   goals are always the lower number, whichever order a save holds them in.
   Anything that is not two whole numbers comes back exactly as it was. */
export function lowFirst(score: string): string {
  const parts = score.split('-');
  if (parts.length !== 2 || parts.some(x => x.trim() === '')) return score;
  const [a, b] = parts.map(Number);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return score;
  return `${Math.min(a, b)}-${Math.max(a, b)}`;
}

export default function ClubManagerCareerPanel({ c, g, nationOffer, onRetireOpen }: {
  c: CareerState;
  /* Round 1343: retire is optional, and the door is drawn only when it is passed. */
  g: Pick<ReturnType<typeof useClubManager>, 'resignNation' | 'acceptNation' | 'answerApproach' | 'applyJob' | 'joinNow' | 'joinSummer' | 'updateManager'>
    & Partial<Pick<ReturnType<typeof useClubManager>, 'retire' | 'setNationalTactics' | 'saveNationalXI'>>;
  nationOffer: ReturnType<typeof nationOfferFor>;
  onRetireOpen?: () => void;
}) {
  /* Round 965: the Edit manager sheet, and for a Skip career the way to name
     the man in the dugout after all. */
  const [editing, setEditing] = useState(false);
  const [showNationalXI, setShowNationalXI] = useState(false);
  const look = managerLookOf(c.manager?.appearance);
  const bg = c.manager ? MANAGER_BACKGROUNDS[c.manager.background] : undefined;
  /* The +1 line reads the XP block's own record of the point, not the
     background table, so it only shows once the point has been handed over. */
  const bgTree = c.manager && c.managerXp?.gift && BACKGROUND_TREE[c.manager.background] === c.managerXp.gift ? c.managerXp.gift : undefined;
  const campaign = c.nationCampaign;
  const mentality = c.nationJob?.mentality ?? 'balanced';
  const summer = nationalSummerOf(c);
  const onSave = g.saveNationalXI;
  if (showNationalXI && summer && onSave) {
    const onBack = () => setShowNationalXI(false);
    return <Suspense fallback={<button type="button" className="min-h-11" onClick={onBack}>← Manager</button>}>
      <NationalLineup career={c} year={summer.year} name={summer.name} onSave={onSave} onBack={onBack} />
    </Suspense>;
  }
  return (
                <>
                {/* Round 202: the international job. Club football is
                    unchanged; the country only plays in the summer. */}
                {c.nationJob ? (
                  <div data-nation-job className="bg-card border border-primary/40 rounded-xl p-3 mb-2">
                    <div className="text-[10px] text-primary uppercase tracking-wider mb-1.5 font-bold">🌐 {c.nationJob.nation} manager</div>
                    <p className="text-xs text-foreground">
                      In charge since season {c.nationJob.since}. {c.nationJob.played === 0
                        ? 'Your first tournament summer is still to come.'
                        : `${formatNumber(c.nationJob.played)} tournament${c.nationJob.played === 1 ? '' : 's'} taken charge of, ${formatNumber(c.nationJob.won)} won.`}
                    </p>
                    {!campaign && c.nationJob.lastResult && c.nationJob.lastResult !== 'Not Selected' && (
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Last summer{c.nationJob.lastYear && c.nationJob.lastYear >= 1900 ? ` (${c.nationJob.lastYear})` : ''}: {c.nationJob.lastResult}.
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Tournaments run between club seasons. Miss one your country should have reached and the federation will not wait around.
                    </p>
                    {summer && onSave && (
                      <button type="button" onClick={() => setShowNationalXI(true)}
                        className="mt-2 w-full min-h-11 rounded-lg border border-border px-2 text-xs font-bold">
                        {c.nationJob.xi?.year === summer.year ? 'Edit national starting XI' : 'Pick national starting XI'}
                      </button>
                    )}
                    {g.setNationalTactics && (
                      <fieldset className="my-2">
                        <legend className="text-xs font-semibold">National tactics</legend>
                        <p className="my-1 text-xs text-muted-foreground">Defensive games tend to have fewer goals for both sides. Attacking games tend to have more.</p>
                        <div className="grid grid-cols-3 gap-1">
                          {MENTALITIES.map(option => (
                            <button
                              key={option.id}
                              type="button"
                              aria-pressed={option.id === mentality}
                              onClick={() => g.setNationalTactics?.(option.id)}
                              className={option.id === mentality
                                ? 'min-h-11 rounded-lg border border-primary bg-primary/10 px-1 text-xs font-bold text-primary'
                                : 'min-h-11 rounded-lg border border-border px-1 text-xs'}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </fieldset>
                    )}
                    <button
                      onClick={g.resignNation}
                      className="mt-2 w-full min-h-11 py-2 rounded-lg bg-secondary text-foreground text-xs font-bold hover:opacity-90 transition-opacity"
                    >
                      Step down from the national team
                    </button>
                  </div>
                ) : nationOffer ? (
                  <div data-nation-offer className="bg-card border border-primary/50 rounded-xl p-3 mb-2">
                    <div className="text-[10px] text-primary uppercase tracking-wider mb-1.5 font-bold">🌐 Your country is calling</div>
                    <p className="text-sm text-foreground font-bold mb-0.5">{nationOffer.nation} want you.</p>
                    <p className="text-[11px] text-muted-foreground mb-2">{nationOffer.blurb}</p>
                    <button
                      onClick={g.acceptNation}
                      className="w-full min-h-11 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity"
                    >
                      🌐 Take the {nationOffer.nation} job as well
                    </button>
                  </div>
                ) : null}
                {campaign && (
                  <details data-cm-nation-campaign className="mb-2 rounded-xl border border-border bg-card px-3">
                    <summary className="min-h-11 cursor-pointer py-3 text-xs font-semibold">
                      {campaign.nation} · {campaign.name}{campaign.year >= 1900 ? ` ${campaign.year}` : ''} · {campaign.result}
                    </summary>
                    <div className="space-y-3 pb-3">
                      {campaign.mentality && <p className="text-xs text-muted-foreground">Campaign tactics: {MENTALITIES.find(option => option.id === campaign.mentality)?.label}</p>}
                      {campaign.xi && (
                        <details>
                          <summary className="min-h-11 cursor-pointer py-3 text-xs font-semibold">Starting XI · {campaign.xi.formation}</summary>
                          <ol className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
                            {campaign.xi.players.map((player, i) => <li key={i}>{i + 1}. {player.name} · {player.position} · {player.rating}</li>)}
                          </ol>
                        </details>
                      )}
                      {campaign.xiUnavailable && <p className="text-xs text-muted-foreground">The saved XI included an unavailable player. The campaign used automatic selection.</p>}
                      {campaign.lostJob && <p className="text-xs text-muted-foreground">The federation ended your contract after qualifying.</p>}
                      {campaign.qualifying.automatic
                        ? <p className="text-xs text-muted-foreground">Automatic entry to the tournament.</p>
                        : <CampaignTable label="Simulated qualifying group" rows={campaign.qualifying.table} nation={campaign.nation} />}
                      {campaign.groupTable.length > 0 && <CampaignTable label={campaign.groupLabel ?? 'Tournament group'} rows={campaign.groupTable} nation={campaign.nation} />}
                      {campaign.matches.length > 0 && (
                        <div>
                          <h3 className="text-xs font-semibold">Tournament results</h3>
                          <ol className="mt-1 space-y-1 text-xs">
                            {campaign.matches.map((match, i) => (
                              <li key={i} className="rounded-md bg-secondary/40 px-2 py-1.5">
                                <span className="block text-muted-foreground">{match.round}</span>
                                <span>{match.home} {match.homeGoals}-{match.awayGoals} {match.away}</span>
                                {match.pens && match.winner && <span className="block text-muted-foreground">{match.winner} won on penalties.</span>}
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </div>
                  </details>
                )}
                {/* Round 168: mid-season approaches land here, his CM-10. */}
                {c.approach && (
                  <div className="bg-card border border-primary/50 rounded-xl p-3 mb-2">
                    <div className="text-[10px] text-primary uppercase tracking-wider mb-1.5 font-bold">📞 An approach has come in</div>
                    <p className="text-sm text-foreground font-bold mb-0.5">{c.approach.club} want you as their manager.</p>
                    <p className="text-[11px] text-muted-foreground mb-2">{c.approach.blurb}</p>
                    <p className="text-[10px] text-muted-foreground mb-2">Commit and it becomes a summer pre-agreement: the move happens when the season ends, the news breaks today, and your current board will not love it. Ignore it and they move on in a few weeks.</p>
                    <div className="flex gap-2">
                      {/* Round 783 review: never promised to two clubs. The
                          engine refuses the handshake while an application is
                          out or a move is booked, so the button goes too. */}
                      {!huntBusy(c) && (
                        <button
                          onClick={() => g.answerApproach(true)}
                          className="flex-1 min-h-11 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity"
                        >
                          🤝 Shake hands for the summer
                        </button>
                      )}
                      <button
                        onClick={() => g.answerApproach(false)}
                        className="flex-1 min-h-11 py-2 rounded-lg border border-border bg-card text-xs font-bold text-foreground hover:border-primary transition-colors"
                      >
                        Turn them down
                      </button>
                    </div>
                  </div>
                )}
                {c.pendingMove && (
                  <div className="bg-card border border-gold/40 rounded-xl p-3 mb-2 text-xs text-foreground">
                    🤝 <span className="font-bold">Pre-agreement signed:</span> you take over at <span className="font-bold">{c.pendingMove.club}</span> when the season ends. Finish the job here first.
                  </div>
                )}
                {/* Round 783: the other direction of the phone. Not while out of
                    work, where the wilderness screen has its own market. */}
                {!c.sacked && !c.wilderness && (
                  <JobHuntCard c={c} onApply={g.applyJob} onJoinNow={g.joinNow} onJoinSummer={g.joinSummer} />
                )}
                <div data-cm-career-card className="bg-card border border-border rounded-xl p-3">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">💼 Manager career</div>
                  {/* Round 303: the created manager's card line. Absent spec, the
                      panel reads exactly as it always has. */}
                  {c.manager ? (
                    <div data-manager-card className="flex items-center gap-2.5 mb-2 rounded-lg border border-border bg-background/60 px-2.5 py-2">
                      {/* Round 965: his face, when he has one. A Round 303
                          manager has none until he builds it in the sheet. */}
                      {look && <ManagerAvatar look={look} size={56} className="rounded-lg bg-secondary/40" />}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <FlagImg name={c.manager.nationality} size={14} />
                          <span className="text-xs font-bold text-foreground truncate">{c.manager.name}</span>
                          {look && <span className="text-[9px] text-muted-foreground">{MANAGER_AGE_BANDS[look.ageBand].label}</span>}
                        </div>
                        <div className="text-[9px] text-muted-foreground truncate">
                          {bg?.emoji} {bg?.label}
                          {' · '}{CLUB_IDENTITIES[c.manager.style]?.emoji} {CLUB_IDENTITIES[c.manager.style]?.label}
                        </div>
                        {bgTree && <div className="text-[9px] font-bold text-gold">+1 {TREE_INFO[bgTree].label} from his background</div>}
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditing(true)}
                        className="shrink-0 inline-flex min-h-11 items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-bold text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
                      >
                        <Pencil className="w-3 h-3" /> Edit
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      data-name-manager
                      onClick={() => setEditing(true)}
                      className="w-full min-h-11 mb-2 inline-flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-2.5 py-2 text-xs font-bold text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Name your manager
                    </button>
                  )}
                  <EditManagerSheet career={c} open={editing} onOpenChange={setEditing} onSave={g.updateManager} />
                  <div className="grid grid-cols-3 gap-2 text-center mb-2">
                    <div>
                      <div className="text-sm font-bold font-display text-foreground">{formatNumber(c.careerStats.wins)}W {formatNumber(c.careerStats.draws)}D {formatNumber(c.careerStats.losses)}L</div>
                      <div className="text-[9px] text-muted-foreground">Record</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold font-display text-foreground">{c.careerStats.played > 0 ? Math.round((c.careerStats.wins / c.careerStats.played) * 100) : 0}%</div>
                      <div className="text-[9px] text-muted-foreground">Win rate</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold font-display text-foreground">{formatNumber(c.trophies.length)}</div>
                      <div className="text-[9px] text-muted-foreground">Trophies</div>
                    </div>
                  </div>
                  <ManagerRecordLines c={c} />
                  {g.retire && !c.retired && !c.live && (
                    <div className="mt-3"><CmRetireDoor c={c} retire={g.retire} onOpen={onRetireOpen} /></div>
                  )}
                </div>
                </>
  );
}

/* Round 1343: the record lines, one list for the Manager panel and the farewell. Text unchanged from the panel,
   plus the highest scoring game after the worst defeat. */
export function ManagerRecordLines({ c, ended = false }: { c: CareerState; /** On the farewell: no first match is coming. */ ended?: boolean }) {
  const high = highestScoringOf(c);
  const counted = high?.missed ? Math.max(0, c.careerStats.played - high.missed) : 0;
  return (
                  <div data-cm-career-lines className="space-y-0.5 text-xs text-muted-foreground">
                    {c.careerStats.biggestWin && (
                      <p>🎉 Biggest win: <span className="text-foreground font-semibold">{c.careerStats.biggestWin.score}</span> vs {c.careerStats.biggestWin.opp}</p>
                    )}
                    {c.careerStats.biggestDefeat && (
                      <p data-cm-worst-defeat>💀 Worst defeat: <span className="text-foreground font-semibold">{lowFirst(c.careerStats.biggestDefeat.score)}</span> vs {c.careerStats.biggestDefeat.opp}</p>
                    )}
                    {high && (
                      <p data-cm-highest-scoring>⚽ Highest scoring game: <span className="text-foreground font-semibold">{high.score}</span>{SCORING_WORD[scoringOutcome(high)]} vs {high.opp}{SCORING_AFTER[scoringOutcome(high)]}, <span className="whitespace-nowrap">Season {formatNumber(high.season)}</span></p>
                    )}
                    {high && (high.missed ?? 0) >= 1 && (
                      <p data-cm-highest-scoring-missed>Counted from {formatNumber(counted)} of your {formatNumber(c.careerStats.played)} matches. Your save no longer keeps {high.missed === 1 ? 'the score of the other one' : `the scores of the other ${formatNumber(high.missed!)}`}.</p>
                    )}
                    {c.careerStats.mostExpensiveBuy && (
                      <p>💸 Priciest buy: <span className="text-foreground font-semibold">{c.careerStats.mostExpensiveBuy.name}</span> ({money(c.careerStats.mostExpensiveBuy.fee, c)})</p>
                    )}
                    {c.careerStats.mostExpensiveSale && (
                      <p>🤑 Best sale: <span className="text-foreground font-semibold">{c.careerStats.mostExpensiveSale.name}</span> ({money(c.careerStats.mostExpensiveSale.fee, c)})</p>
                    )}
                    {(c.careerStats.clubsManaged?.length ?? 0) > 1 && (
                      <p>🧳 Clubs managed: <span className="text-foreground">{c.careerStats.clubsManaged!.join(', ')}</span></p>
                    )}
                    {c.careerStats.played === 0 && <p>{ended ? 'You retired before your first match, so there are no numbers to keep.' : 'Take charge of your first match and the numbers start here.'}</p>}
                  </div>
  );
}

/* The word after the score comes from the score (a res that contradicts it gets none); res only says who won a
   level shootout. Never "2-5 win". */
const SCORING_WORD: Record<ReturnType<typeof scoringOutcome>, string> = { win: ' win', loss: ' loss', draw: ' draw', pensWon: '', pensLost: '', plain: '' };
const SCORING_AFTER: Record<ReturnType<typeof scoringOutcome>, string> = { win: '', loss: '', draw: '', pensWon: ', won on penalties', pensLost: ', lost on penalties', plain: '' };
