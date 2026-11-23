import groups from "./soccerGridNamesakes.json" with { type: "json" };

export type NamesakePosition = 'gk' | 'def' | 'mid' | 'fwd';

type Evidence = {
  club?: string;
  nationality?: string;
  position?: NamesakePosition;
};

function fold(text: string) {
  return text.normalize('NFD').replace(/\p{M}/gu, '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function matches(name: string, entry: { name: string; aliases: string[] }) {
  return [entry.name, ...entry.aliases].some(value => fold(value) === name);
}

export function soccerNamesakeGroup(name: string) {
  const key = fold(name);
  return groups.find(group => matches(key, group) || group.people.some(person => matches(key, person)));
}

export function resolveSoccerNamesakeRecord(name: string, evidence: Evidence): string | null {
  const group = soccerNamesakeGroup(name);
  if (!group) return null;
  const key = fold(name);
  const explicit = group.people.find(person => matches(key, person));
  const clubs = evidence.club?.split(' / ').map(fold);
  const candidates = group.people.filter(person =>
    (explicit ? person === explicit : Boolean(clubs?.length))
    && (!clubs || person.clubs.some(club => clubs.includes(fold(club))))
    && (!evidence.nationality || fold(evidence.nationality) === fold(person.nationality))
    && (!evidence.position || evidence.position === person.position || evidence.position === person.uncertainPosition),
  );
  return candidates.length === 1 ? candidates[0].name : null;
}
