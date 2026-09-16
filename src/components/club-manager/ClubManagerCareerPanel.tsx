import { FlagImg } from '@/components/FlagImg';
import { MANAGER_BACKGROUNDS, CLUB_IDENTITIES, money } from '@/lib/clubManager';
import type { CareerState, nationOfferFor } from '@/lib/clubManager';
import type { useClubManager } from '@/hooks/useClubManager';

export default function ClubManagerCareerPanel({ c, g, nationOffer }: {
  c: CareerState;
  g: Pick<ReturnType<typeof useClubManager>, 'resignNation' | 'acceptNation' | 'answerApproach'>;
  nationOffer: ReturnType<typeof nationOfferFor>;
}) {
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
                      <button
                        onClick={() => g.answerApproach(true)}
                        className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity"
                      >
                        🤝 Shake hands for the summer
                      </button>
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
                <div className="bg-card border border-border rounded-xl p-3">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">💼 Manager career</div>
                  {/* Round 303: the created manager's card line. Absent spec, the
                      panel reads exactly as it always has. */}
                  {c.manager && (
                    <div className="flex items-center gap-2 mb-2 rounded-lg border border-border bg-background/60 px-2.5 py-1.5">
                      <FlagImg name={c.manager.nationality} size={14} />
                      <span className="text-xs font-bold text-foreground truncate">{c.manager.name}</span>
                      <span className="text-[9px] text-muted-foreground truncate">
                        {MANAGER_BACKGROUNDS[c.manager.background]?.emoji} {MANAGER_BACKGROUNDS[c.manager.background]?.label}
                        {' · '}{CLUB_IDENTITIES[c.manager.style]?.emoji} {CLUB_IDENTITIES[c.manager.style]?.label}
                      </span>
                    </div>
                  )}
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
