import { useState, useEffect, useRef } from "react";
import { Trophy, ChevronDown } from "lucide-react";
import { FlagImg } from "@/pages/WorldCupPredictor";

/* ───── player lists ───── */

const GOLDEN_BOOT_PLAYERS = [
  { name: "Mbappé", nation: "France" },
  { name: "Vinícius Jr", nation: "Brazil" },
  { name: "Bellingham", nation: "England" },
  { name: "Salah", nation: "Egypt" },
  { name: "Ronaldo", nation: "Portugal" },
  { name: "Messi", nation: "Argentina" },
  { name: "De Bruyne", nation: "Belgium" },
  { name: "Gakpo", nation: "Netherlands" },
  { name: "Musiala", nation: "Germany" },
  { name: "Díaz", nation: "Colombia" },
  { name: "Osimhen", nation: "Nigeria" },
  { name: "Pulisic", nation: "USA" },
  { name: "Hirving Lozano", nation: "Mexico" },
  { name: "Mitoma", nation: "Japan" },
  { name: "Vlašić", nation: "Croatia" },
  { name: "Mané", nation: "Senegal" },
  { name: "Enner Valencia", nation: "Ecuador" },
  { name: "Kerr", nation: "Australia" },
  { name: "Xhaka", nation: "Switzerland" },
  { name: "Hwang Hee-chan", nation: "South Korea" },
  { name: "Al Dawsari", nation: "Saudi Arabia" },
  { name: "Taremi", nation: "Iran" },
  { name: "Trézéguet", nation: "Egypt" },
  { name: "Kudus", nation: "Ghana" },
  { name: "Alexis Sánchez", nation: "Chile" },
  { name: "Lookman", nation: "Nigeria" },
  { name: "Davies", nation: "Canada" },
  { name: "McGinn", nation: "Scotland" },
  { name: "Slimani", nation: "Algeria" },
  { name: "Haller", nation: "Ivory Coast" },
  { name: "Almirón", nation: "Paraguay" },
  { name: "Zieliński", nation: "Poland" },
  { name: "Shomurodov", nation: "Uzbekistan" },
  { name: "Dolberg", nation: "Denmark" },
  { name: "Muani", nation: "France" },
  { name: "Gyökeres", nation: "Sweden" },
  { name: "Rashica", nation: "Kosovo" },
  { name: "Luckassen", nation: "Curaçao" },
  { name: "Mothiba", nation: "South Africa" },
  { name: "Garry Rodrigues", nation: "Cape Verde" },
  { name: "Almoez Ali", nation: "Qatar" },
  { name: "Wood", nation: "New Zealand" },
  { name: "Davis", nation: "Panama" },
  { name: "Ben Romdhane", nation: "Tunisia" },
  { name: "Isak", nation: "Sweden" },
  { name: "Rashani", nation: "Kosovo" },
  { name: "Nazon", nation: "Haiti" },
  { name: "Metsemaker", nation: "Curaçao" },
];

