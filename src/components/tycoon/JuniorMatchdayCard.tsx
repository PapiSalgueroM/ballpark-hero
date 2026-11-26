import { juniorDayOffer, type TycoonState } from '@/lib/stadiumTycoon';

export default function JuniorMatchdayCard({ state, onBook, failedMatch }: {
  state: TycoonState; onBook: (ground: number, match: number, seats: number) => void; failedMatch: number | null;
}) {
  const offer = juniorDayOffer(state);
  if (!offer) return null;
  return <details className="mb-3 rounded-xl border border-border bg-card px-3 text-xs">
    <summary className="min-h-11 cursor-pointer py-3 font-bold">Junior matchday{state.juniorDay ? ' booked' : ''}</summary>
    <p className="font-bold">Home to {offer.opponent} · Matchday {offer.day}</p>
    <p className="py-2">{offer.seats} junior guests get in free and {offer.newFans} become supporters after the match. They count for concessions and crowd targets. Season pass holders keep their places.</p>
    <p className="pb-2">{offer.displaced} paying walk-ups would lose a seat at today's demand.</p>
    {state.juniorDay ? <p className="pb-3">${offer.seats} hosting paid.</p> : <>
      {failedMatch === offer.match && <p role="alert" className="pb-2 text-destructive">Could not save the junior booking. Try again.</p>}
      <button type="button" className="mb-3 min-h-11 rounded-lg border border-border bg-background px-3 py-2 font-semibold disabled:opacity-60"
        disabled={state.money < offer.seats} onClick={() => onBook(state.rep, offer.match, offer.seats)}>Host {offer.seats} juniors for ${offer.seats}</button>
    </>}
  </details>;
}
