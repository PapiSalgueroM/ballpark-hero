import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Footer } from '@/components/game/Footer';
import PageSeo from '@/components/seo/PageSeo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Flame, Trophy, Calendar, Gamepad2, Share2, Edit2, Check, X, Loader2,
  Star, Target, Crown, Zap, Award, TrendingUp, Medal
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface BestScore {
  game_type: string;
  best_score: number;
  achieved_at: string;
}

interface RecentGame {
  game_type: string;
  score: number;
  played_at: string;
}

const GAME_LABELS: Record<string, string> = {
  'footle': '🎯 Footle',
  'career': '📜 Career Quiz',
  'higher-lower': '📊 Higher/Lower',
  'connections': '🔗 Connections',
  'build-your-xi': '⚽ Build Your XI',
  'guess-the-face': '🖼️ Guess the Face',
  'football-connect-4': '🔴 Connect 4',
  'world-cup': '🏆 World Cup',
  'football-grid': '🏈 Football Grid',
  'football-timeline': '📅 Timeline',
  'football-draft': '🎰 Draft Guesser',
  'nfl-career': '🏈 NFL Career',
  'college-grid': '🎓 College Grid',
  'guess-the-college': '🎓 Guess College',
  'nba-starting-5': '🏀 NBA Starting 5',
  'nba-connect-4': '🏀 NBA Connect 4',
  'nba-chain': '🔗 NBA Chain',
  'baseball-career': '⚾ Baseball Career',
  'baseball-connections': '⚾ Baseball Connections',
  'hockey-career': '🏒 Hockey Career',
  'hockey-higher-lower': '🏒 Hockey H/L',
  'ufc': '🥊 UFC Guesser',
  'ufc-chain': '🔗 Combat Chain',
  'teammates': '🤝 Teammates',
  'olympics': '🏅 Olympics',
  'guess-soccer-club': '⚽ Guess the Club',
  'soccer-grid': '⚽ Soccer Grid',
  'f1-driver': '🏎️ F1 Driver',
  'f1-constructor': '🏎️ F1 Constructor',
  'tennis-player': '🎾 Tennis Player',
  'tennis-chain': '🎾 Tennis Chain',
  'nascar-driver': '🏁 NASCAR Driver',
  'nascar-chain': '🏁 NASCAR Chain',
  'guess-the-nation': '🌍 Guess the Nation',
  'cbb-program': '🏀 CBB Program',
  'conquest': '🗺️ Conquest',
  'guess-the-year': '📆 Guess the Year',
  'nba-lineup': '🏀 NBA Lineup',
  'guess-nfl-team': '🏈 Guess NFL Team',
  'fantasy-draft': '⚽ Fantasy Draft',
  'blurred-face': '🖼️ Blurred Face',
};

const SPORT_CATEGORIES: Record<string, string> = {
  'footle': 'soccer', 'career': 'soccer', 'higher-lower': 'soccer', 'connections': 'soccer',
  'build-your-xi': 'soccer', 'guess-the-face': 'soccer', 'football-connect-4': 'soccer',
  'world-cup': 'soccer', 'teammates': 'soccer', 'guess-soccer-club': 'soccer',
  'soccer-grid': 'soccer', 'fantasy-draft': 'soccer', 'blurred-face': 'soccer',
  'football-grid': 'football', 'football-timeline': 'football', 'football-draft': 'football',
  'nfl-career': 'football', 'guess-nfl-team': 'football', 'conquest': 'football',
  'college-grid': 'college', 'guess-the-college': 'college', 'cbb-program': 'college',
  'nba-starting-5': 'basketball', 'nba-connect-4': 'basketball', 'nba-chain': 'basketball',
  'nba-lineup': 'basketball',
  'baseball-career': 'baseball', 'baseball-connections': 'baseball',
  'hockey-career': 'hockey', 'hockey-higher-lower': 'hockey',
  'ufc': 'combat', 'ufc-chain': 'combat',
  'olympics': 'olympics', 'guess-the-nation': 'olympics',
  'f1-driver': 'motorsport', 'f1-constructor': 'motorsport',
  'nascar-driver': 'motorsport', 'nascar-chain': 'motorsport',
  'tennis-player': 'tennis', 'tennis-chain': 'tennis',
  'guess-the-year': 'general',
};

