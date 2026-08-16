import { useState } from "react";
import { Button } from "@/components/ui/button";
import PlayerAvatar from "./PlayerAvatar";
import {
  type PlayerAppearance, randomAppearance,
  SKIN_TONES, HAIRSTYLES, HAIR_COLORS, FACIAL_HAIR, ACCESSORIES, BOOTS, CELEBRATIONS,
  getBoots, getCelebration,
} from "@/lib/soccerCareerAppearance";

/* ─── AppearanceBuilder (Round 54) ───
   Owner asked for "create your appearance". This is the full look editor on
   the career creation screen: live SVG preview that updates as you tap,
   six tabs of options, a boot line with real flavor text, and a signature
   celebration that shows up in your goal moments for the rest of the career.
   The whole thing is one small object on the save, so it costs nothing. */

interface Props {
  appearance: PlayerAppearance;
  onChange: (next: PlayerAppearance) => void;
  clubColor?: string;
}

type TabKey = "face" | "hair" | "beard" | "boots" | "extras" | "celebration";

const TABS: { key: TabKey; label: string; emoji: string }[] = [
  { key: "face", label: "Skin", emoji: "🧑" },
  { key: "hair", label: "Hair", emoji: "💇" },
  { key: "beard", label: "Beard", emoji: "🧔" },
  { key: "boots", label: "Boots", emoji: "👟" },
  { key: "extras", label: "Extras", emoji: "💍" },
  { key: "celebration", label: "Celebration", emoji: "🎉" },
];

const AppearanceBuilder = ({ appearance, onChange, clubColor = "#10B981" }: Props) => {
  const [tab, setTab] = useState<TabKey>("face");
  const set = (patch: Partial<PlayerAppearance>) => onChange({ ...appearance, ...patch });

  const chip = (active: boolean) =>
    `px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
      active
        ? "border-emerald-500 bg-emerald-500/15 text-emerald-300"
        : "border-border bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
    }`;

  const boots = getBoots(appearance.boots);
  const celebration = getCelebration(appearance.celebration);

  return (
    <div className="bg-card border border-border rounded-xl p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold">Create Your Look</h2>
        <Button
          onClick={() => onChange(randomAppearance())}
          variant="outline"
          className="h-8 px-3 text-xs font-bold"
        >
          🎲 Surprise me
        </Button>
      </div>

      {/* Live preview */}
      <div className="flex items-center gap-4 rounded-xl border border-border bg-muted/10 p-4">
        <div className="shrink-0 rounded-xl overflow-hidden bg-background/40 border border-border">
          <PlayerAvatar appearance={appearance} clubColor={clubColor} size={104} animate />
        </div>
        <div className="min-w-0 space-y-1.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full border border-border shrink-0" style={{ backgroundColor: boots.color }} />
            <span className="font-bold truncate">{boots.label}</span>
          </div>
          <p className="text-muted-foreground leading-snug">{boots.flavor}</p>
          <div className="pt-1 text-muted-foreground">
            <span className="font-bold text-foreground">{celebration.emoji} {celebration.label}</span>
            <span className="block leading-snug">Every goal, you {celebration.line}.</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`py-2 rounded-lg text-[11px] font-bold border transition-all ${
              tab === t.key
                ? "border-emerald-500 bg-emerald-500/15 text-emerald-300"
                : "border-border bg-muted/20 text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="block text-sm leading-none mb-0.5">{t.emoji}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Options.
          Round 131: the lists roughly doubled (23 cuts, 16 hair colours, 14
          beards, 16 extras, 18 boot lines, 19 celebrations), and left alone
          that would have added about six hundred pixels to a creation screen
          that is already the longest page in the game. So the option area is a
          fixed window with its own scroll: the tabs, the preview and the
          buttons underneath never move no matter which tab you are on, which
          is the whole point of the tile rule. */}
      <div className="min-h-[92px] max-h-[190px] overflow-y-auto scrollbar-thin pr-0.5">
        {tab === "face" && (
          <div className="flex flex-wrap gap-2">
            {SKIN_TONES.map(s => (
              <button
                key={s.id}
                onClick={() => set({ skinTone: s.id })}
                title={s.label}
                aria-label={s.label}
                className={`w-11 h-11 rounded-full border-2 transition-all ${
                  appearance.skinTone === s.id ? "border-emerald-400 scale-110" : "border-border hover:scale-105"
                }`}
                style={{ backgroundColor: s.color }}
              />
            ))}
          </div>
        )}

        {tab === "hair" && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {HAIRSTYLES.map(h => (
                <button key={h.id} onClick={() => set({ hairstyle: h.id })} className={chip(appearance.hairstyle === h.id)}>
                  {h.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {HAIR_COLORS.map(c => (
                <button
                  key={c.id}
                  onClick={() => set({ hairColor: c.id })}
                  title={c.label}
                  aria-label={c.label}
                  className={`w-9 h-9 rounded-full border-2 transition-all ${
                    appearance.hairColor === c.id ? "border-emerald-400 scale-110" : "border-border hover:scale-105"
                  }`}
                  style={{ backgroundColor: c.color }}
                />
              ))}
            </div>
          </div>
        )}

        {tab === "beard" && (
          <div className="flex flex-wrap gap-1.5">
            {FACIAL_HAIR.map(f => (
              <button key={f.id} onClick={() => set({ facialHair: f.id })} className={chip(appearance.facialHair === f.id)}>
                {f.label}
              </button>
            ))}
          </div>
        )}

        {tab === "boots" && (
          <div className="grid grid-cols-2 gap-1.5">
            {BOOTS.map(b => (
              <button
                key={b.id}
                onClick={() => set({ boots: b.id })}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] font-semibold border transition-all text-left ${
                  appearance.boots === b.id
                    ? "border-emerald-500 bg-emerald-500/15 text-emerald-300"
                    : "border-border bg-muted/20 text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="w-3.5 h-3.5 rounded-full border border-border shrink-0" style={{ backgroundColor: b.color }} />
                <span className="truncate">{b.label}</span>
              </button>
            ))}
          </div>
        )}

        {tab === "extras" && (
          <div className="flex flex-wrap gap-1.5">
            {ACCESSORIES.map(a => (
              <button key={a.id} onClick={() => set({ accessory: a.id })} className={chip(appearance.accessory === a.id)}>
                {a.label}
              </button>
            ))}
          </div>
        )}

        {tab === "celebration" && (
          <div className="grid grid-cols-2 gap-1.5">
            {CELEBRATIONS.map(c => (
              <button
                key={c.id}
                onClick={() => set({ celebration: c.id })}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] font-semibold border transition-all text-left ${
                  appearance.celebration === c.id
                    ? "border-emerald-500 bg-emerald-500/15 text-emerald-300"
                    : "border-border bg-muted/20 text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="text-base leading-none shrink-0">{c.emoji}</span>
                <span className="truncate">{c.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AppearanceBuilder;
