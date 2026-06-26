# PitchBook

## Tech Stack

### Frontend

| Tool | Version | Role |
|---|---|---|
| Next.js | 16.2 | App Router, SSR |
| React | 19.1 | UI framework |
| TypeScript | 5 | Type safety |
| Tailwind CSS | 4 | Styling |
| Lucide React | 1.17 | Icons |
| Framer Motion | 12 | Animations |
| Socket.IO Client | 4.8 | Real-time chat |
| DM Sans | — | Typography (Google Fonts) |

PitchBook is a full-stack web app for finding pitches, organizing teams, joining pickup lobbies, and confirming matches. It supports player workflows, venue-owner scheduling, admin catalogue management, and real-time friend/chat features.

## What It Does
| Tool | Version | Role |
|---|---|---|
| Node.js | >= 20 | Runtime |
| Express | 5.1 | HTTP server |
| Prisma | 6.14 | ORM |
| PostgreSQL | >= 14 | Database |
| Socket.IO | 4.8 | Real-time messaging |
| JWT | 9.0 | Authentication |
| Bcrypt | 6.0 | Password hashing |

| Area | Highlights |
| --- | --- |
| Field discovery | Browse fields by type, surface, lights, price, complex, and location. |
| Availability | View occupied time slots before choosing a booking window. |
| Teams | Create teams, manage rosters, and invite players. |
| Match posts | Team leaders can publish public or private opponent requests. Accepting a post creates the match and bookings. |
| Lobbies | Individual players can create or join pickup lobbies. Compatible full lobbies auto-match. |
| Bookings | Confirmed matches generate player bookings automatically. |
| Social | Friend requests, direct messages, team invites, and Socket.IO live delivery. |
| Venue tools | Venue owners manage their complexes, fields, schedules, and manual bookings. |
| Admin tools | Admins manage all complexes, fields, schedules, and match results. |
| Localization | English and Vietnamese UI strings with a language toggle. |

## Tech Stack

| Layer | Tools |
| --- | --- |
| Web | Next.js 15 App Router, React 19, TypeScript, Tailwind CSS 4, Framer Motion, Lucide icons |
| API | Node.js 20, Express 5, Socket.IO, JWT auth, bcrypt |
| Data | PostgreSQL, Prisma 6 |
| Dev | npm workspaces, concurrently, Docker Compose |

## Repository Layout

```text
soccer-field-booking-management/
  client/web/              Next.js frontend
    src/app/               App Router pages
    src/components/        Shared UI, layout, field, booking, schedule components
    src/hooks/             Feature data hooks
    src/lib/api/           HTTP client and API wrappers
    src/lib/auth/          Auth context and hooks
    src/lib/i18n/          English/Vietnamese translations
    src/lib/mock/          Frontend mock data mode
  server/                  Express API
    src/controllers/       Request handlers
    src/routes/            API route definitions
    src/services/          Domain logic and cleanup jobs
    src/prisma/            Prisma schema and migrations
    src/socket.js          Socket.IO helper
    seed*.js               Local/demo seed scripts
  docs/API.md              Detailed backend API reference
  docker-compose.yml       PostgreSQL + API local stack
  package.json             Root dev script
```

## Prerequisites

- Node.js 20 or newer
- npm
- PostgreSQL 14 or newer

Docker is optional. Use it if you want Postgres and the API started together without installing Postgres locally.

## Quick Start

### 1. Install dependencies

```bash
npm install
npm install --prefix server
npm install --prefix client/web
```

### 2. Configure environment

Create `server/.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/soccer_booking?schema=public"
JWT_SECRET="replace-this-with-a-secure-random-string"
PORT=5000
CLIENT_URL=http://localhost:3000
```

Create `client/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_USE_MOCK=false
```

### 3. Create and sync the database

Create the database in PostgreSQL:

```sql
CREATE DATABASE soccer_booking;
```

Then sync the Prisma schema:

```bash
cd server
npx prisma generate --schema=src/prisma/schema.prisma
npx prisma db push --schema=src/prisma/schema.prisma
```

### 4. Seed demo data

From `server/`:

```bash
node seed_demo.js
node seed_social.cjs
```

`seed_demo.js` creates demo users, complexes, fields, teams, bookings, match posts, lobbies, and match history. `seed_social.cjs` adds friend and chat data.

### 5. Run the app

From the repository root:

```bash
npm run dev
```

Or run each side separately:

```bash
npm run dev --prefix server
npm run dev --prefix client/web
```

Open:

# Full demo seed — multiple complexes, fields, users, bookings, matches
node seed_demo.js

