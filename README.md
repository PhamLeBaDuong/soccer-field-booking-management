# PitchBook - Soccer Field Booking Management

PitchBook is a full-stack web application for soccer field discovery, team coordination, match organization, and booking management. It is built around Vietnamese football communities, with support for players, team leaders, venue owners, and admins.

## Overview

The app helps players find available fields, join pickup lobbies, form teams, challenge other teams, manage bookings, and communicate with friends. Venue owners and admins can manage complexes, fields, prices, schedules, and booking activity.

## Key Features

| Area | Features |
| --- | --- |
| Authentication | Register, login, JWT sessions, role-aware navigation |
| Field Discovery | Browse fields, view details, see locations, compare pricing and amenities |
| Booking Flow | Availability checks, booking history, booking details, payment status |
| Payments | Cash, bank transfer, Stripe, PayPal, MoMo, VNPay, and ZaloPay integration points |
| Team Management | Create teams, manage members, invite players |
| Matchmaking | Public/private match posts, match acceptance, auto-created matches |
| Pickup Lobbies | Create or join lobbies for individual players and small groups |
| Social | Friends, direct messaging, team invites |
| Admin | Manage complexes, fields, schedules, owners, and bookings |
| Internationalization | English and Vietnamese UI strings |

## Tech Stack

### Frontend

| Tool | Role |
| --- | --- |
| Next.js 16 | App Router frontend |
| React 19 | UI framework |
| TypeScript | Static typing |
| Tailwind CSS 4 | Styling |
| Framer Motion | Page and UI transitions |
| Lucide React | Icons |
| Leaflet / React Leaflet | Field maps |
| Socket.IO Client | Realtime messaging |

### Backend

| Tool | Role |
| --- | --- |
| Node.js | Runtime |
| Express 5 | HTTP API |
| Prisma 6 | ORM |
| PostgreSQL | Database |
| JWT | Authentication |
| Bcrypt | Password hashing |
| Socket.IO | Realtime chat |
| Stripe SDK | Card checkout support |

## Project Structure

```text
soccer-field-booking-management/
|-- client/
|   `-- web/                         # Next.js frontend
|       |-- src/
|       |   |-- app/                 # App Router pages
|       |   |-- components/          # Reusable UI and feature components
|       |   |-- hooks/               # Feature data hooks
|       |   `-- lib/                 # API clients, auth, types, i18n, utilities
|       `-- public/                  # Static assets
|
|-- server/                          # Express backend
|   |-- src/
|   |   |-- controllers/             # Request handlers
|   |   |-- middleware/              # Auth middleware
|   |   |-- prisma/                  # Prisma schema and migrations
|   |   |-- routes/                  # API route definitions
|   |   |-- services/                # Business logic and payment services
|   |   |-- db.cjs                   # Prisma client
|   |   |-- index.js                 # Express and Socket.IO entry point
|   |   `-- socket.js                # Socket singleton helper
|   |-- seed.js                      # Basic seed script
|   |-- seed_demo.js                 # Full demo seed script
|   `-- seed_social.cjs              # Social/admin seed helper
|
|-- docs/
|   `-- API.md                       # API notes
|-- docker-compose.yml
|-- package.json                     # Root scripts
`-- README.md
```

## Prerequisites

- Node.js 20 or newer
- npm 10 or newer
- PostgreSQL 14 or newer
- Git

For Windows, PostgreSQL can be installed with the official EDB installer or:

```bash
winget install PostgreSQL.PostgreSQL
```

## Environment Variables

Create `server/.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/soccer_booking?schema=public"
JWT_SECRET="change-me-to-a-long-random-string"
PORT=5000
CLIENT_URL="http://localhost:3000"
API_URL="http://localhost:5000"

STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

PAYPAL_CLIENT_ID="..."
PAYPAL_CLIENT_SECRET="..."
PAYPAL_MODE="sandbox"

MOMO_PARTNER_CODE="..."
MOMO_ACCESS_KEY="..."
MOMO_SECRET_KEY="..."
MOMO_ENV="sandbox"

VNPAY_TMN_CODE="..."
VNPAY_HASH_SECRET="..."
VNPAY_ENV="sandbox"