const SPORT_LABELS: Record<string, string> = {
  soccer: '⚽ Soccer', football: '🏈 Football', college: '🎓 College',
  basketball: '🏀 Basketball', baseball: '⚾ Baseball', hockey: '🏒 Hockey',
  combat: '🥊 Combat', olympics: '🏅 Olympics', motorsport: '🏎️ Motorsport',
  tennis: '🎾 Tennis', general: '🧩 General',
};

export default function Profile() {
  const { user, profile, loading: authLoading, refreshProfile, updateProfile } = useAuth();
  const { username } = useParams<{ username?: string }>();
  const navigate = useNavigate();

  const [viewingProfile, setViewingProfile] = useState<any>(null);
  const [bestScores, setBestScores] = useState<BestScore[]>([]);
  const [recentGames, setRecentGames] = useState<RecentGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ display_name: '', username: '' });
  const [saving, setSaving] = useState(false);
  const [userScoreData, setUserScoreData] = useState<{ current_streak: number; longest_streak: number; total_points: number } | null>(null);
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null);
  const [savedBracket, setSavedBracket] = useState<any>(null);
  const [dailyGameSlugs, setDailyGameSlugs] = useState<string[]>([]);

  const isOwnProfile = !username || (profile?.username === username);

  useEffect(() => {
    if (authLoading) return; // Wait for auth to finish

    const loadProfile = async () => {
      setLoading(true);
      let targetUserId: string | null = null;

      if (username) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', username)
          .single();

        if (profileData) {
          setViewingProfile(profileData);
          targetUserId = profileData.user_id;
        } else {
          navigate('/');
          toast.error('Profile not found');
          setLoading(false);
          return;
        }
      } else if (user && profile) {
        setViewingProfile(profile);
        setEditForm({
          display_name: profile.display_name || '',
          username: profile.username || '',
        });
        targetUserId = user.id;
      } else if (!user) {
        navigate('/');
        toast.error('Please sign in to view your profile');
        setLoading(false);
        return;
      }

      if (!targetUserId) { setLoading(false); return; }

      // Parallel fetches
      const [scoresRes, recentRes, userScoreRes, rankRes, bracketRes, todayCompletionsRes] = await Promise.all([
        supabase.from('user_best_scores').select('*').eq('user_id', targetUserId).order('best_score', { ascending: false }),
        supabase.from('user_game_scores').select('game_type, score, played_at').eq('user_id', targetUserId).order('played_at', { ascending: false }).limit(5),
        supabase.from('user_scores').select('current_streak, longest_streak, total_points').eq('user_id', targetUserId).single(),
        supabase.from('profiles').select('user_id').order('all_time_score', { ascending: false }),
        supabase.from('saved_brackets').select('id, bracket_data').eq('user_id', targetUserId).limit(1),
        supabase.from('daily_completions').select('game_slug').eq('user_id', targetUserId).eq('date', new Date().toISOString().split('T')[0]),
      ]);

      setBestScores(scoresRes.data || []);
      setRecentGames((recentRes.data || []) as RecentGame[]);
      if (userScoreRes.data) setUserScoreData(userScoreRes.data as any);
      if (bracketRes.data && bracketRes.data.length > 0) setSavedBracket(bracketRes.data[0]);
      if (todayCompletionsRes.data) setDailyGameSlugs(todayCompletionsRes.data.map((c: any) => c.game_slug));

      // Calculate rank
      if (rankRes.data) {
        const idx = rankRes.data.findIndex((p: any) => p.user_id === targetUserId);
        setLeaderboardRank(idx >= 0 ? idx + 1 : null);
      }

      setLoading(false);
    };

    loadProfile();
  }, [username, user, profile, authLoading, navigate]);

  const handleSave = async () => {
    setSaving(true);
    if (editForm.username && !/^[a-zA-Z0-9_]{3,20}$/.test(editForm.username)) {
      toast.error('Username must be 3-20 characters, letters, numbers and underscores only');
      setSaving(false);
      return;
    }
    const { error } = await updateProfile({
      display_name: editForm.display_name || null,
      username: editForm.username || null,
    });
    if (error) {
      toast.error(error.message.includes('duplicate') ? 'Username is already taken' : 'Failed to update profile');
    } else {
      toast.success('Profile updated!');
      setEditing(false);
      await refreshProfile();
    }
    setSaving(false);
  };

  const handleShare = () => {
    const url = `${window.location.origin}/profile/${viewingProfile?.username || ''}`;
    navigator.clipboard.writeText(url);
    toast.success('Profile link copied to clipboard!');
  };

  // Computed stats
  const totalPoints = userScoreData?.total_points ?? viewingProfile?.all_time_score ?? 0;
  const totalGames = viewingProfile?.total_games_played ?? 0;
  const currentStreak = userScoreData?.current_streak ?? viewingProfile?.current_streak ?? 0;
  const longestStreak = userScoreData?.longest_streak ?? viewingProfile?.longest_streak ?? 0;
  const averageScore = totalGames > 0 ? Math.round(totalPoints / totalGames) : 0;

  // Favourite sport
  const sportCounts: Record<string, number> = {};
  bestScores.forEach(s => {
    const sport = SPORT_CATEGORIES[s.game_type] || 'general';
    sportCounts[sport] = (sportCounts[sport] || 0) + 1;
  });
  const favouriteSport = Object.entries(sportCounts).sort((a, b) => b[1] - a[1])[0];

  // Badge calculations
  const allSports = new Set(Object.values(SPORT_CATEGORIES));
  const playedSports = new Set(bestScores.map(s => SPORT_CATEGORIES[s.game_type]).filter(Boolean));
  const has900Plus = bestScores.filter(s => s.best_score >= 900).length;
  const hasPerfect = bestScores.some(s => s.best_score >= 1000);
  const todaySportTypes = new Set(dailyGameSlugs);

  const badges = [
    { emoji: '🔥', name: 'On Fire', desc: '7 day streak', earned: longestStreak >= 7 },
    { emoji: '🏆', name: 'Century Club', desc: '100 games played', earned: totalGames >= 100 },
    { emoji: '🎯', name: 'Perfect Score', desc: 'Scored 1000 on any game', earned: hasPerfect },
    { emoji: '⚽', name: 'World Cup Prophet', desc: 'Completed WC predictor', earned: !!savedBracket },
    { emoji: '🌍', name: 'All Rounder', desc: 'Played every sport', earned: playedSports.size >= allSports.size },
    { emoji: '🧠', name: 'Big Brain', desc: 'Scored 900+ on 10 games', earned: has900Plus >= 10 },
    { emoji: '👑', name: 'GOAT', desc: '30 day streak', earned: longestStreak >= 30 },
    { emoji: '⚡', name: 'Speed Demon', desc: 'Complete a game in <30s', earned: false }, // TODO: needs timing data
    { emoji: '🎪', name: 'Variety Pack', desc: '5 game types in one day', earned: todaySportTypes.size >= 5 },
  ];

  // Avatar
  const avatarUrl = viewingProfile?.avatar_url || user?.user_metadata?.avatar_url;

  // WC bracket champion
  let wcChampion: string | null = null;
  let wcChampionFlag: string | null = null;
  if (savedBracket?.bracket_data) {
    const bd = typeof savedBracket.bracket_data === 'string' ? JSON.parse(savedBracket.bracket_data) : savedBracket.bracket_data;
    if (bd.knockoutWinners?.final) {
      wcChampion = bd.knockoutWinners.final;
    }
    if (bd.awards?.champion) {
      wcChampion = bd.awards.champion;
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!viewingProfile) return null;

  return (
    <>
      <PageSeo
        title={`${viewingProfile.display_name || viewingProfile.username || 'User'}'s Profile | DoUKnowBall`}
        description="View player stats, streaks, and best scores on DoUKnowBall"
        path={username ? `/profile/${username}` : '/profile'}
      />
      <div className="min-h-screen bg-background">
        <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">

          {/* ===== 1. Profile Header ===== */}
          <Card className="border-border/60">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Avatar"
                      className="h-16 w-16 rounded-full object-cover border-2 border-primary/40"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
                      {(viewingProfile.display_name || user?.email || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    {editing ? (
                      <div className="space-y-2">
                        <Input
                          value={editForm.display_name}
                          onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                          placeholder="Display name"
                          className="h-8"
                        />
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">@</span>
                          <Input
                            value={editForm.username}
                            onChange={(e) => setEditForm({ ...editForm, username: e.target.value.toLowerCase() })}
                            placeholder="username"
                            className="h-8"
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <h1 className="text-2xl font-display font-bold text-foreground">
                          {viewingProfile.display_name || 'Anonymous Player'}
                        </h1>
                        {viewingProfile.username && (
                          <p className="text-muted-foreground text-sm">@{viewingProfile.username}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Joined {format(new Date(viewingProfile.created_at), 'MMM yyyy')}
                          </span>
                          {leaderboardRank && (
                            <span className="flex items-center gap-1">
                              <Medal className="w-3 h-3 text-primary" />
                              Rank #{leaderboardRank}
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {isOwnProfile && (
                    editing ? (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                          <X className="w-4 h-4" />
                        </Button>
                        <Button size="sm" onClick={handleSave} disabled={saving}>
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                        <Edit2 className="w-4 h-4 mr-1" /> Edit
                      </Button>
                    )
                  )}
                  {viewingProfile.username && (
                    <Button size="sm" variant="outline" onClick={handleShare}>
                      <Share2 className="w-4 h-4 mr-1" /> Share
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ===== 2. Stats Row ===== */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { icon: <Gamepad2 className="w-6 h-6 text-primary" />, value: totalGames, label: 'Games Played' },
              { icon: <Trophy className="w-6 h-6 text-yellow-500" />, value: totalPoints.toLocaleString(), label: 'Total Points' },
              { icon: <Flame className="w-6 h-6 text-orange-500" />, value: currentStreak, label: 'Current Streak 🔥' },
              { icon: <TrendingUp className="w-6 h-6 text-amber-500" />, value: longestStreak, label: 'Longest Streak' },
              { icon: <Star className="w-6 h-6 text-purple-400" />, value: favouriteSport ? SPORT_LABELS[favouriteSport[0]] || favouriteSport[0] : '—', label: 'Fav Sport', small: true },
              { icon: <Target className="w-6 h-6 text-sky-400" />, value: averageScore, label: 'Avg Score' },
            ].map((stat, i) => (
              <Card key={i} className="border-border/40">
                <CardContent className="pt-4 pb-3 text-center space-y-1">
                  <div className="mx-auto">{stat.icon}</div>
                  <p className={`font-bold ${stat.small ? 'text-sm' : 'text-2xl'} text-foreground`}>{stat.value}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ===== 3. Badges Section ===== */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-display">🏅 Badges</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
                {badges.map((badge) => (
                  <div
                    key={badge.name}
                    className={`flex flex-col items-center text-center p-3 rounded-xl border transition-all ${
                      badge.earned
                        ? 'border-primary/30 bg-primary/5'
                        : 'border-border/30 bg-muted/20 opacity-40 grayscale'
                    }`}
                  >
                    <span className="text-2xl mb-1">{badge.earned ? badge.emoji : '🔒'}</span>
                    <p className="text-[10px] font-bold text-foreground leading-tight">{badge.name}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{badge.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ===== 4. World Cup Predictor Card ===== */}
          {savedBracket && (
            <Card className="border-border/60 bg-gradient-to-r from-card to-secondary/30">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">🏆</span>
                    <div>
                      <h3 className="text-base font-bold font-display text-foreground">World Cup 2026 Prediction</h3>
                      {wcChampion ? (
                        <p className="text-sm text-muted-foreground">
                          Champion: <span className="text-primary font-semibold">{wcChampion}</span>
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">Bracket saved</p>
                      )}
                    </div>
                  </div>
                  <Link to={`/world-cup-predictor?bracket=${savedBracket.id}`}>
                    <Button size="sm" variant="outline">View Bracket</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ===== 5. Recently Played ===== */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-display">🕹️ Recently Played</CardTitle>
            </CardHeader>
            <CardContent>
              {recentGames.length === 0 ? (
                <p className="text-muted-foreground text-center py-6 text-sm">No games played yet. Start playing to see your history!</p>
              ) : (
                <div className="space-y-2">
                  {recentGames.map((game, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-muted/10">
                      <div>
                        <p className="font-medium text-sm text-foreground">
                          {GAME_LABELS[game.game_type] || game.game_type}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(game.played_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <span className="text-lg font-bold text-primary">{game.score}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ===== Best Scores ===== */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-display">🏆 Best Scores</CardTitle>
            </CardHeader>
            <CardContent>
              {bestScores.length === 0 ? (
                <p className="text-muted-foreground text-center py-6 text-sm">No scores yet. Start playing to track your best!</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {bestScores.map((score) => (
                    <div key={score.game_type} className="flex items-center justify-between p-3 rounded-lg border border-border/40">
                      <span className="font-medium text-sm">{GAME_LABELS[score.game_type] || score.game_type}</span>
                      <span className="text-lg font-bold text-primary">{score.best_score}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </main>

        <div className="max-w-4xl mx-auto px-4">
          <Footer />
        </div>
      </div>
    </>
  );
}
