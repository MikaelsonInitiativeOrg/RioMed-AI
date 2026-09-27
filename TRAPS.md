# Trap list

Read this at the start of every session. Add a line whenever something bites, and never remove one (BUILD-DIRECTIVE section 12).

| Trap | The rule |
|---|---|
| Model output was padded with default values (for example `confidence: 0.5`) when fields were missing | Never fill in missing model fields. Reject and fall back (validateModelIntent) |
| The local AI provider silently defaulted to a localhost URL | Local providers need an explicit loopback `AI_BASE_URL` |
| npm 11 blocks package install scripts, so the Prisma engines never download | Run `npm install-scripts approve <pkg>` for known packages, then `npm rebuild` |
| Next 16: `params`, `searchParams` and `cookies()` are async only | Always `await` them. Use the generated `PageProps<"/route">` types (`npx next typegen`) |
| `server-only` modules crash under plain `tsx` | Run server scripts with `npx tsx --conditions=react-server` |
| Backend files imported by the frontend resolve `@/…` against the frontend tsconfig | Inside `backend/src`, use relative imports only. `@/` in backend is for tests only |
| Moving `.env` breaks Prisma and Next separately | Prisma reads `backend/.env`, and Next reads `frontend/.env.local`. SQLite `file:./dev.db` resolves relative to `backend/prisma/` |
