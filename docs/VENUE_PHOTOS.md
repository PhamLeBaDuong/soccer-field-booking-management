# Venue photos and complex booking

Owners manage complex photos by expanding a venue in `/admin`. Each field has
its own Photos button. Upload JPEG, PNG, or WebP files (up to 5 MB each, 12 per
complex or field), remove photos, or use Make cover to move a photo to the front.
The first complex photo is the cover in the booking directory. Selecting a field
also shows that field's gallery.

Photo paths are ordered arrays in existing `Complex.metadata.images` and
`Field.metadata.images`. No Prisma schema migration is needed. Other metadata,
including venue timezone, is preserved. Upload, removal, and cover changes require
the target's owner; image files are publicly readable.

Files are stored in `server/uploads` locally, or `PHOTO_DIRECTORY` when configured.
Docker Compose mounts the `venue_photos` named volume at `/app/uploads` on catalog.
Deploy the updated catalog, gateway configuration (6 MB request limit), and web:

```sh
docker compose up -d --build --force-recreate catalog web gateway
```

Back up the photo volume alongside PostgreSQL. Keep the volume when recreating
containers. For multiple catalog replicas, mount shared storage at PHOTO_DIRECTORY.
Photo removal deletes its file after the metadata commit. Deleting a field or
complex does not purge its files automatically; this avoids deleting stored assets
while retiring venue data. Orphaned files can be removed during storage maintenance.

The directory groups fields by their existing complex relation and links to
`/complexes/:complexId`. Users must choose a field before the existing booking
form appears. Changing fields resets the form and loads availability for the new
field. Reservations, recurring bookings, and lobbies still use that field's ID,
price, timezone, hours, and conflict checks. Existing `/fields/:fieldId` links
remain valid and preselect their field.
