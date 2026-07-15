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
  // Additional nationality strings that appear in the career_players table
  // (Transfermarkt-style). Career Ladder renders FlagImg for the nationality
  // hint and result card, so any unmapped value would fall back to plain text
  // (which on Windows is what the old emoji flags degraded to as well).
  "Republic of Ireland": "ie", "Korea Republic": "kr", "Korea, Republic of": "kr",
  "United States of America": "us", "Bosnia and Herzegovina": "ba",
  "DR Congo Republic": "cd", "Congo DR": "cd",
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
