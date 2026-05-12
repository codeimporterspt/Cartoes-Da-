# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
# Start both servers (from root)
npm run dev:backend      # backend on :3001
npm run dev:frontend     # frontend on :5173 (proxies /api and /uploads → :3001)

# Or individually
cd backend && npm run dev          # ts-node-dev with hot reload
cd frontend && npm run dev         # Vite HMR

# Production
cd backend && npm run build && npm run start
```

### Database
```bash
cd backend
npx prisma db push                 # apply schema changes to dev.db (no migration file)
npx prisma migrate dev --name xyz  # create a named migration (interactive — use in a real terminal, not CI)
npx prisma studio                  # visual DB browser on :5555
npm run prisma:seed                # seed initial data
```

> `prisma generate` (regenerates the TS client) cannot run while the backend process has the native DLL locked. Restart the backend after schema changes to pick up new fields.

### Build & Lint
```bash
cd frontend && npm run lint         # ESLint on .ts/.tsx
cd frontend && npm run build        # tsc + vite build
cd backend  && npm run build        # tsc → dist/
```

## First-time setup

Create `backend/.env` (copy from `backend/.env.example`). For local dev with SQLite:
```env
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="any-local-secret"
PORT=3001
# SMTP fields are optional locally — emails are fire-and-forget
```

`frontend/.env` is not needed locally — Vite proxies `/api` and `/uploads` to `:3001` via `vite.config.ts`.

### Seed credentials
| Role | Email | Password |
|---|---|---|
| ADMIN | admin@hyundai.pt | password123 |
| USER | joao.silva@hyundai.pt | password123 |
| USER | maria.santos@hyundai.pt | password123 |

## Architecture

### Monorepo layout
```
cartoes-da/
├── backend/         Node.js + Express + Prisma (TypeScript)
│   ├── prisma/      schema.prisma, dev.db (SQLite), seed.ts
│   ├── src/
│   │   ├── controllers/   one file per resource
│   │   ├── routes/        one file per resource, wires middlewares
│   │   ├── middleware/     auth.ts — JWT verify + role guards
│   │   ├── services/      emailService.ts, cronService.ts
│   │   ├── utils/         prisma.ts (singleton), excel.ts (exportToExcel helper)
│   │   └── index.ts       Express app entry, mounts all routes
│   └── uploads/     multer destinations: imports/, declarations/
└── frontend/        React + Vite + TypeScript + TailwindCSS
    └── src/
        ├── pages/
        │   ├── admin/     backoffice pages (ADMIN/IMPORTADOR)
        │   └── user/      PrizesPage, CardsPage (USER + ADMIN + IMPORTADOR)
        ├── components/
        │   ├── layout/    Layout.tsx (sidebar shell), UsersLayout.tsx
        │   └── ui/        shared components (Modal, StatusBadge, PageHeader…)
        ├── services/      api.ts — all Axios calls, grouped by resource
        ├── store/         authStore.ts (JWT + user), brandStore.ts (selected brand)
        ├── config/        brandConfig.ts — slug → colors/name/domain
        ├── types/         index.ts — shared TS interfaces
        ├── App.tsx        route tree + ProtectedRoute
        └── BrandSelector.tsx  landing page after login
