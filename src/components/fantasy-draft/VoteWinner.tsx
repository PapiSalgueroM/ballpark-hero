import { useState } from 'react';
import { User, Bot, Trophy, Copy, Check, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { DraftPlayer } from './PlayerPool';

interface VoteWinnerProps {
  userTeam: DraftPlayer[];
  aiTeam: DraftPlayer[];
  onVote: (team: 'user' | 'ai') => void;
  voted: 'user' | 'ai' | null;
  voteCounts: { user: number; ai: number };
}

export const VoteWinner = ({ userTeam, aiTeam, onVote, voted, voteCounts }: VoteWinnerProps) => {
  const [copied, setCopied] = useState(false);

  const winningTeam = voted === 'user' ? userTeam : aiTeam;
  const winnerLabel = voted === 'user' ? 'Your Team' : 'AI Team';
  const topPlayers = winningTeam
    .sort((a, b) => b.market_value_millions - a.market_value_millions)
    .slice(0, 3);

  const shareText = voted
    ? `⚽ Fantasy Draft Showdown\n\nI voted for ${winnerLabel} to win the season! 🏆\n\nMVPs: ${topPlayers.map(p => p.name).join(', ')}\n\nPlay now 👉 douknowball.com/fantasy-draft`
    : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
  const gmailUrl = `https://mail.google.com/mail/?view=cm&body=${encodeURIComponent(shareText)}&su=${encodeURIComponent('Fantasy Draft Showdown Result')}`;
  const smsUrl = `sms:?body=${encodeURIComponent(shareText)}`;
  // Instagram doesn't support direct share URLs, so we copy to clipboard

  return (
    <div className="w-full rounded-2xl border border-border bg-card/60 backdrop-blur-md overflow-hidden">
      <div className="px-4 py-3 border-b border-border text-center">
        <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">
          {voted ? '🏆 Winner Declared!' : 'Who Won the Season?'}
        </h3>
      </div>

      <div className="p-4 sm:p-6 space-y-5">
        {/* Vote buttons */}
        {!voted && (
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => onVote('user')}
              className="flex-1 flex items-center justify-center gap-3 px-6 py-5 rounded-xl border-2 border-primary/40 bg-primary/10 hover:bg-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <User className="w-6 h-6 text-primary" />
              <span className="text-lg font-bold text-primary">Your Team</span>
            </button>
            <button
              onClick={() => onVote('ai')}
              className="flex-1 flex items-center justify-center gap-3 px-6 py-5 rounded-xl border-2 border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Bot className="w-6 h-6 text-amber-400" />
              <span className="text-lg font-bold text-amber-400">AI Team</span>
            </button>
          </div>
        )}

        {/* Winner celebration */}
        {voted && (
          <>
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/15 border border-primary/40">
                <Trophy className="w-5 h-5 text-primary" />
                <span className="text-sm font-bold text-primary uppercase tracking-wider">
                  {winnerLabel} wins!
                </span>
              </div>

              <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
                <span>Your Team: <strong className="text-primary">{voteCounts.user}</strong> votes</span>
                <span>AI Team: <strong className="text-amber-400">{voteCounts.ai}</strong> votes</span>
              </div>

              <div className="mt-3">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Best Players</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {topPlayers.map((p) => (
                    <span key={p.id} className="px-3 py-1 rounded-full bg-secondary/60 text-xs font-semibold text-foreground">
                      {p.name} <span className="text-primary">£{p.market_value_millions}M</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Share buttons */}
            <div className="border-t border-border pt-4">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 text-center">Share Your Result</p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button size="sm" variant="outline" onClick={handleCopy} className="gap-1.5">
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
                <Button size="sm" variant="outline" asChild className="gap-1.5">
                  <a href={twitterUrl} target="_blank" rel="noopener noreferrer">
                    𝕏 Twitter
                  </a>
                </Button>
                <Button size="sm" variant="outline" asChild className="gap-1.5">
                  <a href={gmailUrl} target="_blank" rel="noopener noreferrer">
                    ✉️ Gmail
                  </a>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => {
                    navigator.clipboard.writeText(shareText);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  📸 Instagram
                </Button>
                <Button size="sm" variant="outline" asChild className="gap-1.5">
                  <a href={smsUrl}>
                    <MessageCircle className="w-3.5 h-3.5" />
                    Text
                  </a>
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
