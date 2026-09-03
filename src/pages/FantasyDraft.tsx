import { useState, useEffect, useCallback, useRef } from 'react';
import { GameNavbar } from '@/components/game/GameNavbar';
import { GameHelp } from '@/components/game/GameHelp';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';

import { Button } from '@/components/ui/button';
import { Sparkles, Shield, Trophy, Target, Loader2, User, Bot, CheckCircle2, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PlayerPool, type DraftPlayer } from '@/components/fantasy-draft/PlayerPool';
import { DraftRoster } from '@/components/fantasy-draft/DraftRoster';
import { SeasonStory } from '@/components/fantasy-draft/SeasonStory';
import { TeamAnalysis } from '@/components/fantasy-draft/TeamAnalysis';
import { VoteWinner } from '@/components/fantasy-draft/VoteWinner';
import ShareButtons from '@/components/game/ShareButtons';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { ruleForCriteria, pickIsLegal, anyLegalPick } from '@/lib/fantasyCriteria';
import { recordCompletion } from '@/lib/completions';
import { settleSeason, type SdSeason } from '@/lib/searchDiscard';
import type { Player } from '@/types/game';

/** The settle engine reads marketValue, age and name; this table's rows map
 *  straight onto that. */
const toSettlePlayer = (p: DraftPlayer): Player =>
  ({ name: p.name, marketValue: Math.max(1, p.market_value_millions), age: p.age ?? 27, position: p.position } as Player);

const TEAM_SIZE = 11;
const TOTAL_PICKS = TEAM_SIZE * 2;

function getPickOwner(pickIndex: number, userFirst: boolean): 'user' | 'ai' {
  const round = Math.floor(pickIndex / 2);
  const posInRound = pickIndex % 2;
  const roundStarts = round % 2 === 0 ? (userFirst ? 'user' : 'ai') : (userFirst ? 'ai' : 'user');
  if (posInRound === 0) return roundStarts;
  return roundStarts === 'user' ? 'ai' : 'user';
}

interface AnalysisData {
  strengths: string[];
  weaknesses: string[];
}

