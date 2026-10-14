# Invitation links

Every team, lobby and match request has one stable invitation URL displayed directly with a Copy button. Team members, lobby creators and match-request owners can copy the corresponding URL. Visitors open `/invite/<token>`, log in or register if necessary, and return to that exact invitation to make an explicit decision. There are no link-management dialogs.

- Team links never expire or get consumed and can accept multiple players up to team capacity. A recipient can reconsider a decline, or leave and rejoin using the same URL. Existing team links from the older system are replaced.
- Match links allow one opponent to accept the request. The URL stays the same after acceptance and shows the matched status. A decline is specific to the responding user and does not consume the link for other recipients.
- Lobby links allow multiple joins until capacity is reached, the lobby starts, or it is canceled.
- Links have no expiry and are retained so their URL can be displayed again. A lobby or match that has started, filled, matched or been canceled still blocks further acceptance. Tokens contain 256 bits of randomness; their SHA-256 hashes support lookup.
- Acceptance and its response record share a database transaction. Invitation rows serialize repeated acceptance; team rows serialize capacity across different links. Existing field locks and match/lobby checks handle reservation conflicts.
- Already-joined users and expired/revoked/used links receive clear status messages. Posting and accepting a match require full rosters using existing Team size and TeamMember records. The leader counts once. Both teams are rechecked under team locks at acceptance, and incomplete teams create no match, booking, or acceptance response. The invitation shows player counts and directs users to recruit on the team page. Its URL remains usable after the roster fills again.
- Existing direct team invitations still work.
- Match requests remain open after creation. Matches and participant bookings are created only by explicit acceptance. The posting team's leader can cancel an open request from its card, with confirmation. Canceling a request disables acceptance through its stable link; matched requests cannot be canceled through this action.

## Local demo

From the repository root:

```powershell
npm run demo:invitations
```

Open <http://localhost:5055/demo>. The frontend runs on port 3100 and the sample API on port 5055. It uses the actual invitation, match, and lobby service code with an in-memory database double. Authentication is simulated only in this standalone demo process; it never reads `.env` or changes the remote database.

Use `player / demo123` for an existing recipient, `owner / demo123` for an inviter, or register a new sample account. Match links are single-use; restart the demo to reset sample data. The demo uses a separate `.next-invitation-demo` build directory so it can run alongside the regular frontend.

Recorded browser walkthrough: [walkthrough.html](demo/invitations/walkthrough.html). To record it again on Windows with Chrome installed, start a fresh demo and run `node server/demo/record-invitations.mjs`. Set `DEMO_BROWSER` to a Chromium executable if needed.

## Validation

```powershell
node --experimental-vm-modules --test server/test/match-requests.test.js server/test/share-invitations.test.js server/test/reservations.test.js client/web/test/auth-return.test.mjs client/web/test/match-post-api.test.mjs
npx --no-install tsc --noEmit --project client/web/tsconfig.json
```

The service tests use a database double, not a live PostgreSQL server. The browser walkthrough exercises the real frontend with simulated authentication and sample persistence.

## Deployment

Apply `20261012010000_permanent_team_links` after the initial invitation migration, then regenerate Prisma Client and deploy both backend and frontend. This same migration supports stable team, lobby and match links; no additional columns are required for lobbies or matches. The internal `teamKey` column stores team IDs or `lobby:<id>` / `match:<id>` keys; its unique index and target-row locks ensure concurrent requests get the same link.

```bash
docker exec -i soccer-field-booking-management-db-1 \
  psql -U postgres -d soccer_booking -v ON_ERROR_STOP=1 --single-transaction \
  < server/src/prisma/migrations/20261012010000_permanent_team_links/migration.sql
```

If the application reports that `ShareInvitation.teamKey` is missing, run this equivalent SQL on the database server (it can safely be repeated):

```bash
docker exec -i soccer-field-booking-management-db-1 \
  psql -U postgres -d soccer_booking -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;
ALTER TABLE public."ShareInvitation" ADD COLUMN IF NOT EXISTS "teamKey" TEXT;
ALTER TABLE public."ShareInvitation" ADD COLUMN IF NOT EXISTS "token" TEXT;
ALTER TABLE public."ShareInvitation" ALTER COLUMN "expiresAt" DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "ShareInvitation_teamKey_key"
  ON public."ShareInvitation" ("teamKey");
COMMIT;
SQL
```

The new `ShareInvitation` and `ShareInvitationResponse` tables require the additive migration `20261012000000_share_invitations`. Apply it with a database owner account before deploying the updated backend and frontend. Rebuild the backend image to regenerate Prisma Client. In the service-oriented stack, `/api/invites` is served by **social**; the existing gateway mapping needs no change.

For this server, whose earlier Booking migration was applied manually, the new migration can also be applied directly. From the remote repository root, assuming the migration has not already been applied:

```bash
docker exec -i soccer-field-booking-management-db-1 \
  psql -U postgres -d soccer_booking -v ON_ERROR_STOP=1 --single-transaction \
  < server/src/prisma/migrations/20261012000000_share_invitations/migration.sql
```

If the runtime database account is `soccer_booking_app`, grant access to the new tables:

```bash
docker exec soccer-field-booking-management-db-1 \
  psql -U postgres -d soccer_booking -v ON_ERROR_STOP=1 \
  -c 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."ShareInvitation", public."ShareInvitationResponse" TO soccer_booking_app;'
```

Direct SQL does not update Prisma's migration history. Use `prisma migrate resolve --applied 20261012000000_share_invitations --schema=src/prisma/schema.prisma` from `server/` with the migration database account if maintaining migration history. Resolve older manually applied migrations before using `migrate deploy`.

Deploy the backend and web images together after the schema update. No deployed endpoints or production data are changed by the local demo.

## Match request schedules and timezones

A team can create multiple requests. Open requests and confirmed matches cannot overlap the team's selected window, across fields or visibility settings. Adjacent windows are allowed. Creation locks the team row; acceptance checks both teams under their locks. Requests remain open until an opposing team explicitly accepts. The posting team's Accept button is disabled.

Selected field times become real UTC instants using the existing Field metadata.timeZone value, with UTC as the consistent fallback for legacy fields. The browser timezone does not change the field schedule. Creation, acceptance, lobby joins, and invitation display derive the timezone from the same field metadata. No MatchPost/Lobby timezone columns or database migration are required. The previous proposed timezone migration has been withdrawn. Already-added unused columns can remain; no destructive cleanup is needed. Rebuild/restart the backend to load the corrected application code. Old canceled requests are not reactivated automatically.

The browser regression demo uses node server/demo/record-invitations.mjs --match-post-only with npm run demo:invitations running. It posts a request, posts an adjacent request, rejects an overlap, opens the fresh link, signs in as the opposing leader, then explicitly accepts. Screenshots are in docs/demo/match-requests/walkthrough.html. This demo uses isolated data and does not modify the remote database.
