import "@testing-library/jest-dom";
import { setSoccerDeckLoader } from "@/lib/soccerDeckGate";

/* Round 1504: Soccer Career fetches its summer cards (a lazy chunk) once a
   career is on screen and deals one only after it has landed, so a page test
   would deal a deck card or not depending on how fast the import ran. Every
   test plays without the deck unless it hands the gate a loader of its own
   (src/lib/soccerDeck.test.ts does). */
setSoccerDeckLoader(() => new Promise(() => {}));

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