# Social seed — friend relationships and chat history
node seed_social.cjs
```

After `node seed_demo.js`:

| Role | Username | Password |
| --- | --- | --- |
| Admin | `admin` | `admin123` |
| Player | `player1` | `password123` |
| Player | `player2` | `password123` |

Additional demo players and venue owners are printed by the seed script.

## Docker Option

The Docker Compose stack starts PostgreSQL and the API:

```bash
docker compose up --build
```

The API container runs `prisma db push` on boot. Start the frontend separately:

```bash
npm run dev --prefix client/web
```

Use this frontend env value with Docker:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## Mock Frontend Mode

To work on UI without a running backend, set:

```env
NEXT_PUBLIC_USE_MOCK=true
```

Mock mode uses local data from `client/web/src/lib/mock`.

## Common Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start API and web app together from the repository root. |
| `npm run dev --prefix server` | Start the Express API with nodemon. |
| `npm run dev --prefix client/web` | Start the Next.js dev server. |
| `npm run build --prefix client/web` | Build the frontend. |
| `npx prisma studio --schema=src/prisma/schema.prisma` | Browse the database from `server/`. |
| `npx prisma db push --schema=src/prisma/schema.prisma` | Sync the Prisma schema from `server/`. |

## API Overview

Base URL: `http://localhost:5000`

Protected routes require:

```http
Authorization: Bearer <jwt-token>
```

Primary route groups:

| Group | Purpose |
| --- | --- |
| `/api/auth` | Register, login, current user |
| `/api/fields` | Field browsing and nearby search |
| `/api/bookings` | User bookings and occupied slots |
| `/api/teams` | Team creation and roster management |
| `/api/match-posts` | Team-vs-team opponent requests |
| `/api/lobbies` | Pickup lobby browsing, creation, joining, leaving |
| `/api/matches` | Match details, user matches, cancellation |
| `/api/friends` | Friend requests and friend list |
| `/api/messages` | Conversation history and direct messages |
| `/api/invites` | Team invites |
| `/api/venues` | Venue-owner complexes, fields, schedules, manual bookings |
| `/api/admin` | Admin complex, field, schedule, and match-result management |

See [docs/API.md](docs/API.md) for the detailed endpoint reference.

## Core Flows

### Team Match

1. Register and log in.
2. Create a team.
3. Add or invite members.
4. Pick a field and time.
5. Create a public or private match post.
6. Another team accepts it.
7. The backend creates a confirmed match and bookings for both teams.

### Pickup Lobby

```
soccer-field-booking-management/
|
+-- client/web/                     # Next.js 15 frontend
|   +-- src/
|       +-- app/                    # Pages (App Router)
|       |   +-- (auth)/             # Login, Register (no navbar)
|       |   +-- admin/              # Admin-only pages
|       |   +-- bookings/           # Bookings list + detail
|       |   +-- dashboard/          # User home screen
|       |   +-- fields/             # Field browser + detail
|       |   +-- friends/            # Friends & direct chat
|       |   +-- history/            # Past matches log
|       |   +-- lobbies/            # Pickup lobby browser
|       |   +-- matching/           # Match challenge feed
|       |   +-- my-venues/          # Owner venue dashboard
|       |   +-- teams/              # Team management
|       +-- components/
|       |   +-- ui/                 # Button, Card, Input, Modal, Toast, Badge...
|       |   +-- layout/             # Navbar, AppShell, MobileNav
|       |   +-- bookings/           # BookingCard, BookingForm, BookingStatusBadge
|       |   +-- fields/             # FieldCard, FieldGrid, TimeSlotPicker
|       |   +-- matching/           # MatchCard
|       |   +-- schedule/           # ComplexScheduleGrid, FieldSchedulePanel
|       +-- hooks/                  # useBookings, useFields, useTeams, useMatches...
|       +-- lib/
|           +-- api/                # HTTP call functions per feature
|           +-- auth/               # JWT context + useAuth hook
|           +-- bookings/           # Bookings context (cross-page state)
|           +-- hooks/              # Shared lib-level hooks
|           +-- i18n/               # EN/VI translation strings + toggle
|           +-- mock/               # Offline fallback mock data
|           +-- notifications/      # Notification helpers
|           +-- types/              # Shared TypeScript interfaces
|           +-- utils/              # cn() helper, formatCurrency, formatDateRange
|           +-- constants.ts        # App-wide constants
|           +-- socket.ts           # Socket.IO client setup
|
+-- server/                         # Express.js backend
    +-- src/
        +-- controllers/            # Request handlers per feature
        +-- middleware/             # verifyToken — JWT auth guard
        +-- prisma/                 # schema.prisma (PostgreSQL schema)
        +-- routes/                 # Route definitions
        +-- services/               # cleanupService — auto-expires stale records every 5 min
        +-- db.cjs                  # PostgreSQL client (CommonJS)
        +-- index.js                # Server entry point
        +-- socket.js               # Socket.IO server setup (real-time chat)
```

### Venue Management

1. A venue owner creates or manages complexes under `/my-venues`.
2. Fields are attached to complexes with operating hours and pricing.
3. Owners inspect schedule grids and can create manual bookings.
4. Admins can manage the global catalogue under `/admin`.

## Notes

- Currency is Vietnamese Dong (`VND`).
- JWT tokens expire after 1 hour.
- The cleanup job runs every 5 minutes to expire stale lobbies, match posts, and pending bookings.
- Current roles are `player` and `admin`; venue ownership is represented by complex/field ownership.
- `docs/API.md` and a few source comments still contain older encoding artifacts. The runtime code and data model are unaffected, but those files are good candidates for a documentation cleanup pass.

