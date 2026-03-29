const FLAG_CODES: Record<string, string> = {
  "England": "gb-eng", "Scotland": "gb-sct", "Wales": "gb-wls",
  "Spain": "es", "France": "fr", "Germany": "de", "Brazil": "br",
  "Argentina": "ar", "Portugal": "pt", "Italy": "it", "Netherlands": "nl",
  "USA": "us", "Mexico": "mx", "Japan": "jp", "South Korea": "kr",
  "Nigeria": "ng", "Senegal": "sn", "Ghana": "gh", "Morocco": "ma",
  "Colombia": "co", "Uruguay": "uy", "Belgium": "be", "Croatia": "hr",
  "Denmark": "dk", "Sweden": "se", "Norway": "no", "Switzerland": "ch",
  "Austria": "at", "Ireland": "ie", "Poland": "pl", "Czech Republic": "cz",
  "Serbia": "rs", "Romania": "ro", "Greece": "gr", "Turkey": "tr",
  "Russia": "ru", "Ukraine": "ua", "Australia": "au", "New Zealand": "nz",
  "Canada": "ca", "Jamaica": "jm", "Costa Rica": "cr", "Ecuador": "ec",
  "Peru": "pe", "Chile": "cl", "Cameroon": "cm", "Ivory Coast": "ci",
  "Egypt": "eg", "Algeria": "dz", "Tunisia": "tn", "Mali": "ml",
  "Guinea": "gn", "Gabon": "ga", "Paraguay": "py", "Bolivia": "bo",
  "Iran": "ir", "Saudi Arabia": "sa", "China": "cn", "India": "in",
  "South Africa": "za", "DR Congo": "cd", "Honduras": "hn", "Panama": "pa",
  "Venezuela": "ve", "Bosnia & Herzegovina": "ba", "Kosovo": "xk",
  "Uzbekistan": "uz", "Cape Verde": "cv", "Curaçao": "cw",
  "Iraq": "iq", "Cuba": "cu", "Iceland": "is", "Luxembourg": "lu",
  "Hungary": "hu", "Slovakia": "sk", "Bulgaria": "bg", "Finland": "fi",
  "Montenegro": "me", "North Macedonia": "mk", "Albania": "al",
  "Guinea-Bissau": "gw", "Slovenia": "si", "Georgia": "ge",
  "Bosnia": "ba",
};

export function FlagImg({ name, size = 20 }: { name: string; size?: number }) {
  const code = FLAG_CODES[name];
  if (!code) return <span className="inline-block" style={{ width: size, height: Math.round(size * 0.75) }} />;
  const h = Math.round(size * 0.75);
  return (
    <img
      src={`https://flagcdn.com/${size * 2}x${h * 2}/${code}.png`}
      alt={name}
      className="inline-block align-middle"
      style={{ marginRight: 3, width: size, height: h }}
      loading="lazy"
    />
  );
}
