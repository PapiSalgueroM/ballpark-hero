# Architecture rules

- Use `src/lib/gameQueryClient.ts` for live game relations absent from generated database types. It reuses the existing client with a narrow type-only contract so preview schema drift cannot change the connection, session or queries.