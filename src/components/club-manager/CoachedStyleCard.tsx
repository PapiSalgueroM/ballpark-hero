import { useId, useState } from 'react';
import { cn } from '@/lib/utils';
import { INTENSITY_INFO } from '@/lib/clubManager';
import type { CareerState } from '@/lib/clubManager';
import {
  COACHED_STYLES, COACHED_STYLE_RULES, coachedCourseRefusal,
  readCoachedStyle, readCoachedStyleCourse,
} from '@/lib/clubManagerTraits';
import type { CoachedStyleId } from '@/lib/clubManagerTraits';

interface CoachedStyleCardProps {
  career: CareerState;
  saveState: 'saved' | 'blocked' | 'waiting';
  onStart: (playerId: string, style: CoachedStyleId) => boolean;
  onCancel: (playerId: string) => boolean;
}

export function CoachedStyleCard({ career, saveState, onStart, onCancel }: CoachedStyleCardProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [help, setHelp] = useState(true);
  const [playerId, setPlayerId] = useState('');
  const [target, setTarget] = useState<CoachedStyleId>('press');
  const [notice, setNotice] = useState<string | null>(null);
  const choices: CoachedStyleId[] = ['press', 'link', 'runner'];
  const away = career.loanedOut ?? [];
  const seen = new Set<string>();
  const pool = [...career.squad, ...away.map(row => row.player)]
    .filter(player => {
      if (seen.has(player.id)) return false;
      seen.add(player.id);
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  const picked = pool.find(player => player.id === playerId) ?? null;
  const course = picked ? readCoachedStyleCourse(picked) : null;
  const learned = picked ? readCoachedStyle(picked) : null;
  const context = {
    owned: !!picked && (career.squad.some(player => player.id === picked.id) || away.some(row => row.player.id === picked.id)),
    awayOnLoan: !!picked && away.some(row => row.player.id === picked.id),
    live: !!career.live,
  };
  const refusal = picked ? coachedCourseRefusal(picked, context, target) : null;
  const cancelRefusal = picked ? coachedCourseRefusal(picked, context) : null;
  const learning = pool.filter(player => readCoachedStyleCourse(player) !== null).length;
  const saveWords = saveState === 'saved' ? 'Saved' : saveState === 'blocked' ? 'Not saved' : 'Waiting for save';

  const start = () => {
    if (!picked || saveState !== 'saved') return;
    const why = coachedCourseRefusal(picked, context, target);
    if (why) { setNotice(why); return; }
    setNotice(onStart(picked.id, target) ? null : 'No course change was saved. Check the save notice above.');
  };
  const cancel = () => {
    if (!picked || saveState !== 'saved') return;
    const why = coachedCourseRefusal(picked, context);
    if (why) { setNotice(why); return; }
    setNotice(onCancel(picked.id) ? null : 'No course change was saved. Check the save notice above.');
  };

  return (
    <section className="rounded-xl border border-border bg-card" data-cm-coached-card>
      <button type="button" aria-expanded={open} aria-controls={id + '-panel'}
        className="flex min-h-11 w-full items-center justify-between gap-2 px-3 py-2 text-left"
        onClick={() => setOpen(value => !value)}>
        <span className="text-xs font-bold">Coached style</span>
        <span className="text-xs text-muted-foreground">{learning} learning · {open ? 'Close' : 'Open'}</span>
      </button>
      {open && <div id={id + '-panel'} className="space-y-3 border-t border-border p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">Learn a style in this career, not a real-world player trait.</p>
          <button type="button" aria-label="Coached style rules" aria-expanded={help} aria-controls={id + '-rules'}
            className="min-h-11 min-w-11 shrink-0 rounded-lg border border-border font-bold"
            onClick={() => setHelp(value => !value)}>?</button>
        </div>
        {help && <div id={id + '-rules'} className="space-y-2 rounded-lg bg-muted/30 p-3 text-xs" aria-label="Coached style instructions">
          <p>Pick an owned outfield player and one style. It takes {COACHED_STYLE_RULES.weeks} charged weeks. Reading this screen and playing a match night do not count as another week. Time away on loan pauses it.</p>
          <p>Only one style is learned at a time. A replacement keeps the old style until the new course finishes. Cancel loses unfinished progress. Position retraining must finish or be cancelled first.</p>
          <p>The right instructions, duty, position and condition decide whether a style is used. Existing tactical costs still apply. Matching training can help development, but it cannot raise a ceiling or promise a rating point. There is no badge price premium or guaranteed win.</p>
          <p>Example: a Break runner in a natural or family position needs direct tempo and a target-man or poacher duty. Switch to patient tempo and that style is not used by the plan.</p>
        </div>}
        <label className="block text-xs font-bold" htmlFor={id + '-player'}>Player for coached style</label>
        <select id={id + '-player'} value={playerId} className="min-h-11 w-full rounded-lg border border-border bg-secondary px-2 text-sm"
          onChange={event => { setPlayerId(event.target.value); setNotice(null); }}>
          <option value="">Pick a player</option>
          {pool.map(player => <option key={player.id} value={player.id}>{player.position} {player.name}{away.some(row => row.player.id === player.id) ? ' (away on loan)' : player.onLoan ? ' (on loan)' : ''}</option>)}
        </select>
        {picked && <div className="space-y-2" data-cm-coached-player={picked.id}>
          <p className="break-words text-sm font-bold">{picked.name}</p>
          <p className="text-xs" data-cm-coached-save={saveState}>{saveWords}</p>
          <p className="text-xs" data-cm-coached-learned={learned?.id ?? ''}>
            {learned ? COACHED_STYLES[learned.id].label : 'No coached style yet'}
            {learned && saveState === 'saved' ? '. Learned in this career.' : ''}
          </p>
          {course && <div className="space-y-2 rounded-lg border border-border p-2" data-cm-coached-course={course.to}>
            <p className="text-xs">Learning {COACHED_STYLES[course.to].label}: {course.weeksLeft} of {course.weeksTotal} weeks left.</p>
            {context.awayOnLoan && <p className="text-xs text-muted-foreground">Paused while away on loan.</p>}
            <button type="button" className="min-h-11 w-full rounded-lg border border-border px-2 text-xs font-bold"
              disabled={saveState !== 'saved' || !!cancelRefusal} onClick={cancel}>Cancel course</button>
            {cancelRefusal && <p className="text-xs text-muted-foreground">{cancelRefusal}</p>}
          </div>}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" aria-label="Coached style choices">
            {choices.map(style => <button key={style} type="button" aria-pressed={target === style}
              className={cn('min-h-11 rounded-lg border px-2 py-2 text-left', target === style ? 'border-primary bg-primary/10' : 'border-border')}
              onClick={() => { setTarget(style); setNotice(null); }}>
              <span className="block text-xs font-bold">{COACHED_STYLES[style].label}</span>
              <span className="mt-1 block text-xs text-muted-foreground">{COACHED_STYLES[style].condition}</span>
              <span className="mt-1 block text-xs text-muted-foreground">Training: {INTENSITY_INFO[COACHED_STYLES[style].training].label}</span>
            </button>)}
          </div>
          {refusal && <p className="text-xs text-muted-foreground" data-cm-coached-refusal>{refusal}</p>}
          <button type="button" className="min-h-11 w-full rounded-lg border border-primary bg-primary/10 px-2 text-sm font-bold"
            disabled={saveState !== 'saved' || !!refusal} onClick={start}>Start {COACHED_STYLE_RULES.weeks}-week course</button>
        </div>}
        {notice && <p role="status" className="text-xs text-destructive">{notice}</p>}
      </div>}
    </section>
  );
}

