import { BOOT_IDS } from '@/lib/soccerBootIds';
import type { AppearanceOption } from '@/lib/soccerCareerAppearance';

/* Fictional boot lines. Real brands stay out on purpose (same reason the
   sponsor deals are Vortex and Kinetiq): zero trademark headaches. */
export const BOOTS: (AppearanceOption & { color: string; flavor: string })[] = [
  { id: BOOT_IDS[0], label: "Vortex Strike", color: "#E0342C", flavor: "The volume seller. Red, loud, everywhere." },
  { id: BOOT_IDS[1], label: "Vortex Ghost", color: "#EDEDED", flavor: "All white. You do NOT slide tackle in these." },
  { id: BOOT_IDS[2], label: "Kinetiq Blaze", color: "#F28A1F", flavor: "Construction-cone orange. Defenders see you coming and it does not help them." },
  { id: BOOT_IDS[3], label: "Kinetiq Void", color: "#181820", flavor: "Blackout edition for players who let the feet talk." },
  { id: BOOT_IDS[4], label: "Aurora Nine", color: "#37B58C", flavor: "Mint green, worn by exactly one show-off per league." },
  { id: BOOT_IDS[5], label: "Aurora Royal", color: "#2F4FB5", flavor: "Deep blue classics your dad approves of." },
  { id: BOOT_IDS[6], label: "Pulse Gold", color: "#D9A82D", flavor: "Gold boots. You had better score this week." },
  { id: BOOT_IDS[7], label: "Pulse Venom", color: "#7A3FB0", flavor: "Purple with attitude. The commentators will mention them." },
  { id: BOOT_IDS[8], label: "Classica '86", color: "#2B2B25", flavor: "Old-school black leather. Purists nod in respect." },
  { id: BOOT_IDS[9], label: "Bubblegum Pop", color: "#E86FAE", flavor: "Pink enough to trend on its own." },
  /* Round 131: eight more lines, same rule as the first ten. Every name is
     made up here and nobody else's. */
  { id: BOOT_IDS[10], label: "Vortex Frost", color: "#8FD4E8", flavor: "Ice blue. Somehow always look brand new at full time." },
  { id: BOOT_IDS[11], label: "Kinetiq Flare", color: "#F5E23C", flavor: "Highlighter yellow under floodlights. Impossible to miss." },
  { id: BOOT_IDS[12], label: "Aurora Dusk", color: "#6B4E9E", flavor: "Faded purple that looks better the muddier it gets." },
  { id: BOOT_IDS[13], label: "Pulse Copper", color: "#B4703A", flavor: "Burnt copper, worn by people who take free kicks." },
  { id: BOOT_IDS[14], label: "Terrace Navy", color: "#23335C", flavor: "Quiet, dark, sensible. The boots of somebody who tackles." },
  { id: BOOT_IDS[15], label: "Sunday League", color: "#C9CBC5", flavor: "Battered grey. You have had these since you were fourteen." },
  { id: BOOT_IDS[16], label: "Carnival", color: "#2FB56A", flavor: "Green and gold split. Loud on purpose, and it works." },
  { id: BOOT_IDS[17], label: "Midnight Chrome", color: "#4A4E57", flavor: "Gunmetal with a shine. Photographers love them." },
];
