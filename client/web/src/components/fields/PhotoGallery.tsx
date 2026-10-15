"use client";

import { useState } from "react";
import { photoUrl } from "@/lib/api/photos";

export function PhotoGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState("");
  if (!images.length) return null;
  return <div className="space-y-2">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={photoUrl(images.includes(active) ? active : images[0])} alt={name} className="max-h-96 w-full rounded-lg object-cover" />
    {images.length > 1 && <div className="flex gap-2 overflow-x-auto pb-1">
      {images.map((path, index) => <button key={path} type="button" onClick={() => setActive(path)}
        aria-label={`View ${name} photo ${index + 1}`} aria-pressed={path === (images.includes(active) ? active : images[0])}
        className="shrink-0 overflow-hidden rounded-md border-2 border-transparent aria-pressed:border-neutral-950">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photoUrl(path)} alt="" className="h-16 w-24 object-cover" />
      </button>)}
    </div>}
  </div>;
}
