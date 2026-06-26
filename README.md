# PitchBook — Soccer Field Booking Management

A full-stack web application for booking soccer fields, forming teams, and organizing matches. Built for Vietnamese sports communities with support for both individual bookings and team-vs-team matchmaking.

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Getting Started](#getting-started)
4. [Seed / Demo Data](#seed--demo-data)
5. [Feature Walkthrough](#feature-walkthrough)
6. [Project Structure](#project-structure)
7. [API Reference](#api-reference)

---

## Overview

**PitchBook** lets players search for and book football pitches, build teams, challenge other teams, and fill open lobbies for pickup games — all without leaving the browser.

### Key Features

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
JWT_SECRET="replace-this-with-a-secure-random-string"
```

`client/web/.env.local`:
```env
# URL of the running backend (no trailing slash)
NEXT_PUBLIC_API_URL=http://localhost:5000

# Set to true to run the frontend with local mock data (no backend needed)
NEXT_PUBLIC_USE_MOCK=false
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

## Seed / Demo Data

The project ships with seed scripts that populate the database with sample complexes, fields, users, and bookings.

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

## Feature Walkthrough

### Field Booking

Browse available pitches on `/fields` using filters for field type (5v5 / 7v7 / 11v11), surface (indoor/outdoor), and date. Each field detail page shows a visual timeline grid of booked and available slots for the selected day. Pick a start and end time, set your team size, and optionally toggle **"Need matching opponent"** to enter the matchmaking queue.

### Teams

Create a team from `/teams`, set its size, and invite players by username. The team leader can remove members, edit team info, or disband the team. Pending invites are shown in a dedicated panel — members accept or decline from there.

### Match Challenges

Team leaders post a public or private match challenge on `/matching`, specifying a field and preferred time. Other teams browse the open feed and accept a challenge that fits their size. On acceptance, the system auto-creates a confirmed **Match** and **Bookings** for both sides. Private posts generate a shareable code so leaders can invite a specific opponent directly.

### Lobby System

Individual players who don't have a full team can create or join a lobby on `/lobbies`. Each lobby tracks a fill ratio (`X / TeamSize`). When complementary lobbies for the same field and time fill up on both sides, the system automatically merges them into a confirmed match for all participants.

### Real-time Chat & Friends

Send friend requests from `/friends`, then open a chat panel to message friends directly via Socket.IO. Inside a conversation, leaders can send a team invite in one click. All message history is persisted in the database.

### My Venues

Field owners access `/my-venues` to see all their registered complexes, view incoming bookings across all fields, and inspect a daily schedule timeline per field. Venue ownership is assigned by an admin.

### Admin Panel

Admins manage the full catalogue of complexes and fields at `/admin`. The dashboard shows live stats (total fields, pending bookings) and a recent bookings table. Admins can create, edit, and delete complexes and fields, and view a schedule grid per complex showing all bookings across all fields for the day.

---

## Project Structure

```
soccer-field-booking-management/
├── client/web/                     # Next.js 15 frontend
│   └── src/
│       ├── app/                    # Pages (App Router)
│       │   ├── (auth)/             # Login, Register (no navbar)
│       │   ├── admin/              # Admin-only pages
│       │   ├── bookings/           # Bookings list + detail
│       │   ├── dashboard/          # User home screen
│       │   ├── fields/             # Field browser + detail
│       │   ├── friends/            # Friends & direct chat
│       │   ├── lobbies/            # Pickup lobby browser
│       │   ├── matching/           # Match challenge feed
│       │   ├── my-venues/          # Owner venue dashboard
│       │   └── teams/              # Team management
│       ├── components/
│       │   ├── ui/                 # Button, Card, Input, Modal, Toast, Badge...
│       │   ├── layout/             # Navbar, AppShell, MobileNav
│       │   ├── bookings/           # BookingCard, BookingForm, BookingStatusBadge
│       │   ├── fields/             # FieldCard, FieldGrid, TimeSlotPicker
│       │   ├── matching/           # MatchCard
│       │   └── schedule/           # ComplexScheduleGrid, FieldSchedulePanel
│       ├── hooks/                  # useBookings, useFields, useTeams, useMatches...
│       └── lib/
│           ├── api/                # HTTP call functions per feature
│           ├── auth/               # JWT context + useAuth hook
│           ├── bookings/           # Bookings context (cross-page state)
│           ├── i18n/               # EN/VI translation strings + toggle
│           ├── mock/               # Offline fallback mock data
│           ├── notifications/      # Notification helpers
│           ├── types/              # Shared TypeScript interfaces
│           ├── utils/              # cn() helper, formatCurrency, formatDateRange
│           ├── constants.ts        # App-wide constants
│           └── socket.ts           # Socket.IO client setup
│
└── server/                         # Express backend
    └── src/
        ├── controllers/            # Route handlers per feature
        ├── middleware/             # verifyToken — JWT auth guard
        ├── prisma/                 # schema.prisma (PostgreSQL schema)
        ├── routes/                 # Route definitions
        ├── services/               # Auto-cleanup job (runs every 5 min)
        ├── db.cjs                  # PostgreSQL client
        ├── index.js                # Server entry point
        └── socket.js               # Socket.IO server (real-time chat)
```

---

## API Reference

Full endpoint reference: [`docs/API.md`](docs/API.md)

### Quick Summary

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Register a new account |
| POST | `/api/auth/login` | No | Login and receive JWT |
| GET | `/api/auth/me` | Yes | Get the current user |
| GET | `/api/fields` | No | List all fields |
| GET | `/api/fields/:id` | No | Get a single field |
| GET | `/api/bookings/user/:userId` | Yes | List a user's bookings |
| POST | `/api/bookings` | Yes | Create a booking |
| DELETE | `/api/bookings/:id` | Yes | Cancel a booking |
| GET | `/api/teams/mine` | Yes | List your teams |
| POST | `/api/teams` | Yes | Create a team |
| POST | `/api/teams/:id/members` | Yes (leader) | Invite a member |
| GET | `/api/match-posts` | No | Browse open match challenges |
| POST | `/api/match-posts` | Yes (leader) | Post a challenge |
| POST | `/api/match-posts/:id/accept` | Yes (leader) | Accept a challenge |
| GET | `/api/lobbies` | No | Browse open lobbies |
| POST | `/api/lobbies` | Yes | Create a lobby |
| POST | `/api/lobbies/:id/join` | Yes | Join a lobby |
| DELETE | `/api/lobbies/:id/leave` | Yes | Leave a lobby |
| GET | `/api/friends` | Yes | List friends |
| POST | `/api/friends` | Yes | Send a friend request |
| POST | `/api/friends/:id/accept` | Yes | Accept a friend request |
| GET | `/api/friends/:id/messages` | Yes | Get chat messages |
| POST | `/api/friends/:id/messages` | Yes | Send a message |
| GET | `/api/admin/complexes` | Admin | List all complexes |
| POST | `/api/admin/complexes` | Admin | Create a complex |
| POST | `/api/admin/fields` | Admin | Create a field |
| PUT | `/api/admin/fields/:id` | Admin | Update a field |
| DELETE | `/api/admin/fields/:id` | Admin | Delete a field |

All protected endpoints require:
```
Authorization: Bearer <jwt-token>
```

---

## Notes

- **Mock data mode** — Set `NEXT_PUBLIC_USE_MOCK=true` to run the frontend with local mock data when the backend is offline. Useful for UI-only development.
- **Auto-cleanup** — The backend runs a cleanup job every 5 minutes to expire stale lobbies, open match posts, and dangling pending bookings.
- **Currency** — All prices are in Vietnamese Dong (VND).
- **JWT expiry** — Auth tokens expire after 1 hour. Expired sessions redirect automatically to `/login`.
- **Roles** — Two roles: `player` (default on registration) and `admin` (assigned via seed or manually in the database).
