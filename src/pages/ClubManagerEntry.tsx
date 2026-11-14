import { lazy, Suspense, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ClubManagerEraPicker, ClubManagerPickerHeading } from '@/components/club-manager/ClubManagerEraPicker';
import { ClubManagerFrame, ClubManagerStartup } from '@/components/club-manager/ClubManagerFrame';
import { hasClubManagerBootData } from '@/lib/clubManagerOpening';
import { clubManagerRequestedSlot } from '@/lib/clubManagerSaveKeys';

const ClubManagerContents = lazy(() => import('./ClubManager').then(m => ({ default: m.ClubManagerContents })));
const ClubManagerClubList = lazy(() => import('@/components/club-manager/ClubManagerClubList').then(m => ({ default: m.ClubManagerClubList })));

export default function ClubManagerEntry() {
  const { search } = useLocation();
  const requestedSlot = clubManagerRequestedSlot(search);
  const [direct] = useState(() => {
    const prerender = typeof window !== 'undefined' && (window as Window & { __DUKB_PRERENDER__?: boolean }).__DUKB_PRERENDER__;
    return prerender || hasClubManagerBootData();
  });
  const [pickedEra, setPickedEra] = useState<{ id: string; wasFocused: boolean } | null>(null);
  const [readCatalogue, setReadCatalogue] = useState(false);
  const openDirect = direct || requestedSlot !== undefined;
  const openCareer = openDirect || pickedEra !== null;
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
        <Suspense fallback={openDirect
          ? <ClubManagerStartup>Loading Club Manager...</ClubManagerStartup>
          : picker}>
          <ClubManagerContents key={requestedSlot === null ? 'chooser' : requestedSlot ?? 'default'} initialEra={pickedEra?.id} requestedSlot={requestedSlot} />
        </Suspense>
      ) : picker}
    </ClubManagerFrame>
  );
}