```

> `FLOWS.md` in the repo root is a detailed UI/screen specification for every page and modal. Consult it when working on visual layout or user flows.

### Request flow
1. Frontend `api.ts` interceptor attaches `Authorization: Bearer <token>` to every request.
2. Backend `authenticate` middleware decodes the JWT and populates `req.user` (id, email, role, brands).
3. Route-level middleware blocks by role before the controller runs.
4. Controllers do additional ownership checks for USER-level access (e.g. a USER can only modify their own cards).

### Auth & roles
- JWT payload contains `id`, `email`, `role`, `name`, `brands` (comma-separated slugs). No DB lookup per request.
- Roles: `ADMIN` > `IMPORTADOR` > `VALIDADOR` > `USER`.
- `brands` on User is a CSV string (e.g. `"hyundai,genesis"`). IMPORTADOR users are filtered to their brands throughout the backend.
- **IMPORTADOR list scoping**: the `GET /users` controller always re-reads the IMPORTADOR's brands from the DB (not the JWT) to avoid stale data, then scopes the result to those brands.
- Passwords hashed with bcrypt (cost 10).

### Backend middleware role map (`src/middleware/auth.ts`)
| Middleware | Roles allowed |
|---|---|
| `requireAdmin` | ADMIN |
| `requireAdminOrImportador` | ADMIN, IMPORTADOR |
| `requireElevated` | ADMIN, IMPORTADOR, VALIDADOR |
| `requireValidation` | ADMIN, VALIDADOR |

### Frontend role flags (`CardsPage`, `PrizesPage`, etc.)
```ts
const isAdmin    = user?.role === 'ADMIN';
const isElevated = isAdmin || user?.role === 'IMPORTADOR';
```
Use `isAdmin` to guard ADMIN-only UI; use `isElevated` for ADMIN + IMPORTADOR UI (e.g. the Transferir button, backoffice filters).

### Multi-brand theming
- After login, the user picks a brand from `BrandSelector`. This writes a `BrandConfig` to `brandStore` (Zustand, persisted to localStorage).
- `useBrandTheme` hook injects CSS variables (`--brand-primary`, `--brand-light`) on the root element.
- `brandStore.brand.slug` is passed as a query param to most API calls so the backend can filter by brand.

### Data model highlights
- **User** has `brands` (active) and `pendingBrands` (requested, pre-approval), plus `concessaoIds` (CSV of all concessões) and a primary `concessaoId` (FK to the main one).
- **User status lifecycle**: `PENDING → ACTIVE` (approve) or `REJECTED` (reject, clears `pendingBrands`); `ACTIVE → INACTIVE` (deactivate, sets `deactivatedAt`); both `INACTIVE` and `REJECTED` → `ACTIVE` via the same `reactivate` endpoint. Permanent removal uses `deletedAt` (soft-delete, user disappears from all lists) and also inactivates the user's cards.
- NIF uniqueness check excludes `REJECTED` users — a new registration can reuse the NIF of a rejected account.
- **Prize** lifecycle: `PENDENTE → VALIDADO → CARREGADO` (or `REJEITADO`/`ANULADO`). Prizes are marked `CARREGADO` when a topup import matches by `userId + status = VALIDADO` — the card's concessão is intentionally **not** part of the match.
- **PrizeImport** records each Excel import with `importType` (`"prizes"` or `"prizes-aftersales"`) so the history table can distinguish them.
- **CardBalanceHistory** tracks every balance movement. **CardLoadingHistory** is written specifically by the topup import and is the source of truth for the "last importador update" date on card exports.
- `Origin` has `matricula` and `modelo` flags that control which columns are shown/required in prize import templates.

### Import column mappings (Excel)
| Import type | Col1 | Col2 | Col3 | Col4 | Col5 | Col6 |
|---|---|---|---|---|---|---|
| prizes (vendas) | Origem (name) | VIN | Matrícula | Dealer Code | NIF | Valor |
| prizes-aftersales | Origem (name) | Matrícula | Dealer Code | NIF | Valor | Modelo |
| topup | NIF | Série | Nº Cartão | Valor | Origem (name, **required**) | — |
| origins | ID (display) | Área | Origem | Estado | Matrícula | Modelo |
| concessoes | Nome | Dealer Code | — | — | — | — |

Origin is matched case-insensitively by `Origin.name`. Templates with an Origem column include a dropdown (via a hidden `_Origens` sheet) populated from the DB at generation time.

### Frontend data fetching
- All server state via **TanStack Query v5**. Query keys follow the pattern `['resource', filters...]`.
- Mutations use `useMutation`; on success they `invalidateQueries` the relevant keys.
- When calling `doImport.mutate()` with no arguments, pass `undefined` explicitly — TanStack Query v5 requires at least one argument.

### File uploads
- Multer stores imports in `uploads/imports/` and card declarations in `uploads/declarations/`.
- After each successful import the file is also copied to `uploads/imports/last_<type>.xlsx` to support "último ficheiro carregado" downloads.
- The `downloadLastFile` allowed types are: `prizes`, `prizes-aftersales`, `topup`, `origins`, `concessoes`. The frontend must pass the **template key** (kebab-case), not the ImportType id (camelCase).

### Declaration template generation
The card declaration is an RTF file at `backend/static/declaracao_cartao_da.rtf`. When the user clicks "Download template declaração", a form modal collects four fields (name, NIF, card number, series number). On confirm, the frontend fetches the RTF via `api.get('/cards/declaration-template', { responseType: 'text' })`, replaces the underscore placeholders using regex, injects today's date, creates a `Blob`, and triggers a client-side download — no additional backend endpoint is involved. Placeholder patterns matched: `___/___/______` (date), `Eu, _+,` (name), `NIF n\.º _+,` (NIF), `Número do Cartão: _+` (card number), `Número de Série: _+` (series number).

### Number formatting
All monetary values displayed in the UI must use `fmtMoney` from `frontend/src/utils/format.ts` (`value.toFixed(2).replace('.', ',')`). This produces Portuguese-style decimals (`250,00 €`). Never use raw `.toFixed(2)` in JSX.

### UsersPage tabs
`/utilizadores` has four tabs driven by separate queries: **Ativos** (`status=ACTIVE`), **Pendentes** (`hasPendingBrands=true`), **Desativados** (`status=INACTIVE`), **Rejeitados** (`status=REJECTED`). The Pendentes tab shows only users with brands awaiting approval (the `pendingBrands` CSV field); the Rejeitados tab uses the `reactivate` endpoint to restore a rejected user directly to ACTIVE.

### Auth store caveat
`authStore` (Zustand, persisted to localStorage) holds the `user` object set at login time. This data can become stale across sessions. Do **not** rely on `user.name`, `user.nif`, or other profile fields from the store for display or pre-filling — call `authApi.me()` via `useQuery` to get fresh data from the DB when needed.

### Email
All emails are fire-and-forget (wrapped in `try/catch` with `/* non-critical */`). Triggers: account approved/rejected, card declaration submitted, card approved/rejected, prize import success/error, prize validation approved/rejected, card balance updated, monthly reminder cron (1st of month, 09:00).