const GOLDEN_GLOVE_KEEPERS = [
  { name: "Maignan", nation: "France" },
  { name: "Unai Simón", nation: "Spain" },
  { name: "Pickford", nation: "England" },
  { name: "Alisson", nation: "Brazil" },
  { name: "Costa", nation: "Portugal" },
  { name: "E. Martínez", nation: "Argentina" },
  { name: "Courtois", nation: "Belgium" },
  { name: "Flekken", nation: "Netherlands" },
  { name: "Neuer", nation: "Germany" },
  { name: "Vargas", nation: "Colombia" },
  { name: "Casteels", nation: "Belgium" },
  { name: "Yassine Bounou", nation: "Morocco" },
  { name: "Turner", nation: "USA" },
  { name: "Ochoa", nation: "Mexico" },
  { name: "Gonda", nation: "Japan" },
  { name: "Livaković", nation: "Croatia" },
  { name: "Mendy", nation: "Senegal" },
  { name: "Galíndez", nation: "Ecuador" },
  { name: "Ryan", nation: "Australia" },
  { name: "Kobel", nation: "Switzerland" },
  { name: "Ørjan Nyland", nation: "Norway" },
  { name: "Schmeichel", nation: "Denmark" },
  { name: "Rochet", nation: "Uruguay" },
  { name: "Seung-gyu", nation: "South Korea" },
  { name: "Al-Subaiee", nation: "Saudi Arabia" },
  { name: "Beiranvand", nation: "Iran" },
  { name: "El-Shenawy", nation: "Egypt" },
  { name: "Ati-Zigi", nation: "Ghana" },
  { name: "Bravo", nation: "Chile" },
  { name: "Okoye", nation: "Nigeria" },
  { name: "Crépeau", nation: "Canada" },
  { name: "Clark", nation: "Scotland" },
  { name: "Dahmen", nation: "Tunisia" },
  { name: "Nordfeldt", nation: "Sweden" },
  { name: "Muric", nation: "Kosovo" },
  { name: "Joseph", nation: "Haiti" },
  { name: "Dos Ramos", nation: "Curaçao" },
  { name: "Williams", nation: "South Africa" },
  { name: "Fernandes", nation: "Cape Verde" },
  { name: "Al-Bawardi", nation: "Qatar" },
  { name: "Sail", nation: "Morocco" },
  { name: "Koffi", nation: "Ivory Coast" },
  { name: "Nahuel Guzmán", nation: "Paraguay" },
  { name: "Wood (GK)", nation: "New Zealand" },
];

const STORAGE_KEY = "wc2026-awards";

interface AwardPicks {
  goldenBoot: string;
  goldenGlove: string;
  goldenBall: string;
}

function loadAwards(): AwardPicks {
  const fresh: AwardPicks = { goldenBoot: "", goldenGlove: "", goldenBall: "" };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fresh;
    const parsed = JSON.parse(raw);
    // a save written by another version can hold anything, keep only string fields
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return fresh;
    return {
      goldenBoot: typeof parsed.goldenBoot === "string" ? parsed.goldenBoot : "",
      goldenGlove: typeof parsed.goldenGlove === "string" ? parsed.goldenGlove : "",
      goldenBall: typeof parsed.goldenBall === "string" ? parsed.goldenBall : "",
    };
  } catch {
    return fresh;
  }
}

/* ───── Dropdown component ───── */

