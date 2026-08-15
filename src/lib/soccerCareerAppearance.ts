/* ─── Soccer Career: Create Your Appearance (Round 54) ───
   The look you build here follows you everywhere: the career header, the
   Ballon d'Or stage, newspaper features, and your retirement send-off.
   Rendered by src/components/soccer-career/PlayerAvatar.tsx as a layered SVG
   bust, so every combination looks hand-drawn instead of emoji soup.
   All fields are plain strings so saves stay tiny and old saves just get
   appearance: null until the player builds a look (there is a one-tap
   randomize for that). */

export interface PlayerAppearance {
  skinTone: string;      // id from SKIN_TONES
  hairstyle: string;     // id from HAIRSTYLES
  hairColor: string;     // id from HAIR_COLORS
  facialHair: string;    // id from FACIAL_HAIR
  celebration: string;   // id from CELEBRATIONS
  boots: string;         // id from BOOTS
  accessory: string;     // id from ACCESSORIES
}

export interface AppearanceOption {
  id: string;
  label: string;
}

export const SKIN_TONES: (AppearanceOption & { color: string; shade: string })[] = [
  { id: "porcelain", label: "Porcelain", color: "#F5D5B8", shade: "#E3BC9A" },
  { id: "fair", label: "Fair", color: "#EDBD95", shade: "#D9A67C" },
  { id: "olive", label: "Olive", color: "#D19E6F", shade: "#BA885B" },
  { id: "tan", label: "Tan", color: "#B57C4B", shade: "#9E683B" },
  { id: "brown", label: "Brown", color: "#8C572F", shade: "#754624" },
  { id: "deep", label: "Deep", color: "#5C3A21", shade: "#4A2D18" },
];

export const HAIR_COLORS: (AppearanceOption & { color: string })[] = [
  { id: "black", label: "Black", color: "#1D1A17" },
  { id: "darkbrown", label: "Dark Brown", color: "#3B2A1D" },
  { id: "brown", label: "Brown", color: "#6B4A2E" },
  { id: "blonde", label: "Blonde", color: "#D8B25C" },
  { id: "platinum", label: "Platinum", color: "#E8E3D8" },
  { id: "red", label: "Red", color: "#A6432A" },
  { id: "blue", label: "Dyed Blue", color: "#3E6FB8" },
  { id: "pink", label: "Dyed Pink", color: "#D8679C" },
];

export const HAIRSTYLES: AppearanceOption[] = [
  { id: "buzz", label: "Buzz Cut" },
  { id: "fade", label: "High Fade" },
  { id: "curls", label: "Curls" },
  { id: "afro", label: "Afro" },
  { id: "waves", label: "Waves" },
  { id: "topknot", label: "Top Knot" },
  { id: "long", label: "Flowing Locks" },
  { id: "mohawk", label: "Mohawk" },
  { id: "braids", label: "Braids" },
  { id: "mullet", label: "Mullet" },
  { id: "spiky", label: "Frosted Spikes" },
  { id: "bald", label: "Clean Bald" },
];

export const FACIAL_HAIR: AppearanceOption[] = [
  { id: "none", label: "Clean Shaven" },
  { id: "stubble", label: "Stubble" },
  { id: "goatee", label: "Goatee" },
  { id: "full", label: "Full Beard" },
  { id: "mustache", label: "Mustache" },
  { id: "chinstrap", label: "Chinstrap" },
  { id: "soul", label: "Soul Patch" },
];

export const ACCESSORIES: AppearanceOption[] = [
  { id: "none", label: "Nothing" },
  { id: "headband", label: "Headband" },
  { id: "chain", label: "Gold Chain" },
  { id: "sleeve", label: "Arm Sleeve" },
  { id: "gloves", label: "Gloves" },
  { id: "earring", label: "Diamond Stud" },
  { id: "tape", label: "Wrist Tape" },
  { id: "captain", label: "Captain's Band" },
];

/* Fictional boot lines. Real brands stay out on purpose (same reason the
   sponsor deals are Vortex and Kinetiq): zero trademark headaches. */
