-- Deploy regenerated clients to all services before removing these unused columns.
ALTER TABLE public."Team" DROP COLUMN IF EXISTS "rating";
ALTER TABLE public."MatchPost" DROP COLUMN IF EXISTS "lat", DROP COLUMN IF EXISTS "lng";
