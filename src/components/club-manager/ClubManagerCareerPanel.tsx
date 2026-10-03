import { useState } from 'react';
import { Pencil, UserPlus } from 'lucide-react';
import { FlagImg } from '@/components/FlagImg';
import { MANAGER_BACKGROUNDS, CLUB_IDENTITIES, MANAGER_AGE_BANDS, money, managerLookOf } from '@/lib/clubManager';
import type { CareerState, nationOfferFor } from '@/lib/clubManager';
import type { useClubManager } from '@/hooks/useClubManager';
import JobHuntCard from '@/components/club-manager/JobHuntCard';
import ManagerAvatar from '@/components/club-manager/ManagerAvatar';
import EditManagerSheet from '@/components/club-manager/EditManagerSheet';
import { huntBusy } from '@/lib/clubManagerJobHunt';
import { BACKGROUND_TREE, TREE_INFO } from '@/lib/clubManagerXp';

export default function ClubManagerCareerPanel({ c, g, nationOffer }: {
  c: CareerState;
  g: Pick<ReturnType<typeof useClubManager>, 'resignNation' | 'acceptNation' | 'answerApproach' | 'applyJob' | 'joinNow' | 'joinSummer' | 'updateManager'>;
  nationOffer: ReturnType<typeof nationOfferFor>;
}) {
  /* Round 965: the Edit manager sheet, and for a Skip career the way to name
     the man in the dugout after all. */
  const [editing, setEditing] = useState(false);
  const look = managerLookOf(c.manager?.appearance);
  const bg = c.manager ? MANAGER_BACKGROUNDS[c.manager.background] : undefined;
  /* The +1 line reads the XP block's own record of the point, not the
     background table, so it only shows once the point has been handed over. */
  const bgTree = c.manager && c.managerXp?.gift && BACKGROUND_TREE[c.manager.background] === c.managerXp.gift ? c.managerXp.gift : undefined;
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
                        : `${c.nationJob.played} tournament${c.nationJob.played === 1 ? '' : 's'} taken charge of, ${c.nationJob.won} won.`}
                    </p>
                    {c.nationJob.lastResult && (
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Last summer ({c.nationJob.lastYear}): {c.nationJob.lastResult}.
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Tournaments run between club seasons. Miss one your country should have reached and the federation will not wait around.
                    </p>
                    <button
                      onClick={g.resignNation}
                      className="mt-2 w-full py-2 rounded-lg bg-secondary text-foreground text-xs font-bold hover:opacity-90 transition-opacity"
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
                      className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity"
                    >
                      🌐 Take the {nationOffer.nation} job as well
                    </button>
                  </div>
                ) : null}
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
                          className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity"
                        >
                          🤝 Shake hands for the summer
                        </button>
                      )}
                      <button
                        onClick={() => g.answerApproach(false)}
                        className="flex-1 py-2 rounded-lg border border-border bg-card text-xs font-bold text-foreground hover:border-primary transition-colors"
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
                <div className="bg-card border border-border rounded-xl p-3">
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
                        className="shrink-0 inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-[10px] font-bold text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
                      >
                        <Pencil className="w-3 h-3" /> Edit
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      data-name-manager
                      onClick={() => setEditing(true)}
                      className="w-full mb-2 inline-flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-2.5 py-2 text-[11px] font-bold text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Name your manager
                    </button>
                  )}
                  <EditManagerSheet career={c} open={editing} onOpenChange={setEditing} onSave={g.updateManager} />
                  <div className="grid grid-cols-3 gap-2 text-center mb-2">
                    <div>
                      <div className="text-sm font-bold font-display text-foreground">{c.careerStats.wins}W {c.careerStats.draws}D {c.careerStats.losses}L</div>
                      <div className="text-[9px] text-muted-foreground">Record</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold font-display text-foreground">{c.careerStats.played > 0 ? Math.round((c.careerStats.wins / c.careerStats.played) * 100) : 0}%</div>
                      <div className="text-[9px] text-muted-foreground">Win rate</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold font-display text-foreground">{c.trophies.length}</div>
                      <div className="text-[9px] text-muted-foreground">Trophies</div>
                    </div>
                  </div>
                  <div className="space-y-0.5 text-[10px] text-muted-foreground">
                    {c.careerStats.biggestWin && (
                      <p>🎉 Biggest win: <span className="text-foreground font-semibold">{c.careerStats.biggestWin.score}</span> vs {c.careerStats.biggestWin.opp}</p>
                    )}
                    {c.careerStats.biggestDefeat && (
                      <p>💀 Worst defeat: <span className="text-foreground font-semibold">{c.careerStats.biggestDefeat.score}</span> vs {c.careerStats.biggestDefeat.opp}</p>
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
                    {c.careerStats.played === 0 && <p>Take charge of your first match and the numbers start here.</p>}
                  </div>
                </div>
                </>
  );
}
