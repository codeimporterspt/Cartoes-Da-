# Cartões Dá — Hyundai Portugal Extranet

Internal platform for managing employee reward cards (Cartão Dá) and prize/bonus workflows.

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: JWT with role-based access (ADMIN / USER)
- **Files**: ExcelJS (import/export), Multer (uploads)
- **Email**: Nodemailer
- **Scheduler**: node-cron (monthly reminder)

---

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

---

## Setup

### 1. Clone and install

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Database

Create a PostgreSQL database:

```sql
CREATE DATABASE cartoes_da;
```

### 3. Environment variables

**Backend** — copy `backend/.env.example` to `backend/.env` and fill in:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/cartoes_da"
JWT_SECRET="change-this-to-a-long-random-string"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
FINANCE_EMAIL="finance@hyundai.pt"
FRONTEND_URL="http://localhost:5173"
```

### 4. Run Prisma migrations and seed

```bash
cd backend
npx prisma migrate dev --name init
npm run prisma:seed
```

### 5. Start the servers

```bash
# Terminal 1 — Backend
cd backend
npm run dev

# Terminal 2 — Frontend
cd frontend
npm run dev
```

Open http://localhost:5173

---

## Default Credentials (seed data)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@hyundai.pt | password123 |
| User | joao.silva@hyundai.pt | password123 |
| User | maria.santos@hyundai.pt | password123 |

---

## Modules

### Standard User
| Module | Description |
|--------|-------------|
| Prémios | View own prizes with filters (year, month, concessão) and Excel export |
| Consulta Cartões | View own cards, create new card with declaration upload, view balance history |

### Admin (BackOffice)
| Module | Description |
|--------|-------------|
| Validação Prémios | Approve / Reject / Annul pending prizes in bulk with email notifications |
| Saldo Cartão | Full card list with dealer code, NIF, balance — Excel export |
| Origens | Manage prize origin types — CRUD + Excel export |
| Cartões | All card requests, validate/reject declarations |
| Importações | Import prizes, card top-ups, origins via Excel with template download |
| Histórico Carregamentos | Full loading history with origem, extranet login, movement + balance values |
| Utilizadores | Full user CRUD with password reset; delete auto-inactivates cards |

---

## API Endpoints

### Auth
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PUT /api/auth/change-password`

### Users (admin only except GET own)
- `GET /api/users`
- `POST /api/users`
- `PUT /api/users/:id`
- `DELETE /api/users/:id`
- `PUT /api/users/:id/reset-password`

### Cards
- `GET /api/cards` — filtered list
- `POST /api/cards` — create with declaration upload
- `PUT /api/cards/:id/validate` — admin: approve/reject
- `PUT /api/cards/:id/balance` — admin: update balance
- `PUT /api/cards/:id/inactivate`
- `PUT /api/cards/:id/reactivate` — admin
- `PUT /api/cards/:id/transfer` — admin
- `GET /api/cards/export` — Excel download

### Prizes
- `GET /api/prizes`
- `GET /api/prizes/pending`
- `POST /api/prizes/approve`
- `POST /api/prizes/reject`
- `POST /api/prizes/annul`
- `GET /api/prizes/export`

### Imports
- `GET /api/imports/template/:type` — download template (prizes|topup|origins)
- `POST /api/imports/prizes`
- `POST /api/imports/topup`
- `POST /api/imports/origins`

### Origins / Concessões / Card Loading
- Standard CRUD and export endpoints

---

## Email Triggers

1. New card declaration → Finance team
2. Card approved → Card holder
3. Card rejected → Card holder (with reason)
4. Prize import success → Importer
5. Prize import error → Importer (with error list)
6. Prize validation approved → Stakeholders
7. Prize validation rejected → Importer
8. Card balance updated → Card holder
9. Monthly reminder (1st of month, 09:00) → All active card holders

---

## Production Notes

- Set `NODE_ENV=production` to reduce DB query logging
- Use a reverse proxy (nginx) to serve frontend build and proxy API
- Configure SMTP with a transactional email service (SendGrid, Mailgun, etc.)
- Set strong `JWT_SECRET` — minimum 32 random characters
- Configure file upload limits and storage path in `.env`
