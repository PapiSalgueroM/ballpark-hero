# Architecture rules

- Use `src/lib/gameQueryClient.ts` for live game relations missing from the generated schema. It adds narrow query types to the existing client instance, so runtime connections and sessions do not change; never edit generated integration files to repair these types.