import { useState, useEffect, useMemo } from 'react';
import { Footer } from '@/components/game/Footer';
import PageSeo from '@/components/seo/PageSeo';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Sparkles, Shield, Trophy, Target, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PlayerPool, type DraftPlayer } from '@/components/fantasy-draft/PlayerPool';

const FantasyDraft = () => {
  const [started, setStarted] = useState(false);
  const [criteria, setCriteria] = useState<string | null>(null);
  const [loadingCriteria, setLoadingCriteria] = useState(true);
  const [players, setPlayers] = useState<DraftPlayer[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [draftedIds, setDraftedIds] = useState<Set<string>>(new Set());

  // Fetch daily criteria
  useEffect(() => {
    const fetchCriteria = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('fantasy-draft-daily');
        if (!error && data?.criteria) {
          setCriteria(data.criteria);
        }
      } catch {
        // silent fail
      } finally {
        setLoadingCriteria(false);
      }
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
        .select('id, name, position, nationality, market_value_millions, dominant_foot')
        .order('name');
      if (data) setPlayers(data as DraftPlayer[]);
      setLoadingPlayers(false);
    };
    fetchPlayers();
  }, [started]);

  const handleSelectPlayer = (player: DraftPlayer) => {
    setDraftedIds((prev) => new Set(prev).add(player.id));
  };

  return (
    <>
      <PageSeo
        title="Fantasy Draft Showdown | DoUKnowBall"
        description="Draft your Starting XI, simulate a full season, and vote for the winner in Fantasy Draft Showdown."
        path="/fantasy-draft"
      />
      <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, hsl(145 40% 8%) 0%, hsl(152 35% 6%) 50%, hsl(225 25% 6%) 100%)' }}>
        <Header />

        <main className="flex-1 flex flex-col items-center px-4 py-8 sm:py-14 relative overflow-hidden">
          {/* Pitch lines decoration */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.04]">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] sm:w-[400px] sm:h-[400px] rounded-full border-2 border-foreground" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full bg-foreground" />
          </div>

          <div className="relative z-10 w-full max-w-2xl mx-auto space-y-8 text-center">
            {!started && (
              <>
                {/* Icon cluster */}
                <div className="flex items-center justify-center gap-3 text-primary">
                  <Shield className="w-8 h-8 sm:w-10 sm:h-10 opacity-60" />
                  <Trophy className="w-10 h-10 sm:w-14 sm:h-14" />
                  <Shield className="w-8 h-8 sm:w-10 sm:h-10 opacity-60" />
                </div>

                <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground leading-tight">
                  Fantasy Draft
                  <span className="block text-primary">Showdown</span>
                </h1>

                <p className="text-base sm:text-xl text-muted-foreground max-w-md mx-auto leading-relaxed">
                  Draft your Starting XI. Simulate a season. Vote for the winner.
                </p>

                {/* Today's Criteria Card */}
                <div className="w-full max-w-md mx-auto rounded-2xl border border-primary/30 bg-card/60 backdrop-blur-md p-5 sm:p-6 shadow-lg shadow-primary/10">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <Target className="w-5 h-5 text-primary" />
                    <h2 className="text-sm font-bold uppercase tracking-widest text-primary">
                      Today's Criteria
                    </h2>
                  </div>
                  {loadingCriteria ? (
                    <div className="flex items-center justify-center py-3">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : criteria ? (
                    <p className="text-base sm:text-lg font-semibold text-foreground leading-snug">
                      {criteria}
                    </p>
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

            {started && (
              <>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">
                  Draft Your XI
                </h1>
                {criteria && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30">
                    <Target className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-primary">{criteria}</span>
                  </div>
                )}

                {loadingPlayers ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <PlayerPool
                    players={players}
                    draftedIds={draftedIds}
                    onSelect={handleSelectPlayer}
                  />
                )}
              </>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default FantasyDraft;
