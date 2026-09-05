import { flagEmojiToIso, splitFlagSegments } from '@/lib/flagUtils';

/* Round 194: exported so bakeNationalities.mjs and simNationalities can
   fail closed on any nationality string that has no flag, instead of the
   market quietly rendering text where a flag should be. */
export const FLAG_CODES: Record<string, string> = {
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
  /* Round 124: the other ten OFC full members, so an Oceania qualifying group
     shows real flags instead of bare country names. Tahiti plays under the
     French Polynesia flag (pf). */
  "New Caledonia": "nc", "Tahiti": "pf", "Solomon Islands": "sb",
  "Papua New Guinea": "pg", "Vanuatu": "vu", "Samoa": "ws",
  "American Samoa": "as", "Cook Islands": "ck", "Tonga": "to",
  "Syria": "sy", "Palestine": "ps",
  /* Round 194: nationalities surfaced by the player_market_values pass
     that had no flag yet. Codes are ISO 3166-1 alpha-2 as flagcdn serves
     them (Martinique mq, Guadeloupe gp and Saint-Martin mf are the French
     overseas codes flagcdn carries; football federations list players
     under them). */
  "Guyana": "gy", "Central African Republic": "cf", "Gibraltar": "gi",
  "Barbados": "bb", "St. Kitts & Nevis": "kn", "Grenada": "gd",
  "Seychelles": "sc", "Martinique": "mq", "Chad": "td", "Burundi": "bi",
  "Yemen": "ye", "Mauritania": "mr", "Saint-Martin": "mf",
  /* Round 453: the two nationalities the golf and UFC pools print that had no
     flag yet. ISO 3166-1 alpha-2 codes, both served by flagcdn (probed
     2026-09-05, w40 returns 200 for je and kg). */
  "Jersey": "je", "Kyrgyzstan": "kg",
  /* Round 453, found by simNationalityFlags: Soccer Career's club table names
     Al Ain's country "UAE", which had no entry here, so an offer from Al Ain
     showed the letters where every other club shows a flag. Monaco and
     Malaysia are the other two club countries in that table with no flag. */
  "UAE": "ae", "Monaco": "mc", "Malaysia": "my",
};

/* ─── Round 106: flags that actually appear ───

   Two separate bugs meant most flags on the site rendered as nothing at all,
   which is why the Club Manager nation picker showed bare country names.

   1. THE SIZE. The old code asked flagcdn for `${size*2}x${h*2}`, where h was
      round(size * 0.75). flagcdn only serves a fixed set of 4:3 pairs
      (20x15, 28x21, 32x24, 40x30, 60x45, 80x60). At size 20 the maths landed
      on 40x30 and worked, which is why this was never spotted, but at size 34
      it asked for 68x52 and got a 404, and at size 14 it asked for 28x22 and
      got a 404. Every flag at any size the maths did not happen to hit was a
      broken image. This now asks by WIDTH only (w40, w80, w160), which
      flagcdn always honours, and lets CSS do the rest.

   2. ENGLAND. flagcdn serves gb-eng as a 122 byte blank. Scotland, Wales and
      Northern Ireland are all fine; England, the single most important flag
      in a football game, is empty. So England is drawn inline instead, and
      any other flag that turns out to be blank can join it in INLINE_FLAGS
      without touching anything else.

   Anything that still fails falls back to the flag emoji, and only then to
   text, so a flag slot is never just empty space. */

/** flagcdn honours these widths; anything else is a coin flip. */
const CDN_WIDTHS = [20, 40, 80, 160, 320];

/** Drawn here because the CDN copy is blank or wrong. */
const INLINE_FLAGS: Record<string, (w: number, h: number) => JSX.Element> = {
  'gb-eng': (w, h) => (
    <svg width={w} height={h} viewBox="0 0 60 36" aria-hidden="true" style={{ display: 'block', borderRadius: 2 }}>
      <rect width="60" height="36" fill="#fff" />
      <rect x="25" width="10" height="36" fill="#CE1124" />
      <rect y="13" width="60" height="10" fill="#CE1124" />
    </svg>
  ),
};

/** The flag emoji for an iso code, used as the fallback if the image fails. */
function emojiFor(code: string): string {
  const base = code.split('-')[0];
  if (base.length !== 2) return '';
  return String.fromCodePoint(...[...base.toUpperCase()].map(c => 0x1f1e6 + c.charCodeAt(0) - 65));
}

export function FlagImg({ name, size = 20, showLabel = false }: { name: string; size?: number; showLabel?: boolean }) {
  const code = FLAG_CODES[name];
  /* Round 453: a nationality with no flag renders as its name alone, never a
     wrong flag and never a placeholder. When the caller asked for the label
     it keeps the caller's text size instead of shrinking to text-xs. */
  if (!code) return <span className={showLabel ? 'inline-block align-middle' : 'inline-block align-middle text-xs'}>{name}</span>;
  const h = Math.round(size * 0.75);
  const inline = INLINE_FLAGS[code];
  const emoji = emojiFor(code);
  // Ask for the smallest supported width that still covers a retina screen.
  const want = size * 2;
  const cdnWidth = CDN_WIDTHS.find(w => w >= want) ?? CDN_WIDTHS[CDN_WIDTHS.length - 1];
  return (
    <span className="inline-flex items-center gap-1 align-middle shrink-0">
      {inline ? inline(size, h) : (
        <img
          src={`https://flagcdn.com/w${cdnWidth}/${code}.png`}
          alt={name}
          className="inline-block align-middle object-cover"
          style={{ width: size, height: h, borderRadius: 2 }}
          loading="lazy"
          onError={(e) => {
            // Never leave a hole: swap in the emoji, and if the platform has
            // no flag font (Windows) that still reads as the country code.
            const img = e.target as HTMLImageElement;
            img.style.display = 'none';
            const span = img.nextElementSibling as HTMLElement | null;
            if (span) span.style.display = 'inline';
          }}
        />
      )}
      {!inline && emoji && (
        <span style={{ display: 'none', fontSize: size * 0.9, lineHeight: 1 }} aria-hidden="true">{emoji}</span>
      )}
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
  /* Round 444: this asked flagcdn for "{size*2}x{h*2}", which is bug 1 in the
     note above FlagImg living on in the function right below it. flagcdn only
     serves a fixed set of pairs, so the URL was valid only when the arithmetic
     happened to land on one. Probed on 2026-09-04: size 16 and 20 ask for
     32x24 and 40x30 and both return 200, but size 14 asks for 28x22 and size
     18 asks for 36x28 and both return 404, and onError hides the image, so
     those two sizes rendered nothing at all. That is every flag in Clue
     Auction, Puck Detective and Soccer Career's money line (14) and in
     Olympics, Player Bingo and Squad Deal (18). It asks by WIDTH now, the same
     way FlagImg has since Round 106, which flagcdn always honours.

     England goes through the inline drawing so the two components draw the
     same England. Note for whoever reads Round 106's bug 2 next: flagcdn's
     gb-eng is NOT blank any more. w40 came back 122 bytes on 2026-09-04 as it
     did then, but decoding it gives 240 red pixels of 960, a real St George
     cross. INLINE_FLAGS is kept here for consistency with FlagImg, not because
     the CDN file is empty. */
  const inline = INLINE_FLAGS[iso];
  if (inline) {
    return <span className="inline-flex align-middle shrink-0">{inline(size, h)}</span>;
  }
  const cdnWidth = CDN_WIDTHS.find(w => w >= size * 2) ?? CDN_WIDTHS[CDN_WIDTHS.length - 1];
  return (
    <img
      src={`https://flagcdn.com/w${cdnWidth}/${iso}.png`}
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
