import { createContext } from 'react';

export const GameReportContext = createContext<{
  gameType?: string;
  gameContext?: Record<string, unknown>;
}>({});
