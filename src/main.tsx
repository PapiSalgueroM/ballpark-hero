import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { watchForNewBuild } from "./lib/freshBuild";
import { applyTheme, storedTheme } from "./lib/theme";

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
