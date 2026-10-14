# Fixed bookings

Users and venue owners can reserve a weekly or monthly slot through an inclusive end date. Every occurrence is created immediately as an ordinary confirmed Booking; no background worker or rolling schedule is needed. The local clock follows Field metadata.timeZone (UTC for legacy fields), including daylight saving changes. Monthly schedules keep the original day and skip months without that date. A request may contain at most 104 dates.

All occurrences use the existing field lock, operating-hour validation, server pricing and conflict checks. Any invalid or occupied date rejects the entire request. Payments remain per booking. The end date applies to the occurrence's start date, including overnight slots. The implementation creates individual reservations and does not add a series cancellation operation.

Owners see direct bookings in blue and fixed bookings in purple, with labels for accessibility. User booking cards and public availability do not distinguish the types. The occupied-slot API returns only startTime and endTime, and the booking form fetches availability for the selected field date.

## Schema and deployment

One column, Booking.bookingType, records `direct` or `fixed`. Existing bookings default to `direct`. Booking has no metadata or recurrence relation; notes describe customers, Match/Lobby relations describe participation, and Field metadata describes the field. Those existing structures cannot persist the owner-visible distinction without overloading unrelated data. No new tables, series IDs, or persisted recurrence rules are needed.

Apply the additive SQL in `server/src/prisma/migrations/20261014010000_fixed_bookings/migration.sql` **before** rebuilding/restarting all backend services. Older clients work with the added column because it has a default. New clients select the column and therefore require it to exist.

This migration contains only the new column and its allowed-value constraint. Review pending migrations before using `prisma migrate deploy`: the earlier schema cleanup migration removes unrelated columns and is not required for this feature. On installations that apply SQL directly, run this migration's exact SQL through the existing database deployment process, then record it as applied using Prisma migration resolve. No live database migration is executed by the implementation or its isolated tests.

After applying the SQL, stop the local backend before running `npm run build --prefix server` if Windows reports that its Prisma engine DLL is locked, then restart it. Use `npm run build --prefix client/web` for the frontend. Docker generates its client during the image build; the existing startup `db push` behavior should not substitute for reviewing the migration order.

## API

- `POST /api/bookings/fixed`: `{ fieldId, startTime, endTime, repeat: { frequency: "weekly" | "monthly", until: "YYYY-MM-DD" } }`. The authenticated user owns the resulting bookings; body user IDs are not accepted.
- `POST /api/venues/fields/:id/manual-booking`: existing local date, clock times and customer note payload, with optional `repeat` in the same format. Ownership is checked under the field lock.
- Both recurring paths return `{ bookings, totalPrice }`. The legacy direct-booking endpoint still returns one booking; the manual endpoint also retains its `booking` property for old clients.
