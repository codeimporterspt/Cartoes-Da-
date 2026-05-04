# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
# Start both servers (from root)
npm run dev:backend      # backend on :3001
npm run dev:frontend     # frontend on :5173 (proxies /api → :3001)

# Or individually
cd backend && npm run dev          # ts-node-dev with hot reload
cd frontend && npm run dev         # Vite HMR
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
        │   └── user/      PrizesPage, CardsPage (USER)
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

### Request flow
1. Frontend `api.ts` interceptor attaches `Authorization: Bearer <token>` to every request.
2. Backend `authenticate` middleware decodes the JWT and populates `req.user` (id, email, role, brands).
3. Route-level middleware (`requireAdmin`, `requireElevated`, `requireAdminOrImportador`, `requireValidation`) block by role before the controller runs.
4. Controllers do additional ownership checks for USER-level access (e.g. a USER can only modify their own cards).

### Auth & roles
- JWT payload contains `id`, `email`, `role`, `name`, `brands` (comma-separated slugs). No DB lookup per request.
- Roles: `ADMIN` > `IMPORTADOR` > `VALIDADOR` > `USER`. `VALIDADOR` can only access prize validation.
- `brands` on User is a CSV string (e.g. `"hyundai,genesis"`). IMPORTADOR users are filtered to their brands throughout the backend.
- Passwords hashed with bcrypt (cost 10).

### Multi-brand theming
- After login, the user picks a brand from `BrandSelector`. This writes a `BrandConfig` to `brandStore` (Zustand, persisted to localStorage).
- `useBrandTheme` hook injects CSS variables (`--brand-primary`, `--brand-light`) on the root element.
- `brandStore.brand.slug` is passed as a query param to most API calls so the backend can filter by brand.

### Data model highlights
- **User** has `brands` (active) and `pendingBrands` (requested, pre-approval), plus `concessaoIds` (CSV) and a primary `concessaoId`.
- **Prize** lifecycle: `PENDENTE → VALIDADO → CARREGADO` (or `REJEITADO`/`ANULADO`). Prizes are marked `CARREGADO` when a topup import matches by `userId + status = VALIDADO` — the card's concessão is intentionally **not** part of the match.
- **PrizeImport** records each Excel import with `importType` (`"prizes"` or `"prizes-aftersales"`) so the history table can distinguish them.
- **CardBalanceHistory** tracks every balance movement. **CardLoadingHistory** is written specifically by the topup import and is the source of truth for the "last importador update" date on card exports.
- `Origin` has `matricula` and `modelo` flags that control which columns are shown/required in prize import templates.

### Import column mappings (Excel)
| Import type | Col1 | Col2 | Col3 | Col4 | Col5 | Col6 |
|---|---|---|---|---|---|---|
| prizes (vendas) | ID (Origin seqId) | VIN | Matrícula | Dealer Code | NIF | Valor |
| prizes-aftersales | ID (Origin seqId) | Matrícula | Dealer Code | NIF | Valor | Modelo |
| topup | NIF | Série | Nº Cartão | Valor | — | — |
| origins | ID (display) | Área | Origem | Estado | Matrícula | Modelo |
| concessoes | Nome | Dealer Code | — | — | — | — |

Origin seqId in prize imports is a 1-based index into `prisma.origin.findMany({ orderBy: { area: 'asc' } })`.

### Frontend data fetching
- All server state via **TanStack Query v5**. Query keys follow the pattern `['resource', filters...]`.
- Mutations use `useMutation`; on success they `invalidateQueries` the relevant keys.
- When calling `doImport.mutate()` with no arguments, pass `undefined` explicitly — TanStack Query v5 requires at least one argument.

### File uploads
- Multer stores imports in `uploads/imports/` and card declarations in `uploads/declarations/`.
- After each successful import the file is also copied to `uploads/imports/last_<type>.xlsx` to support "último ficheiro carregado" downloads.
- The `downloadLastFile` allowed types are: `prizes`, `prizes-aftersales`, `topup`, `origins`, `concessoes`. The frontend must pass the **template key** (kebab-case), not the ImportType id (camelCase).

### Declaration template generation
The card declaration is an RTF file at `backend/static/declaracao_cartao_da.rtf`. When the user clicks "Download template declaração" in the card creation modal, a form modal opens with four empty fields (name, NIF, card number, series number). On confirm, the frontend fetches the RTF via `api.get('/cards/declaration-template', { responseType: 'text' })`, replaces the underscore placeholders using regex, injects today's date, creates a `Blob`, and triggers a client-side download — no additional backend endpoint is involved. Placeholder patterns matched: `___/___/______` (date), `Eu, _+,` (name), `NIF n\.º _+,` (NIF), `Número do Cartão: _+` (card number), `Número de Série: _+` (series number).

### Number formatting
All monetary values displayed in the UI must use `fmtMoney` from `frontend/src/utils/format.ts` (`value.toFixed(2).replace('.', ',')`). This produces Portuguese-style decimals (`250,00 €`). Never use raw `.toFixed(2)` in JSX.

### Auth store caveat
`authStore` (Zustand, persisted to localStorage) holds the `user` object set at login time. This data can become stale across sessions. Do **not** rely on `user.name`, `user.nif`, or other profile fields from the store for display or pre-filling — call `authApi.me()` via `useQuery` to get fresh data from the DB when needed.

### Email
All emails are fire-and-forget (wrapped in `try/catch` with `/* non-critical */`). Triggers: account approved/rejected, card declaration submitted, card approved/rejected, prize import success/error, prize validation approved/rejected, card balance updated, monthly reminder cron (1st of month, 09:00).
