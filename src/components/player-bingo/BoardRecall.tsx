import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { recallQuestions, type BingoTile } from '@/lib/playerBingoRecall';

export function BoardRecall({ tiles, locked, answers, onAnswer }: {
  tiles: BingoTile[]; locked: Record<string, string>; answers: string[]; onAnswer: (index: number, answer: string) => void;
}) {
  const questions = recallQuestions(tiles, locked);
  if (!questions.length) return null;
  const index = answers.length;
  const question = questions[index];
  const correct = answers.filter((answer, i) => answer === questions[i]?.player).length;
  return <Dialog>
    <DialogTrigger asChild><button type="button" className="my-2 min-h-11 rounded-lg border border-border px-4 py-2 text-sm font-semibold">{question ? (index ? 'Continue board recall' : 'Recall your board') : `Board recall ${correct}/${questions.length}`}</button></DialogTrigger>
    <DialogContent className="max-h-[85dvh] overflow-y-auto">
      <DialogTitle>Recall your board</DialogTitle>
      <DialogDescription>{question ? `Who did you place on this square? Question ${index + 1} of ${questions.length}.` : `You remembered ${correct} of ${questions.length} placements.`}</DialogDescription>
      {question && <div key={question.id} className="space-y-3">
        <h3 className="font-semibold">{question.label}</h3>
        <div className="grid gap-2">{question.options.map(name => <button key={name} type="button" className="min-h-11 rounded-lg border border-border px-3 py-2 text-left hover:bg-secondary" onClick={() => onAnswer(index, name)}>{name}</button>)}</div>
      </div>}
      {index > 0 && <ul className="space-y-2 text-sm" aria-live="polite">{answers.map((answer, i) => <li key={questions[i].id}>
        <span className="font-semibold">{questions[i].label}</span>{' · '}{answer === questions[i].player ? `Correct, ${answer}` : `You picked ${answer}. Your placement was ${questions[i].player}.`}
      </li>)}</ul>}
    </DialogContent>
  </Dialog>;
}
