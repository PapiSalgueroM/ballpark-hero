# Architecture rules

- Use `src/lib/gameQueryClient.ts` for the game relations absent from generated database types; it narrows the existing client without changing its endpoint, session, or runtime queries.