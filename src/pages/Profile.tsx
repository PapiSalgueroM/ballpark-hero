import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/game/Footer';
import PageSeo from '@/components/seo/PageSeo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame, Trophy, Calendar, Gamepad2, Share2, Edit2, Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface BestScore {
  game_type: string;
  best_score: number;
  achieved_at: string;
}

interface DailyBadge {
  date: string;
  streak_days: number;
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
};

export default function Profile() {
  const { user, profile, refreshProfile, updateProfile } = useAuth();
  const { username } = useParams<{ username?: string }>();
  const navigate = useNavigate();
  
  const [viewingProfile, setViewingProfile] = useState<any>(null);
  const [bestScores, setBestScores] = useState<BestScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ display_name: '', username: '' });
  const [saving, setSaving] = useState(false);
  const [legendStreak, setLegendStreak] = useState<number>(0);
  const [legendBadgeCount, setLegendBadgeCount] = useState<number>(0);

  const isOwnProfile = !username || (profile?.username === username);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);

      if (username) {
        // Viewing someone else's profile by username
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', username)
          .single();

        if (profileData) {
          setViewingProfile(profileData);
          
          // Load their best scores
          const { data: scores } = await supabase
            .from('user_best_scores')
            .select('*')
            .eq('user_id', profileData.user_id)
            .order('best_score', { ascending: false });

          setBestScores(scores || []);
        } else {
          navigate('/');
          toast.error('Profile not found');
        }
      } else if (user && profile) {
        // Viewing own profile
        setViewingProfile(profile);
        setEditForm({
          display_name: profile.display_name || '',
          username: profile.username || '',
        });

        const { data: scores } = await supabase
          .from('user_best_scores')
          .select('*')
          .eq('user_id', user.id)
          .order('best_score', { ascending: false });

        setBestScores(scores || []);

        // Load daily legend badges
        const { data: badges } = await supabase
          .from('daily_badges')
          .select('date, streak_days')
          .eq('user_id', user.id)
          .order('date', { ascending: false });

        if (badges && badges.length > 0) {
          setLegendBadgeCount(badges.length);
          // Calculate current streak from most recent badge
          const today = new Date().toISOString().split('T')[0];
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];
          
          if (badges[0].date === today || badges[0].date === yesterdayStr) {
            setLegendStreak(badges[0].streak_days);
          } else {
            setLegendStreak(0);
          }
        }
      } else if (!user) {
        navigate('/');
        toast.error('Please sign in to view your profile');
      }

      setLoading(false);
    };

    loadProfile();
  }, [username, user, profile, navigate]);

  const handleSave = async () => {
    setSaving(true);

    // Validate username
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
      if (error.message.includes('duplicate')) {
        toast.error('Username is already taken');
      } else {
        toast.error('Failed to update profile');
      }
    } else {
      toast.success('Profile updated!');
      setEditing(false);
      await refreshProfile();
    }

    setSaving(false);
  };

  const handleShare = () => {
    const shareText = `Check out my DoUKnowBall stats!\n🔥 Streak: ${viewingProfile?.current_streak || 0} days | 🏆 Games: ${viewingProfile?.total_games_played || 0}\n${window.location.origin}/profile/${viewingProfile?.username || ''}`;
    
    if (navigator.share) {
      navigator.share({ text: shareText });
    } else {
      navigator.clipboard.writeText(shareText);
      toast.success('Profile link copied!');
    }
  };

  const getFavouriteGame = () => {
    if (bestScores.length === 0) return null;
    // For now, return the game with highest score
    const best = bestScores[0];
    return GAME_LABELS[best.game_type] || best.game_type;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!viewingProfile) {
    return null;
  }

  return (
    <>
      <PageSeo
        title={`${viewingProfile.display_name || viewingProfile.username || 'User'}'s Profile | DoUKnowBall`}
        description="View player stats, streaks, and best scores on DoUKnowBall"
        path={username ? `/profile/${username}` : '/profile'}
      />
      <div className="min-h-screen bg-background">
        <Header />
        
        <main className="max-w-4xl mx-auto px-4 py-8">
          {/* Profile Header */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
                    {(viewingProfile.display_name || user?.email || 'U').charAt(0).toUpperCase()}
                  </div>
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
                        <h1 className="text-2xl font-display font-bold">
                          {viewingProfile.display_name || 'Anonymous Player'}
                        </h1>
                        {viewingProfile.username && (
                          <p className="text-muted-foreground">@{viewingProfile.username}</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
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
                        <Edit2 className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    )
                  )}
                  {viewingProfile.username && (
                    <Button size="sm" variant="outline" onClick={handleShare}>
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-4 text-center">
                <Flame className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                <p className="text-3xl font-bold">{viewingProfile.current_streak}</p>
                <p className="text-sm text-muted-foreground">Current Streak</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                <p className="text-3xl font-bold">{viewingProfile.longest_streak}</p>
                <p className="text-sm text-muted-foreground">Best Streak</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <Gamepad2 className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="text-3xl font-bold">{viewingProfile.total_games_played}</p>
                <p className="text-sm text-muted-foreground">Games Played</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium">
                  {format(new Date(viewingProfile.created_at), 'MMM d, yyyy')}
                </p>
                <p className="text-sm text-muted-foreground">Member Since</p>
              </CardContent>
            </Card>
          </div>

          {/* Daily Legend Streak */}
          {isOwnProfile && (legendStreak > 0 || legendBadgeCount > 0) && (
            <Card className="mb-6 border-[hsl(var(--ft-gold)/0.3)] bg-gradient-to-r from-card to-secondary/30">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">🏆</span>
                    <div>
                      <h3 className="text-lg font-bold font-display text-[hsl(var(--ft-gold))]">Daily Legend</h3>
                      <p className="text-sm text-muted-foreground">
                        Completed all 37 games in a day — {legendBadgeCount} {legendBadgeCount === 1 ? 'time' : 'times'}
                      </p>
                    </div>
                  </div>
                  {legendStreak > 0 && (
                    <div className="text-right">
                      <p className="text-2xl font-bold text-foreground">🔥 {legendStreak} day{legendStreak !== 1 ? 's' : ''}</p>
                      <p className="text-xs text-muted-foreground">streak</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Favourite Game */}
          {getFavouriteGame() && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">⭐ Favourite Game</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-display">{getFavouriteGame()}</p>
              </CardContent>
            </Card>
          )}

          {/* Best Scores */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🏆 Best Scores</CardTitle>
            </CardHeader>
            <CardContent>
              {bestScores.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No scores yet. Start playing to track your best!
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {bestScores.map((score) => (
                    <div
                      key={score.game_type}
                      className="flex items-center justify-between p-3 rounded-lg border border-border"
                    >
                      <span className="font-medium">
                        {GAME_LABELS[score.game_type] || score.game_type}
                      </span>
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
