/*
  Warnings:

  - Added the required column `teamSize` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Made the column `userId` on table `Booking` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "public"."Booking" DROP CONSTRAINT "Booking_userId_fkey";

-- AlterTable
ALTER TABLE "public"."Booking" ADD COLUMN     "needMatching" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "teamSize" INTEGER NOT NULL,
ALTER COLUMN "userId" SET NOT NULL,
ALTER COLUMN "version" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."Field" ADD COLUMN     "listOccupiedEndTime" TIMESTAMP(3)[],
ADD COLUMN     "listOccupiedStartTime" TIMESTAMP(3)[];

-- AddForeignKey
ALTER TABLE "public"."Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
