import type { UsCareerCore } from '@/lib/usCareerSport';
import MlbInheritedRunners from './MlbInheritedRunners';
import MlbPinchHitSeries from './MlbPinchHitSeries';

export default function MlbPracticeRoom({ career }: { career: UsCareerCore }) {
  if (career.pos !== 'SP' && career.pos !== 'RP') return <MlbPinchHitSeries career={career} />;
  const owner = JSON.stringify([career.name, career.pos, career.draftPick, career.summerSalt]);
  return <MlbInheritedRunners key={owner} owner={owner} />;
}
