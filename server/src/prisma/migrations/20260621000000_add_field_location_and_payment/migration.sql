-- AlterTable: add lat/lng to Field for field-level location override
ALTER TABLE "public"."Field" ADD COLUMN "lat" DOUBLE PRECISION,
ADD COLUMN "lng" DOUBLE PRECISION;

-- AlterTable: add payment tracking to Booking
ALTER TABLE "public"."Booking" ADD COLUMN "paymentMethod" TEXT,
ADD COLUMN "paymentStatus" TEXT NOT NULL DEFAULT 'unpaid';
