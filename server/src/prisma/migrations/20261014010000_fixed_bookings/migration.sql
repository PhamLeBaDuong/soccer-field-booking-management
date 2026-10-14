ALTER TABLE "Booking" ADD COLUMN "bookingType" TEXT NOT NULL DEFAULT 'direct';
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_bookingType_check" CHECK ("bookingType" IN ('direct', 'fixed'));
