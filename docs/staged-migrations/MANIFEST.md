# Staged Migrations Manifest

Every draft content migration lives in `docs/staged-migrations/` with a `DRAFT_` prefix
and a top-of-file banner: `-- DRAFT — NOT FACT-VERIFIED — DO NOT APPLY UNTIL SIGNED OFF`.

**Firewall rule:** Claude Code never applies these. A draft becomes shippable only after
its status here is moved to `verified` by Anthony / his chat assistant. Then Anthony applies it.

| Draft file | Target table | Rows | Status | Notes |
|---|---|---|---|---|
| _(none yet)_ | | | | |

Status values: `drafted` → `verified` → `applied`
