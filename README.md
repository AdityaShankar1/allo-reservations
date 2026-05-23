# Allo Reservations

![Next JS](https://img.shields.io/badge/Next-black?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)
![Vercel](https://img.shields.io/badge/vercel-%23000000.svg?style=for-the-badge&logo=vercel&logoColor=white)

A concurrency-safe inventory reservation system built for the Allo Engineering take-home exercise.

[![Watch the video](https://img.youtube.com/vi/fw1sIspfExw/maxresdefault.jpg)](https://youtu.be/fw1sIspfExw)

## Problem Statement

In ecommerce systems, payment confirmation may take several minutes due to UPI, 3DS, wallet redirects, or banking delays.

If inventory is decremented only after payment succeeds, multiple users may successfully pay for the same physical unit.

This project solves that problem using temporary inventory reservations.

---

## Quick start

### Prerequisites

- Node.js 20+
- PostgreSQL (Supabase or any hosted Postgres)

### Setup

```bash
npm install
cp .env.example .env
# Set DATABASE_URL in .env to your Postgres connection string
npx prisma db push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment

| Variable       | Description                |
| ---------------- | -------------------------- |
| `DATABASE_URL`   | PostgreSQL connection URL (use Supabase **pooler** port `6543` with `?pgbouncer=true` for Vercel) |

### Deploy on Vercel

1. Import [github.com/AdityaShankar1/allo-reservations](https://github.com/AdityaShankar1/allo-reservations)
2. Set `DATABASE_URL` in Project → Settings → Environment Variables
3. Deploy (build runs `prisma generate` via `postinstall` + `build` script)
4. Seed once: `npm run db:seed` (from a machine with DB access)

**Live:** https://allo-reservations-nine.vercel.app

---

## Core flow

1. User reserves inventory during checkout
2. Inventory becomes temporarily unavailable (`reservedQuantity` increases)
3. Reservation expires after **10 minutes**
4. User may confirm purchase or cancel the reservation
5. Expired reservations release stock automatically (lazy cleanup)

---

## Stack

- Next.js App Router
- TypeScript
- Prisma ORM
- PostgreSQL (Supabase)
- Tailwind CSS
- shadcn/ui
- Zod
- Sonner (toasts)

## Architecture

```text
Next.js App Router
        ↓
Route Handlers
        ↓
Business Logic Layer
        ↓
Prisma Transactions
        ↓
PostgreSQL Row Locks
```

```mermaid
sequenceDiagram
    participant U as User
    participant A as Next.js API
    participant D as Database (Postgres)
    participant C as Cleanup Job

    U->>A: POST /api/reservations (reserve)
    A->>D: SELECT ... FOR UPDATE (Lock Row)
    D-->>A: Current Capacity
    alt Sufficient Stock
        A->>D: Increment reservedQuantity + Create Reservation
        D-->>A: OK
        A-->>U: 201 Created (10m hold)
    else Insufficient Stock
        A-->>U: 409 Conflict
    end

    U->>A: POST /api/reservations/:id/confirm (pay)
    A->>D: Update stock + Release Reservation
    D-->>A: OK
    A-->>U: 200 OK

    C->>D: Sweep expired reservations
    D->>D: reservedQuantity -= quantity
```

---

## API endpoints

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET | `/api/products` | Products with per-warehouse stock and `availableStock` |
| POST | `/api/reservations` | Create reservation (409 if insufficient stock) |
| GET | `/api/reservations/:id` | Reservation details + countdown |
| POST | `/api/reservations/:id/confirm` | Confirm purchase (410 if expired) |
| POST | `/api/reservations/:id/release` | Cancel / release hold |

---

## Concurrency handling

PostgreSQL row-level locking was chosen over distributed locking systems because it provides strong transactional guarantees with minimal infrastructure complexity for this scale of application.

The create-reservation endpoint uses a Prisma transaction with PostgreSQL row-level locking:

```sql
SELECT ... FROM "Inventory" WHERE ... FOR UPDATE
```

Inside the transaction:

1. Lock the inventory row
2. Check `totalQuantity - reservedQuantity >= requested quantity`
3. Increment `reservedQuantity`
4. Create the reservation with `expiresAt = now + 10 minutes`

If stock is insufficient, the transaction rolls back and the API returns **409**.

---

## Reservation expiry

**Current approach:** lazy cleanup

- On `GET /api/reservations/:id`, expired pending reservations are released
- On `POST .../confirm`, expired reservations return **410** and stock is released first

**Production improvement:** a Vercel Cron job (or `pg_cron`) to sweep expired reservations periodically, so stock is returned even if nobody reads the reservation again.

---

## Output Screenshot:

<img width="1457" height="551" alt="image" src="https://github.com/user-attachments/assets/433fdc6c-8be5-4204-b93f-65cd949b67e4" />


## Trade-offs

- **No auth** — demo MVP only
- **No idempotency keys** — would add Redis or a DB table for the bonus
- **Lazy expiry** — simple and correct, but stock may stay reserved until the next read/confirm if the user abandons the page
- **Polling UI** — reservation page refetches every 3s instead of WebSockets
- **Redis** - Redis-based distributed locking was intentionally avoided in the MVP because PostgreSQL transactions already provide sufficient correctness guarantees for inventory reservation at this scale.

---

## Project structure

```
src/
  app/
    api/          # Route handlers (thin)
    page.tsx      # Product catalog
    reservation/  # Checkout / hold page
  components/     # UI + client features
  lib/
    reservations.ts  # Business logic + transactions
    products.ts
    validations.ts
prisma/
  schema.prisma
  seed.ts
```

---

## Demo script

1. Open the home page — three products across three warehouses
2. Reserve 1 unit of **Ceramic Mug** from **Los Angeles** (only 1 available)
3. On the reservation page, watch the 10-minute countdown
4. **Confirm** — stock is permanently decremented
5. Or **Cancel** — reserved units return to available stock
6. Try reserving the last LA mug in two browser tabs — one gets 409

---

## Scripts

| Command | Description |
| ------- | ----------- |
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run db:push` | Sync schema to database |
| `npm run db:seed` | Seed demo data |

## Next Improvements

- Idempotency keys for retry-safe payment flows
- Cron-based expiry sweeper
- WebSocket inventory updates
- Reservation metrics / audit logs
- Distributed worker queues for async processing

