import { flagEmojiToIso, splitFlagSegments } from '@/lib/flagUtils';

const FLAG_CODES: Record<string, string> = {
  "England": "gb-eng", "Scotland": "gb-sct", "Wales": "gb-wls",
  "Spain": "es", "France": "fr", "Germany": "de", "Brazil": "br",
  "Argentina": "ar", "Portugal": "pt", "Italy": "it", "Netherlands": "nl",
  "USA": "us", "United States": "us", "Mexico": "mx", "Japan": "jp",
  "South Korea": "kr", "Nigeria": "ng", "Senegal": "sn", "Ghana": "gh",
  "Morocco": "ma", "Colombia": "co", "Uruguay": "uy", "Belgium": "be",
  "Croatia": "hr", "Denmark": "dk", "Sweden": "se", "Norway": "no",
  "Switzerland": "ch", "Austria": "at", "Ireland": "ie", "Poland": "pl",
  "Czech Republic": "cz", "Serbia": "rs", "Romania": "ro", "Greece": "gr",
  "Turkey": "tr", "Russia": "ru", "Ukraine": "ua", "Australia": "au",
  "New Zealand": "nz", "Canada": "ca", "Jamaica": "jm", "Costa Rica": "cr",
  "Ecuador": "ec", "Peru": "pe", "Chile": "cl", "Cameroon": "cm",
  "Ivory Coast": "ci", "Egypt": "eg", "Algeria": "dz", "Tunisia": "tn",
  "Mali": "ml", "Guinea": "gn", "Gabon": "ga", "Paraguay": "py",
  "Bolivia": "bo", "Iran": "ir", "Saudi Arabia": "sa", "China": "cn",
  "India": "in", "South Africa": "za", "DR Congo": "cd", "Honduras": "hn",
  "Panama": "pa", "Venezuela": "ve", "Bosnia & Herzegovina": "ba",
  "Kosovo": "xk", "Uzbekistan": "uz", "Cape Verde": "cv", "Curaçao": "cw",
  "Iraq": "iq", "Cuba": "cu", "Iceland": "is", "Luxembourg": "lu",
  "Hungary": "hu", "Slovakia": "sk", "Bulgaria": "bg", "Finland": "fi",
  "Montenegro": "me", "North Macedonia": "mk", "Albania": "al",
  "Guinea-Bissau": "gw", "Slovenia": "si", "Georgia": "ge",
  "Bosnia": "ba", "West Germany": "de", "Czechoslovakia": "cz",
  "Soviet Union": "ru", "Yugoslavia": "rs",
  // Exact nationality strings as they appear in player_market_values (Türkiye,
  // Cote d'Ivoire, Korea, South, Bosnia-Herzegovina, Curacao) plus common
  // footballing nations that were missing - all render real flags now instead
  // of falling back to plain text.
  "Türkiye": "tr", "Cote d'Ivoire": "ci", "Bosnia-Herzegovina": "ba",
  "Korea, South": "kr", "Curacao": "cw", "Israel": "il", "Belarus": "by",
  "Vietnam": "vn", "Armenia": "am", "El Salvador": "sv", "Northern Ireland": "gb-nir",
  "United Arab Emirates": "ae", "Angola": "ao", "Lithuania": "lt", "The Gambia": "gm",
  "Suriname": "sr", "Burkina Faso": "bf", "Guatemala": "gt", "Benin": "bj",
  "Cyprus": "cy", "Oman": "om", "Haiti": "ht", "Indonesia": "id", "Kazakhstan": "kz",
  "Togo": "tg", "Comoros": "km", "Guadeloupe": "gp", "Faroe Islands": "fo",
  "Zambia": "zm", "Latvia": "lv", "Fiji": "fj", "Libya": "ly", "Malta": "mt",
  "Moldova": "md", "Azerbaijan": "az", "Tajikistan": "tj", "Sierra Leone": "sl",
  "Congo": "cg", "Lebanon": "lb", "Kenya": "ke", "Liberia": "lr", "Zimbabwe": "zw",
  "Qatar": "qa", "Estonia": "ee",
  // July 2026 site-wide flag-image sweep: names used by pools that previously
  // rendered emoji (dealPlayers, puckDetective labels, Olympics athletes).
  "Czechia": "cz", "Gambia": "gm", "Mozambique": "mz", "Equatorial Guinea": "gq",
  "Korea Republic": "kr", "Republic of Ireland": "ie", "Great Britain": "gb",
  "United Kingdom": "gb", "Bosnia and Herzegovina": "ba", "Saint Lucia": "lc",
  "Dominican Republic": "do", "Trinidad and Tobago": "tt", "Philippines": "ph",
  "Thailand": "th", "Jordan": "jo", "Bahrain": "bh", "Kuwait": "kw",
  "Uganda": "ug", "Tanzania": "tz", "Ethiopia": "et", "Madagascar": "mg",
  "Andorra": "ad", "San Marino": "sm", "Liechtenstein": "li",
  "North Korea": "kp", "Korea, North": "kp",
};

export function FlagImg({ name, size = 20, showLabel = false }: { name: string; size?: number; showLabel?: boolean }) {
  const code = FLAG_CODES[name];
  if (!code) return <span className="inline-block align-middle text-xs">{name}</span>;
  const h = Math.round(size * 0.75);
  return (
    <span className="inline-flex items-center gap-1 align-middle">
      <img
        src={`https://flagcdn.com/${size * 2}x${h * 2}/${code}.png`}
        alt={name}
        className="inline-block align-middle"
        style={{ width: size, height: h }}
        loading="lazy"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
      {showLabel && <span className="text-inherit">{name}</span>}
    </span>
  );
}

/**
 * Renders a real flag image straight from a flag EMOJI: FlagFromEmoji turns
 * the stored pair/tag sequence into flagcdn's iso code (France pair -> fr,
 * England tag sequence -> gb-eng). Windows renders flag emojis as bare
 * letter pairs, so anywhere the data layer only has the emoji string, render
 * it through this instead of printing the emoji. Non-flag strings fall back
 * to a FLAG_CODES name lookup, then to the original text (globes, glyphs and
 * plain words render unchanged).
 */
export function FlagFromEmoji({ emoji, size = 20 }: { emoji: string; size?: number }) {
  const trimmed = (emoji ?? '').trim();
  const iso = flagEmojiToIso(trimmed);
  if (!iso) {
    if (FLAG_CODES[trimmed]) return <FlagImg name={trimmed} size={size} />;
    return <span className="inline-block align-middle">{emoji}</span>;
  }
  const h = Math.round(size * 0.75);
  return (
    <img
      src={`https://flagcdn.com/${size * 2}x${h * 2}/${iso}.png`}
      alt={trimmed}
      className="inline-block align-middle"
      style={{ width: size, height: h }}
      loading="lazy"
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = 'none';
      }}
    />
  );
}

/**
 * Renders a plain string, swapping every embedded flag emoji for a real
 * flagcdn image ("[AR flag] Prime Messi", "[EU flag] Named UEFA Player of
 * the Year!"). Strings without flag emojis pass through untouched, so this
 * is safe to wrap around any user-visible text that MIGHT carry a flag.
 */
export function TextWithFlags({ text, size = 16 }: { text: string; size?: number }) {
  const value = text ?? '';
  const segments = splitFlagSegments(value);
  if (!segments.some(seg => 'flag' in seg)) return <>{value}</>;
  return (
    <>
      {segments.map((seg, i) =>
        'flag' in seg ? (
          <FlagFromEmoji key={i} emoji={seg.flag} size={size} />
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </>
  );
}
