"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FieldGrid } from "@/components/fields/FieldGrid";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { FIELD_TYPES, ROUTES } from "@/lib/constants";
import { todayInputValue } from "@/lib/utils/format";
import { useFields } from "@/hooks/useFields";

type SurfaceFilter = "all" | "indoor" | "outdoor";
type SortOption = "name" | "price";

export default function FieldsPage() {
  const router = useRouter();
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
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-16 z-20 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto grid max-w-7xl gap-3 px-4 py-4 sm:px-6 md:grid-cols-5 lg:px-8">
          <Input
            label="Search"
            placeholder="Field or complex"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-gray-800">Type</span>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              <option value="all">All</option>
              {FIELD_TYPES.map((fieldType) => (
                <option key={fieldType} value={fieldType}>
                  {fieldType}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-gray-800">Surface</span>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              value={surface}
              onChange={(event) => setSurface(event.target.value as SurfaceFilter)}
            >
              <option value="all">All</option>
              <option value="indoor">Indoor</option>
              <option value="outdoor">Outdoor</option>
            </select>
          </label>
          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-gray-800">Sort</span>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              value={sort}
              onChange={(event) => setSort(event.target.value as SortOption)}
            >
              <option value="price">Price</option>
              <option value="name">Name</option>
            </select>
          </label>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Fields</h1>
          <p className="mt-1 text-sm text-gray-500">
            {filteredFields.length} available for {date}
          </p>
        </div>
        {error ? (
          <ErrorState message={error} onRetry={refresh} />
        ) : filteredFields.length || loading ? (
          <FieldGrid fields={filteredFields} loading={loading} />
        ) : (
          <EmptyState
            icon={<span className="text-lg">?</span>}
            title="No fields found"
            description="Try a different search, field type, or surface filter."
            action={{ label: "Reset Filters", onClick: () => router.push(ROUTES.fields) }}
          />
        )}
      </div>
    </div>
  );
}
