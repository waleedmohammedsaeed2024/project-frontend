# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Vite dev server at http://localhost:5173
npm run build     # tsc -b && vite build (TS project-references build, then bundle)
npm run lint      # eslint .
npm run preview   # preview the production build
```

There is no test runner configured.

Database / backend (Supabase):

```bash
supabase link --project-ref <project-id>
supabase db push                              # apply migrations in supabase/migrations/
supabase functions deploy send-whatsapp       # deploy the WhatsApp edge function
```

Required env vars in `.env` (see `.env.example`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ENABLE_WHATSAPP`. If `VITE_SUPABASE_URL` is missing or contains `placeholder`, `src/routes/router.tsx` swaps the entire app for a `SetupPage`. Keep that fallback intact when touching routing.

## Architecture

This is a React 19 + TypeScript + Vite SPA backed by Supabase (PostgreSQL + Auth + Edge Functions). It is an inventory-centric ERP: purchasing → inventory → sales orders → delivery → invoices, with returns/adjustments and reports. Most business logic lives in PostgreSQL (triggers, RLS, RPC); the frontend orchestrates and displays.

**Data flow:** UI → TanStack Query hook → `supabase` client → Postgres (RLS-enforced) / RPC functions / triggers. Mutations invalidate query keys defined centrally in `src/lib/query-keys.ts` — when adding queries, register the key there rather than inlining string arrays.

**Auth + RBAC:** `src/context/AuthContext.tsx` wraps the app. The role lives in `session.user.app_metadata.role` (one of `admin | purchase_manager | salesman | manager`) and is read via `useAuth()`. Use the `useCanDo()` helper for permission gates rather than checking role strings ad-hoc; the matrix there is the source of truth and mirrors RLS policies. `src/routes/ProtectedRoute.tsx` redirects unauthenticated users to `/login`.

**Routing:** `src/routes/router.tsx` is a `createBrowserRouter` config — there are no nested route files. Top-level layout is `src/components/layout/AppLayout`. The `App.tsx` file is intentionally a no-op stub.

**Code organization:**
- `src/features/<domain>/` — page-level UI grouped by domain (partners, items, purchase, sales, delivery, invoices, inventory, returns, adjustments, reports, auth, dashboard, misc). Each feature owns its forms, tables, and detail dialogs.
- `src/components/` — only cross-feature UI (`layout/`, `inventory/`, `orders/`). Most shadcn primitives live under feature folders or get imported directly from Radix.
- `src/lib/` — singletons and pure helpers: `supabase.ts` (client), `env.ts` (validated env), `query-client.ts` and `query-keys.ts` (React Query), `database.types.ts` (hand-written DB types mirroring `001_initial_schema.sql`), `utils.ts` (formatting + business math), `whatsapp.ts`, `printOrderPDF.ts`.
- `src/shared/types.ts` — non-DB shared types.
- `supabase/migrations/` — numbered SQL migrations; the schema (16 tables) is defined in `001_initial_schema.sql` and later migrations patch it. **Treat `database.types.ts` as a hand-maintained mirror of these migrations** — when changing schema, update both.
- `supabase/functions/send-whatsapp/` — Deno edge function invoked from `src/lib/whatsapp.ts` after purchase invoices.

**Key business rules (enforced in DB and reflected in `src/lib/utils.ts`):**
- Average cost: `(old_qty × old_cost + new_qty × new_cost) / total_qty` — see `calcAvgCost`.
- Sale price = cost × 1.15 (fixed 15% markup) — see `calcItemPrice`. Change here if markup rules change.
- Order status `o → p → c | d` is one-way; the DB rejects invalid transitions.
- Soft delete via `deleted_at`; never hard-delete.
- Negative stock and overselling are blocked by triggers — surface DB errors to users rather than pre-validating in JS.
- WhatsApp notifications are best-effort: failures must not block the originating mutation; outcomes are logged in `notification_log`.

**Path alias:** `@/` → `src/` (configured in both `vite.config.ts` and `tsconfig.app.json`).

**React Compiler:** Enabled via `@rolldown/plugin-babel` + `babel-plugin-react-compiler` in `vite.config.ts`. Avoid manual `useMemo`/`useCallback` for cases the compiler handles; do not disable the compiler without reason.

**Data Base schema:** connect to @skills/database-schema/SKILLS.md, you find API Key on env files
