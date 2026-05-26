import { Badge } from "@/components/ui/Badge";
import type { Field } from "@/lib/types";

export function AmenitiesList({ field }: { field: Field }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge label={field.type} />
      <Badge label={field.indoor ? "Indoor" : "Outdoor"} />
      {field.lights ? <Badge label="Lights" /> : null}
    </div>
  );
}

