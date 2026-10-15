import { photos, PHOTO_DIRECTORY, PHOTO_NAME } from "../services/photoService.js";
import { resolve } from "node:path";

export async function managePhotos(req, res) {
  try {
    const { kind, id, name } = req.params;
    let images;
    if (req.method === "POST") images = await photos.upload(kind, id, req.user.id, req.body);
    else if (req.method === "PUT") images = await photos.reorder(kind, id, req.user.id, req.body.images);
    else images = await photos.remove(kind, id, req.user.id, name);
    res.status(req.method === "POST" ? 201 : 200).json({ images });
  } catch (error) {
    if (!error.status) console.error(error);
    res.status(error.status || 500).json({ error: error.status ? error.message : "Unable to save photos." });
  }
}

export function getPhoto(req, res) {
  if (!PHOTO_NAME.test(req.params.name)) return res.status(404).end();
  res.set("X-Content-Type-Options", "nosniff");
  res.sendFile(resolve(PHOTO_DIRECTORY, req.params.name), { maxAge: "1y", immutable: true }, error => {
    if (error && !res.headersSent) res.status(error.statusCode || 404).end();
  });
}