function AwardDropdown({
  label,
  emoji,
  value,
  options,
  onChange,
}: {
  label: string;
  emoji: string;
  value: string;
  options: { name: string; nation: string }[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const filtered = search
    ? options.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.nation.toLowerCase().includes(search.toLowerCase())
      )
    : options;

  const selected = options.find((p) => p.name === value);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl
          bg-[hsl(220,15%,13%)] border border-[hsl(220,15%,22%)] hover:border-[hsl(45,60%,40%)]
          transition-colors text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg flex-shrink-0">{emoji}</span>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-[hsl(150,15%,56%)] font-semibold">{label}</p>
            {selected ? (
              <p className="text-sm text-white font-medium truncate">
                <FlagImg name={selected.nation} size={16} />
                {selected.name} <span className="text-[hsl(150,15%,56%)]">({selected.nation})</span>
              </p>
            ) : (
              <p className="text-sm text-[hsl(150,15%,56%)]">Select a player...</p>
            )}
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-[hsl(150,15%,56%)] transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl bg-[hsl(220,18%,12%)] border border-[hsl(220,15%,22%)] shadow-2xl overflow-hidden">
          <div className="p-2">
            <input
              type="text"
              placeholder="Search players..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search players"
              className="w-full px-3 py-2 rounded-lg bg-[hsl(220,15%,16%)] border border-[hsl(220,15%,25%)]
                text-white text-xs placeholder:text-[hsl(150,15%,62%)] focus:border-[hsl(45,60%,40%)]"
              autoFocus
            />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.map((p) => (
              <button
                key={p.name}
                onClick={() => {
                  onChange(p.name);
                  setOpen(false);
                  setSearch("");
                }}
                className={`w-full flex items-center gap-2 px-4 py-2 text-left text-xs hover:bg-[hsl(220,15%,18%)] transition-colors
                  ${value === p.name ? "bg-[hsl(45,60%,15%)] text-[hsl(45,90%,60%)]" : "text-white"}`}
              >
                <FlagImg name={p.nation} size={16} />
                <span className="font-medium">{p.name}</span>
                <span className="text-[hsl(150,15%,56%)] ml-auto">{p.nation}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-4 py-3 text-xs text-[hsl(150,15%,56%)]">No players found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ───── Main Awards component ───── */

export default function AwardsPredictor({ champion }: { champion: string }) {
  const [awards, setAwards] = useState<AwardPicks>(loadAwards);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(awards));
  }, [awards]);

  const update = (key: keyof AwardPicks) => (val: string) =>
    setAwards((prev) => ({ ...prev, [key]: val }));

  const bootPlayer = GOLDEN_BOOT_PLAYERS.find((p) => p.name === awards.goldenBoot);
  const glovePlayer = GOLDEN_GLOVE_KEEPERS.find((p) => p.name === awards.goldenGlove);
  const ballPlayer = GOLDEN_BOOT_PLAYERS.find((p) => p.name === awards.goldenBall);

  const hasPicks = champion || awards.goldenBoot || awards.goldenGlove || awards.goldenBall;

  return (
    <div className="mt-12">
      <h2 className="text-xl sm:text-2xl font-bold text-white mb-1 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-[hsl(45,90%,55%)]" />
        Awards Predictor
      </h2>
      <p className="text-[hsl(150,15%,50%)] text-xs sm:text-sm mb-6">
        Pick your predictions for the tournament's top individual awards.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Tournament Winner, auto-filled */}
        <div className="px-4 py-3 rounded-xl bg-[hsl(220,15%,13%)] border border-[hsl(220,15%,22%)]">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏆</span>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[hsl(150,15%,56%)] font-semibold">
                Tournament Winner
              </p>
              {champion ? (
                <p className="text-sm text-white font-medium">
                  <FlagImg name={champion} size={16} />
                  {champion}
                </p>
              ) : (
                <p className="text-sm text-[hsl(150,15%,56%)]">Pick a champion in the bracket above</p>
              )}
            </div>
          </div>
        </div>

        {/* Golden Boot */}
        <AwardDropdown
          label="Golden Boot (Top Scorer)"
          emoji="🥇"
          value={awards.goldenBoot}
          options={GOLDEN_BOOT_PLAYERS}
          onChange={update("goldenBoot")}
        />

        {/* Golden Glove */}
        <AwardDropdown
          label="Golden Glove (Best GK)"
          emoji="🧤"
          value={awards.goldenGlove}
          options={GOLDEN_GLOVE_KEEPERS}
          onChange={update("goldenGlove")}
        />

        {/* Golden Ball */}
        <AwardDropdown
          label="Golden Ball (Best Player)"
          emoji="🌟"
          value={awards.goldenBall}
          options={GOLDEN_BOOT_PLAYERS}
          onChange={update("goldenBall")}
        />
      </div>

      {/* Summary card */}
      {hasPicks && (
        <div className="mt-8 rounded-2xl border-2 border-[hsl(45,70%,25%)] bg-gradient-to-br from-[hsl(220,15%,11%)] to-[hsl(230,18%,8%)] p-6 shadow-lg">
          <h3 className="text-sm font-bold text-[hsl(45,90%,60%)] uppercase tracking-wider mb-4 text-center">
            🏅 Your Award Predictions
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <SummaryRow emoji="🏆" label="Champion" value={champion} nation={champion} />
            <SummaryRow emoji="🥇" label="Golden Boot" value={bootPlayer?.name} nation={bootPlayer?.nation} />
            <SummaryRow emoji="🧤" label="Golden Glove" value={glovePlayer?.name} nation={glovePlayer?.nation} />
            <SummaryRow emoji="🌟" label="Golden Ball" value={ballPlayer?.name} nation={ballPlayer?.nation} />
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryRow({ emoji, label, value, nation }: { emoji: string; label: string; value?: string; nation?: string }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[hsl(220,15%,13%)]">
      <span className="text-base">{emoji}</span>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-[hsl(150,15%,56%)] font-semibold">{label}</p>
        {value ? (
          <p className="text-sm text-white font-medium truncate">
            {nation && <FlagImg name={nation} size={14} />}
            {value}
          </p>
        ) : (
          <p className="text-xs text-[hsl(150,15%,56%)]">Not selected</p>
        )}
      </div>
    </div>
  );
}
