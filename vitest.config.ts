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
      /* Round 495 negative control. scripts/simDailyRecord.mjs writes a copy of
         the daily engine carrying the pre 495 stale closure reads in addGuess
         and sets this variable, so src/test/dailyRecord.test.tsx can be pointed
         at the real defect and proved to go red on it. Same ordering rule as
         above: it has to sit over "@". Off in every ordinary run. */
      ...(process.env.DAILY_RECORD_CONTROL === "stale"
        ? { "@/hooks/useDailyPuzzle": path.resolve(__dirname, "./src/hooks/__control_useDailyPuzzle.ts") }
        : {}),
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
