"use client";

import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";
import type { Field } from "@/lib/types";

const FieldMapInner = dynamic(
  () => import("./FieldMapInner").then((m) => m.FieldMapInner),
  { ssr: false, loading: () => <div className="flex h-full items-center justify-center bg-stone-100 text-sm text-stone-400">Loading map…</div> },
);

export function FieldMap({ field }: { field: Field }) {
  const lat = (field as any).lat ?? field.complex?.lat;
  const lng = (field as any).lng ?? field.complex?.lng;
  const address = field.address || field.complex?.address;

  if (!lat || !lng) {
    return (
      <div className="flex items-start gap-2 rounded-[8px] border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" aria-hidden="true" />
        <span>{address ?? "Location not available"}</span>
      </div>
    );
  }

  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  return (
    <div className="space-y-3">
      <div className="h-64 overflow-hidden rounded-[8px] border border-stone-200 shadow-sm">
        <FieldMapInner lat={lat} lng={lng} fieldName={field.name} address={address} />
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-sm text-stone-600">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-stone-400" aria-hidden="true" />
          {address ?? "Location on map"}
        </p>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-[6px] border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 shadow-sm transition-colors hover:bg-stone-50"
        >
          Get Directions
        </a>
      </div>
    </div>
  );
}
