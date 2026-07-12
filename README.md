# TransitOps — Smart Transport Operations Platform

A full-stack transport operations platform built for the Odoo VR Hackathon. Digitizes vehicle, driver, dispatch, maintenance, and expense management with real-time operational insights.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, Tailwind CSS 4, Recharts |
| Backend | Node.js, Express |
| Database | **PostgreSQL** (via Prisma ORM) |
| Auth | JWT + Role-Based Access Control (RBAC) |

## Features

- **Authentication & RBAC** — 4 roles: Fleet Manager, Driver, Safety Officer, Financial Analyst
- **Dashboard** — KPIs, fleet utilization, filters by type/status/region
- **Vehicle Registry** — CRUD with unique registration numbers and status lifecycle
- **Driver Management** — License tracking, safety scores, expiry warnings
- **Trip Management** — Draft → Dispatched → Completed → Cancelled with automatic status transitions
- **Maintenance** — Auto-sets vehicle to "In Shop", restores on close
- **Fuel & Expenses** — Operational cost tracking per vehicle
- **Reports & Analytics** — Fuel efficiency, fleet utilization, ROI, CSV/PDF export
- **Dark Mode** — Full theme toggle
- **Responsive UI** — Mobile-friendly professional design

## Business Rules Enforced

- Unique vehicle registration numbers
- Retired/In Shop vehicles excluded from dispatch
- Expired/suspended drivers cannot be assigned
- On-trip vehicles/drivers blocked from new assignments
- Cargo weight validated against vehicle capacity
- Automatic status transitions on dispatch/complete/cancel/maintenance

## Quick Start

### Prerequisites

- Node.js 18+
- Docker (for PostgreSQL) OR a local PostgreSQL instance

//temporary using sql lite
### 1. Start PostgreSQL

```bash
docker compose up -d
```

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
npm install
npx prisma db push
npm run db:seed
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Fleet Manager | fleet@transitops.com | password123 |
| Driver | driver@transitops.com | password123 |
| Safety Officer | safety@transitops.com | password123 |
| Financial Analyst | finance@transitops.com | password123 |

## Example Workflow (from spec)

1. Register vehicle **Van-05** (500 kg capacity) — pre-seeded
2. Register driver **Alex** — pre-seeded
3. Create trip with 450 kg cargo → validated against capacity
4. Dispatch → vehicle & driver become **On Trip**
5. Complete trip with odometer & fuel data
6. Vehicle & driver return to **Available**
7. Create maintenance record → vehicle becomes **In Shop**
8. Reports update with operational cost & fuel efficiency

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | Login |
| GET | /api/dashboard | Dashboard KPIs |
| CRUD | /api/vehicles | Vehicle registry |
| CRUD | /api/drivers | Driver management |
| CRUD | /api/trips | Trip lifecycle |
| POST | /api/trips/:id/dispatch | Dispatch trip |
| POST | /api/trips/:id/complete | Complete trip |
| CRUD | /api/maintenance | Maintenance logs |
| CRUD | /api/expenses | Fuel & expenses |
| GET | /api/reports/analytics | Analytics data |
| GET | /api/reports/export/csv | CSV export |
| GET | /api/reports/export/pdf | PDF export |

## Project Structure

```
├── backend/
│   ├── prisma/schema.prisma   # Database schema
│   ├── prisma/seed.js         # Demo data
│   └── src/
│       ├── routes/            # API routes
│       ├── middleware/        # Auth middleware
│       └── utils/rules.js     # Business rule validators
├── frontend/
│   └── src/
│       ├── pages/             # Dashboard, Vehicles, Trips, etc.
│       ├── components/        # Layout, UI components
│       └── context/           # Auth & Theme providers
└── docker-compose.yml         # PostgreSQL container
```

## Team

Built for **ODOO Hackathon Team 5star** — Odoo VR 2026
