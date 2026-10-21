interface PotentialProgressProps {
  ceiling: number;
  earned: number;
  eliteRun: number;
  overall: number;
  retired: boolean;
  awardPending: boolean;
}

export default function PotentialProgress({ ceiling, earned, eliteRun, overall, retired, awardPending }: PotentialProgressProps) {
  if (awardPending) {
    return <div role="region" aria-label="Potential progress" data-potential-progress="waiting"
      className="pt-1 text-[11px] text-muted-foreground">
      Potential progress is waiting for the award reveal.
    </div>;
  }

  return (
    <div role="region" aria-label="Potential progress" data-potential-progress="visible"
      className="pt-1 space-y-1 text-[11px] text-muted-foreground">
      <p data-potential-ceiling>Ceiling {ceiling}/99{earned > 0 && <> · {earned} earned</>}.</p>
      <p data-potential-run>Elite run: {eliteRun} {eliteRun === 1 ? 'season' : 'seasons'}.</p>
      {ceiling >= 99 ? <p>99 is the ceiling limit. It cannot rise further.</p>
        : retired ? <p>Career complete. Your earned ceiling points stay in your record.</p>
        : <>
          <p data-potential-next>Next point: elite run 2+ and {ceiling - 2}+ overall at season end.
            {overall >= ceiling - 2 && <> Overall target met now.</>}</p>
          <details>
            <summary className="cursor-pointer min-h-11 py-3">Elite-season requirements</summary>
            <p className="pt-1">30+ appearances and a 7.5+ rating, plus a Champions League, World Cup or Ballon d'Or win.
              At a tier 1 or tier 2 club, a league or continental club title, 30+ goals or an 8.2+ rating also counts.</p>
          </details>
        </>}
    </div>
  );
}
