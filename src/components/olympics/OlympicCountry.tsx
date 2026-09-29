import { FlagFromEmoji } from '@/components/FlagImg';
import { flagEmojiToIso } from '@/lib/flagUtils';

/* Round 660: how The Medal Games shows the team an athlete competed for.

   src/data/olympicsAthletes.ts stores a modern nation as its flag emoji and a
   team that has no modern flag as text: the Soviet Union, East Germany,
   Czechoslovakia, and any future West Germany, Yugoslavia or Unified Team. A
   text team is shown as its name and nothing else. It never goes near
   FLAG_CODES, because that table answers "which modern flag does this
   nationality use" for football pools and maps the Soviet Union to Russia's
   flag, so a Latynina card drew Russia and a Bubka card went from Ukraine to
   Russia. flagcdn is the only image host this site may use and it serves the
   flags of countries that exist today, so a label is the honest answer.

   A flag emoji draws its flag plus the name the Games use for that team
   (Great Britain, never England: Farah, Coe and Daley Thompson competed for
   Great Britain). scripts/simSportsFacts.mjs section 8 renders this component for
   every athlete and checks the flag it draws and the name beside it against
   the verified record, so the page and the record cannot drift apart. */
const TEAM_BY_ISO: Record<string, string> = {
  us: 'USA', ar: 'Argentina', jm: 'Jamaica', rs: 'Serbia',
  kr: 'South Korea', it: 'Italy', fr: 'France', gb: 'Great Britain',
  de: 'Germany', br: 'Brazil', es: 'Spain', nl: 'Netherlands',
  jp: 'Japan', ca: 'Canada', au: 'Australia', cn: 'China',
  ru: 'Russia', se: 'Sweden', no: 'Norway', cz: 'Czech Republic',
  ua: 'Ukraine', ro: 'Romania', fi: 'Finland', cu: 'Cuba',
  lc: 'Saint Lucia', ke: 'Kenya',
};

/** What the page shows for a stored country: the flag it draws (null for none) and the name beside it. */
export function olympicCountry(value: string): { iso: string | null; label: string } {
  const stored = (value ?? '').trim();
  const iso = flagEmojiToIso(stored);
  if (iso) return { iso, label: TEAM_BY_ISO[iso] ?? '' };
  return { iso: null, label: stored };
}

export function OlympicCountry({ country, size = 18 }: { country: string; size?: number }) {
  const { iso, label } = olympicCountry(country);
  return (
    <span className="inline-flex items-center gap-1">
      {iso && <FlagFromEmoji emoji={country} size={size} />}
      {label}
    </span>
  );
}
