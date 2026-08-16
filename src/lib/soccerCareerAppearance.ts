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

/* Round 131: he asked for more of everything on the look screen, and the skin
   row was the shortest of the lot at six. Eleven now, and they step evenly
   from the lightest to the darkest instead of jumping. */
export const SKIN_TONES: (AppearanceOption & { color: string; shade: string })[] = [
  { id: "porcelain", label: "Porcelain", color: "#F7DFC8", shade: "#E7C6A8" },
  { id: "ivory", label: "Ivory", color: "#F2D2B2", shade: "#DEB894" },
  { id: "fair", label: "Fair", color: "#EDBD95", shade: "#D9A67C" },
  { id: "sand", label: "Sand", color: "#E0AC80", shade: "#C9926A" },
  { id: "olive", label: "Olive", color: "#D19E6F", shade: "#BA885B" },
  { id: "honey", label: "Honey", color: "#C48C5C", shade: "#AC7648" },
  { id: "tan", label: "Tan", color: "#B57C4B", shade: "#9E683B" },
  { id: "chestnut", label: "Chestnut", color: "#9E6A3D", shade: "#875531" },
  { id: "brown", label: "Brown", color: "#8C572F", shade: "#754624" },
  { id: "cocoa", label: "Cocoa", color: "#71442A", shade: "#5C351F" },
  { id: "deep", label: "Deep", color: "#5C3A21", shade: "#4A2D18" },
  { id: "ebony", label: "Ebony", color: "#422815", shade: "#311D0F" },
];

export const HAIR_COLORS: (AppearanceOption & { color: string })[] = [
  { id: "black", label: "Black", color: "#1D1A17" },
  { id: "darkbrown", label: "Dark Brown", color: "#3B2A1D" },
  { id: "brown", label: "Brown", color: "#6B4A2E" },
  { id: "lightbrown", label: "Light Brown", color: "#8C6136" },
  { id: "auburn", label: "Auburn", color: "#7C3A21" },
  { id: "ginger", label: "Ginger", color: "#C2652A" },
  { id: "blonde", label: "Blonde", color: "#D8B25C" },
  { id: "sandy", label: "Sandy Blonde", color: "#C6A778" },
  { id: "platinum", label: "Platinum", color: "#E8E3D8" },
  { id: "silver", label: "Silver Fox", color: "#B7B5B0" },
  { id: "red", label: "Red", color: "#A6432A" },
  /* The dyed ones are a decision, not a roll, which is why randomAppearance
     stops before them. */
  { id: "blue", label: "Dyed Blue", color: "#3E6FB8" },
  { id: "pink", label: "Dyed Pink", color: "#D8679C" },
  { id: "green", label: "Dyed Green", color: "#3FA36B" },
  { id: "purple", label: "Dyed Purple", color: "#8155C4" },
  { id: "bleach", label: "Bleached Out", color: "#F2ECD9" },
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
  /* Round 131: eleven more, all drawn as SVG paths in PlayerAvatar the same
     way the first twelve are. No image host, no photos, nothing fetched. */
  { id: "sidepart", label: "Side Part" },
  { id: "slickback", label: "Slicked Back" },
  { id: "curtains", label: "Curtains" },
  { id: "dreads", label: "Dreadlocks" },
  { id: "cornrows", label: "Cornrows" },
  { id: "hightop", label: "High Top" },
  { id: "ponytail", label: "Ponytail" },
  { id: "receding", label: "Receding" },
  { id: "shaggy", label: "Shaggy Bowl" },
  { id: "lines", label: "Shaved Lines" },
  { id: "quiff", label: "Big Quiff" },
];

export const FACIAL_HAIR: AppearanceOption[] = [
  { id: "none", label: "Clean Shaven" },
  { id: "stubble", label: "Stubble" },
  { id: "goatee", label: "Goatee" },
  { id: "full", label: "Full Beard" },
  { id: "mustache", label: "Mustache" },
  { id: "chinstrap", label: "Chinstrap" },
  { id: "soul", label: "Soul Patch" },
  { id: "heavy", label: "Heavy Beard" },
  { id: "vandyke", label: "Van Dyke" },
  { id: "boxed", label: "Boxed Beard" },
  { id: "sideburns", label: "Sideburns" },
  { id: "pencil", label: "Pencil Moustache" },
  { id: "horseshoe", label: "Horseshoe" },
  { id: "patchy", label: "Patchy" },
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
  { id: "mask", label: "Face Mask" },
  { id: "snood", label: "Snood" },
  { id: "goggles", label: "Sports Goggles" },
  { id: "nosestrip", label: "Nose Strip" },
  { id: "sweatband", label: "Sweatbands" },
  { id: "cap", label: "Scrum Cap" },
  { id: "hoops", label: "Hoop Earrings" },
  { id: "undershirt", label: "Long Undershirt" },
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
  /* Round 131: eight more lines, same rule as the first ten. Every name is
     made up here and nobody else's. */
  { id: "vortex_frost", label: "Vortex Frost", color: "#8FD4E8", flavor: "Ice blue. Somehow always look brand new at full time." },
  { id: "kinetiq_flare", label: "Kinetiq Flare", color: "#F5E23C", flavor: "Highlighter yellow under floodlights. Impossible to miss." },
  { id: "aurora_dusk", label: "Aurora Dusk", color: "#6B4E9E", flavor: "Faded purple that looks better the muddier it gets." },
  { id: "pulse_copper", label: "Pulse Copper", color: "#B4703A", flavor: "Burnt copper, worn by people who take free kicks." },
  { id: "terrace_navy", label: "Terrace Navy", color: "#23335C", flavor: "Quiet, dark, sensible. The boots of somebody who tackles." },
  { id: "sunday_league", label: "Sunday League", color: "#C9CBC5", flavor: "Battered grey. You have had these since you were fourteen." },
  { id: "carnival", label: "Carnival", color: "#2FB56A", flavor: "Green and gold split. Loud on purpose, and it works." },
  { id: "midnight_chrome", label: "Midnight Chrome", color: "#4A4E57", flavor: "Gunmetal with a shine. Photographers love them." },
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
  /* Round 131: nine more, all second person, all your own limbs, same as the
     first ten after Round 99 and Round 129 fixed them. */
  { id: "arms_wide", label: "Arms Wide", emoji: "🛩️", line: "run to the corner with both arms out and let the whole stand come to you" },
  { id: "point_sky", label: "Point To The Sky", emoji: "☝️", line: "point one finger at the sky for somebody who is not here to see it" },
  { id: "badge_kiss", label: "Kiss The Badge", emoji: "😘", line: "grab the badge on your chest and kiss it in front of your own end" },
  { id: "cartwheel", label: "Cartwheel", emoji: "🤾", line: "throw a cartwheel that the manager will bring up in training on Monday" },
  { id: "sit_down", label: "Take A Seat", emoji: "🪑", line: "sit down on the advertising boards and cross your legs like the game is over" },
  { id: "dance_off", label: "The Dance Off", emoji: "🕺", line: "start a three man dance you have clearly been practising all week" },
  { id: "salute", label: "The Salute", emoji: "🫡", line: "snap a salute to the bench and hold it until somebody laughs" },
  { id: "crowd_dive", label: "Into The Crowd", emoji: "🙌", line: "climb the hoardings and disappear into the away end for eleven seconds" },
  { id: "ice_cold", label: "Ice Cold", emoji: "🧊", line: "do absolutely nothing, turn around, and jog back to the halfway line" },
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
    hairColor: pickOne(HAIR_COLORS.filter(c => !c.label.startsWith("Dyed") && c.id !== "bleach")).id, // dyed colors are a choice, not a roll
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
