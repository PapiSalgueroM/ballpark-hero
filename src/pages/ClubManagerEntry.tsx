import { lazy, Suspense, useState } from 'react';
import { ClubManagerEraPicker, ClubManagerPickerHeading } from '@/components/club-manager/ClubManagerEraPicker';
import { ClubManagerFrame, ClubManagerStartup } from '@/components/club-manager/ClubManagerFrame';
import { hasClubManagerBootData } from '@/lib/clubManagerOpening';

const ClubManagerContents = lazy(() => import('./ClubManager').then(m => ({ default: m.ClubManagerContents })));
const ClubManagerClubList = lazy(() => import('@/components/club-manager/ClubManagerClubList').then(m => ({ default: m.ClubManagerClubList })));

export default function ClubManagerEntry() {
  const [direct] = useState(() => {
    const prerender = typeof window !== 'undefined' && (window as Window & { __DUKB_PRERENDER__?: boolean }).__DUKB_PRERENDER__;
    return prerender || hasClubManagerBootData();
  });
  const [pickedEra, setPickedEra] = useState<{ id: string; wasFocused: boolean } | null>(null);
  const [readCatalogue, setReadCatalogue] = useState(false);
  const openCareer = direct || pickedEra !== null;
  const picker = <>
    <ClubManagerPickerHeading step="era" />
    <ClubManagerEraPicker
      onPick={(id, wasFocused) => setPickedEra({ id, wasFocused })}
      pendingEra={pickedEra?.id}
      preserveFocus={pickedEra?.wasFocused}
    />
  </>;

  return (
    <ClubManagerFrame catalogue={openCareer || readCatalogue ? (
      <Suspense fallback={<p role="status" className="mt-10 text-sm">Loading club list...</p>}>
        <ClubManagerClubList />
      </Suspense>
    ) : (
      <button type="button" className="mt-10 min-h-11 text-sm text-primary underline" onClick={() => setReadCatalogue(true)}>
        Browse clubs by league
      </button>
    )}>
      {openCareer ? (
        <Suspense fallback={direct
          ? <ClubManagerStartup>Loading Club Manager...</ClubManagerStartup>
          : picker}>
          <ClubManagerContents initialEra={pickedEra?.id} />
        </Suspense>
      ) : picker}
    </ClubManagerFrame>
  );
}
