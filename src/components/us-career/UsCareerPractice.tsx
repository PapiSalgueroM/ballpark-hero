import { useEffect, useState } from 'react';
import TrainingGround from '@/components/career/TrainingGround';
import { trainingBankNote, type TrainingSport } from '@/lib/careerTraining';
import type { UsCareerPracticeResult, UsCareerSport } from '@/lib/usCareerSport';
import { escapeCloses, focusDialogOnMount } from '@/lib/dialogA11y';

export default function UsCareerPractice({ sport, pos, available, result, onComplete, onClose }: {
  sport: UsCareerSport;
  pos: string;
  available: boolean;
  result?: UsCareerPracticeResult;
  onComplete: (drill: string, score: number) => void;
  onClose: () => void;
}) {
  const [skin, setSkin] = useState<TrainingSport | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let current = true;
    setFailed(false);
    void sport.loadTraining(pos).then(
      next => { if (current) setSkin(next); },
      () => { if (current) setFailed(true); },
    );
    return () => { current = false; };
  }, [sport, pos, attempt]);
  if (!skin) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3">
      <div role="dialog" aria-modal="true" aria-label={sport.practiceLabel} tabIndex={-1} ref={focusDialogOnMount} onKeyDown={escapeCloses(onClose)} className="w-full max-w-md rounded-2xl border border-border bg-card p-5 text-center">
        <p role="status" className="text-sm">{failed ? 'Could not open practice. Try again.' : 'Opening practice...'}</p>
        {failed && <button onClick={() => setAttempt(n => n + 1)} className="mt-3 min-h-11 rounded-lg bg-primary px-4 font-bold text-primary-foreground">Retry practice</button>}
        <button onClick={onClose} className="ml-2 mt-3 min-h-11 rounded-lg bg-secondary px-4 font-bold">Close</button>
      </div>
    </div>
  );
  return <TrainingGround
    sport={skin}
    available={available}
    onComplete={onComplete}
    onClose={onClose}
    bankedNote={result ? `${trainingBankNote(result)} OVR ${result.before} to ${result.ovr}.` : undefined}
    instructions="Choose one drill and bank its score. Below 50 earns no rating, 50 to 79 earns up to +1, and 80 or more earns up to +2. Example: an 80 score at 74 OVR with a 75 ceiling earns +1. Banking uses this season's session, even at your ceiling. Leaving before banking keeps it available. Your rating carries into camp and the next season."
  />;
}
