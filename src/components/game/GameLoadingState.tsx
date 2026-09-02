interface GameLoadingStateProps {
  label?: string;
}

export function GameLoadingState({ label = 'Getting your game ready...' }: GameLoadingStateProps) {
  return (
    <div
      role="status"
      className="flex min-h-80 items-center justify-center rounded-2xl border border-border bg-card/50 px-6 text-center"
    >
      <p className="text-sm font-semibold text-muted-foreground animate-pulse">{label}</p>
    </div>
  );
}
