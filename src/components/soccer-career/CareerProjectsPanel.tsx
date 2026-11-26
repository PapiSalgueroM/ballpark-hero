import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { CareerState } from '@/lib/soccerCareerEngine';
import {
  getCareerProjectsView,
  type CareerProjectChoiceId,
  type CareerProjectId,
  type CareerProjectResult,
} from '@/lib/soccerCareerProjects';

type Screen = 'projects' | 'history' | CareerProjectId;
type Props = {
  career: CareerState;
  onChoose: (projectId: CareerProjectId, choiceId: CareerProjectChoiceId) => void;
  renderHeader: (title: string, backLabel: string, onBack: () => void) => ReactNode;
  onBack: () => void;
};
type Commitment = NonNullable<ReturnType<typeof getCareerProjectsView>['pending']>;

const icons: Record<CareerProjectId, string> = {
  'street-league': '⚽',
  'match-lab': '📋',
  'players-council': '🤝',
  'fan-radio': '🎙️',
};

const action = 'min-h-11 rounded-xl border border-white/15 px-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-300';

function ProjectReceipt({ result }: { result: CareerProjectResult }) {
  return (
    <article className="space-y-1 rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs">
      <div className="flex items-start justify-between gap-2">
        <p className="font-bold text-white/85">{result.year} · {result.projectTitle}</p>
        <span className={result.outcome === 'completed' ? 'shrink-0 text-emerald-300' : 'shrink-0 text-amber-300'}>
          {result.outcome === 'completed' ? 'Met' : 'Missed'}
        </span>
      </div>
      <p className="font-semibold">{result.chapterTitle} · {result.choiceTitle}</p>
      <p className="text-white/65">Target · {result.goalLabel}</p>
      <p className="text-white/85">Result · {result.actualLabel}</p>
      <p className="text-white/65">{result.effectLabel}</p>
    </article>
  );
}

function PendingProject({ pending }: { pending: Commitment }) {
  return (
    <section className="space-y-1 rounded-xl border border-sky-400/30 bg-sky-400/10 p-2.5 text-xs">
      <h3 tabIndex={-1} data-project-pending="" className="font-bold text-sky-200">In progress · {pending.projectTitle}</h3>
      <p className="font-semibold">{pending.chapterTitle} · {pending.choice.title}</p>
      <p className="text-white/80">{pending.choice.goalLabel}</p>
      <p className="text-white/60">Settles after your next played senior season.</p>
    </section>
  );
}

export default function CareerProjectsPanel({ career, onChoose, renderHeader, onBack }: Props) {
  const [screen, setScreen] = useState<Screen>('projects');
  const body = useRef<HTMLDivElement>(null);
  const focusNext = useRef<string | null>(null);
  const focusCommitment = useRef<CareerProjectId | null>(null);
  const { projects, pending, lastResult, history, canChoose } = getCareerProjectsView(career);
  const project = projects.find(row => row.id === screen);
  const chapter = project?.chapter;
  const pendingId = pending?.projectId;

  function navigate(to: Screen, focus: string) {
    focusNext.current = focus;
    setScreen(to);
  }

  useLayoutEffect(() => {
    if (focusNext.current) {
      if (body.current) body.current.scrollTop = 0;
      body.current?.querySelector<HTMLElement>(focusNext.current)?.focus({ preventScroll: true });
      focusNext.current = null;
    } else if (pendingId && focusCommitment.current === pendingId) {
      body.current?.querySelector<HTMLElement>('[data-project-pending]')?.focus({ preventScroll: true });
      focusCommitment.current = null;
    }
  }, [screen, pendingId]);

  const title = screen === 'history' ? 'Project history' : project?.title ?? 'Career Projects';
  const back = screen === 'projects' ? onBack : () => navigate(
    'projects',
    project ? `[data-career-project="${project.id}"]` : '[data-project-history-open]',
  );

  return (
    <>
      {renderHeader(title, screen === 'projects' ? 'Home' : 'Projects', back)}
      <div ref={body} data-career-projects-screen={screen} className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-2.5">
        {screen === 'projects' ? (
          <>
            <h2 tabIndex={-1} data-project-heading="" className="sr-only">Career Projects</h2>
            <p className="text-xs leading-snug text-white/75">Pick one project goal for your next senior season.</p>
            {pending && <PendingProject pending={pending} />}
            <div className="grid grid-cols-2 gap-2" aria-label="Career projects">
              {projects.map(row => (
                <button
                  key={row.id}
                  type="button"
                  data-career-project={row.id}
                  className={`${action} min-w-0 space-y-1 bg-white/5 py-2 hover:bg-white/10 ${pendingId === row.id ? 'border-sky-400/50' : ''}`}
                  onClick={() => navigate(row.id, '[data-project-heading]')}
                >
                  <span aria-hidden="true" className="block text-base leading-none">{icons[row.id]}</span>
                  <span className="block text-xs font-black leading-snug">{row.title}</span>
                  <span className="block text-[11px] text-white/65">
                    {row.completed === row.total ? 'Complete' : `${row.completed}/${row.total} chapters`}
                  </span>
                </button>
              ))}
            </div>
            {lastResult && (
              <button
                type="button"
                data-project-history-open=""
                className={`${action} w-full bg-white/5 text-xs hover:bg-white/10`}
                onClick={() => navigate('history', '[data-project-heading]')}
              >
                <span className="block font-bold">Project history</span>
                <span className="block text-[11px] text-white/65">
                  Latest · {lastResult.projectTitle} · {lastResult.outcome === 'completed' ? 'Target met' : 'Target missed'}
                </span>
              </button>
            )}
          </>
        ) : screen === 'history' ? (
          <>
            <h2 tabIndex={-1} data-project-heading="" className="sr-only">Project history</h2>
            {history.map((result, index) => <ProjectReceipt key={`${result.year}-${result.projectTitle}-${index}`} result={result} />)}
          </>
        ) : project && (
          <>
            <h2 tabIndex={-1} data-project-heading="" className="text-sm font-black">
              {chapter ? `Chapter ${chapter.number} of ${project.total} · ${chapter.title}` : 'Project complete'}
            </h2>
            <p className="text-xs leading-snug text-white/75">{chapter?.description ?? project.description}</p>
            {pending && pendingId === project.id ? <PendingProject pending={pending} /> : chapter && (
              <>
                {!canChoose && (
                  <p className="rounded-lg bg-white/5 px-2.5 py-2 text-xs text-white/75">
                    {pending ? `${pending.projectTitle} has your current commitment.` : 'New goals are available during a senior playing career.'}
                  </p>
                )}
                {chapter.choices.map(choice => (
                  <button
                    key={choice.id}
                    type="button"
                    data-career-project-choice={choice.id}
                    disabled={!canChoose}
                    className={`${action} w-full space-y-1 bg-white/5 py-2 text-xs enabled:hover:border-sky-400/50 enabled:hover:bg-sky-400/10 disabled:cursor-default`}
                    onClick={() => { focusCommitment.current = project.id; onChoose(project.id, choice.id); }}
                  >
                    <span className="block font-black">{choice.title}</span>
                    <span className="block text-white/70">{choice.description}</span>
                    <span className="block font-semibold text-white/90">{choice.goalLabel}</span>
                    <span className="block text-emerald-200">If met · {choice.successLabel}</span>
                    <span className="block text-amber-200">If missed · {choice.missLabel}</span>
                  </button>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