const FantasyDraft = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [started, setStarted] = useState(false);
  const [criteria, setCriteria] = useState<string | null>(null);
  const [loadingCriteria, setLoadingCriteria] = useState(true);
  const [players, setPlayers] = useState<DraftPlayer[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  // Draft state
  const [userFirst, setUserFirst] = useState(true);
  const [pickIndex, setPickIndex] = useState(0);
  const [userTeam, setUserTeam] = useState<DraftPlayer[]>([]);
  const [aiTeam, setAiTeam] = useState<DraftPlayer[]>([]);
  const [draftedIds, setDraftedIds] = useState<Set<string>>(new Set());
  const [lastPickId, setLastPickId] = useState<string | null>(null);
  const aiTimerRef = useRef<number | null>(null);

  // Round 326, "unclear goal": the deterministic verdict, computed the
  // moment the draft completes, the same settle engine Search and Discard
  // uses. The narrated stories and the vote stay as flavor underneath.
  const [verdict, setVerdict] = useState<SdSeason | null>(null);

  // Season simulation state
  const [simulating, setSimulating] = useState(false);
  const [teamAStory, setTeamAStory] = useState<string | null>(null);
  const [teamBStory, setTeamBStory] = useState<string | null>(null);

  // Analysis state
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisA, setAnalysisA] = useState<AnalysisData | null>(null);
  const [analysisB, setAnalysisB] = useState<AnalysisData | null>(null);

  // Vote state
  const [voted, setVoted] = useState<'user' | 'ai' | null>(null);
  const [voteCounts, setVoteCounts] = useState({ user: 0, ai: 0 });

  const draftComplete = pickIndex >= TOTAL_PICKS;
  const currentTurn = draftComplete ? 'user' : getPickOwner(pickIndex, userFirst);
  const seasonSimulated = teamAStory !== null && teamBStory !== null;

  /* Round 299 gave this page a completion record; Round 326 moves it to the
     VERDICT moment and gives it an honest score. The old completion waited
     on the narrated stories, which come from an edge function, so a network
     hiccup meant a finished draft earned nothing; the verdict is computed
     locally the moment the draft completes, and the score is the season
     points share, the same shape Search and Discard records. */
  const completionRef = useRef(false);
  useEffect(() => {
    if (!draftComplete || completionRef.current || userTeam.length < TEAM_SIZE || aiTeam.length < TEAM_SIZE) return;
    completionRef.current = true;
    const season = settleSeason(userTeam.map(toSettlePlayer), aiTeam.map(toSettlePlayer));
    setVerdict(season);
    const score = Math.min(100, Math.round((season.points[0] / 114) * 100));
    recordCompletion('/fantasy-draft', score, undefined, season.winner === 0 ? 1 : 0);
  }, [draftComplete, userTeam, aiTeam]);

  // Owner 2026-08-05: the daily criteria is a real rule, not decoration.
  // Illegal picks are blocked for BOTH the player and the AI. If a side has
  // no legal pick left (pool exhaustion), the rule relaxes for that pick so
  // the draft can always finish.
  const rule = ruleForCriteria(criteria);

  // Fetch daily criteria
  useEffect(() => {
    const fetchCriteria = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('fantasy-draft-daily');
        if (!error && data?.criteria) setCriteria(data.criteria);
      } catch { /* silent */ }
      finally { setLoadingCriteria(false); }
    };
    fetchCriteria();
  }, []);

  // Fetch players when draft starts
  useEffect(() => {
    if (!started) return;
    const fetchPlayers = async () => {
      setLoadingPlayers(true);
      const { data } = await supabase
        .from('fantasy_draft_players')
        .select('id, name, position, nationality, market_value_millions, dominant_foot, age' as any)
        .order('name');
      if (data) setPlayers(data as unknown as DraftPlayer[]);
      setLoadingPlayers(false);
    };
    setUserFirst(Math.random() < 0.5);
    fetchPlayers();
  }, [started]);

  const draftPlayer = useCallback((player: DraftPlayer, side: 'user' | 'ai') => {
    if (side === 'user') setUserTeam((prev) => [...prev, player]);
    else setAiTeam((prev) => [...prev, player]);
    setDraftedIds((prev) => new Set(prev).add(player.id));
    setLastPickId(player.id);
    setPickIndex((prev) => prev + 1);
  }, []);

  const handleUserPick = useCallback((player: DraftPlayer) => {
    if (currentTurn !== 'user' || draftComplete) return;
    const mustFollowRule = anyLegalPick(rule, userTeam, players, draftedIds);
    if (mustFollowRule && !pickIsLegal(rule, userTeam, player)) {
      toast({
        title: 'Blocked by today\'s rule',
        description: rule?.blockedReason ?? 'That pick breaks today\'s criteria.',
        variant: 'destructive',
      });
      return;
    }
    draftPlayer(player, 'user');
  }, [currentTurn, draftComplete, draftPlayer, rule, userTeam, players, draftedIds, toast]);

  // AI auto-pick: obeys the criteria like the player does, and drafts with
  // intent (leans toward the priciest legal options with a little chaos)
  // instead of picking blind out of a hat.
  useEffect(() => {
    if (draftComplete || currentTurn !== 'ai' || players.length === 0) return;
    aiTimerRef.current = window.setTimeout(() => {
      const available = players.filter((p) => !draftedIds.has(p.id));
      if (available.length === 0) return;
      const legal = available.filter((p) => pickIsLegal(rule, aiTeam, p));
      const pool = legal.length > 0 ? legal : available;
      // Needs a keeper by the end: if the AI has no GK and keepers are
      // getting scarce, grab one now.
      const aiHasGk = aiTeam.some((p) => p.position === 'GK');
      const gksLeft = pool.filter((p) => p.position === 'GK');
      const slotsLeft = TEAM_SIZE - aiTeam.length;
      let candidates = pool;
      if (!aiHasGk && gksLeft.length > 0 && (gksLeft.length <= 2 || slotsLeft <= 2)) {
        candidates = gksLeft;
      }
      const sorted = [...candidates].sort(
        (a, b) => (b.market_value_millions || 0) - (a.market_value_millions || 0),
      );
      const topN = sorted.slice(0, Math.min(6, sorted.length));
      const pick = topN[Math.floor(Math.random() * topN.length)];
      draftPlayer(pick, 'ai');
    }, 2000);
    return () => { if (aiTimerRef.current) clearTimeout(aiTimerRef.current); };
  }, [currentTurn, draftComplete, players, draftedIds, draftPlayer, rule, aiTeam]);

  // Simulate season
  const handleSimulate = async () => {
    setSimulating(true);
    try {
      const { data, error } = await supabase.functions.invoke('simulate-season', {
        body: { userTeam, aiTeam },
      });
      if (error) throw error;
      if (data?.error) {
        toast({ title: 'Simulation failed', description: data.error, variant: 'destructive' });
      } else {
        setTeamAStory(data.teamAStory);
        setTeamBStory(data.teamBStory);
        // Auto-trigger analysis after season story
        fetchAnalysis();
      }
    } catch {
      toast({ title: 'Error', description: 'Could not simulate the season. Please try again.', variant: 'destructive' });
    } finally {
      setSimulating(false);
    }
  };

  // Fetch analysis
  const fetchAnalysis = async () => {
    setAnalysisLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-squads', {
        body: { userTeam, aiTeam },
      });
      if (!error && data?.teamA && data?.teamB) {
        setAnalysisA(data.teamA);
        setAnalysisB(data.teamB);
      }
    } catch {
      // silent, analysis is supplementary
    } finally {
      setAnalysisLoading(false);
    }
  };

  // Vote handler
  const handleVote = async (team: 'user' | 'ai') => {
    if (!user) {
      toast({ title: 'Sign in required', description: 'Please sign in to vote.', variant: 'destructive' });
      return;
    }
    setVoted(team);
    // Save to Supabase with user_id for per-user deduplication
    await supabase.from('fantasy_draft_votes').insert({ voted_team: team, user_id: user.id } as any);
    // Fetch counts
    const { count: userVotes } = await supabase
      .from('fantasy_draft_votes')
      .select('*', { count: 'exact', head: true })
      .eq('voted_team', 'user');
    const { count: aiVotes } = await supabase
      .from('fantasy_draft_votes')
      .select('*', { count: 'exact', head: true })
      .eq('voted_team', 'ai');
    setVoteCounts({ user: userVotes || 0, ai: aiVotes || 0 });
  };

  return (
    <>
      <PageSeo
        title="Fantasy Draft Showdown - Soccer Draft Game | DoUKnowBall"
        description="Draft your Starting XI, simulate a full season, and vote for the winner. Daily fantasy football challenge."
        path="/fantasy-draft"
      />
      <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, hsl(145 40% 8%) 0%, hsl(152 35% 6%) 50%, hsl(225 25% 6%) 100%)' }}>
        <GameNavbar />
        <div className="relative z-10 mx-auto w-full max-w-4xl"><GameHelp /></div>

        <main id="dukb-main" className="flex-1 flex flex-col items-center px-4 py-6 sm:py-10 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none opacity-[0.04]">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] sm:w-[400px] sm:h-[400px] rounded-full border-2 border-foreground" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full bg-foreground" />
          </div>

          <div className="relative z-10 w-full max-w-4xl mx-auto space-y-6 text-center">
            {/* Pre-draft */}
            {!started && (
              <>
                <div className="flex items-center justify-center gap-3 text-primary">
                  <Shield className="w-8 h-8 sm:w-10 sm:h-10 opacity-60" />
                  <Trophy className="w-10 h-10 sm:w-14 sm:h-14" />
                  <Shield className="w-8 h-8 sm:w-10 sm:h-10 opacity-60" />
                </div>
                <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground leading-tight">
                  Fantasy Draft<span className="block text-primary">Showdown</span>
                </h1>
                <p className="text-base sm:text-xl text-muted-foreground max-w-md mx-auto leading-relaxed">
                  The goal: outdraft the AI. Your XI and its XI play the same simulated season, and the final table decides who drafted better.
                </p>
                <div className="w-full max-w-md mx-auto rounded-2xl border border-primary/30 bg-card/60 backdrop-blur-md p-5 sm:p-6 shadow-lg shadow-primary/10">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <Target className="w-5 h-5 text-primary" />
                    <h2 className="text-sm font-bold uppercase tracking-widest text-primary">Today's Criteria</h2>
                  </div>
                  {loadingCriteria ? (
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mx-auto" />
                  ) : criteria ? (
                    <p className="text-base sm:text-lg font-semibold text-foreground leading-snug">{criteria}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Could not load today's criteria.</p>
                  )}
                </div>
                <Button
                  size="lg"
                  onClick={() => setStarted(true)}
                  className="text-lg px-10 py-6 rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 hover:scale-105"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Start Draft
                </Button>
              </>
            )}

            {/* Draft phase */}
            {started && (
              <>
                {!draftComplete ? (
                  <div className={cn(
                    'inline-flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-bold uppercase tracking-wider animate-pulse',
                    currentTurn === 'user'
                      ? 'bg-primary/15 border-primary/40 text-primary'
                      : 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                  )}>
                    {currentTurn === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    {currentTurn === 'user' ? 'Your Pick' : 'AI is picking...'}
                    <span className="text-xs font-mono opacity-60 ml-1">
                      Round {Math.floor(pickIndex / 2) + 1} • Pick {pickIndex + 1}/{TOTAL_PICKS}
                    </span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/15 border border-primary/40 text-primary text-sm font-bold uppercase tracking-wider">
                    <CheckCircle2 className="w-4 h-4" />
                    Draft Complete!
                  </div>
                )}

                {criteria && (
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-card/60 border border-border">
                    <Target className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-semibold text-muted-foreground">{criteria}</span>
                    {rule && (
                      <span className="text-[10px] font-bold uppercase tracking-wide text-primary">Enforced</span>
                    )}
                  </div>
                )}

                {loadingPlayers ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col lg:flex-row gap-4 w-full">
                      <div className="w-full lg:w-[380px] shrink-0 order-2 lg:order-1">
                        <DraftRoster
                          userTeam={userTeam}
                          aiTeam={aiTeam}
                          currentTurn={currentTurn}
                          lastPickId={lastPickId}
                        />
                      </div>
                      {!draftComplete && (
                        <div className="flex-1 order-1 lg:order-2">
                          <PlayerPool
                            players={players}
                            draftedIds={draftedIds}
                            onSelect={handleUserPick}
                            disabled={currentTurn !== 'user' || draftComplete}
                            isEligible={
                              rule && anyLegalPick(rule, userTeam, players, draftedIds)
                                ? (p) => pickIsLegal(rule, userTeam, p)
                                : undefined
                            }
                            ineligibleReason={rule?.blockedReason}
                          />
                        </div>
                      )}
                    </div>

                    {/* Round 326: the verdict, the point of the whole draft,
                        shown the moment pick 22 lands. */}
                    {draftComplete && verdict && (
                      <div className={cn(
                        'w-full max-w-md mx-auto rounded-2xl border p-5 text-center',
                        verdict.winner === 0 ? 'border-correct bg-correct/10' : verdict.winner === -1 ? 'border-border bg-card/60' : 'border-destructive/50 bg-destructive/10',
                      )}>
                        <p className="text-2xl font-extrabold text-foreground mb-1">
                          {verdict.winner === 0 ? 'Your draft wins the season!' : verdict.winner === -1 ? 'Dead level after 38 games' : 'The AI drafted better'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          You {verdict.points[0]} pts ({verdict.ratings[0]} OVR) · AI {verdict.points[1]} pts ({verdict.ratings[1]} OVR)
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{verdict.headToHead}.</p>
                      </div>
                    )}

                    {/* Simulate button */}
                    {draftComplete && !seasonSimulated && (
                      <Button
                        size="lg"
                        onClick={handleSimulate}
                        disabled={simulating}
                        className="text-lg px-10 py-6 rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 hover:scale-105"
                      >
                        {simulating ? (
                          <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Writing the story...</>
                        ) : (
                          <><Zap className="w-5 h-5 mr-2" />Tell the season's story</>
                        )}
                      </Button>
                    )}

                    {/* Season stories */}
                    {seasonSimulated && teamAStory && teamBStory && (
                      <SeasonStory teamAStory={teamAStory} teamBStory={teamBStory} />
                    )}

                    {/* Team analysis */}
                    {seasonSimulated && (
                      <TeamAnalysis teamA={analysisA} teamB={analysisB} loading={analysisLoading} />
                    )}

                    {/* Vote section */}
                    {seasonSimulated && !analysisLoading && (analysisA || !analysisLoading) && (
                      <VoteWinner
                        userTeam={userTeam}
                        aiTeam={aiTeam}
                        onVote={handleVote}
                        voted={voted}
                        voteCounts={voteCounts}
                      />
                    )}

                    {seasonSimulated && (
                      <ShareButtons
                        gameName="Fantasy Draft"
                        gamePath="/fantasy-draft"
                        score={verdict ? `${verdict.points[0]} pts vs the AI's ${verdict.points[1]}` : 'Drafted my XI and simulated a full season'}
                        customText="I outdrafted the AI on Fantasy Draft at DoUKnowBall! Can you build a better squad? douknowball.com/fantasy-draft"
                      />
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </main>

        <GameSeoContent
          pageHasOwnH1
          title="Fantasy Draft: Soccer Team Builder | DoUKnowBall"
          description="Draft your ultimate soccer squad against an AI opponent. Pick 11 players in a snake draft, then simulate a full season to see who built the better team."
          howToPlay={[
            "Take turns drafting soccer players with the AI in a snake draft format (you pick, AI picks, repeat).",
            "Build a balanced squad of 11 players across all positions within the daily criteria.",
            "The moment the draft completes, both XIs play the same simulated 38 game season and the table names the winner. The narrated season stories and the community vote follow underneath."
          ]}
          examples={[
            "Draft Mbappé as your striker: 95 pace, 91 shooting",
            "Pick Rodri for midfield stability: 89 passing, 87 defending",
            "Grab Virgil van Dijk for defense: 90 defending, 86 physical",
            "Select Alisson for goalkeeper: 89 reflexes, 88 diving",
            "Criteria: Best Under-25 Squad, Highest Market Value XI",
            "Snake draft: You pick 1st, AI picks 2nd & 3rd, you pick 4th & 5th..."
          ]}
        />
      </div>
    </>
  );
};

export default FantasyDraft;
