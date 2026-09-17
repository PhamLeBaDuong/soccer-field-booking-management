"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { buttonClasses } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useI18n } from "@/lib/i18n/context";
import { validCoordinates, type Coordinates, type SortLocation } from "@/lib/utils/location";

const LocationPickerMap = dynamic(() => import("./LocationPickerMap").then((module) => module.LocationPickerMap), { ssr: false });

export function LocationPicker({ location, center, onSelect, onClose }: {
  location: SortLocation | null;
  center: Coordinates;
  onSelect: (location: SortLocation) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [manual, setManual] = useState(true);
  const [point, setPoint] = useState<(Coordinates & { label?: string }) | null>(location);
  const [address, setAddress] = useState(location?.label ?? "");
  const [results, setResults] = useState<(Coordinates & { label: string })[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const searchRequest = useRef<AbortController | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);
  useEffect(() => () => { request.current += 1; searchRequest.current?.abort(); }, []);

  function cancelSearch() {
    searchRequest.current?.abort();
    searchRequest.current = null;
    setSearching(false);
    setResults([]);
    setSearchMessage(null);
  }

  async function searchAddress(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    chooseManually();
    cancelSearch();
    setPoint(null);
    const controller = new AbortController();
    searchRequest.current = controller;
    setSearching(true);
    try {
      const response = await fetch(`/api/locations?q=${encodeURIComponent(address.trim())}`, { signal: controller.signal });
      if (!response.ok) throw new Error("Search failed");
      const data = await response.json();
      if (controller.signal.aborted) return;
      setResults(data.results);
      if (!data.results.length) setSearchMessage(t("fields.addressNotFound"));
    } catch {
      if (!controller.signal.aborted) setSearchMessage(t("fields.addressSearchError"));
    } finally {
      if (!controller.signal.aborted) setSearching(false);
    }
  }

  function chooseManually() {
    request.current += 1;
    setPending(false);
    setManual(true);
  }

  function locate() {
    cancelSearch();
    const id = ++request.current;
    setError(null);
    if (!navigator.geolocation || !window.isSecureContext) {
      setError(t("fields.locationUnavailable"));
      setManual(true);
      return;
    }
    setPending(true);
    navigator.geolocation.getCurrentPosition((position) => {
      if (id !== request.current) return;
      setPending(false);
      const coordinates = { lat: position.coords.latitude, lng: position.coords.longitude };
      if (!validCoordinates(coordinates)) {
        setError(t("fields.locationUnavailable"));
        setManual(true);
        return;
      }
      onSelect({ ...coordinates, source: "current" });
    }, (failure) => {
      if (id !== request.current) return;
      setPending(false);
      setManual(true);
      setError(t(failure.code === 1 ? "fields.locationDenied" : failure.code === 3 ? "fields.locationTimeout" : "fields.locationUnavailable"));
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  }

  return (
    <Modal open title={t("fields.chooseLocation")} onClose={onClose} footer={
      <div className="flex justify-end gap-2">
        <button type="button" className={buttonClasses("secondary", "md")} onClick={onClose}>{t("common.cancel")}</button>
        {manual && <button type="button" className={buttonClasses("primary", "md")} disabled={!point || pending || searching} onClick={() => { if (point) onSelect({ ...point, source: "selected" }); }}>{t("fields.useLocation")}</button>}
      </div>
    }>
      <div className="space-y-4">
        <p className="text-sm text-stone-600">{t("fields.locationHelp")}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={buttonClasses("primary", "md")} disabled={pending} onClick={locate}>{pending ? t("fields.locating") : error ? t("fields.retryLocation") : t("fields.useCurrentLocation")}</button>
        </div>
        {pending && <p role="status" className="text-sm text-stone-600">{t("fields.locating")}</p>}
        {error && <p role="alert" className="text-sm text-amber-800">{error}</p>}
        {manual && <>
          <form onSubmit={searchAddress} className="flex items-end gap-2">
            <div className="min-w-0 flex-1"><Input label={t("fields.addressSearch")} placeholder={t("fields.addressPlaceholder")} value={address} minLength={3} maxLength={200} required onChange={(event) => { chooseManually(); cancelSearch(); setAddress(event.target.value); setPoint(null); }} /></div>
            <button type="submit" className={buttonClasses("secondary", "md")} disabled={searching || address.trim().length < 3}>{t("fields.search")}</button>
          </form>
          {searching && <p role="status" className="text-sm text-stone-600">{t("fields.searchingAddress")}</p>}
          {searchMessage && <p role="status" className="text-sm text-amber-800">{searchMessage}</p>}
          {results.length > 0 && <ul className="divide-y divide-stone-200 rounded-lg border border-stone-200">{results.map((result, index) => <li key={`${result.lat},${result.lng},${index}`}><button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-green-50 focus-visible:bg-green-50" onClick={() => { setPoint(result); setAddress(result.label); setResults([]); }}>{result.label}</button></li>)}</ul>}
          {point && <p role="status" className="text-sm font-medium text-green-800">{t("fields.selectedLocation")}: {point.label ?? t("fields.mapPin")}</p>}
          <p className="text-xs text-stone-500">{t("fields.addressAttribution")} <a href="https://photon.komoot.io" target="_blank" rel="noreferrer" className="underline">Photon</a> / <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline">© OpenStreetMap</a></p>
          <p className="text-sm text-stone-600">{t("fields.mapHelp")}</p>
          <div className="relative isolate h-60 overflow-hidden rounded-lg border border-stone-200">
            <LocationPickerMap center={location ?? center} value={point} onChange={(selected) => { chooseManually(); cancelSearch(); setPoint(selected); setAddress(""); }} />
          </div>
        </>}
      </div>
    </Modal>
  );
}