ZALOPAY_APP_ID="..."
ZALOPAY_KEY1="..."
ZALOPAY_KEY2="..."
ZALOPAY_ENV="sandbox"
```

Create `client/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_USE_MOCK=false
```

## Installation

Install dependencies from the root, backend, and frontend folders as needed:

```bash
npm install
cd server
npm install
cd ../client/web
npm install
```

## Database Setup

Create the PostgreSQL database:

```sql
CREATE DATABASE soccer_booking;
```

Generate the Prisma client:

```bash
cd server
npx prisma generate --schema src/prisma/schema.prisma
```

Apply the schema during local development:

```bash
npx prisma db push --schema src/prisma/schema.prisma
```

Or run migrations if you prefer the migration flow:

```bash
npx prisma migrate dev --schema src/prisma/schema.prisma
```

## Running Locally

From the repository root, start both apps:

```bash
npm run dev
```

Or run them separately:

```bash
cd server
npm run dev
```

```bash
cd client/web
npm run dev
```

Default local URLs:

| App | URL |
| --- | --- |
| Frontend | `http://localhost:3000` |
| Backend API | `http://localhost:5000` |

## Seed Data

From `server/`, run one of the seed scripts:

```bash
node seed.js
```

```bash
node seed_demo.js
```

The demo seed creates users, complexes, fields, teams, friendships, match posts, lobbies, matches, and bookings.

Common demo accounts from the seed scripts include:

| Role | Username | Password |
| --- | --- | --- |
| Admin | `admin` | `admin123` |
| Player | `duong99` | `player123` |
| Player | `khanh88` | `player123` |
| Player | `minh77` | `player123` |

## Main User Flows

### Player

1. Register or log in.
2. Browse fields and view availability.
3. Join pickup lobbies or create a lobby.
4. Create or join a team.
5. Post or accept match challenges.
6. View bookings and payment status.
7. Add friends and send messages.

### Team Leader

1. Create a team.
2. Invite members.
3. Post public or private match challenges.
4. Accept compatible challenges from other teams.
5. Track confirmed matches and related bookings.

### Venue Owner

1. Open `My Venues`.
2. Review owned complexes and fields.
3. Monitor bookings and schedules for managed venues.

### Admin

1. Open `/admin`.
2. Manage complexes and fields.
3. Review bookings and schedule data.
4. Maintain venue and field metadata.

## API Summary

More API detail is available in [`docs/API.md`](docs/API.md) and `server/src/routes/`.

| Area | Base Path |
| --- | --- |
| Auth | `/api/auth` |
| Admin | `/api/admin` |
| Fields | `/api/fields` |
| Bookings | `/api/bookings` |
| Matches | `/api/matches` |
| Teams | `/api/teams` |
| Match Posts | `/api/match-posts` |
| Lobbies | `/api/lobbies` |
| Venues | `/api/venues` |
| Users | `/api/users` |
| Friends | `/api/friends` |
| Messages | `/api/messages` |
| Invites | `/api/invites` |
| Webhooks | `/api/webhooks` |

Protected endpoints require:

```http
Authorization: Bearer <jwt-token>
```

## Useful Scripts

### Root

```bash
npm run dev
```

Runs backend and frontend together with `concurrently`.

### Server

```bash
npm run dev
npm run start
npm run build
```

Note: the Prisma schema is stored at `server/src/prisma/schema.prisma`. If Prisma cannot find it, pass `--schema src/prisma/schema.prisma`.

### Frontend

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Notes

- Prices default to Vietnamese Dong (VND).
- JWT sessions currently expire after 1 hour.
- The backend runs cleanup work on an interval to expire stale lobbies, match posts, and completed records.
- `NEXT_PUBLIC_USE_MOCK=true` lets the frontend fall back to mock data for selected screens when the API is unavailable.
- Payment providers need real sandbox credentials before online checkout can be fully tested.

## Project Status

This project is a strong full-stack booking and matchmaking prototype. Before production deployment, prioritize clean build scripts, automated tests, stricter authorization checks, payment webhook hardening, and production-ready environment configuration.
