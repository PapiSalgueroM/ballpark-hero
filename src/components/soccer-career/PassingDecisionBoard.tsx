import { useRef, useState } from 'react';

const situations = [
  {
    title: 'Find the open side',
    text: 'A defender blocks the pass to Centre. Left is unmarked and has a clear lane.',
    options: ['Force the centre pass', 'Pass left', 'Carry straight at the defender'],
    correct: 1,
    reason: 'Left is open. The central lane runs through the defender.',
  },
  {
    title: 'Use the return lane',
    text: 'You pass to Right, then move into clear space ahead. Right can see you; your old spot is now marked. What should Right do?',
    options: ['Pass into the new space', 'Pass back to the old spot', 'Dribble toward the marker'],
    correct: 0,
    reason: 'Return the ball into the open space, not the spot the defender has covered.',
  },
  {
    title: 'Support under pressure',
    text: 'You receive with your back to the attack. A defender is tight behind you. Support is open behind the ball.',
    options: ['Turn into the defender', 'Hold the ball for the press', 'Set it back to Support'],
    correct: 2,
    reason: 'The open support pass keeps the ball away from the defender at your back.',
  },
  {
    title: 'Offer a useful angle',
    text: 'Wide is pressed at the line. A defender blocks the straight pass to you. The diagonal space to your left is open.',
    options: ['Stay behind the defender', 'Move into the open diagonal', 'Run closer along the blocked lane'],
    correct: 1,
    reason: 'A new angle gives Wide a passing lane; moving along the blocked line does not.',
  },
  {
    title: 'Choose the keeper outlet',
    text: 'The keeper has the ball. Centre is being pressed. Wide is unmarked with a clear short lane.',
    options: ['Play into the marked centre', 'Wait for the press to arrive', 'Roll to Wide'],
    correct: 2,
    reason: 'The wide outlet has a clear lane and time to receive.',
  },
];

function Rules() {
  return <div className="rounded-xl border border-border bg-primary/5 p-3 text-xs leading-relaxed space-y-2">
    <p>Read five fictional passing situations. The passing options are onside. Pick the open lane or useful support move. There is no timer. Your first answer in each situation is final.</p>
    <p>Each correct read earns 20 points. Three correct reads score 60; four score 80.</p>
    <p>Worked example: a defender blocks one teammate, while another has a clear passing lane. Choose the clear lane to keep the ball away from the defender.</p>
    <p>Banking 50+ earns +1 to the listed skill next season; 80+ earns +2. Current attributes do not rise here. Only one session can be banked each season. Further runs are free practice.</p>
  </div>;
}

export default function PassingDecisionBoard({ onComplete, onBack }: {
  onComplete: (score: number) => void;
  onBack: () => void;
}) {
  const [index, setIndex] = useState(-1);
  const [answers, setAnswers] = useState<number[]>([]);
  const [help, setHelp] = useState(false);
  const current = useRef(-1);
  const firstAnswers = useRef<number[]>([]);
  const finished = useRef(false);
  const score = answers.reduce((sum, answer, i) => sum + (answer === situations[i].correct ? 20 : 0), 0);
  const situation = situations[index];
  const answered = answers[index] !== undefined;
  const answer = (at: number, option: number) => {
    if (at !== current.current || finished.current || firstAnswers.current[at] !== undefined) return;
    const next = [...firstAnswers.current]; next[at] = option;
    firstAnswers.current = next; setAnswers(next);
  };
  const advance = (at: number) => {
    if (at !== current.current || finished.current || firstAnswers.current[at] === undefined) return;
    if (at === situations.length - 1) {
      finished.current = true;
      const points = firstAnswers.current.reduce((sum, pick, i) => sum + (pick === situations[i].correct ? 20 : 0), 0);
      onComplete(points);
    } else {
      current.current = at + 1; setIndex(at + 1);
    }
  };
  const control = 'min-h-11 rounded-lg px-3 py-2 text-xs font-bold';

  return <section className="p-4 space-y-3" aria-label="Read the pass">
    <div className="flex items-center justify-between gap-2">
      <button type="button" className={control + ' border border-border'} onClick={onBack}>Back to drills</button>
      <button type="button" aria-label="Reading session rules" aria-expanded={index < 0 || help}
        className={control + ' min-w-11 bg-muted/30'} onClick={() => setHelp(value => !value)}>?</button>
    </div>
    <h3 className="text-base font-black">Read the pass</h3>
    {(index < 0 || help) && <Rules />}
    {index < 0 ? <button type="button" className={control + ' w-full bg-emerald-600 text-black'}
      onClick={() => { if (current.current !== -1) return; current.current = 0; setHelp(false); setIndex(0); }}>Start reading session</button>
      : <>
        <div className="flex justify-between gap-2 text-xs font-bold">
          <span>Decision {index + 1} of 5</span>
          <span><output aria-label="Reading session score">{score}</output>/100 points</span>
        </div>
        <h4 className="text-sm font-black">{situation.title}</h4>
        <p className="text-xs leading-relaxed">{situation.text}</p>
        <div role="group" aria-label={'Decision ' + (index + 1) + ' of 5: ' + situation.title} className="space-y-2">
          {situation.options.map((option, i) => <button key={option} type="button" disabled={answered}
            aria-pressed={answered && answers[index] === i} onClick={() => answer(index, i)}
            className={control + ' w-full border text-left disabled:cursor-default ' + (answered && answers[index] === i ? 'border-primary bg-primary/10' : 'border-border bg-muted/10')}>
            {option}
          </button>)}
        </div>
        {answered && <p role="status" aria-label="Reading feedback" className="rounded-xl bg-muted/20 p-3 text-xs leading-relaxed">
          <strong>{answers[index] === situation.correct ? 'Good read. ' : 'Another option was safer. '}</strong>{situation.reason}
        </p>}
        <button type="button" disabled={!answered} className={control + ' w-full bg-emerald-600 text-black disabled:opacity-40'}
          onClick={() => advance(index)}>{index === 4 ? 'See session score' : 'Next decision'}</button>
      </>}
  </section>;
}
