"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, MapPinned, Search, SlidersHorizontal } from "lucide-react";
import { FieldGrid } from "@/components/fields/FieldGrid";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { FIELD_TYPES, ROUTES } from "@/lib/constants";
import { todayInputValue } from "@/lib/utils/format";
import { useFields } from "@/hooks/useFields";
import { useI18n } from "@/lib/i18n/context";

type SurfaceFilter = "all" | "indoor" | "outdoor";
type SortOption = "name" | "price";

export default function FieldsPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { fields, loading, error, refresh } = useFields();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [surface, setSurface] = useState<SurfaceFilter>("all");
  const [date, setDate] = useState(todayInputValue());
  const [sort, setSort] = useState<SortOption>("price");

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
        sort === "price"
          ? a.metadata.price - b.metadata.price
          : a.name.localeCompare(b.name),
      );
  }, [fields, search, sort, surface, type]);

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
        <div className="mx-auto grid max-w-7xl gap-3 px-4 py-4 sm:px-6 md:grid-cols-5 lg:px-8">
          <Input
            label={t("fields.search")}
            placeholder={t("fields.searchPlaceholder")}
            leadingIcon={<Search className="h-4 w-4" aria-hidden="true" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-neutral-900">{t("fields.type")}</span>
            <select
              className="select-control"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="all">{t("common.all")}</option>
              {FIELD_TYPES.map((fieldType) => (
                <option key={fieldType} value={fieldType}>
                  {fieldType}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-neutral-900">{t("fields.surface")}</span>
            <select
              className="select-control"
              value={surface}
              onChange={(e) => setSurface(e.target.value as SurfaceFilter)}
            >
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
            <select
              className="select-control"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
            >
              <option value="price">{t("common.price")}</option>
              <option value="name">{t("fields.sortName")}</option>
            </select>
          </label>
        </div>
      </div>

      {/* Results */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-stone-500">{t("fields.catalog")}</p>
            <h2 className="mt-1 text-2xl font-semibold text-neutral-950">{t("fields.heading")}</h2>
          </div>
          <p className="hidden text-sm font-medium text-stone-500 sm:block">
            {t("fields.sortedBy")} {sort === "price" ? t("common.price") : t("fields.sortName")}
          </p>
        </div>

        {error ? (
          <ErrorState message={error} onRetry={refresh} />
        ) : filteredFields.length || loading ? (
          <FieldGrid fields={filteredFields} loading={loading} />
        ) : (
          <EmptyState
            icon={<span className="text-lg">?</span>}
            title={t("fields.notFound")}
            description={t("fields.notFoundDesc")}
            action={{ label: t("fields.resetFilters"), onClick: () => router.push(ROUTES.fields) }}
          />
        )}
      </div>
    </div>
  );
}
