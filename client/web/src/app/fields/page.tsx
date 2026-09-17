"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, ChevronDown, MapPinned, Search, SlidersHorizontal } from "lucide-react";
import { FieldGrid } from "@/components/fields/FieldGrid";
import { LocationPicker } from "@/components/fields/LocationPicker";
import { compareFieldDistances, distanceKm, fieldCoordinates, type SortLocation } from "@/lib/utils/location";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { FIELD_TYPES, ROUTES } from "@/lib/constants";
import { todayInputValue } from "@/lib/utils/format";
import { useFields } from "@/hooks/useFields";
import { useI18n } from "@/lib/i18n/context";
import { cn } from "@/lib/utils/cn";

type SurfaceFilter = "all" | "indoor" | "outdoor";
type SortOption = "name" | "price" | "nearby";

export default function FieldsPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { fields, loading, error, refresh } = useFields();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [surface, setSurface] = useState<SurfaceFilter>("all");
  const [date, setDate] = useState(todayInputValue());
  const [sort, setSort] = useState<SortOption>("price");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [location, setLocation] = useState<SortLocation | null>(null);
  const [locationPicker, setLocationPicker] = useState<"sort" | "change" | null>(null);
  const distances = useMemo(() => new Map(fields.map((field) => {
    const coordinates = fieldCoordinates(field);
    return [field.id, location && coordinates ? distanceKm(location, coordinates) : null] as const;
  })), [fields, location]);
  const mapCenter = fields.map(fieldCoordinates).find((point) => point !== null) ?? { lat: 10.7769, lng: 106.7009 };

  function changeSort(next: SortOption) {
    if (next === "nearby" && !location) setLocationPicker("sort");
    else setSort(next);
  }

  const activeFilterCount = [
    type !== "all",
    surface !== "all",
    date !== todayInputValue(),
    sort !== "price",
  ].filter(Boolean).length;

  const filteredFields = useMemo(() => {
    const needle = search.toLowerCase().trim();
    return fields
      .filter((field) => {
        const matchesSearch =
          !needle ||
          field.name.toLowerCase().includes(needle) ||
          field.complex?.name.toLowerCase().includes(needle);
        const matchesType = type === "all" || field.type === type;
        const matchesSurface =
          surface === "all" ||
          (surface === "indoor" ? field.indoor : !field.indoor);
        return matchesSearch && matchesType && matchesSurface;
      })
      .sort((a, b) =>
        sort === "nearby"
          ? compareFieldDistances(a, b, distances)
          : sort === "price"
          ? a.metadata.price - b.metadata.price
          : a.name.localeCompare(b.name),
      );
  }, [fields, search, sort, surface, type, distances]);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="pitch-hero-bg">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="max-w-2xl text-white">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-xs font-semibold text-white/80 ring-1 ring-white/16 backdrop-blur-sm">
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
              {filteredFields.length} {t("fields.availableFor")} {date}
            </p>
            <h1 className="mt-5 text-4xl font-semibold tracking-[0] sm:text-5xl">
              {t("fields.title")}
            </h1>
            <p className="mt-4 text-base leading-7 text-white/76">
              {t("fields.subtitle")}
            </p>
          </div>
        </div>
      </section>

      {/* Sticky filter bar */}
      <div className="sticky top-16 z-20 border-b border-stone-200/70 bg-white/88 shadow-[0_1px_0_rgba(0,0,0,0.04)] backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          {/* Mobile: search always visible + toggle button */}
          <div className="flex items-end gap-3 md:hidden">
            <div className="flex-1">
              <Input
                label={t("fields.search")}
                placeholder={t("fields.searchPlaceholder")}
                leadingIcon={<Search className="h-4 w-4" aria-hidden="true" />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={() => setFiltersOpen((o) => !o)}
              className={cn(
                "mb-0.5 flex shrink-0 items-center gap-1.5 rounded-[8px] border px-3 py-2.5 text-sm font-semibold transition-colors",
                filtersOpen || activeFilterCount > 0
                  ? "border-neutral-950 bg-neutral-950 text-white"
                  : "border-stone-300 bg-white text-neutral-700 hover:bg-stone-50",
              )}
              aria-expanded={filtersOpen}
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              Filters
              {activeFilterCount > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", filtersOpen && "rotate-180")} aria-hidden="true" />
            </button>
          </div>

          {/* Mobile collapsible filters */}
          <AnimatePresence>
            {filtersOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden md:hidden"
              >
                <div className="grid grid-cols-2 gap-3 pt-3 sm:grid-cols-3">
                  <label className="block space-y-1.5">
                    <span className="text-sm font-semibold text-neutral-900">{t("fields.type")}</span>
                    <select className="select-control" value={type} onChange={(e) => setType(e.target.value)}>
                      <option value="all">{t("common.all")}</option>
                      {FIELD_TYPES.map((ft) => <option key={ft} value={ft}>{ft}</option>)}
                    </select>
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-sm font-semibold text-neutral-900">{t("fields.surface")}</span>
                    <select className="select-control" value={surface} onChange={(e) => setSurface(e.target.value as SurfaceFilter)}>
                      <option value="all">{t("common.all")}</option>
                      <option value="indoor">{t("fields.indoor")}</option>
                      <option value="outdoor">{t("fields.outdoor")}</option>
                    </select>
                  </label>
                  <Input
                    label={t("common.date")}
                    type="date"
                    leadingIcon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                  <label className="block space-y-1.5">
                    <span className="text-sm font-semibold text-neutral-900">{t("fields.sort")}</span>
                    <select className="select-control" value={sort} onChange={(e) => changeSort(e.target.value as SortOption)}>
                      <option value="price">{t("common.price")}</option>
                      <option value="name">{t("fields.sortName")}</option>
                      <option value="nearby">{t("fields.sortNearby")}</option>
                    </select>
                  </label>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Desktop: all filters in one row */}
          <div className="hidden gap-3 py-1 md:grid md:grid-cols-5">
            <Input
              label={t("fields.search")}
              placeholder={t("fields.searchPlaceholder")}
              leadingIcon={<Search className="h-4 w-4" aria-hidden="true" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-neutral-900">{t("fields.type")}</span>
              <select className="select-control" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="all">{t("common.all")}</option>
                {FIELD_TYPES.map((ft) => <option key={ft} value={ft}>{ft}</option>)}
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-neutral-900">{t("fields.surface")}</span>
              <select className="select-control" value={surface} onChange={(e) => setSurface(e.target.value as SurfaceFilter)}>
                <option value="all">{t("common.all")}</option>
                <option value="indoor">{t("fields.indoor")}</option>
                <option value="outdoor">{t("fields.outdoor")}</option>
              </select>
            </label>
            <Input
              label={t("common.date")}
              type="date"
              leadingIcon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-neutral-900">{t("fields.sort")}</span>
              <select className="select-control" value={sort} onChange={(e) => changeSort(e.target.value as SortOption)}>
                <option value="price">{t("common.price")}</option>
                <option value="name">{t("fields.sortName")}</option>
                <option value="nearby">{t("fields.sortNearby")}</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {location && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm">
            <div role="status">
              <p className="flex items-center gap-2 font-medium text-green-900"><MapPinned className="h-4 w-4 shrink-0" aria-hidden="true" />{t("fields.nearLocation")}: {location.label ?? t(location.source === "current" ? "fields.currentLocation" : "fields.mapPin")}</p>
              <p className="mt-1 text-green-800">{t("fields.distanceHelp")}</p>
            </div>
            <button type="button" className="rounded px-2 py-1 font-semibold text-green-900 underline focus-visible:outline-2" onClick={() => setLocationPicker("change")}>{t("fields.changeLocation")}</button>
          </div>
        )}
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-stone-500">{t("fields.catalog")}</p>
            <h2 className="mt-1 text-2xl font-semibold text-neutral-950">{t("fields.heading")}</h2>
          </div>
          <p className="hidden text-sm font-medium text-stone-500 sm:block">
            {t("fields.sortedBy")} {sort === "nearby" ? t("fields.sortNearby") : sort === "price" ? t("common.price") : t("fields.sortName")}
          </p>
        </div>

        {error ? (
          <ErrorState message={error} onRetry={refresh} />
        ) : filteredFields.length || loading ? (
          <FieldGrid fields={filteredFields} loading={loading} distances={location ? distances : undefined} />
        ) : (
          <EmptyState
            icon={<span className="text-lg">?</span>}
            title={t("fields.notFound")}
            description={t("fields.notFoundDesc")}
            action={{ label: t("fields.resetFilters"), onClick: () => router.push(ROUTES.fields) }}
          />
        )}
      </div>
      {locationPicker && <LocationPicker location={location} center={mapCenter} onClose={() => setLocationPicker(null)} onSelect={(selected) => {
        setLocation(selected);
        if (locationPicker === "sort") setSort("nearby");
        setLocationPicker(null);
      }} />}
    </div>
  );
}
