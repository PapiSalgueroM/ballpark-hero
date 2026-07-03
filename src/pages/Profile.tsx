import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Footer } from '@/components/game/Footer';
import PageSeo from '@/components/seo/PageSeo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Flame, Trophy, Calendar, Gamepad2, Share2, Edit2, Check, X, Loader2,
  Star, Target, Crown, Zap, TrendingUp, Medal, Clock, Copy, CalendarCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import html2canvas from 'html2canvas';
import { useStreaks } from '@/hooks/useStreaks';

/* ────────────────────── Constants ────────────────────── */

interface BestScore { game_type: string; best_score: number; achieved_at: string; }
interface RecentGame { game_type: string; score: number; played_at: string; }

const GAME_LABELS: Record<string, string> = {
  'footle': '🎯 Footle', 'career': '📜 Career Quiz', 'higher-lower': '📊 Higher/Lower',
  'connections': '🔗 Connections', 'build-your-xi': '⚽ Build Your XI',
  'guess-the-face': '🖼️ Guess the Face', 'football-connect-4': '🔴 Connect 4',
  'world-cup': '🏆 World Cup', 'football-grid': '🏈 Football Grid',
  'football-timeline': '📅 Timeline', 'football-draft': '🎰 Draft Guesser',
  'nfl-career': '🏈 NFL Career', 'college-grid': '🎓 College Grid',
  'guess-the-college': '🎓 Guess College', 'nba-starting-5': '🏀 NBA Starting 5',
  'nba-connect-4': '🏀 NBA Connect 4', 'nba-chain': '🔗 NBA Chain',
  'baseball-career': '⚾ Baseball Career', 'baseball-connections': '⚾ Baseball Connections',
  'hockey-career': '🏒 Hockey Career', 'hockey-higher-lower': '🏒 Hockey H/L',
  'ufc': '🥊 UFC Guesser', 'ufc-chain': '🔗 Combat Chain', 'teammates': '🤝 Teammates',
  'olympics': '🏅 Olympics', 'guess-soccer-club': '⚽ Guess the Club',
  'soccer-grid': '⚽ Soccer Grid', 'f1-driver': '🏎️ F1 Driver',
  'f1-constructor': '🏎️ F1 Constructor', 'tennis-player': '🎾 Tennis Player',
  'tennis-chain': '🎾 Tennis Chain', 'nascar-driver': '🏁 NASCAR Driver',
  'nascar-chain': '🏁 NASCAR Chain', 'guess-the-nation': '🌍 Guess the Nation',
  'cbb-program': '🏀 CBB Program', 'conquest': '🗺️ Conquest',
  'guess-the-year': '📆 Guess the Year', 'nba-lineup': '🏀 NBA Lineup',
  'guess-nfl-team': '🏈 Guess NFL Team', 'fantasy-draft': '⚽ Fantasy Draft',
};

