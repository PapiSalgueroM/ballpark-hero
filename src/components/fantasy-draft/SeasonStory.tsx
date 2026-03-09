import { User, Bot } from 'lucide-react';

interface SeasonStoryProps {
  teamAStory: string;
  teamBStory: string;
}

export const SeasonStory = ({ teamAStory, teamBStory }: SeasonStoryProps) => {
  return (
    <div className="w-full rounded-2xl border border-border bg-card/60 backdrop-blur-md overflow-hidden">
      <div className="flex flex-col sm:flex-row">
        {/* User team story */}
        <div className="flex-1 p-4 sm:p-6 border-b sm:border-b-0 sm:border-r border-border">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-primary/30">
            <User className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold uppercase tracking-widest text-primary">Your Team's Season</h3>
          </div>
          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">{teamAStory}</p>
        </div>

        {/* AI team story */}
        <div className="flex-1 p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-amber-500/30">
            <Bot className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold uppercase tracking-widest text-amber-400">AI Team's Season</h3>
          </div>
          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">{teamBStory}</p>
        </div>
      </div>
    </div>
  );
};
