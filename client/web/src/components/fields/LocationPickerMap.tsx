"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type { Coordinates } from "@/lib/utils/location";

function Selection({ value, onChange }: { value: Coordinates | null; onChange: (point: Coordinates) => void }) {
  const map = useMap();
  useMapEvents({ click: (event) => onChange({ lat: event.latlng.lat, lng: ((event.latlng.lng + 180) % 360 + 360) % 360 - 180 }) });
  useEffect(() => {
    if (value) map.panTo([value.lat, value.lng]);
  }, [map, value]);
  return value ? <CircleMarker center={[value.lat, value.lng]} radius={9} pathOptions={{ color: "#15803d", fillColor: "#22c55e", fillOpacity: 0.9 }} /> : null;
}

export function LocationPickerMap({ center, value, onChange }: {
  center: Coordinates;
  value: Coordinates | null;
  onChange: (point: Coordinates) => void;
}) {
  return (
    <MapContainer center={[center.lat, center.lng]} zoom={12} className="h-full w-full" scrollWheelZoom={false}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Selection value={value} onChange={onChange} />
    </MapContainer>
  );
}
