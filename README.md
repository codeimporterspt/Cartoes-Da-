# Cartões Dá — Caetano Automotive Portugal

Internal platform for managing employee reward cards (Cartão Dá) and prize/bonus workflows across multiple brands.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: SQLite (dev) / PostgreSQL (prod) via Prisma ORM
- **Auth**: JWT with role-based access (ADMIN / IMPORTADOR / VALIDADOR / USER)
- **Files**: ExcelJS (import/export), Multer (uploads)
- **Email**: Nodemailer (fire-and-forget)
- **Scheduler**: node-cron (monthly reminder, 1st of month 09:00)

---

## Prerequisites

- Node.js 18+
- npm

> No database server needed for local dev — Prisma uses SQLite (`backend/prisma/dev.db`).

---

## Setup

### 1. Clone and install

```bash
npm run install:all   # installs backend + frontend dependencies
```

### 2. Environment variables

Copy `backend/.env.example` to `backend/.env`. For local dev:

```env
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="any-local-secret"
PORT=3001
# SMTP fields are optional — emails are fire-and-forget and won't break the app if absent
```

### 3. Database and seed

```bash
cd backend
npx prisma db push       # create/update SQLite schema
npm run prisma:seed      # seed brands, concessões, origins, and one USER per brand
```

### 4. Start servers

```bash
# from repo root
npm run dev:backend      # :3001
npm run dev:frontend     # :5173  (proxies /api and /uploads → :3001)
```

---

## Seed credentials

| Role | Email | Password |
|------|-------|----------|
| ADMIN | admin@cartoes-da.pt | password123 |
| USER (per brand) | utilizador@{brand-slug}.pt | password123 |

Brand slugs: `byd` `dongfeng` `farizon` `geely` `honda` `hyundai` `nissan` `xpeng` `zeekr`

IMPORTADOR and VALIDADOR accounts are not seeded — create them via the admin UI or Prisma Studio (`npx prisma studio`).

---

## Roles & modules

### USER
| Module | Capabilities |
|--------|-------------|
| Prémios `/premios` | View own prizes; filter by year/month/concessão/origem; Excel export |
| Consulta Cartões `/cartoes` | View own cards; create card (with declaration upload); inactivate/reactivate own card; view balance history; download filled RTF declaration |

### IMPORTADOR
All USER capabilities plus:
| Module | Capabilities |
|--------|-------------|
| Consulta Cartões | Transfer card to another user; inactivate/reactivate own card |
| Validação Prémios `/backoffice/validacao` | View pending prizes; annul prizes (sets status ANULADO) |
| Saldo Cartão `/backoffice/saldo-cartao` | Full card list with balance; Excel export |
| Origens `/backoffice/origens` | Manage prize origin types (CRUD + Excel export) |
| Cartões `/backoffice/cartoes` | Approve/reject card declarations |
| Importações `/backoffice/importacoes` | Import prizes, aftersales prizes, card top-ups, origins, concessões via Excel; download templates and last uploaded file |
| Histórico de Carregamentos `/backoffice/historico` | Full top-up loading history |
| Concessões `/backoffice/concessoes` | Manage concessões |

### VALIDADOR
| Module | Capabilities |
|--------|-------------|
| Validação Prémios | Validate/reject pending prizes (individual + bulk); annul prizes |

### ADMIN
All of the above, plus:
| Module | Capabilities |
|--------|-------------|
| Consulta Cartões | Transfer any card; inactivate/reactivate any card |
| Gestão de Utilizadores `/utilizadores` | Full user CRUD; approve/reject registrations; reset password; deactivate/reactivate accounts (deactivation also inactivates the user's cards) |

---

## Multi-brand

After login the user selects a brand from a picker (`/driveevents`). The selected brand slug is stored in Zustand + localStorage and sent as a query param on every API call, so the backend scopes all results to that brand. Sidebar colours update via CSS variables (`--brand-primary`, `--brand-light`) injected by `useBrandTheme`.

---

## API endpoints

### Auth
| Method | Path |
|--------|------|
| POST | `/api/auth/login` |
| GET | `/api/auth/me` |
| PUT | `/api/auth/change-password` |

### Users
| Method | Path | Guard |
|--------|------|-------|
| GET | `/api/users` | elevated |
| GET | `/api/users/:id` | authenticated |
| POST | `/api/users` | elevated |
| PUT | `/api/users/:id` | elevated |
| DELETE | `/api/users/:id` | elevated |
| PUT | `/api/users/:id/reset-password` | elevated |
| PUT | `/api/users/:id/approve` | elevated |
| PUT | `/api/users/:id/reject` | elevated |
| PUT | `/api/users/:id/deactivate` | elevated |
| PUT | `/api/users/:id/reactivate` | elevated |

### Cards
| Method | Path | Guard |
|--------|------|-------|
| GET | `/api/cards` | authenticated |
| GET | `/api/cards/export` | authenticated |
| GET | `/api/cards/declaration-template` | authenticated |
| GET | `/api/cards/:id` | authenticated |
| POST | `/api/cards` | authenticated + multipart |
| PUT | `/api/cards/:id/validate` | elevated |
| PUT | `/api/cards/:id/balance` | authenticated (owner or elevated) |
| PUT | `/api/cards/:id/inactivate` | authenticated (owner or elevated) |
| PUT | `/api/cards/:id/reactivate` | authenticated (owner or elevated) |
| PUT | `/api/cards/:id/transfer` | elevated |

### Prizes
| Method | Path | Guard |
|--------|------|-------|
| GET | `/api/prizes` | authenticated |
| GET | `/api/prizes/export` | authenticated |
| GET | `/api/prizes/pending` | elevated |
| POST | `/api/prizes/approve` | admin+validador |
| POST | `/api/prizes/reject` | admin+validador |
| PUT | `/api/prizes/:id/annul` | elevated |
| DELETE | `/api/prizes/:id` | elevated (PENDENTE only) |

### Imports
| Method | Path |
|--------|------|
| GET | `/api/imports` — import history |
| GET | `/api/imports/template/:type` — download blank template |
| GET | `/api/imports/last-file/:type` — download last uploaded file |
| POST | `/api/imports/prizes` |
| POST | `/api/imports/prizes-aftersales` |
| POST | `/api/imports/topup` |
| POST | `/api/imports/origins` |
| POST | `/api/imports/concessoes` |

All import POSTs require `elevated` and `multipart/form-data` with a `file` field.

### Origins / Concessões / Card loading history
Standard GET (list + export) and CRUD endpoints under `/api/origins`, `/api/concessoes`, `/api/card-loading`.

---

## Email triggers

1. Card declaration submitted → Finance team
2. Card approved → Card holder
3. Card rejected → Card holder (with reason)
4. Prize import success → Importer
5. Prize import error → Importer (with error list)
6. Prize validation approved → Stakeholders
7. Prize validation rejected → Importer
8. Card balance updated → Card holder
9. Monthly reminder (1st of month, 09:00) → All active card holders

---

## Production

- Replace `DATABASE_URL` with a PostgreSQL connection string; run `npx prisma migrate deploy`
- Set a strong `JWT_SECRET` (32+ random chars)
- Set `NODE_ENV=production`
- Serve the frontend build via nginx and proxy `/api` and `/uploads` to the Express process
- Configure SMTP with a transactional provider (SendGrid, Mailgun, etc.)
