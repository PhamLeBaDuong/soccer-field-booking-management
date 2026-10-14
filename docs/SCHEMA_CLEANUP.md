# Schema cleanup

Removed from the application schema and contracts:

- `Team.rating`: no calculation or update path; the UI always displayed an unused value.
- `MatchPost.lat` / `MatchPost.lng`: no lookup or matching consumer; the request's field already supplies its location.

The remaining ownership, membership, booking, payment, result, and invitation fields have active consumers or preserve historical records. The legacy `Lobby.matchId` relation still supports reading old matched lobbies. Direct player invitations and share links remain separate, active workflows.

Deploy order matters: regenerate Prisma Client and rebuild/redeploy **all backend services** before removing physical columns. Older clients select retired columns, even when the UI no longer displays them. The application with the cleaned client works while those old database columns still exist.

After deployment, apply `20261014000000_remove_unused_fields` using your migration owner account. For the Docker host, the equivalent SQL is:

```bash
docker exec -i soccer-field-booking-management-db-1 \
  psql -U postgres -d soccer_booking -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;
ALTER TABLE public."Team" DROP COLUMN IF EXISTS "rating";
ALTER TABLE public."MatchPost" DROP COLUMN IF EXISTS "lat", DROP COLUMN IF EXISTS "lng";
COMMIT;
SQL
```

This removes the stored values in those columns. Use the normal backup process before applying the migration. Direct SQL does not update Prisma migration history; mark the migration applied if using managed migrations. Do not use `db push` to sweep other schema drift into this cleanup.

The remote database was not changed by this cleanup. No existing reservation, invitation, member, or payment record is deleted by the prepared migration.
