import { FieldCard } from "@/components/fields/FieldCard";
import { CardSkeleton } from "@/components/ui/Skeleton";
import type { Field } from "@/lib/types";

export function FieldGrid({
  fields,
  loading,
  distances,
}: {
  fields: Field[];
  loading?: boolean;
  distances?: ReadonlyMap<string, number | null>;
}) {
  if (loading) {
    return (
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <CardSkeleton key={index} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {fields.map((field) => (
        <FieldCard key={field.id} field={field} distanceKm={distances ? distances.get(field.id) ?? null : undefined} />
      ))}
    </div>
  );
}
