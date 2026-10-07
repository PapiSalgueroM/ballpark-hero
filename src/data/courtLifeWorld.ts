import type { CourtAttributes, CourtTeamSpec } from '@/lib/courtLife';

export const COURT_ATTRIBUTE_KEYS = ['finishing', 'shooting', 'passing', 'defense', 'conditioning'] as const;
export type CourtAttribute = typeof COURT_ATTRIBUTE_KEYS[number];
export interface CourtArchetype { id: string; name: string; description: string; attrs: CourtAttributes }
export interface CourtLifeChange {
  condition?: number; credits?: number; trust?: number; attrs?: Partial<CourtAttributes>;
}
export interface CourtLifeDecision {
  id: string; title: string; situation: string;
  options: Array<{ id: string; label: string; explanation: string; change: CourtLifeChange }>;
}
export interface CourtLifeWorld { crews: CourtTeamSpec[]; archetypes: CourtArchetype[]; decisions: CourtLifeDecision[] }

export const COURT_ARCHETYPES: CourtArchetype[] = [
  { id: 'finisher', name: 'Finisher', description: 'Get inside and finish through traffic.', attrs: { finishing: 78, shooting: 54, passing: 54, defense: 54, conditioning: 60 } },
  { id: 'shooter', name: 'Shooter', description: 'Find space and make the defense come out.', attrs: { finishing: 54, shooting: 78, passing: 54, defense: 54, conditioning: 60 } },
  { id: 'connector', name: 'Connector', description: 'Move the ball and bring teammates into the game.', attrs: { finishing: 54, shooting: 54, passing: 78, defense: 60, conditioning: 54 } },
  { id: 'stopper', name: 'Stopper', description: 'Win the ball and protect the basket.', attrs: { finishing: 54, shooting: 54, passing: 54, defense: 78, conditioning: 60 } },
  { id: 'runner', name: 'Runner', description: 'Keep moving when everyone else needs a break.', attrs: { finishing: 58, shooting: 58, passing: 58, defense: 58, conditioning: 68 } },
];

// These crews and players belong only to this fictional neighborhood league.
const CREWS: CourtTeamSpec[] = [
  { id: 'copper-owls', name: 'Copper Owls', color: '#e99a63', chemistry: 55, players: [
    { id: 'owls-1', name: 'Ren Alder', attrs: { finishing: 66, shooting: 54, passing: 64, defense: 56, conditioning: 60 } },
    { id: 'owls-2', name: 'Nia Fen', attrs: { finishing: 52, shooting: 74, passing: 62, defense: 54, conditioning: 58 } },
    { id: 'owls-3', name: 'Sol Wren', attrs: { finishing: 70, shooting: 46, passing: 54, defense: 72, conditioning: 58 } },
  ] },
  { id: 'juniper-comets', name: 'Juniper Comets', color: '#a6d987', chemistry: 55, players: [
    { id: 'comets-1', name: 'Mika Reed', attrs: { finishing: 64, shooting: 58, passing: 70, defense: 54, conditioning: 54 } },
    { id: 'comets-2', name: 'Tavi Moss', attrs: { finishing: 58, shooting: 68, passing: 54, defense: 56, conditioning: 64 } },
    { id: 'comets-3', name: 'Ari Vale', attrs: { finishing: 66, shooting: 48, passing: 58, defense: 66, conditioning: 62 } },
  ] },
  { id: 'slate-foxes', name: 'Slate Foxes', color: '#b8a6f2', chemistry: 55, players: [
    { id: 'foxes-1', name: 'Ivo Briar', attrs: { finishing: 58, shooting: 66, passing: 58, defense: 64, conditioning: 54 } },
    { id: 'foxes-2', name: 'Leni Grove', attrs: { finishing: 54, shooting: 62, passing: 70, defense: 58, conditioning: 56 } },
    { id: 'foxes-3', name: 'Koa Finch', attrs: { finishing: 70, shooting: 44, passing: 52, defense: 70, conditioning: 64 } },
  ] },
  { id: 'lumen-waves', name: 'Lumen Waves', color: '#72cfe1', chemistry: 55, players: [
    { id: 'waves-1', name: 'Ena Rook', attrs: { finishing: 58, shooting: 70, passing: 56, defense: 54, conditioning: 62 } },
    { id: 'waves-2', name: 'Jori Ash', attrs: { finishing: 62, shooting: 56, passing: 72, defense: 52, conditioning: 58 } },
    { id: 'waves-3', name: 'Zev Linden', attrs: { finishing: 66, shooting: 48, passing: 52, defense: 68, conditioning: 66 } },
  ] },
];

