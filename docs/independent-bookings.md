# Independent bookings

Direct booking creates a confirmed, unpaid booking for the authenticated user.
Full lobbies create one booking for the creator and each joined user, linked by
`lobbyId`, without creating a match. Only opponent matching creates a new match
and participant bookings with `matchId`. Venue manual reservations also have no
match; customer information is stored in the booking's `note`.

The per-participant price assignment is unchanged: each participant booking
stores the field price for the selected duration. Payment splitting is not part
of this change. Opening a lobby does not hold the field; availability is checked
again when it fills. If another reservation has taken the slot, the lobby is
canceled and no participant bookings are created.

Historical lobby/manual matches and their links are preserved. Historical
`matched` lobbies remain closed and display as confirmed. Legacy implementations
are retained as commented code for review.

## Database rollout — requires separate approval

No remote schema changes or data migrations were executed for this implementation.
Review `server/src/prisma/migrations/20260916000000_independent_bookings/migration.sql`.
It makes the match link optional, adds an optional lobby link and booking note,
and prevents duplicate bookings for one user in one lobby. It does not rewrite
existing reservations, results, matches, or payments.

The repository's older migrations are behind the schema previously installed
using `db push`. Do not blindly run the entire migration history against that
database. Before an approved rollout, verify its actual schema and migration
history, then apply the reviewed migration using the appropriate baseline.

Deploy the database change before running the updated backend. Generate the local
Prisma client after reviewing the schema, and restart the backend once the
database is ready:

```powershell
cd server
npx prisma generate --schema=src/prisma/schema.prisma
```

## Verification

```powershell
cd server
node --experimental-vm-modules --test test/reservations.test.js
```

These tests load actual services with an in-memory database substitute. They do
not read `.env` or connect to PostgreSQL. They cover the three reservation flows,
fractional pricing, operating hours, conflicts, rollback, last-slot joins and
schedule grouping. PostgreSQL row-lock behavior still needs an integration check
against an explicitly approved test database; the mock tests do not prove actual
database concurrency semantics.
