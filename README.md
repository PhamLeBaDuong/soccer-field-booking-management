# PitchBook — Soccer Field Booking Management

A full-stack web application for booking soccer fields, forming teams, and organizing matches. Built for Vietnamese sports communities.

---

## Features

| Feature | Description |
|---|---|
| Field Booking | Search, filter, and book 5v5 / 7v7 / 11v11 pitches by date and time |
| Team Management | Create teams, invite members, manage rosters |
| Match Challenges | Post or accept team-vs-team challenges — auto-confirms booking on acceptance |
| Lobby System | Pickup game lobbies that auto-merge into a confirmed match when full |
| Real-time Chat | Friend requests, direct messaging, and team invites via Socket.IO |
| Admin Panel | Manage venues, fields, pricing, and daily schedules |
| Bilingual UI | English / Vietnamese language toggle |

---

## Tech Stack

### Frontend

| Tool | Version | Role |
|---|---|---|
| Next.js | 15.4 | App Router, SSR |
| React | 19.1 | UI framework |
| TypeScript | 5 | Type safety |
| Tailwind CSS | 4 | Styling |
| Framer Motion | 12 | Animations |
| Socket.IO Client | 4.8 | Real-time chat |

### Backend

| Tool | Version | Role |
|---|---|---|
| Node.js | >= 20 | Runtime |
| Express | 5.1 | HTTP server |
| Prisma | 6.14 | ORM |
| PostgreSQL | >= 14 | Database |
| Socket.IO | 4.8 | Real-time messaging |
| JWT | 9.0 | Authentication |
| Bcrypt | 6.0 | Password hashing |

---

## Getting Started

**Prerequisites:** Node.js >= 20, PostgreSQL >= 14

### 1. Clone and install

```bash
git clone https://github.com/your-username/soccer-field-booking-management.git

cd server && npm install
cd ../client/web && npm install
```

### 2. Configure environment

`server/.env`:
```env
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/pitchbook"
PORT=5000
JWT_SECRET="your-secret"
```

`client/web/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### 3. Set up the database

Create the database first, then push the schema:

```bash
# In psql or pgAdmin:
CREATE DATABASE pitchbook;

# Then from the server/ directory:
npx prisma db push
```

### 4. Run

```bash
# Terminal 1 — backend (http://localhost:5000)
cd server && npm run dev

# Terminal 2 — frontend (http://localhost:3000)
cd client/web && npm run dev
```

---

## Seed Data

```bash
# From the server/ directory:
node seed.js          # minimal — admin user + basic fields
node seed_demo.js     # full demo — complexes, users, bookings, matches
node seed_social.cjs  # social data — friends and chat history
```

Demo credentials after `seed_demo.js`:

| Role | Username | Password |
|---|---|---|
| Admin | `admin` | `admin123` |
| Player | `player1` | `password123` |
| Player | `player2` | `password123` |

---

## Project Structure

```
soccer-field-booking-management/
├── client/web/               # Next.js 15 frontend
│   └── src/
│       ├── app/              # Pages (App Router)
│       ├── components/       # UI, layout, bookings, fields, schedule
│       ├── hooks/            # useBookings, useFields, useTeams...
│       └── lib/              # API clients, auth, i18n, socket, types
│
└── server/                   # Express backend
    └── src/
        ├── controllers/      # Route handlers
        ├── middleware/       # JWT auth guard
        ├── prisma/           # schema.prisma
        ├── routes/           # Route definitions
        ├── services/         # Auto-cleanup job (runs every 5 min)
        └── socket.js         # Socket.IO real-time layer
```

---

## API

Full endpoint reference: [`docs/API.md`](docs/API.md)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Register a new account |
| POST | `/api/auth/login` | No | Login → JWT |
| GET | `/api/fields` | No | List all fields |
| POST | `/api/bookings` | Yes | Create a booking |
| DELETE | `/api/bookings/:id` | Yes | Cancel a booking |
| GET | `/api/teams/mine` | Yes | Your teams |
| POST | `/api/match-posts` | Yes | Post a match challenge |
| POST | `/api/match-posts/:id/accept` | Yes | Accept a challenge |
| POST | `/api/lobbies` | Yes | Create a lobby |
| POST | `/api/lobbies/:id/join` | Yes | Join a lobby |
| GET | `/api/friends/:id/messages` | Yes | Chat history |
| POST | `/api/admin/complexes` | Admin | Create a venue |
| POST | `/api/admin/fields` | Admin | Create a field |

All protected endpoints require:
```
Authorization: Bearer <jwt-token>
```
