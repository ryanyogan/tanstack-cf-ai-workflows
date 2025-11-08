# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a full-stack monorepo built on Cloudflare infrastructure, using pnpm workspaces. It consists of:
- **user-application**: A React frontend with an integrated Cloudflare Worker backend
- **data-service**: A separate Cloudflare Worker service (currently minimal)
- **@repo/data-ops**: A shared TypeScript package for database operations, validation schemas, and Cloudflare-specific helpers

## Architecture

### Frontend + Backend Integration (user-application)
The user-application uniquely combines React frontend and Cloudflare Worker backend in a single app:
- Frontend lives in `apps/user-application/src/`
- Backend (Worker) lives in `apps/user-application/worker/`
- The Worker serves both tRPC API endpoints (`/trpc/*`) and static assets via Cloudflare Workers Assets
- TanStack Router handles client-side routing with type-safe routes
- tRPC provides end-to-end type safety between frontend and backend
- Path aliases: `@/*` maps to `src/`, `@/worker/*` maps to `worker/`

### Data Layer (@repo/data-ops)
The shared package exports:
- `database`: Drizzle ORM initialization functions for Cloudflare D1
- `queries/*`: Database query helpers
- `zod-schema/*`: Validation schemas
- `durable-objects-helpers`: Helpers for Cloudflare Durable Objects
- `auth`: Better-auth configuration (referenced but not fully implemented)

The package must be built before use: `pnpm run build-package`

### tRPC Architecture
- Router definition: `apps/user-application/worker/trpc/router.ts`
- Context creation: `apps/user-application/worker/trpc/context.ts` (provides `req`, `env`, `workerCtx`)
- Individual routers in `worker/trpc/routers/`
- Client setup in `src/router.tsx` with TanStack Query integration

### Database
- Uses Cloudflare D1 (SQLite)
- Drizzle ORM for queries
- Configuration in `packages/data-ops/drizzle.config.ts`
- Database must be initialized via `initDatabase(bindingDb)` before use

## Common Commands

### Development
```bash
# Build the shared data-ops package (required first)
pnpm run build-package

# Start frontend development server (port 3000)
pnpm run dev-frontend

# Start data-service worker development
pnpm run dev-data-service
```

### user-application Specific
```bash
# From apps/user-application/
pnpm dev                    # Start dev server
pnpm build                  # Build for production (runs vite build && tsc)
pnpm test                   # Run Vitest tests
pnpm cf-typegen             # Generate Cloudflare Worker types
pnpm deploy                 # Build and deploy to Cloudflare
```

### data-service Specific
```bash
# From apps/data-service/
pnpm dev                    # Start with remote bindings
pnpm start                  # Start without remote bindings
pnpm test                   # Run Vitest tests
pnpm cf-typegen             # Generate Cloudflare Worker types
pnpm deploy                 # Deploy to Cloudflare
```

### data-ops Package
```bash
# From packages/data-ops/
pnpm build                  # Compile TypeScript and resolve aliases
pnpm pull                   # Pull database schema from D1
pnpm migrate                # Run migrations
pnpm generate               # Generate migration files
pnpm studio                 # Open Drizzle Studio
pnpm better-auth-generate   # Generate better-auth types
```

## Cloudflare Configuration

### Service Bindings
- Defined in `service-bindings.d.ts` files in each app
- user-application: `interface ServiceBindings extends Env {}`
- After adding bindings to `wrangler.jsonc`, run `pnpm cf-typegen` to update types
- Access bindings via tRPC context: `ctx.env.BINDING_NAME`

### Wrangler Configuration
- Uses `wrangler.jsonc` (not `.toml`) in each app
- user-application serves React app via Workers Assets (`assets.binding: "ASSETS"`)
- Both apps use compatibility_date: "2025-06-17"
- data-service enables `nodejs_compat` flag

## Key Technologies

- **Frontend**: React 19, TanStack Router, TanStack Query, Tailwind CSS 4
- **Backend**: Cloudflare Workers, Hono, tRPC
- **Database**: Cloudflare D1, Drizzle ORM
- **Auth**: Better-auth (with Stripe integration configured)
- **Validation**: Zod
- **Testing**: Vitest (with Cloudflare Workers pool for data-service)
- **Build**: Vite 7, TypeScript 5

## Important Notes

- Always build `@repo/data-ops` before running apps that depend on it
- The user-application Worker exports a default handler that routes `/trpc` to tRPC and everything else to static assets
- TanStack Router auto-generates `routeTree.gen.ts` - don't edit manually
- TypeScript path resolution uses both tsconfig paths and vite-tsconfig-paths plugin
- Tabler icons are imported from static ESM bundle to prevent chunking issues