export const BOOTS: (AppearanceOption & { color: string; flavor: string })[] = [
  { id: "vortex_strike", label: "Vortex Strike", color: "#E0342C", flavor: "The volume seller. Red, loud, everywhere." },
  { id: "vortex_ghost", label: "Vortex Ghost", color: "#EDEDED", flavor: "All white. You do NOT slide tackle in these." },
  { id: "kinetiq_blaze", label: "Kinetiq Blaze", color: "#F28A1F", flavor: "Construction-cone orange. Defenders see you coming and it does not help them." },
  { id: "kinetiq_void", label: "Kinetiq Void", color: "#181820", flavor: "Blackout edition for players who let the feet talk." },
  { id: "aurora_nine", label: "Aurora Nine", color: "#37B58C", flavor: "Mint green, worn by exactly one show-off per league." },
  { id: "aurora_royal", label: "Aurora Royal", color: "#2F4FB5", flavor: "Deep blue classics your dad approves of." },
  { id: "pulse_gold", label: "Pulse Gold", color: "#D9A82D", flavor: "Gold boots. You had better score this week." },
  { id: "pulse_venom", label: "Pulse Venom", color: "#7A3FB0", flavor: "Purple with attitude. The commentators will mention them." },
  { id: "retro_classica", label: "Classica '86", color: "#2B2B25", flavor: "Old-school black leather. Purists nod in respect." },
  { id: "bubblegum", label: "Bubblegum Pop", color: "#E86FAE", flavor: "Pink enough to trend on its own." },
];

/* Round 99: found by playing it. Both places these appear render them as
   "you {line}", but every line was written in the third person, so the
   character creation screen every single player sees read "you rips off
   toward the corner flag", "you stands frozen", "you throws a backflip".
   All ten are second person now, which is how they were always rendered. */
export const CELEBRATIONS: (AppearanceOption & { emoji: string; line: string })[] = [
  /* Round 129: he flagged this one as reading badly and it did. "you rip off
     toward the corner flag and slide on the knees" is nobody's knees in
     particular. Second person, own knees, same as the other nine. */
  { id: "knee_slide", label: "Knee Slide", emoji: "🛝", line: "tear off toward the corner flag and slide across the grass on your knees" },
  { id: "statue", label: "The Statue", emoji: "🗿", line: "stand frozen, arms crossed, dead serious, while your teammates mob the pose" },
  { id: "backflip", label: "Backflip", emoji: "🤸", line: "throw a full backflip that makes the physio cover their eyes" },
  { id: "shush", label: "The Shush", emoji: "🤫", line: "shush the away end with one finger. They deserved it" },
  { id: "heart_hands", label: "Heart Hands", emoji: "🫶", line: "make a heart to the family section" },
  { id: "robot", label: "The Robot", emoji: "🤖", line: "hit a crisp robot that goes straight to every highlight reel" },
  { id: "cradle", label: "Baby Cradle", emoji: "👶", line: "rock the baby cradle for the newest member of the family" },
  { id: "binoculars", label: "Binoculars", emoji: "🔭", line: "scan the crowd through pretend binoculars looking for the doubters" },
  { id: "phone_call", label: "Phone Call", emoji: "📞", line: "pick up an imaginary phone. Sorry, the GOAT line is busy" },
  { id: "sleeper", label: "The Sleeper", emoji: "😴", line: "lie down for a nap on the grass. Too easy" },
];

/* Lookup helpers, all safe on unknown ids so old or hand-edited saves never crash. */
export const getSkinTone = (id: string) => SKIN_TONES.find(s => s.id === id) || SKIN_TONES[2];
export const getHairColor = (id: string) => HAIR_COLORS.find(h => h.id === id) || HAIR_COLORS[0];
export const getHairstyle = (id: string) => HAIRSTYLES.find(h => h.id === id) || HAIRSTYLES[0];
export const getFacialHair = (id: string) => FACIAL_HAIR.find(f => f.id === id) || FACIAL_HAIR[0];
export const getBoots = (id: string) => BOOTS.find(b => b.id === id) || BOOTS[0];
export const getCelebration = (id: string) => CELEBRATIONS.find(c => c.id === id) || CELEBRATIONS[0];
export const getAccessory = (id: string) => ACCESSORIES.find(a => a.id === id) || ACCESSORIES[0];

const pickOne = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export function randomAppearance(): PlayerAppearance {
  return {
    skinTone: pickOne(SKIN_TONES).id,
    hairstyle: pickOne(HAIRSTYLES).id,
    hairColor: pickOne(HAIR_COLORS.slice(0, 6)).id, // dyed colors are a choice, not a roll
    facialHair: pickOne(FACIAL_HAIR).id,
    celebration: pickOne(CELEBRATIONS).id,
    boots: pickOne(BOOTS).id,
    accessory: pickOne(ACCESSORIES).id,
  };
}

export function defaultAppearance(): PlayerAppearance {
  return {
    skinTone: "olive",
    hairstyle: "fade",
    hairColor: "black",
    facialHair: "none",
    celebration: "knee_slide",
    boots: "vortex_strike",
    accessory: "none",
  };
}
