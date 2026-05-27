# Soccer Field Booking — Backend API Reference

Base URL: `http://localhost:5000`

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Fields](#2-fields)
3. [Admin — Complexes & Fields](#3-admin--complexes--fields)
4. [Teams](#4-teams)
5. [Match Posts](#5-match-posts)
6. [Lobbies](#6-lobbies)
7. [Matches](#7-matches)
8. [Bookings](#8-bookings)
9. [Response Shapes](#9-response-shapes)
10. [Frontend Flow Guides](#10-frontend-flow-guides)

---

## 1. Authentication

### How it works
All protected routes require a **Bearer token** in the `Authorization` header:

```
Authorization: Bearer <token>
```

Tokens are returned by `/api/auth/login` and expire after **1 hour**.

The token payload contains:
```json
{ "id": "<userId>", "username": "...", "role": "player" }
```

---

### `POST /api/auth/register`
Create a new user account.

**Auth:** none

**Body:**
```json
{
  "username": "duong99",
  "password": "secret123",
  "name": "Duong Pham",
  "email": "duong@example.com",
  "phone": "0901234567"
}
```

| Field      | Required | Notes                        |
|------------|----------|------------------------------|
| `username` | ✅       | Must be unique               |
| `password` | ✅       | Min 6 characters             |
| `name`     | ✅       |                              |
| `email`    | ✅       | Valid email format           |
| `phone`    | ❌       |                              |

**Response `201`:**
```json
{
  "id": "uuid",
  "username": "duong99",
  "name": "Duong Pham",
  "email": "duong@example.com",
  "role": "player",
  "createdAt": "2026-05-27T..."
}
```

---

### `POST /api/auth/login`
Log in and receive a JWT token.

**Auth:** none

**Body:**
```json
{ "username": "duong99", "password": "secret123" }
```

**Response `200`:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": "...", "username": "duong99", "name": "Duong Pham", "role": "player" }
}
```

> **Store the token** in `localStorage` or a cookie. Attach it to every subsequent request.

---

### `GET /api/auth/me`
Decode the current token and return the logged-in user's ID.

**Auth:** required

**Response `200`:**
```json
{ "id": "uuid", "username": "duong99", "role": "player" }
```

---

## 2. Fields

> All field routes require authentication.

### `GET /api/fields`
List all fields.

**Query params (all optional):**

| Param       | Type    | Example             |
|-------------|---------|---------------------|
| `complexId` | string  | `complexId=abc-123` |
| `type`      | string  | `type=5v5`          |
| `indoor`    | boolean | `indoor=true`       |
| `lights`    | boolean | `lights=true`       |

**Response `200`:** array of [Field objects](#field)

---

### `GET /api/fields/nearby`
Find fields sorted by distance to a GPS coordinate.

**Query params:**

| Param    | Required | Default | Description              |
|----------|----------|---------|--------------------------|
| `lat`    | ✅       |         | Latitude (float)         |
| `lng`    | ✅       |         | Longitude (float)        |
| `radius` | ❌       | `50`    | Max distance in km       |

**Response `200`:** array of Field objects, each with an extra `distanceKm` field, sorted nearest-first.

```json
[
  { "id": "...", "name": "Field A", "distanceKm": 1.3, ... },
  { "id": "...", "name": "Field B", "distanceKm": 4.7, ... }
]
```

---

### `GET /api/fields/:fieldId`
Get a single field by ID.

**Response `200`:** [Field object](#field)

---

## 3. Admin — Complexes & Fields

> Requires `role: "admin"`.

| Method   | Path                                  | Description               |
|----------|---------------------------------------|---------------------------|
| `GET`    | `/api/admin/complexes`                | List all complexes        |
| `GET`    | `/api/admin/complexes/:id`            | Get one complex           |
| `POST`   | `/api/admin/complexes`                | Create complex            |
| `PUT`    | `/api/admin/complexes/:id`            | Update complex            |
| `DELETE` | `/api/admin/complexes/:id`            | Delete complex            |
| `GET`    | `/api/admin/fields`                   | List all fields (admin)   |
| `GET`    | `/api/admin/complexes/:id/fields`     | Fields in one complex     |
| `POST`   | `/api/admin/fields`                   | Create field              |
| `PUT`    | `/api/admin/fields/:id`               | Update field              |
| `DELETE` | `/api/admin/fields/:id`               | Delete field              |

**Create/update field body:**
```json
{
  "complexId": "uuid",
  "name": "Field 1",
  "type": "5v5",
  "startTime": "2026-01-01T06:00:00Z",
  "endTime": "2026-01-01T23:00:00Z",
  "indoor": false,
  "lights": true,
  "pricePerHour": 150000,
  "desc": "Grass surface",
  "address": "123 Street"
}
```

**Create/update complex body:**
```json
{
  "name": "My Complex",
  "address": "456 Avenue",
  "lat": 10.7769,
  "lng": 106.7009,
  "desc": "Downtown complex"
}
```

---

## 4. Teams

> All team routes require authentication.

### `POST /api/teams`
Create a new team. The caller becomes the **leader** and is automatically added as the first member.

**Body:**
```json
{ "name": "Thunder FC", "size": 5 }
```

| Field  | Required | Notes                                     |
|--------|----------|-------------------------------------------|
| `name` | ✅       | Team display name                         |
| `size` | ✅       | Players per side (e.g. 5 for 5v5)        |

**Response `201`:** [Team object](#team)

---

### `GET /api/teams/mine`
List all teams the caller belongs to (as member or leader).

**Response `200`:** array of [Team objects](#team)

---

### `GET /api/teams/:teamId`
Get a team by ID (visible to anyone).

**Response `200`:** [Team object](#team)

---

### `PUT /api/teams/:teamId`
Update team name or size. **Leader only.**

**Body (all optional):**
```json
{ "name": "New Name", "size": 7 }
```

> `size` cannot be reduced below the current member count.

**Response `200`:** updated [Team object](#team)

---

### `DELETE /api/teams/:teamId`
Disband the team. **Leader only.** Cancels any open match posts.

**Response `200`:**
```json
{ "message": "Team disbanded" }
```

---

### `POST /api/teams/:teamId/members`
Add a user to the team. **Leader only.**

**Body:**
```json
{ "userId": "uuid-of-user-to-add" }
```

> Fails if the team is already at `size` capacity.

**Response `201`:** updated [Team object](#team)

---

### `DELETE /api/teams/:teamId/members/:userId`
Remove a member.

- **Leader** can remove anyone.
- A **player** can remove themselves.
- The leader cannot remove themselves (disband the team instead).

**Response `200`:** updated [Team object](#team)

---

## 5. Match Posts

A team's advertisement seeking an opponent.  
Public posts are visible to all. Private posts require an **access code**.

### `GET /api/match-posts`
List open public match posts. **No auth required.**

**Query params (all optional):**

| Param      | Type   | Description                    |
|------------|--------|--------------------------------|
| `teamSize` | number | Filter by team size            |
| `fieldId`  | string | Filter by preferred field      |
| `status`   | string | Default `"open"`. Also `"matched"`, `"canceled"` |

**Response `200`:** array of [MatchPost objects](#matchpost)

---

### `POST /api/match-posts`
Create a match post. **Leader only** (one open post per team at a time).

**Auth:** required

**Body:**
```json
{
  "teamId": "uuid",
  "fieldId": "uuid",
  "preferredStartTime": "2026-06-01T08:00:00Z",
  "preferredEndTime": "2026-06-01T10:00:00Z",
  "visibility": "public",
  "lat": 10.7769,
  "lng": 106.7009
}
```

| Field                 | Required | Notes                                              |
|-----------------------|----------|----------------------------------------------------|
| `teamId`              | ✅       | Must be a team the caller leads                    |
| `fieldId`             | ❌       | Preferred venue; can be null ("any field")         |
| `preferredStartTime`  | ❌       | ISO 8601; can be null ("flexible time")            |
| `preferredEndTime`    | ❌       | ISO 8601                                           |
| `visibility`          | ❌       | `"public"` (default) or `"private"`                |
| `lat` / `lng`         | ❌       | Used for location-based browsing when no fieldId   |

> If `visibility` is `"private"`, the response includes a `code` field — share this with the opponent.

**Response `201`:** [MatchPost object](#matchpost)

---

### `GET /api/match-posts/:postId`
Get a single match post.

**Auth:** required

- For **public** posts: no extra params needed.
- For **private** posts: append `?code=XXXXXXXX`.

```
GET /api/match-posts/abc-123?code=A3F9C2B1
```

**Response `200`:** [MatchPost object](#matchpost)

---

### `POST /api/match-posts/:postId/accept`
Accept a match post — forms a Match and creates bookings for all members of both teams.

**Auth:** required (accepting team's leader)

**Body:**
```json
{
  "acceptingTeamId": "uuid",
  "fieldId": "uuid",
  "startTime": "2026-06-01T08:00:00Z",
  "endTime": "2026-06-01T10:00:00Z",
  "code": "A3F9C2B1"
}
```

| Field             | Required | Notes                                                      |
|-------------------|----------|------------------------------------------------------------|
| `acceptingTeamId` | ✅       | Must be a team the caller leads                            |
| `fieldId`         | ❌*      | Required if the post has no `fieldId`                      |
| `startTime`       | ❌*      | Required if the post has no `preferredStartTime`           |
| `endTime`         | ❌*      | Required if the post has no `preferredEndTime`             |
| `code`            | ❌*      | Required for private posts                                 |

**Validation rules:**
- Accepting team's `size` must equal the posting team's `size`.
- `startTime` must be in the future.
- The field + time slot must not already be booked.
- A team cannot accept its own post.

**Response `201`:** [Match object](#match) with full booking list

---

### `DELETE /api/match-posts/:postId`
Cancel an open match post. **Posting team's leader only.**

**Auth:** required

**Response `200`:** updated [MatchPost object](#matchpost)

---

## 6. Lobbies

An open lobby lets **individual players** fill up a team slot at a specific field and time.  
When a lobby reaches capacity it auto-matches with another full lobby at the same field/time.

### `GET /api/lobbies`
List lobbies. **No auth required.**

**Query params (all optional):**

| Param      | Type   | Description                                      |
|------------|--------|--------------------------------------------------|
| `fieldId`  | string | Filter by field                                  |
| `status`   | string | `"open"` (default shows all), `"full"`, `"matched"`, `"canceled"` |
| `teamSize` | number | Filter by team size                              |

**Response `200`:** array of [Lobby objects](#lobby)

---

### `GET /api/lobbies/:lobbyId`
Get a single lobby. **No auth required.**

**Response `200`:** [Lobby object](#lobby)

---

### `POST /api/lobbies`
Create a new lobby.

**Auth:** required

**Body:**
```json
{
  "fieldId": "uuid",
  "startTime": "2026-06-01T08:00:00Z",
  "endTime": "2026-06-01T10:00:00Z",
  "teamSize": 5,
  "initialSize": 2
}
```

| Field         | Required | Notes                                                          |
|---------------|----------|----------------------------------------------------------------|
| `fieldId`     | ✅       |                                                                |
| `startTime`   | ✅       | Must be in the future                                          |
| `endTime`     | ✅       | Must be after `startTime`                                      |
| `teamSize`    | ✅       | Total players per side needed                                  |
| `initialSize` | ❌       | Players the creator already brings (default `1`)               |

> **`initialSize`** — use this when you're already a group. E.g. if you have 3 friends and need 5 per side, set `initialSize=3`; the lobby only needs 2 more slots filled before it triggers auto-matching.

> If `initialSize >= teamSize` the lobby starts as **full** and auto-matching fires immediately.

**Response `201`:**
```json
{
  "lobby": { ...lobby object... },
  "match": null
}
```
If auto-match succeeded on creation:
```json
{
  "lobby": { ...lobby with status "matched"... },
  "match": { ...match object... }
}
```

---

### `POST /api/lobbies/:lobbyId/join`
Join an open lobby.

**Auth:** required

> - The lobby creator cannot join (they're already counted in `initialSize`).
> - Each user can only join once.
> - Joining the last available slot triggers auto-match automatically.

**Response `201`:**
```json
{
  "lobby": { ...updated lobby object... },
  "match": null
}
```
If the lobby just became full **and** a matching partner lobby was found:
```json
{
  "lobby": { ...lobby with status "matched"... },
  "match": { ...match object with bookings... }
}
```

---

### `DELETE /api/lobbies/:lobbyId/leave`
Leave a lobby you previously joined.

**Auth:** required

> - Creator cannot leave — cancel the lobby instead.
> - If the lobby was `"full"`, it reverts to `"open"`.

**Response `200`:** updated [Lobby object](#lobby)

---

### `DELETE /api/lobbies/:lobbyId`
Cancel a lobby. **Creator only.**

**Auth:** required

> Cannot cancel a lobby that has already been matched.

**Response `200`:** updated [Lobby object](#lobby) with `status: "canceled"`

---

## 7. Matches

Matches are **system-created** — never created directly via API.  
They are formed either by accepting a MatchPost or by two full lobbies pairing up.

### `GET /api/matches/mine`
List all matches the caller has a booking in.

**Auth:** required

**Response `200`:** array of [Match objects](#match)

---

### `GET /api/matches/:matchId`
Get a single match with all bookings, lobbies, and match post details.

**Auth:** required

**Response `200`:** [Match object](#match)

---

### `DELETE /api/matches/:matchId`
Cancel a match.

**Auth:** required

**Effects:**
- All bookings in the match are marked `"canceled"`.
- Lobbies that were part of this match revert to `"open"` (players can re-queue).

**Response `200`:**
```json
{ "message": "Match canceled; bookings voided and lobbies reopened" }
```

---

## 8. Bookings

Bookings are **system-created only** — generated automatically when a Match is formed.  
Users cannot create or modify bookings directly.

### `GET /api/bookings/occupied`
Get all occupied (confirmed) slots for a field in a time window.  
Used by the **calendar UI** to render availability.

**Auth:** not required

**Query params:**

| Param       | Required | Description          |
|-------------|----------|----------------------|
| `fieldId`   | ✅       |                      |
| `startTime` | ✅       | Window start (ISO 8601) |
| `endTime`   | ✅       | Window end (ISO 8601)   |

**Response `200`:** array of booking objects (only `fieldId`, `startTime`, `endTime`, `status`)

---

### `GET /api/bookings/user/:userId`
Get all bookings for a user.

**Auth:** required

**Response `200`:** array of [Booking objects](#booking)

---

### `GET /api/bookings/:bookingId`
Get a single booking.

**Auth:** required

**Response `200`:** [Booking object](#booking)

---

## 9. Response Shapes

### User
```json
{
  "id": "uuid",
  "name": "Duong Pham",
  "username": "duong99",
  "email": "duong@example.com",
  "phone": "0901234567",
  "role": "player",
  "createdAt": "2026-05-27T10:00:00Z"
}
```

### Field
```json
{
  "id": "uuid",
  "name": "Field 1",
  "desc": "Grass surface",
  "address": "123 Street",
  "type": "5v5",
  "indoor": false,
  "lights": true,
  "pricePerHour": 150000,
  "startTime": "2026-01-01T06:00:00Z",
  "endTime": "2026-01-01T23:00:00Z",
  "complexId": "uuid",
  "complex": {
    "id": "uuid",
    "name": "My Complex",
    "address": "456 Avenue",
    "lat": 10.7769,
    "lng": 106.7009
  },
  "createdAt": "2026-05-27T..."
}
```

### Team
```json
{
  "id": "uuid",
  "name": "Thunder FC",
  "size": 5,
  "rating": 0,
  "leaderId": "uuid",
  "leader": { "id": "uuid", "name": "Duong Pham", "username": "duong99" },
  "members": [
    {
      "id": "uuid",
      "userId": "uuid",
      "user": { "id": "uuid", "name": "Duong Pham", "username": "duong99" },
      "joinedAt": "2026-05-27T..."
    }
  ],
  "createdAt": "2026-05-27T..."
}
```

### MatchPost
```json
{
  "id": "uuid",
  "teamId": "uuid",
  "team": { ...Team object... },
  "fieldId": "uuid",
  "field": { ...Field object or null... },
  "lat": 10.7769,
  "lng": 106.7009,
  "preferredStartTime": "2026-06-01T08:00:00Z",
  "preferredEndTime": "2026-06-01T10:00:00Z",
  "visibility": "public",
  "code": null,
  "status": "open",
  "createdAt": "2026-05-27T..."
}
```

> `code` is only non-null when `visibility === "private"`. It is only returned to the post creator — do not show it in public listings.

### Lobby
```json
{
  "id": "uuid",
  "fieldId": "uuid",
  "field": { ...Field object... },
  "startTime": "2026-06-01T08:00:00Z",
  "endTime": "2026-06-01T10:00:00Z",
  "teamSize": 5,
  "initialSize": 2,
  "creatorId": "uuid",
  "status": "open",
  "matchId": null,
  "slots": [
    {
      "id": "uuid",
      "userId": "uuid",
      "user": { "id": "uuid", "name": "...", "username": "..." },
      "joinedAt": "2026-05-27T..."
    }
  ],
  "createdAt": "2026-05-27T..."
}
```

**Slots remaining formula (frontend):**
```
remaining = teamSize - initialSize - slots.length
```

### Match
```json
{
  "id": "uuid",
  "source": "post",
  "status": "confirmed",
  "fieldId": "uuid",
  "startTime": "2026-06-01T08:00:00Z",
  "endTime": "2026-06-01T10:00:00Z",
  "matchPostId": "uuid",
  "matchPost": { ...MatchPost or null... },
  "lobbies": [ ...array of Lobby objects (2) or []... ],
  "bookings": [
    {
      "id": "uuid",
      "userId": "uuid",
      "user": { "id": "uuid", "name": "...", "username": "..." },
      "fieldId": "uuid",
      "startTime": "...",
      "endTime": "...",
      "totalPrice": 300000,
      "currency": "VND",
      "status": "confirmed"
    }
  ],
  "createdAt": "2026-05-27T..."
}
```

### Booking
```json
{
  "id": "uuid",
  "userId": "uuid",
  "user": { "id": "uuid", "name": "...", "username": "..." },
  "fieldId": "uuid",
  "field": { ...Field object with complex... },
  "matchId": "uuid",
  "match": {
    "id": "uuid",
    "source": "post",
    "status": "confirmed",
    "matchPost": { "team": { "id": "...", "name": "Thunder FC", "size": 5 } },
    "lobbies": []
  },
  "startTime": "2026-06-01T08:00:00Z",
  "endTime": "2026-06-01T10:00:00Z",
  "totalPrice": 300000,
  "currency": "VND",
  "status": "confirmed",
  "createdAt": "2026-05-27T..."
}
```

---

## 10. Frontend Flow Guides

---

### Flow A — Team Match via Match Post

> **Goal:** two teams agree to play each other, at a specific field and time.

```
Team A creates post ──► Team B browses & accepts ──► Match + Bookings auto-created
```

#### Step 1 — Register & log in
```
POST /api/auth/register   →  create account
POST /api/auth/login      →  get token (store it)
```

#### Step 2 — Create a team
```
POST /api/teams
{ "name": "Thunder FC", "size": 5 }
```
Store the returned `team.id`.

#### Step 3 — (Optional) Add team members
```
POST /api/teams/:teamId/members
{ "userId": "other-user-id" }
```
Repeat for each player. Each added user will get a booking when the match is created.

#### Step 4 — Browse fields
```
GET /api/fields
GET /api/fields/nearby?lat=10.77&lng=106.70&radius=10
```
Pick a `fieldId` and a time slot.

#### Step 5 — Check the slot is not already occupied _(optional pre-check)_
```
GET /api/bookings/occupied?fieldId=X&startTime=Y&endTime=Z
```
Empty array = slot is free.

#### Step 6 — Post a match request
```
POST /api/match-posts
{
  "teamId": "your-team-id",
  "fieldId": "uuid",
  "preferredStartTime": "2026-06-01T08:00:00Z",
  "preferredEndTime":   "2026-06-01T10:00:00Z",
  "visibility": "public"
}
```

> For a **private** post set `"visibility": "private"`. The response contains a `code` — share it privately with the opponent.

#### Step 7 — Opponent browses posts
```
GET /api/match-posts?teamSize=5
```
They find the post, see the field and time, decide to accept.

#### Step 8 — Opponent accepts
```
POST /api/match-posts/:postId/accept
{
  "acceptingTeamId": "their-team-id"
}
```
If the post had `fieldId` and `preferredStartTime`/`preferredEndTime`, those values are used automatically. If not, the opponent must provide `fieldId`, `startTime`, `endTime` in the body.

For a **private** post:
```json
{ "acceptingTeamId": "...", "code": "A3F9C2B1" }
```

**The system:**
1. Validates both teams have the same `size`.
2. Validates the slot is in the future and free.
3. Creates the `Match` record.
4. Creates one `Booking` for every member of **both** teams.
5. Marks the MatchPost as `"matched"`.

**Response** — full Match object with all bookings.

#### Step 9 — Players view their bookings
```
GET /api/bookings/user/:userId
```

---

### Flow B — Lobby Match

> **Goal:** individual players fill two team-sized groups at the same field and time. Matching is automatic.

```
Player A opens lobby ──► Others join ──► Lobby full ──► Auto-scan ──► Partner found ──► Match created
```

#### Step 1 — Log in
```
POST /api/auth/login  →  get token
```

#### Step 2 — Browse fields & pick a slot
```
GET /api/fields
GET /api/bookings/occupied?fieldId=X&startTime=Y&endTime=Z
```

#### Step 3 — Browse existing lobbies first _(to avoid creating a duplicate)_
```
GET /api/lobbies?fieldId=X&status=open&teamSize=5
```
If a compatible lobby exists, skip to Step 5 and join it instead.

#### Step 4 — Create a lobby
```
POST /api/lobbies
{
  "fieldId": "uuid",
  "startTime": "2026-06-01T08:00:00Z",
  "endTime":   "2026-06-01T10:00:00Z",
  "teamSize":  5,
  "initialSize": 1
}
```

> **`initialSize`** = how many players you already have (yourself + friends who won't book individually).  
> Example: you + 2 friends show up together → `initialSize: 3`. The lobby only needs 2 more to fill.

**Response:**
```json
{ "lobby": { "id": "...", "status": "open", "slots": [] }, "match": null }
```

If `initialSize >= teamSize`, the lobby starts as `"full"` and auto-matching runs immediately:
```json
{ "lobby": { "status": "matched" }, "match": { ...match object... } }
```

#### Step 5 — Other players join
```
POST /api/lobbies/:lobbyId/join
```
Each call adds the authenticated user as a slot. The response shows the updated lobby and whether a match was formed:
```json
{
  "lobby": { "status": "full", "slots": [...5 users...] },
  "match": { ...match object... }   ←  non-null when auto-match succeeded
}
```

#### Step 6 — Auto-match logic (server-side)
When a lobby becomes full, the server automatically:
1. Finds another lobby at the **same `fieldId` + `startTime` + `endTime` + `teamSize`** with `status: "full"`.
2. Validates the slot is still free.
3. Creates a `Match` (`source: "lobby"`).
4. Creates one `Booking` per unique user in both lobbies (creator + all slot holders).
5. Marks both lobbies as `"matched"`.

> If no partner lobby exists yet, the lobby waits at `"full"` until another one arrives and triggers the match.

#### Step 7 — Players view their bookings
```
GET /api/bookings/user/:userId
```

---

### Flow C — Calendar / Slot Picker

Show which slots on a field are taken before letting a user pick a time.

```
GET /api/bookings/occupied?fieldId=X&startTime=2026-06-01T00:00:00Z&endTime=2026-06-02T00:00:00Z
```

Returns an array of `{ startTime, endTime }` blocks that are confirmed. Grey these out in the UI.

---

### Flow D — Viewing a Match & Its Participants

After a match is created (either flow):

```
GET /api/matches/:matchId
```

The response contains:
- `source` — `"post"` or `"lobby"`
- `fieldId`, `startTime`, `endTime` — the confirmed venue and time
- `bookings[]` — one entry per player; each has `userId`, `user.name`, `totalPrice`
- `matchPost` — the original post (if source = "post"), including both teams
- `lobbies[]` — both lobbies (if source = "lobby"), including all slot holders

---

### Error Handling

All endpoints return errors in this shape:
```json
{ "error": "Human-readable message" }
```

| Status | Meaning                                      |
|--------|----------------------------------------------|
| `400`  | Bad input — message describes the problem    |
| `401`  | No token or token expired                    |
| `403`  | Authenticated but not authorized (wrong role / not the leader) |
| `404`  | Route not found                              |
| `500`  | Unexpected server error                      |

---

### Quick Reference — Auth Requirements

| Route group       | Public (no token) | Authenticated (any user) |
|-------------------|:-----------------:|:------------------------:|
| `POST /auth/register` | ✅ | |
| `POST /auth/login` | ✅ | |
| `GET /match-posts` (list) | ✅ | |
| `GET /lobbies` (list/get) | ✅ | |
| `GET /bookings/occupied` | ✅ | |
| Everything else | | ✅ |