const DECISIONS: CourtLifeDecision[] = [
  { id: 'crew-session', title: 'Stay for one more run?', situation: 'Your new crew is putting in extra time after the court clears.', options: [
    { id: 'stay', label: 'Stay and work together', explanation: 'Build trust and passing, at the cost of rest.', change: { condition: -10, trust: 8, attrs: { passing: 1 } } },
    { id: 'rest', label: 'Head home early', explanation: 'Recover for the fixture, but miss time with the crew.', change: { condition: 12, trust: -3 } },
  ] },
  { id: 'shift-offer', title: 'A shift opens up', situation: 'The community center needs someone to help close tonight.', options: [
    { id: 'work', label: 'Take the shift', explanation: 'Earn credits for training and give up some energy.', change: { credits: 18, condition: -12 } },
    { id: 'decline', label: 'Keep the evening free', explanation: 'Rest and check in with the crew. No extra pay.', change: { condition: 8, trust: 2 } },
  ] },
  { id: 'late-night', title: 'Running on empty', situation: 'You have been feeling the last few days in your legs.', options: [
    { id: 'recover', label: 'Make sleep the priority', explanation: 'Recover properly and skip the optional crew meeting.', change: { condition: 20, trust: -4 } },
    { id: 'show-up', label: 'Show up for the crew', explanation: 'Keep your commitment, but play through the tired legs.', change: { condition: -5, trust: 7 } },
  ] },
  { id: 'equipment', title: 'A shared training session', situation: 'The local gym has space for your crew to book a shooting session.', options: [
    { id: 'book', label: 'Cover the booking', explanation: 'Pay for focused shooting work and time together.', change: { credits: -10, condition: -6, trust: 4, attrs: { shooting: 2 } } },
    { id: 'outside', label: 'Meet at the outdoor court', explanation: 'Keep your credits and spend time passing instead.', change: { condition: -4, trust: 3, attrs: { passing: 1 } } },
  ] },
  { id: 'neighbors', title: 'Someone needs a hand', situation: 'A neighbor is moving boxes on the same evening you planned to recover.', options: [
    { id: 'help', label: 'Help with the move', explanation: 'Earn a little and work on conditioning, but lose rest.', change: { credits: 8, condition: -10, attrs: { conditioning: 1 } } },
    { id: 'rest', label: 'Keep the recovery evening', explanation: 'Protect your energy and pass on the extra credits.', change: { condition: 12 } },
  ] },
  { id: 'responsibility', title: 'Lead the walkthrough?', situation: 'The crew needs someone to organize the defensive walkthrough before the next game.', options: [
    { id: 'lead', label: 'Take responsibility', explanation: 'Earn trust and defensive experience. It takes energy.', change: { condition: -8, trust: 8, attrs: { defense: 1 } } },
    { id: 'listen', label: 'Help with the setup', explanation: 'Contribute without taking on the full session.', change: { condition: -2, trust: 3 } },
  ] },
];

export function createCourtLifeWorld(): CourtLifeWorld {
  return JSON.parse(JSON.stringify({ crews: CREWS, archetypes: COURT_ARCHETYPES, decisions: DECISIONS }));
}
