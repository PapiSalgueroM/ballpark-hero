import { lazy, Suspense, useRef, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SoccerCareerCreator, type SoccerCareerDraft } from "@/components/soccer-career/SoccerCareerCreator";
import { SoccerCareerFrame } from "@/components/soccer-career/SoccerCareerFrame";
import { SaveMovedNotice, useSoccerPastCareers } from "@/components/soccer-career/SoccerCareerOverlays";
import { useSaveFenceWatch } from "@/hooks/useSaveFenceWatch";
import { adoptSoccerCareerSave } from "@/lib/soccerCareerSaveEntry";
import { continueSaveEntries, resolveContinueSave, SOCCER_CAREER_SAVE, type ContinueSave } from "@/data/continueSaves";
import type { CareerState } from "@/lib/soccerCareerEngine";

type SoccerCareerModule = typeof import("./SoccerCareer");
let loaded: SoccerCareerModule | undefined;
let pending: Promise<SoccerCareerModule> | undefined;

function loadSoccerCareer() {
  return pending ??= import("./SoccerCareer").then(module => {
    if (!module?.default) throw new Error("Soccer Career did not load");
    loaded = module;
    return module;
  }).catch(error => {
    pending = undefined;
    throw error;
  });
}

const SavedSoccerCareer = lazy(loadSoccerCareer);
const SoccerCareerSlots = lazy(() => import("@/components/soccer-career/SoccerCareerSlots"));
const slots = continueSaveEntries(SOCCER_CAREER_SAVE);
const loadCreationSupport = () => loadSoccerCareer().then(module => module.getCreationSupport());

function FreshSoccerCareer({ saveKey, savesPath, onBegin }: { saveKey: string; savesPath: string; onBegin: (draft: SoccerCareerDraft) => void }) {
  const { moved: saveMoved } = useSaveFenceWatch(saveKey);
  const { openPastCareers, pastCareersTrigger, pastCareersOverlay } = useSoccerPastCareers(saveMoved);

  return (
    <>
      <SoccerCareerFrame reportGameContext={{ careerRating: {
        phase: "creation", age: null, position: null, overall: null, derivedOverall: null, skills: null,
        seasonCount: 0, lastSeason: null, saveFailed: false, saveMoved, saveError: false,
      } }}>
        <main id="dukb-main" tabIndex={-1} className="flex-1 w-full max-w-5xl mx-auto px-3 sm:px-4 py-4">
          {saveMoved && <Suspense fallback={null}><SaveMovedNotice message="This career moved on in another tab. Reload to carry on." /></Suspense>}
          <div className="mb-3 grid grid-cols-2 gap-2">
            <Button asChild variant="outline" className="min-h-11 whitespace-normal"><Link to={savesPath}>Career saves</Link></Button>
            <Button ref={pastCareersTrigger} variant="outline" className="min-h-11 whitespace-normal" onClick={openPastCareers}>Past careers</Button>
          </div>
          <SoccerCareerCreator initialSupport={loaded?.getCreationSupport()} loadSupport={loadCreationSupport} onBegin={onBegin} />
        </main>
      </SoccerCareerFrame>
      {pastCareersOverlay}
    </>
  );
}

export default function SoccerCareerEntry() {
  const { search } = useLocation();
  const slot = resolveContinueSave(SOCCER_CAREER_SAVE, search);
  if (!slot) return <Navigate to={SOCCER_CAREER_SAVE.path} replace />;
  if (new URLSearchParams(search).get('view') === 'saves') return (
    <SoccerCareerFrame reportGameContext={{}}>
      <main id="dukb-main" tabIndex={-1} className="flex-1 w-full max-w-5xl mx-auto px-3 sm:px-4 pb-4 pt-12">
        <Suspense fallback={<p role="status">Opening career saves...</p>}>
          <SoccerCareerSlots slots={slots} backPath={slot.path} />
        </Suspense>
      </main>
    </SoccerCareerFrame>
  );
  return <SoccerCareerSlot key={slot.saveKey} slot={slot} />;
}

function SoccerCareerSlot({ slot }: { slot: ContinueSave }) {
  const { saveKey } = slot;
  const savesPath = slot.path + (slot.path.includes('?') ? '&' : '?') + 'view=saves';
  const [saved] = useState(() => adoptSoccerCareerSave(saveKey));
  const [started, setStarted] = useState<CareerState | null>(null);
  const starting = useRef(false);

  if (saved !== null) return (
    <Suspense fallback={<main id="dukb-main" tabIndex={-1} role="status" className="mx-auto min-h-svh p-4 text-sm text-muted-foreground">Opening your career...</main>}>
      <SavedSoccerCareer entry={{ saved, saveKey, savesPath }} />
    </Suspense>
  );

  if (started && loaded) return <loaded.default entry={{ started, saveKey, savesPath }} />;

  return <FreshSoccerCareer saveKey={saveKey} savesPath={savesPath} onBegin={draft => {
    if (!loaded || starting.current) return;
    starting.current = true;
    setStarted(loaded.startSoccerCareer(draft));
  }} />;
}
