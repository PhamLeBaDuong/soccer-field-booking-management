-- Additive migration: existing match IDs and bookings are preserved.
ALTER TABLE "Booking" ALTER COLUMN "matchId" DROP NOT NULL;
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_matchId_fkey";
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_matchId_fkey"
    FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD COLUMN "lobbyId" TEXT;
ALTER TABLE "Booking" ADD COLUMN "note" TEXT;
CREATE UNIQUE INDEX "Booking_lobbyId_userId_key" ON "Booking"("lobbyId", "userId");
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_lobbyId_fkey"
    FOREIGN KEY ("lobbyId") REFERENCES "Lobby"("id") ON DELETE SET NULL ON UPDATE CASCADE;
