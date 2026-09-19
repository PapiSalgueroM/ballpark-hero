import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: {
      /* Round 439 negative control. scripts/simTycoonAway.mjs writes a copy of
         the Stadium Tycoon hook carrying the pre 439 load-only away settle and
         sets this variable, so the suite can be pointed at the real defect and
         proved to go red on it. The specific entry has to sit above "@" because
         vite matches aliases in order. Off in every ordinary run. */
      ...(process.env.TYCOON_AWAY_CONTROL === "loadonly"
        ? { "@/hooks/useStadiumTycoon": path.resolve(__dirname, "./src/hooks/__control_useStadiumTycoon.ts") }
        : {}),
      ...(process.env.COMPLETION_HOOK
        ? { "@/hooks/useGameCompletion": path.resolve(process.env.COMPLETION_HOOK) }
        : {}),
      ...(process.env.CONQUEST_NBA_HOOK
        ? { "@/hooks/useConquestNba": path.resolve(process.env.CONQUEST_NBA_HOOK) }
        : {}),
      ...(process.env.CONQUEST_NBA_BOARD
        ? { "@/components/conquest/ConquestBoardNba": path.resolve(process.env.CONQUEST_NBA_BOARD) }
        : {}),
      ...(process.env.POLL_FIXTURES
        ? { "@/data/pollFixtures": path.resolve(process.env.POLL_FIXTURES) }
        : {}),
      /* Round 503 negative control. scripts/simDailyRecord.mjs writes a copy of
         the daily engine carrying the pre 503 stale closure reads in addGuess
         and sets this variable, so src/test/dailyRecord.test.tsx can be pointed
         at the real defect and proved to go red on it. Same ordering rule as
         above: it has to sit over "@". Off in every ordinary run. */
      ...(process.env.DAILY_RECORD_CONTROL === "stale"
        ? { "@/hooks/useDailyPuzzle": path.resolve(__dirname, "./src/hooks/__control_useDailyPuzzle.ts") }
        : {}),
      /* Round 580 negative controls. scripts/simTycoonRooms.mjs writes a copy of
         the Stadium Tycoon page with one of its room rules broken and points
         src/test/tycoonRooms.test.tsx at it. Same ordering rule: above "@". */
      ...(process.env.TYCOON_ROOMS_PAGE
        ? { "@/pages/StadiumTycoon": path.resolve(process.env.TYCOON_ROOMS_PAGE) }
        : {}),
      /* Round 581 negative controls. scripts/simTycoonLoads.mjs writes a broken
         copy of one tycoon hook or lib and points the load and away suites at
         it. Same ordering rule: above "@". */
      ...(process.env.TYCOON_LOADS_STADIUM_HOOK
        ? { "@/hooks/useStadiumTycoon": path.resolve(process.env.TYCOON_LOADS_STADIUM_HOOK) }
        : {}),
      ...(process.env.TYCOON_LOADS_ACADEMY_HOOK
        ? { "@/hooks/useWonderkidFactory": path.resolve(process.env.TYCOON_LOADS_ACADEMY_HOOK) }
        : {}),
      ...(process.env.TYCOON_LOADS_STADIUM_LIB
        ? { "@/lib/stadiumTycoon": path.resolve(process.env.TYCOON_LOADS_STADIUM_LIB) }
        : {}),
      ...(process.env.TYCOON_LOADS_ACADEMY_LIB
        ? { "@/lib/wonderkidFactory": path.resolve(process.env.TYCOON_LOADS_ACADEMY_LIB) }
        : {}),
      /* Round 583 negative controls: scripts/simTycoonPitch.mjs writes a broken
         copy of the pitch. Same ordering rule: above "@". */
      ...(process.env.TYCOON_PITCH_COMPONENT
        ? { "@/components/tycoon/TycoonPitch": path.resolve(process.env.TYCOON_PITCH_COMPONENT) }
        : {}),
      /* Round 585 negative controls: scripts/simTycoonPacks.mjs writes a broken copy
         of the gem ledger or the Packs panel. Same ordering rule: above "@". */
      ...(process.env.TYCOON_PACKS_REWARDS
        ? { "@/lib/tycoonRewards": path.resolve(process.env.TYCOON_PACKS_REWARDS) }
        : {}),
      ...(process.env.TYCOON_PACKS_PANEL
        ? { "@/components/tycoon/PacksPanel": path.resolve(process.env.TYCOON_PACKS_PANEL) }
        : {}),
      /* Round 643 negative controls: scripts/simNoDoubleRecord.mjs writes a
         broken copy of one module (the restore mark, one daily hook, one
         toggle page) and names it here as {"@/module": "/abs/copy"}. Same
         ordering rule: above "@". */
      ...(process.env.NO_DOUBLE_SWAP
        ? (JSON.parse(process.env.NO_DOUBLE_SWAP) as Record<string, string>)
        : {}),
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
