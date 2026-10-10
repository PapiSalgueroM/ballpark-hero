// Round 1142: FIRST, before any module that reads localStorage as it loads.
// A browser that blocks site data throws on the read itself, and this is
// what stands in for the visit. Keep it the first import in this file.
import "./lib/safeStorage";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { watchForNewBuild } from "./lib/freshBuild";
import { applyTheme, storedTheme } from "./lib/theme";
import { installTranslateGuard } from "./lib/translateGuard";
import { runSaveKeeper } from "./lib/saveKeeper";

// Round 1219: a kept aside save a player asked to put back is swapped in
// here, before React mounts and before any game is in memory, because a
// game left open writes itself over its save as the page goes. Also the
// copy a held save gets before a newer version of its game refuses it.
// An ordinary load reads a few keys and writes nothing.
runSaveKeeper();

// Round 1140: a browser that translates the page swaps text nodes under
// React, and the next update used to throw and take the whole route down.
// Installed before the first render so no commit ever runs without it.
installTranslateGuard();

// Round 90: a cached index.html was pinning returning players to old
// builds, so shipped fixes looked like they never landed.
watchForNewBuild();

// Round 347: a returning light mode player gets their theme before React
// draws anything. Applied here and not in index.html, which is frozen.
applyTheme(storedTheme());

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
