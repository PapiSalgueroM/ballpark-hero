import { User, Bot, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';

interface TeamAnalysisData {
  strengths: string[];
  weaknesses: string[];
}

interface TeamAnalysisProps {
  teamA: TeamAnalysisData | null;
  teamB: TeamAnalysisData | null;
  loading: boolean;
}

const AnalysisColumn = ({
  label,
  icon,
  data,
  accentBorder,
}: {
  label: string;
  icon: React.ReactNode;
  data: TeamAnalysisData;
  accentBorder: string;
}) => (
  <div className="flex-1 min-w-0">
    <div className={`flex items-center gap-2 mb-3 pb-2 border-b ${accentBorder}`}>
      {icon}
      <span className="text-xs sm:text-sm font-bold uppercase tracking-widest">{label}</span>
    </div>
    <div className="space-y-3">
      <div>
        <div className="flex items-center gap-1.5 mb-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Strengths</span>
        </div>
        <ul className="space-y-1">
          {data.strengths.map((s, i) => (
            <li key={i} className="text-xs text-foreground/85 leading-snug pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-primary">
              {s}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <div className="flex items-center gap-1.5 mb-1.5">
          <TrendingDown className="w-3.5 h-3.5 text-destructive" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-destructive">Weaknesses</span>
        </div>
        <ul className="space-y-1">
          {data.weaknesses.map((w, i) => (
            <li key={i} className="text-xs text-foreground/85 leading-snug pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-destructive">
              {w}
            </li>
          ))}
        </ul>
      </div>
    </div>
  </div>
);

export const TeamAnalysis = ({ teamA, teamB, loading }: TeamAnalysisProps) => {
  if (loading) {
    return (
      <div className="w-full rounded-2xl border border-border bg-card/60 backdrop-blur-md p-8 flex items-center justify-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Analyzing squads...</span>
      </div>
    );
  }

  if (!teamA || !teamB) return null;

  return (
    <div className="w-full rounded-2xl border border-border bg-card/60 backdrop-blur-md overflow-hidden">
      <div className="px-4 py-3 border-b border-border text-center">
        <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">Team Analysis</h3>
      </div>
      <div className="flex flex-col sm:flex-row p-4 sm:p-5 gap-4 sm:gap-6">
        <AnalysisColumn
          label="Your Team"
          icon={<User className="w-4 h-4 text-primary" />}
          data={teamA}
          accentBorder="border-primary/30 text-primary"
        />
        <div className="w-px bg-border/50 hidden sm:block shrink-0" />
        <div className="h-px bg-border/50 sm:hidden" />
        <AnalysisColumn
          label="AI Team"
          icon={<Bot className="w-4 h-4 text-amber-400" />}
          data={teamB}
          accentBorder="border-amber-500/30 text-amber-400"
        />
      </div>
    </div>
  );
};
