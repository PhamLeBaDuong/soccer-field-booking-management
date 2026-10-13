CREATE TABLE "ShareInvitation" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShareInvitation_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ShareInvitationResponse" (
  "id" TEXT NOT NULL,
  "invitationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "decision" TEXT NOT NULL,
  "resultId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShareInvitationResponse_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ShareInvitation_tokenHash_key" ON "ShareInvitation"("tokenHash");
CREATE INDEX "ShareInvitation_kind_targetId_idx" ON "ShareInvitation"("kind", "targetId");
CREATE UNIQUE INDEX "ShareInvitationResponse_invitationId_userId_key" ON "ShareInvitationResponse"("invitationId", "userId");
ALTER TABLE "ShareInvitationResponse" ADD CONSTRAINT "ShareInvitationResponse_invitationId_fkey"
  FOREIGN KEY ("invitationId") REFERENCES "ShareInvitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
