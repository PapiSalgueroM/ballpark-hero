import { lazy, Suspense, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { SoccerCareerCreator, type SoccerCareerDraft } from "@/components/soccer-career/SoccerCareerCreator";
import { SoccerCareerFrame } from "@/components/soccer-career/SoccerCareerFrame";
import { SaveMovedNotice, useSoccerPastCareers } from "@/components/soccer-career/SoccerCareerOverlays";
import { useSaveFenceWatch } from "@/hooks/useSaveFenceWatch";
import { SAVE_KEY, adoptSoccerCareerSave } from "@/lib/soccerCareerSaveEntry";
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
const loadCreationSupport = () => loadSoccerCareer().then(module => module.getCreationSupport());

function FreshSoccerCareer({ onBegin }: { onBegin: (draft: SoccerCareerDraft) => void }) {
  const { moved: saveMoved } = useSaveFenceWatch(SAVE_KEY);
  const { openPastCareers, pastCareersTrigger, pastCareersOverlay } = useSoccerPastCareers(saveMoved);

  return (
    <>
      <SoccerCareerFrame reportGameContext={{ careerRating: {
        phase: "creation", age: null, position: null, overall: null, derivedOverall: null, skills: null,
        seasonCount: 0, lastSeason: null, saveFailed: false, saveMoved, saveError: false,
      } }}>
        <main id="dukb-main" className="flex-1 w-full max-w-5xl mx-auto px-3 sm:px-4 py-4">
          {saveMoved && <Suspense fallback={null}><SaveMovedNotice message="This career moved on in another tab. Reload to carry on." /></Suspense>}
          <Button ref={pastCareersTrigger} variant="outline" className="mb-3 min-h-11 w-full whitespace-normal" onClick={openPastCareers}>Past careers</Button>
          <SoccerCareerCreator initialSupport={loaded?.getCreationSupport()} loadSupport={loadCreationSupport} onBegin={onBegin} />
        </main>
      </SoccerCareerFrame>
      {pastCareersOverlay}
    </>
  );
}

export default function SoccerCareerEntry() {
  const [saved] = useState(adoptSoccerCareerSave);
  const [started, setStarted] = useState<CareerState | null>(null);
  const starting = useRef(false);

  if (saved !== null) return (
    <Suspense fallback={<main id="dukb-main" role="status" className="mx-auto min-h-svh p-4 text-sm text-muted-foreground">Opening your career...</main>}>
      <SavedSoccerCareer entry={{ saved }} />
    </Suspense>
  );

  if (started && loaded) return <loaded.default entry={{ started }} />;

  return <FreshSoccerCareer onBegin={draft => {
    if (!loaded || starting.current) return;
    starting.current = true;
    setStarted(loaded.startSoccerCareer(draft));
  }} />;
}