const SPORT_CATEGORIES: Record<string, string> = {
  'footle': 'soccer', 'career': 'soccer', 'higher-lower': 'soccer', 'connections': 'soccer',
  'build-your-xi': 'soccer', 'guess-the-face': 'soccer', 'football-connect-4': 'soccer',
  'world-cup': 'soccer', 'teammates': 'soccer', 'guess-soccer-club': 'soccer',
  'soccer-grid': 'soccer', 'fantasy-draft': 'soccer',
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

const ALL_GAME_OPTIONS = Object.entries(GAME_LABELS).map(([key, label]) => ({ value: key, label }));

/* ────────────────────── Component ────────────────────── */

export default function Profile() {
  const { user, profile, loading: authLoading, refreshProfile, updateProfile } = useAuth();
  const { username } = useParams<{ username?: string }>();
  const navigate = useNavigate();

  // #101/#100: local-first streaks and days-visited. This is deliberately
  // the primary source for streak/visit numbers on this page rather than
  // profile.current_streak etc: the `profiles` table those legacy fields
  // read from does not exist in the live database (verified directly via
  // SQL against flawuiqbvjobmkfkauhw), so those fields are always 0/null in
  // production today regardless of how much a player has actually played.
  const {
    globalCurrentStreak, globalLongestStreak, topGameStreaks, daysVisited,
  } = useStreaks();

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

  // Personal info (from user_preferences)
  const [favouriteGame, setFavouriteGame] = useState<string>('');
  const [favouriteTeam, setFavouriteTeam] = useState('');
  const [favouritePlayer, setFavouritePlayer] = useState('');
  const [timeSpent, setTimeSpent] = useState(0);
  const [prefsSaving, setPrefsSaving] = useState(false);

  const isOwnProfile = !username || (profile?.username === username);

  /* ── Data loading ── */
  useEffect(() => {
    if (authLoading) return;

    const loadProfile = async () => {
      setLoading(true);
      let targetUserId: string | null = null;

      if (username) {
        const { data: profileData } = await supabase
          .from('profiles').select('*').eq('username', username).maybeSingle();
        if (profileData) {
          setViewingProfile(profileData);
          targetUserId = profileData.user_id;
        } else {
          navigate('/');
          toast.error('Profile not found');
          setLoading(false);
          return;
        }
      } else if (user) {
        targetUserId = user.id;
        if (profile) {
          setViewingProfile(profile);
          setEditForm({ display_name: profile.display_name || '', username: profile.username || '' });
        } else {
          const { data: fp } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle();
          if (fp) {
            setViewingProfile(fp);
            setEditForm({ display_name: (fp as any).display_name || '', username: (fp as any).username || '' });
          } else {
            setViewingProfile({
              user_id: user.id,
              display_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
              username: null,
              avatar_url: user.user_metadata?.avatar_url || null,
              current_streak: 0, longest_streak: 0, total_games_played: 0,
              total_correct_answers: 0, all_time_score: 0, created_at: user.created_at,
            });
          }
        }
      } else {
        navigate('/');
        toast.error('Please sign in to view your profile');
        setLoading(false);
        return;
      }

      if (!targetUserId) { setLoading(false); return; }

      const [scoresRes, recentRes, userScoreRes, rankRes, bracketRes, todayRes, prefsRes] = await Promise.all([
        supabase.from('user_best_scores').select('*').eq('user_id', targetUserId).order('best_score', { ascending: false }),
        supabase.from('user_game_scores').select('game_type, score, played_at').eq('user_id', targetUserId).order('played_at', { ascending: false }).limit(5),
        supabase.from('user_scores').select('current_streak, longest_streak, total_points').eq('user_id', targetUserId).maybeSingle(),
        supabase.from('profiles').select('user_id').order('all_time_score', { ascending: false }),
        supabase.from('saved_brackets').select('id, bracket_data').eq('user_id', targetUserId).limit(1),
        supabase.from('daily_completions').select('game_slug').eq('user_id', targetUserId).eq('date', new Date().toISOString().split('T')[0]),
        supabase.from('user_preferences').select('*').eq('user_id', targetUserId).maybeSingle(),
      ]);

      setBestScores(scoresRes.data || []);
      setRecentGames((recentRes.data || []) as RecentGame[]);
      if (userScoreRes.data) setUserScoreData(userScoreRes.data as any);
      if (bracketRes.data && bracketRes.data.length > 0) setSavedBracket(bracketRes.data[0]);
      if (todayRes.data) setDailyGameSlugs(todayRes.data.map((c: any) => c.game_slug));

      // Preferences
      if (prefsRes.data) {
        const p = prefsRes.data as any;
        setFavouriteGame(p.favourite_game || '');
        setFavouriteTeam(p.favourite_team || '');
        setFavouritePlayer(p.favourite_player || '');
        setTimeSpent(p.time_spent_minutes || 0);
      }

      if (rankRes.data) {
        const idx = rankRes.data.findIndex((p: any) => p.user_id === targetUserId);
        setLeaderboardRank(idx >= 0 ? idx + 1 : null);
      }

      setLoading(false);
    };

    loadProfile();
  }, [username, user, profile, authLoading, navigate]);

  /* ── Time tracking (increment every minute while page is visible) ── */
  useEffect(() => {
    if (!user || !isOwnProfile) return;
    const interval = setInterval(async () => {
      if (document.visibilityState === 'visible') {
        setTimeSpent(prev => prev + 1);
        // Fire-and-forget time update
        try {
          await supabase.from('user_preferences').upsert(
            { user_id: user.id, time_spent_minutes: timeSpent + 1, updated_at: new Date().toISOString() } as any,
            { onConflict: 'user_id' }
          );
        } catch (_) { /* ignore */ }
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, [user, isOwnProfile, timeSpent]);

  /* ── Save personal info ── */
  const savePreferences = useCallback(async (field: string, value: string) => {
    if (!user) return;
    setPrefsSaving(true);
    const { error } = await supabase.from('user_preferences').upsert(
      { user_id: user.id, [field]: value, updated_at: new Date().toISOString() } as any,
      { onConflict: 'user_id' }
    );
    if (error) toast.error('Failed to save');
    else toast.success('Saved!');
    setPrefsSaving(false);
  }, [user]);

  /* ── Save profile edits ── */
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

  const copyProfileUrl = () => {
    const url = `${window.location.origin}/profile/${viewingProfile?.username || ''}`;
    navigator.clipboard.writeText(url);
    toast.success('Profile URL copied!');
  };

  const shareCardRef = useRef<HTMLDivElement>(null);

  const handleShareCard = async () => {
    const el = shareCardRef.current;
    if (!el) return;
    try {
      const canvas = await html2canvas(el, { backgroundColor: null, scale: 2 });
      canvas.toBlob(async (blob) => {
        if (!blob) { toast.error('Failed to generate image'); return; }
        const file = new File([blob], 'douknowball-card.png', { type: 'image/png' });
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: 'My DoUKnowBall Stats' });
        } else {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'douknowball-card.png';
          a.click();
          URL.revokeObjectURL(a.href);
          toast.success('Card downloaded!');
        }
      }, 'image/png');
    } catch {
      const top3Text = bestScores.slice(0, 3).map(s => `${GAME_LABELS[s.game_type] || s.game_type}: ${s.best_score}`).join(', ');
      const text = `🏆 ${viewingProfile?.display_name || 'Player'} on DoUKnowBall\n🔥 Streak: ${currentStreak} | 🎮 Games: ${totalGames} | ⭐ Points: ${totalPoints}\nTop: ${top3Text}\n🏅 ${earnedCount}/${badges.length} badges\ndouknowball.com`;
      navigator.clipboard.writeText(text);
      toast.success('Stats copied to clipboard!');
    }
  };

  /* ── Computed stats ── */
  const totalPoints = userScoreData?.total_points ?? viewingProfile?.all_time_score ?? 0;
  const totalGames = viewingProfile?.total_games_played ?? 0;
  // Local-first (see useStreaks() above), with the legacy DB-backed fields
  // only as a fallback for the unlikely case they're ever non-zero (e.g.
  // after the proposed profiles table + sync exists). On isOwnProfile this
  // is always the local browser's own streak, which is correct since a
  // player viewing their own profile is on their own device by definition.
  // On someone else's profile (isOwnProfile false), local streak data is
  // this visitor's, not the viewed player's, so it's intentionally not
  // shown there - see the isOwnProfile guard around the streak stats below.
  const currentStreak = isOwnProfile
    ? globalCurrentStreak
    : (userScoreData?.current_streak ?? viewingProfile?.current_streak ?? 0);
  const longestStreak = isOwnProfile
    ? globalLongestStreak
    : (userScoreData?.longest_streak ?? viewingProfile?.longest_streak ?? 0);
  const averageScore = totalGames > 0 ? Math.round(totalPoints / totalGames) : 0;

  const sportCounts: Record<string, number> = {};
  bestScores.forEach(s => {
    const sport = SPORT_CATEGORIES[s.game_type] || 'general';
    sportCounts[sport] = (sportCounts[sport] || 0) + 1;
  });
  const favouriteSportEntry = Object.entries(sportCounts).sort((a, b) => b[1] - a[1])[0];

  /* ── Badge calculations ── */
  const allSportSet = new Set(Object.values(SPORT_CATEGORIES));
  const playedSports = new Set(bestScores.map(s => SPORT_CATEGORIES[s.game_type]).filter(Boolean));
  const has900Plus = bestScores.filter(s => s.best_score >= 900).length;
  const hasPerfect = bestScores.some(s => s.best_score >= 1000);
  const todaySportTypes = new Set(dailyGameSlugs);

  const sport900 = (sport: string) =>
    bestScores.filter(s => SPORT_CATEGORIES[s.game_type] === sport && s.best_score >= 900).length;

  const badges = [
    // Streak badges (tiered)
    { emoji: '🔥', name: 'Streak Starter', desc: '3 day streak', earned: longestStreak >= 3 },
    { emoji: '🔥🔥', name: 'On Fire', desc: '7 day streak', earned: longestStreak >= 7 },
    { emoji: '👑', name: 'Streak King', desc: '30 day streak', earned: longestStreak >= 30 },
    // Games played badges (tiered)
    { emoji: '🎮', name: 'Rookie', desc: '10 games played', earned: totalGames >= 10 },
    { emoji: '🎮🎮', name: 'Veteran', desc: '50 games played', earned: totalGames >= 50 },
    { emoji: '🏆', name: 'Century Club', desc: '100 games played', earned: totalGames >= 100 },
    // Score badges
    { emoji: '🎯', name: 'Sharp Shooter', desc: 'Score 900+ on any game', earned: has900Plus >= 1 },
    { emoji: '🎯🎯', name: 'Perfect', desc: 'Score 1000 on any game', earned: hasPerfect },
    { emoji: '🧠', name: 'Big Brain', desc: '900+ on 10 different games', earned: has900Plus >= 10 },
    // Sport master badges
    { emoji: '⚽', name: 'Soccer Master', desc: '900+ on 3 soccer games', earned: sport900('soccer') >= 3 },
    { emoji: '🏈', name: 'Football Master', desc: '900+ on 3 football games', earned: sport900('football') >= 3 },
    { emoji: '🏀', name: 'Hoops Master', desc: '900+ on 3 basketball games', earned: sport900('basketball') >= 3 },
    // Special badges
    { emoji: '🌍', name: 'All Rounder', desc: 'Play every sport category', earned: playedSports.size >= allSportSet.size },
    { emoji: '⚡', name: 'Variety Pack', desc: '5 game types in one day', earned: todaySportTypes.size >= 5 },
    { emoji: '🔮', name: 'Prophet', desc: 'Complete WC 2026 bracket', earned: !!savedBracket },
    { emoji: '💎', name: 'Diamond', desc: '500+ total games played', earned: totalGames >= 500 },
    { emoji: '🐐', name: 'GOAT', desc: '100 day streak', earned: longestStreak >= 100 },
  ];
  const earnedCount = badges.filter(b => b.earned).length;

  const avatarUrl = viewingProfile?.avatar_url || user?.user_metadata?.avatar_url;

  /* ── WC champion ── */
  let wcChampion: string | null = null;
  if (savedBracket?.bracket_data) {
    const bd = typeof savedBracket.bracket_data === 'string' ? JSON.parse(savedBracket.bracket_data) : savedBracket.bracket_data;
    if (bd.knockoutWinners?.final) wcChampion = bd.knockoutWinners.final;
    if (bd.awards?.champion) wcChampion = bd.awards.champion;
  }

  /* ── Loading states ── */
  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!viewingProfile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Could not load profile.</p>
        <Button variant="outline" onClick={() => navigate('/')}>Go Home</Button>
      </div>
    );
  }

  return (
    <>
      <PageSeo
        title={`${viewingProfile.display_name || viewingProfile.username || 'Player'}'s Profile | DoUKnowBall`}
        description="View player stats, streaks, and badges on DoUKnowBall"
        path={username ? `/profile/${username}` : '/profile'}
      />
      <div className="min-h-screen bg-background">
        <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">

          {/* ═══════════════ 1. PROFILE HEADER ═══════════════ */}
          <Card className="border-border/60 overflow-hidden">
            {/* Decorative top stripe */}
            <div className="h-1.5 bg-gradient-to-r from-primary via-primary/60 to-primary/20" />
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                {/* Avatar + info */}
                <div className="flex items-center gap-4">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="h-18 w-18 rounded-full object-cover border-2 border-primary/40" referrerPolicy="no-referrer" style={{ width: 72, height: 72 }} />
                  ) : (
                    <div className="rounded-full bg-primary text-primary-foreground flex items-center justify-center text-3xl font-bold" style={{ width: 72, height: 72 }}>
                      {(viewingProfile.display_name || user?.email || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="space-y-1">
                    {editing ? (
                      <div className="space-y-2">
                        <Input value={editForm.display_name} onChange={e => setEditForm({ ...editForm, display_name: e.target.value })} placeholder="Display name" className="h-8 w-48" />
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">@</span>
                          <Input value={editForm.username} onChange={e => setEditForm({ ...editForm, username: e.target.value.toLowerCase() })} placeholder="username" className="h-8 w-40" />
                        </div>
                      </div>
                    ) : (
                      <>
                        <h1 className="text-2xl font-display font-bold text-foreground">
                          {viewingProfile.display_name || 'Anonymous Player'}
                        </h1>
                        {viewingProfile.username && <p className="text-muted-foreground text-sm">@{viewingProfile.username}</p>}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Joined {format(new Date(viewingProfile.created_at), 'MMM yyyy')}</span>
                          {leaderboardRank && <span className="flex items-center gap-1"><Medal className="w-3.5 h-3.5 text-primary" /> Rank #{leaderboardRank}</span>}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isOwnProfile && (
                    editing ? (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => setEditing(false)}><X className="w-4 h-4" /></Button>
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
                    <Button size="sm" variant="outline" onClick={copyProfileUrl}>
                      <Copy className="w-4 h-4 mr-1" /> Copy URL
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={handleShareCard}>
                    📸 Share Card
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hidden share card for html2canvas */}
          <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
            <div
              ref={shareCardRef}
              style={{
                width: 600, height: 300, padding: 32,
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                borderRadius: 16, fontFamily: 'system-ui, sans-serif',
                color: '#e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                border: '2px solid hsl(142, 76%, 36%)',
              }}
            >
              <div>
                <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 2 }}>
                  {viewingProfile?.display_name || 'Anonymous Player'}
                </div>
                {viewingProfile?.username && (
                  <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 12 }}>@{viewingProfile.username}</div>
                )}
                <div style={{ display: 'flex', gap: 24, fontSize: 14, marginBottom: 16 }}>
                  <span>🔥 {currentStreak} streak</span>
                  <span>🎮 {totalGames} games</span>
                  <span>⭐ {totalPoints.toLocaleString()} pts</span>
                  <span>🏅 {earnedCount}/{badges.length} badges</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Top Scores</div>
                <div style={{ display: 'flex', gap: 16 }}>
                  {bestScores.slice(0, 3).map((s) => (
                    <div key={s.game_type} style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 8, padding: '6px 12px' }}>
                      <div style={{ fontSize: 12, color: '#94a3b8' }}>{GAME_LABELS[s.game_type]?.replace(/^[^\s]+\s/, '') || s.game_type}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: 'hsl(142, 76%, 46%)' }}>{s.best_score}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ fontSize: 11, color: '#64748b', textAlign: 'right' }}>douknowball.com</div>
            </div>
          </div>

          {/* ═══════════════ 2. PERSONAL INFO ═══════════════ */}
          {isOwnProfile && (
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-display flex items-center gap-2">
                  <Star className="w-5 h-5 text-primary" /> Personal Info
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Favourite Game */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Favourite Game</label>
                    <Select
                      value={favouriteGame}
                      onValueChange={val => { setFavouriteGame(val); savePreferences('favourite_game', val); }}
                    >
                      <SelectTrigger className="h-9"><SelectValue placeholder="Pick a game..." /></SelectTrigger>
                      <SelectContent className="max-h-60">
                        {ALL_GAME_OPTIONS.map(g => (
                          <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Favourite Team */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Favourite Team</label>
                    <Input
                      value={favouriteTeam}
                      onChange={e => setFavouriteTeam(e.target.value)}
                      onBlur={() => savePreferences('favourite_team', favouriteTeam)}
                      placeholder="e.g. Real Madrid"
                      className="h-9"
                    />
                  </div>
                  {/* Favourite Player */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Favourite Player</label>
                    <Input
                      value={favouritePlayer}
                      onChange={e => setFavouritePlayer(e.target.value)}
                      onBlur={() => savePreferences('favourite_player', favouritePlayer)}
                      placeholder="e.g. Messi"
                      className="h-9"
                    />
                  </div>
                </div>
                {prefsSaving && <p className="text-xs text-muted-foreground mt-2 animate-pulse">Saving…</p>}
              </CardContent>
            </Card>
          )}

          {/* ═══════════════ 3. STATS ═══════════════ */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { icon: <Gamepad2 className="w-5 h-5 text-primary" />, value: totalGames, label: 'Games Played' },
              { icon: <Trophy className="w-5 h-5 text-yellow-500" />, value: totalPoints.toLocaleString(), label: 'Total Points' },
              { icon: <Flame className="w-5 h-5 text-orange-500" />, value: currentStreak, label: 'Streak 🔥' },
              { icon: <TrendingUp className="w-5 h-5 text-amber-500" />, value: longestStreak, label: 'Best Streak' },
              { icon: <Star className="w-5 h-5 text-purple-400" />, value: favouriteSportEntry ? SPORT_LABELS[favouriteSportEntry[0]] || '-' : '-', label: 'Fav Sport', small: true },
              { icon: <Target className="w-5 h-5 text-sky-400" />, value: averageScore, label: 'Avg Score' },
              { icon: <Clock className="w-5 h-5 text-emerald-400" />, value: timeSpent > 60 ? `${Math.floor(timeSpent / 60)}h ${timeSpent % 60}m` : `${timeSpent}m`, label: 'Time Played' },
              // #13/#100: days-visited stat, local-first (see useStreaks() above).
              // Own-profile only: this browser's visit history has no meaning
              // when looking at someone else's profile.
              ...(isOwnProfile
                ? [{ icon: <CalendarCheck className="w-5 h-5 text-gold" />, value: daysVisited, label: 'Days Visited' }]
                : []),
            ].map((stat, i) => (
              <Card key={i} className="border-border/40">
                <CardContent className="pt-3 pb-2 text-center space-y-0.5">
                  <div className="mx-auto w-fit">{stat.icon}</div>
                  <p className={`font-bold text-foreground ${stat.small ? 'text-xs' : 'text-xl'}`}>{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ═══════════════ 3b. PER-GAME BEST STREAKS (#101/#100) ═══════════════ */}
          {/* Own-profile only: per-game streaks are local-first and only meaningful for this browser's own history. */}
          {isOwnProfile && topGameStreaks.length > 0 && (
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-display flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-500" /> Best Streaks by Game
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {topGameStreaks.map(({ gameSlug, current, longest }) => (
                    <div key={gameSlug} className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-surface-1">
                      <span className="font-medium text-sm">{GAME_LABELS[gameSlug] || gameSlug}</span>
                      <span className="text-sm text-muted-foreground">
                        <span className="font-bold text-gold">{longest}</span> best
                        {current > 0 && <span className="ml-2 text-orange-500">🔥 {current} now</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ═══════════════ 4. BADGES ═══════════════ */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-display">🏅 Badges</CardTitle>
                <span className="text-sm font-semibold text-primary">{earnedCount} / {badges.length} earned</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3">
                {badges.map((badge) => (
                  <div
                    key={badge.name}
                    className={`relative flex flex-col items-center text-center p-3 rounded-xl border-2 transition-all ${
                      badge.earned
                        ? 'border-primary/50 bg-primary/5 shadow-[0_0_12px_hsl(var(--primary)/0.25)]'
                        : 'border-border/20 bg-muted/10 opacity-50'
                    }`}
                    style={badge.earned ? {} : { filter: 'blur(0.5px) grayscale(0.8)' }}
                  >
                    <span className="text-3xl mb-1.5">{badge.emoji}</span>
                    <p className="text-[10px] font-bold text-foreground leading-tight">{badge.name}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{badge.desc}</p>
                    {badge.earned && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ═══════════════ WC Predictor Card ═══════════════ */}
          {savedBracket && (
            <Card className="border-border/60 bg-gradient-to-r from-card to-secondary/30">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">🏆</span>
                    <div>
                      <h3 className="text-base font-bold font-display text-foreground">World Cup 2026 Prediction</h3>
                      <p className="text-sm text-muted-foreground">
                        {wcChampion ? <>Champion: <span className="text-primary font-semibold">{wcChampion}</span></> : 'Bracket saved'}
                      </p>
                    </div>
                  </div>
                  <Link to={`/world-cup-bracket?bracket=${savedBracket.id}`}>
                    <Button size="sm" variant="outline">View Bracket</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ═══════════════ Recently Played ═══════════════ */}
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
                        <p className="font-medium text-sm text-foreground">{GAME_LABELS[game.game_type] || game.game_type}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(game.played_at), 'MMM d, yyyy')}</p>
                      </div>
                      <span className="text-lg font-bold text-primary">{game.score}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ═══════════════ Best Scores ═══════════════ */}
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
