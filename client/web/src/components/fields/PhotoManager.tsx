"use client";

import { useState } from "react";
import { uploadPhoto, removePhoto, reorderPhotos, photoUrl, type PhotoTarget } from "@/lib/api/photos";
import { Button } from "@/components/ui/Button";

export function PhotoManager({ kind, id, images, onChange }: {
  kind: PhotoTarget; id: string; images: string[]; onChange: (images: string[]) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(action: () => Promise<{ images: string[] }>) {
    setBusy(true); setError("");
    try { onChange((await action()).images); }
    catch (error) { setError(error instanceof Error ? error.message : "Unable to save photos."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm font-semibold">Photos</p>
      <label className="text-xs font-medium text-stone-600">
        <span className="sr-only">Upload photos</span>
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy || images.length >= 12}
          className="max-w-full text-xs file:mr-2 file:rounded-md file:border file:border-stone-200 file:bg-white file:px-3 file:py-2 file:font-semibold disabled:opacity-50"
          onChange={e => {
            const files = Array.from(e.target.files ?? []); e.target.value = "";
            if (!files.length) return;
            if (files.some(file => file.size > 5 * 1024 * 1024) || images.length + files.length > 12) {
              setError("Choose up to 12 photos, at most 5 MB each."); return;
            }
            void save(async () => {
              let latest = images;
              for (const file of files) { latest = (await uploadPhoto(kind, id, file)).images; onChange(latest); }
              return { images: latest };
            });
          }} />
      </label>
    </div>
    <p className="text-xs text-stone-500">JPEG, PNG or WebP · Up to 12 photos, 5 MB each. First photo is the cover.</p>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {images.map((path, index) => <div key={path} className="overflow-hidden rounded-lg border border-stone-200 bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photoUrl(path)} alt={`Photo ${index + 1}`} className="aspect-video w-full object-cover" />
        <div className="flex flex-wrap items-center gap-2 p-2">
          {index === 0 ? <span className="text-xs font-semibold">Cover</span> :
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => { void save(() => reorderPhotos(kind, id, [path, ...images.filter(url => url !== path)])); }}>Make cover</Button>}
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => {
            if (window.confirm("Remove this photo?")) void save(() => removePhoto(kind, id, path));
          }}>Remove</Button>
        </div>
      </div>)}
    </div>
    {busy && <p role="status" className="text-xs text-stone-500">Saving photos…</p>}
  </div>;
}
