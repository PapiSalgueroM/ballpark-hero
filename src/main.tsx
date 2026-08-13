import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { watchForNewBuild } from "./lib/freshBuild";

// Round 90: a cached index.html was pinning returning players to old
// builds, so shipped fixes looked like they never landed.
watchForNewBuild();

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
