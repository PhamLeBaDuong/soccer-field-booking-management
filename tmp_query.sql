\pset pager off
\echo === OWNER USER full ===
SELECT id, name, username, email, phone,
       password,
       role, metadata::text AS metadata, "createdAt"
FROM "User" WHERE id = '228c801f-9a07-4b26-9be9-231644b2fb62';

\echo === COMPLEX full ===
SELECT id, name, "desc", address, lat, lng, metadata::text AS metadata, "createdAt", "ownerId"
FROM "Complex" WHERE id = '8717cb9a-9d7f-47bb-a508-d15cbffdb899';

\echo === FIELDS metadata ===
SELECT id, name, "desc", address, metadata::text AS metadata
FROM "Field" WHERE "complexId" = '8717cb9a-9d7f-47bb-a508-d15cbffdb899';
