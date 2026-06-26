# PitchBook — Soccer Field Booking Management

A full-stack web application for booking soccer fields, forming teams, and organizing matches. Built for Vietnamese sports communities with support for both individual bookings and team-vs-team matchmaking.

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Prerequisites](#prerequisites)
4. [Installation](#installation)
5. [Environment Variables](#environment-variables)
6. [Running the Project](#running-the-project)
7. [Seed / Demo Data](#seed--demo-data)
8. [Usage Guide](#usage-guide)
   - [Authentication](#1-authentication)
   - [Browse & Book a Field](#2-browse--book-a-field)
   - [Manage Bookings](#3-manage-bookings)
   - [Teams](#4-teams)
   - [Team Matchmaking (Match Posts)](#5-team-matchmaking-match-posts)
   - [Lobby Matchmaking (Pickup Games)](#6-lobby-matchmaking-pickup-games)
   - [Friends & Messaging](#7-friends--messaging)
   - [My Venues](#8-my-venues)
   - [Admin Panel](#9-admin-panel)
9. [Project Structure](#project-structure)
10. [API Reference](#api-reference)

---

## Overview

**PitchBook** lets players search for and book football pitches, build teams, challenge other teams, and fill open lobbies for pickup games — all without leaving the browser.

### Key Features

| Feature | Description |
|---|---|
| Field Booking | Search, filter, and book 5v5 / 7v7 / 11v11 pitches by date and time |
| Team Management | Create teams, invite members, manage rosters |
| Match Posts | Post a match challenge; opponent teams accept to auto-confirm a game |
| Lobby System | Open pickup game slots; players join until both sides are full |
| Friends & Chat | Send friend requests, direct-message friends, invite them to your team |
| Admin Panel | Manage complexes, fields, pricing, and operating hours |
| Bilingual UI | Full English / Vietnamese language toggle |

---

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

## Prerequisites

Make sure the following are installed before proceeding:

- **Node.js** >= 20 — [nodejs.org](https://nodejs.org)
- **npm** >= 10 (comes with Node.js)
- **PostgreSQL** >= 14 — [postgresql.org](https://www.postgresql.org)
- **Git**

> **Windows users:** Install PostgreSQL via the [EDB installer](https://www.enterprisedb.com/downloads/postgres-postgresql-downloads) or run `winget install PostgreSQL.PostgreSQL`.

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/your-username/soccer-field-booking-management.git
cd soccer-field-booking-management
```

### 2. Install backend dependencies

```bash
cd server
npm install
```

### 3. Install frontend dependencies

```bash
cd ../client/web
npm install
```

---

## Environment Variables

### Backend — `server/.env`

Create the file `server/.env`:

```env
# PostgreSQL connection string
# Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/pitchbook"

# Server port (optional — defaults to 5000)
PORT=5000

# JWT secret — use a long random string in production
JWT_SECRET="replace-this-with-a-secure-random-string"
```

> **Create the database first** (in psql or pgAdmin):
> ```sql
> CREATE DATABASE pitchbook;
> ```

### Frontend — `client/web/.env.local`

Create the file `client/web/.env.local`:

```env
# URL of the running backend (no trailing slash)
NEXT_PUBLIC_API_URL=http://localhost:5000

# Optional: use mock data when the backend is offline
NEXT_PUBLIC_USE_MOCK=false
```

---

## Running the Project

### Step 1 — Push the database schema

Run this **once** after creating the database (or again after schema changes):

```bash
cd server
npx prisma db push
```

### Step 2 — Start the backend

```bash
# From the server/ directory
npm run dev
```

The API is available at `http://localhost:5000`.
You should see: `Server running on port 5000`.

### Step 3 — Start the frontend

Open a **second terminal**:

```bash
# From the client/web/ directory
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## Seed / Demo Data

The project ships with seed scripts that populate the database with sample complexes, fields, users, and bookings.

```bash
# From the server/ directory

# Minimal seed — admin user + basic fields
node seed.js

# Full demo seed — multiple complexes, fields, users, bookings, matches
node seed_demo.js

# Social seed — friend relationships and chat history
node seed_social.cjs
```

After running the demo seed, log in with these accounts:

| Role | Username | Password |
|---|---|---|
| Admin | `admin` | `admin123` |
| Player | `player1` | `password123` |
| Player | `player2` | `password123` |

---

## Usage Guide

### 1. Authentication

#### Register a new account

1. Open `http://localhost:3000`. You are redirected to `/login`.
2. Click **"Create one"** at the bottom of the form.
3. Fill in the registration form:
   - **Full name** — your display name (e.g. `Nguyen Van A`)
   - **Username** — unique login handle, no spaces (e.g. `nguyenvana`)
   - **Email address** — must be a valid format
   - **Phone number** — optional
   - **Password** — minimum 6 characters
   - **Confirm password** — must match the password above
4. Click **Create Account**. You are automatically logged in and redirected to the dashboard.

#### Log in

1. Go to `/login`.
2. Enter your **username or email** and **password**.
3. Click **Sign in**.

#### Switch language

Click the **EN | VI** toggle in the top-right of the navbar to switch between English and Vietnamese. The preference is saved locally.

#### Log out

Click your avatar (top-right navbar) — **Logout**. On mobile, tap the hamburger menu — **Sign out**.

---

### 2. Browse & Book a Field

#### Browse available fields

1. Click **Fields** in the navbar, or go to `/fields`.
2. Use the sticky filter bar to narrow results:
   - **Search** — type a field name or complex/venue name
   - **Type** — 5v5, 7v7, or 11v11
   - **Surface** — Indoor or Outdoor
   - **Date** — pick a date to check availability for that day
   - **Sort by** — Price (low to high) or Name (A to Z)
3. Each field card displays:
   - Field name, venue (complex), and location tag
   - Price per hour (VND)
   - Operating hours
   - Surface amenity badges (Indoor / Lights)
4. Hover over a card to see it lift — click **View & Book** to open the detail page.

#### Book a field

1. On the field detail page (`/fields/:id`) you will see:
   - Description, address, operating hours, and price
   - **Timeline grid** — a visual block showing which time slots are already booked today. Occupied slots are shaded; your planned slot is highlighted as you select it.
   - **Booking form** on the right (or below on mobile)
2. Fill in the booking form:
   - **Start time** — must be within operating hours and not overlap an occupied slot
   - **End time** — must be after the start time and within operating hours
   - **Team size** — number of players on your side
   - **Need matching opponent** — toggle ON if you want the system to find you an opponent team (sets status to `matching`)
3. Click **Book Field**.
4. A success toast confirms the booking. Status is **Pending** until confirmed.

> **Tip:** If the slot you want is unavailable, the timeline grid shows exactly when it is free.

---

### 3. Manage Bookings

#### View all bookings

Go to `/bookings` (click **Bookings** in the navbar).

Use the **segment tab bar** at the top to filter:

| Tab | Shows |
|---|---|
| All | Every booking you have ever made |
| Upcoming | Future bookings that are not canceled |
| Pending | Awaiting venue or system confirmation |
| Confirmed | Confirmed — ready to play |
| Canceled | All canceled bookings |

Each booking card shows: field name and venue, status badge (color-coded), date and time range, team size, and total price.

#### Cancel a booking

1. Find the booking card with status **Pending** or **Confirmed**.
2. Click the **Cancel** button (far right of the card).
3. An inline confirmation prompt appears — click **Yes** to proceed, **No** to dismiss.
4. Status changes to **Canceled** and a toast notification confirms the action.

> Only bookings with status **Pending** or **Confirmed** can be canceled.

#### View booking details

Click **View Details** on any booking card to open `/bookings/:id`, which shows full field info, booking time, price, status, and associated match information (if part of a matched game).

---

### 4. Teams

Go to `/teams` (click **Teams** in the navbar).

#### Create a team

1. Click **Create Team** (top-right of the page).
2. Fill in:
   - **Team name** — e.g. `FC Thu Duc`
   - **Size** — number of players per side (e.g. `5` for a 5v5 team)
3. Click **Create**. You become the team **Leader** automatically.

#### Invite players to your team

1. Open your team panel.
2. Click **Invite Player**.
3. Search for a player by username.
4. Click **Send Invite**. The invitation appears in the target player's pending invites.

#### Accept or decline an invite

Pending invites appear in the **Invites** panel on the Teams page.
- Click **Accept** to join the team.
- Click **Decline** to reject it.

#### Leader-only actions

As the team leader you can:
- **Remove a member** — click the remove icon next to their name
- **Disband the team** — click **Disband** (permanent, cannot be undone)
- **Edit team info** — click the edit icon on the team card

---

### 5. Team Matchmaking (Match Posts)

Match Posts let one team post a public challenge. Another team finds it and accepts. When accepted, a confirmed **Match** and both teams' **Bookings** are created automatically.

Go to `/matching` (click **Matches** in the navbar).

#### Post a match challenge

1. Click **Post Match**.
2. Fill in:
   - **Team** — select one of the teams where you are the leader
   - **Field** — the field where you want to play
   - **Preferred start time** and **end time**
   - **Visibility**:
     - **Public** — appears in the open feed for any team to accept
     - **Private** — generates a code; only the team you share the code with can accept
3. Click **Post**. Your challenge appears in the feed with status **Open**.

#### Browse and accept challenges

1. The feed shows all open public match posts from other teams.
2. Each card shows: team name, field, time, and size requirement.
3. Click **Accept** on a post that matches your team's size.
4. Select your team from the dropdown and confirm.
5. If the field slot is available and sizes match, a **Match** is confirmed instantly. Both teams' bookings change to **Confirmed**.

#### Private challenges (using a code)

- The creator of a private post receives a **Match Code**.
- Share the code directly with your intended opponent (e.g. via chat or phone).
- The opponent clicks **Join with Code**, enters the code, and can then accept the private post.

#### Cancel your own match post

Open the post and click **Cancel Post** (available to the creator before the post is accepted).

---

### 6. Lobby Matchmaking (Pickup Games)

Lobbies are for individual players who want to join a game without organizing a full team. Two lobbies that fill up for the same field and time will auto-merge into a confirmed match.

Go to `/lobbies` (click **Lobbies** in the navbar).

#### Create a lobby

1. Click **Create Lobby**.
2. Fill in:
   - **Field** — where you want to play
   - **Start time / End time**
   - **Team size** — total players needed per side (e.g. `5`)
   - **Initial player count** — how many are already coming with you (minimum 1 = yourself)
   - **Visibility** — Public or Private
3. Click **Create**. A lobby card appears with a fill progress bar showing `X / TeamSize` players.

#### Join a lobby

1. Browse open lobbies in the list.
2. Each card shows: field name, time, team size, and current fill ratio.
3. Click **Join** on a lobby that has available slots.
4. Your name is added. The fill bar updates.
5. When both sides of a lobby set are full, the system auto-confirms a **Match** for everyone.

#### Leave a lobby

Click **Leave** on a lobby you have already joined. Your slot is freed for someone else.

> **Note:** The lobby creator can also **Cancel** the entire lobby, which removes all joined players.

---

### 7. Friends & Messaging

Go to `/friends` (accessible from the user dropdown in the navbar).

#### Send a friend request

1. Click **Add Friend** (top of the Friends page).
2. Type a username in the search box.
3. Click **Send Request** next to the user you want to add.
4. The request appears in their **Pending** tab.

#### Accept or decline a friend request

1. Open the **Pending** tab on the Friends page.
2. Click **Accept** to add them as a friend, or **Decline** to reject the request.

#### Chat with a friend

1. Click on any friend's name in the **Friends** list.
2. A chat panel opens on the right side of the screen.
3. Type a message and press **Enter** or click the send button.
4. Messages refresh every 3 seconds automatically.
5. All message history is preserved.

#### Invite a friend to your team (from chat)

Inside a chat conversation, click **Invite to Team**, then select one of the teams where you are the leader. A team invite is sent directly to that friend.

#### Remove a friend

Click the **Remove** icon next to a friend's name. The friendship and chat history are deleted.

---

### 8. My Venues

Go to `/my-venues` (click **My Venues** in the navbar).

This page is for **field owners** — players who own or manage sports complexes. Here you can:

- View all complexes registered under your account
- See an overview of fields per complex
- View incoming bookings across all your fields
- Check the daily schedule timeline for each field

> To become a venue owner, an admin must associate your account with a complex via the admin panel.

---

### 9. Admin Panel

Only accounts with `role: "admin"` can access `/admin`. The **Admin** link appears automatically in the navbar for admin users.

#### Dashboard (`/admin`)

Summary statistics at a glance:
- Total complexes, total fields, total bookings, pending bookings
- A recent bookings table with field, time, status, and price
- Quick navigation buttons to complex and field management

#### Manage Complexes (`/admin/complexes`)

A **Complex** is a physical sports venue that contains one or more fields (e.g. *San bong Thu Duc*).

**Create a complex:**
1. Click **New Complex**.
2. Fill in: name, description, address, latitude, longitude.
3. Click **Save**. The complex appears in the list immediately.

**Edit a complex:**
1. Click on a complex in the list.
2. Edit any fields and click **Save Changes**.

**Delete a complex:**
- Click **Delete** on the complex card.
- Deleting a complex also removes all fields within it.

#### Manage Fields (`/admin/fields` or inside a complex)

A **Field** is a single bookable pitch inside a complex.

**Create a field:**
1. Click **New Field**.
2. Fill in:
   - **Name** — e.g. `San A`, `Pitch 1`
   - **Complex** — which venue this field belongs to
   - **Type** — 5v5, 7v7, or 11v11
   - **Opening time** — e.g. `06:00`
   - **Closing time** — e.g. `22:00`
   - **Price per hour** — in VND (e.g. `200000`)
   - **Indoor** — toggle on if the field is covered/indoors
   - **Lights** — toggle on if the field has floodlights for night games
   - **Description** — optional free-text field info
3. Click **Save**. The field is instantly visible on the public `/fields` page.

**Edit a field:**
1. Click on a field in the admin fields list.
2. Adjust any settings and click **Save Changes**.

**Delete a field:**
- Click **Delete** on the field's admin page.

#### Schedule View (`/admin/complexes/:id`)

Inside a complex detail page, click **View Schedule** to open a full-width timeline grid showing:
- All fields in the complex as rows
- Time slots across the day as columns
- Occupied slots shaded (with booking details on hover)

---

## Project Structure

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

---

## API Reference

A complete endpoint reference is in [`docs/API.md`](docs/API.md).

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
- **Currency** — All prices are in Vietnamese Dong (VND) by default.
- **JWT expiry** — Auth tokens expire after 1 hour. When the session expires you are redirected to `/login` automatically.
- **Roles** — Two roles exist: `player` (default for all registrations) and `admin` (set manually in the database or via seed scripts).
