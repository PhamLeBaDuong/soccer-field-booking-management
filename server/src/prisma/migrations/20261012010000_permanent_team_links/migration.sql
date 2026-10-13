ALTER TABLE "ShareInvitation" ADD COLUMN "teamKey" TEXT;
ALTER TABLE "ShareInvitation" ADD COLUMN "token" TEXT;
ALTER TABLE "ShareInvitation" ALTER COLUMN "expiresAt" DROP NOT NULL;
CREATE UNIQUE INDEX "ShareInvitation_teamKey_key" ON "ShareInvitation"("teamKey");
