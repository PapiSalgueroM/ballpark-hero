/* Round 1046: the Resume chip on the career page: "📺 Resume 2031/32,
   matchday 14". The page loads this file only when this browser keeps a
   place at all (one storage read), so a first visit downloads none of it.

   It shows a button only when the record names a season this career still
   holds, by the Season Centre's own key for that season, and (for a table
   season he did not win) only while the save can still show that season as
   he watched it: src/lib/season/resume.ts holds that one rule. A record for
   another career, an older build or a hand edited one is simply no chip.

   It imports the record's read side and nothing else of the Season Centre,
   so it stays a few hundred bytes. That is why the season's key is one
   template line here and not an import: scripts/simSeasonCentreMotion.mjs
   reads the line out of this file and holds it to soccerSeasonKey on every
   season of the probe careers. */
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { CareerState, SeasonRecord } from '@/lib/soccerCareerEngine';
import { readResume, resumeLabel, resumeRowIndex } from '@/lib/season/resume';

interface Props {
  career: CareerState;
  /** Changes whenever the page wants the record read again (the Season Centre just closed). */
  at: number;
  onOpen: (row: SeasonRecord) => void;
}

export default function SeasonResumeChip({ career, at, onOpen }: Props) {
  const [resume, setResume] = useState(() => readResume('soccer'));
  useEffect(() => { setResume(readResume('soccer')); }, [at]);
  const row = career.seasons[resumeRowIndex(resume, career.seasons, r => `${career.playerName}|${r.club}|${r.year}|${r.apps}|${r.goals}|${r.assists}|${r.rating}|centre`, career.phone?.world?.year)];
  if (!resume || !row) return null;
  return (
    <div className="mt-2">
      <Button onClick={() => onOpen(row)} variant="outline" className="w-full h-11 text-sm font-bold" data-season-resume>
        📺 {resumeLabel(resume, `${row.year}/${String(row.year + 1).slice(-2)}`, 'matchday')}
      </Button>
    </div>
  );
}
