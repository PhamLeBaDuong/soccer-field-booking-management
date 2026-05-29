import { CloudSun, Goal, Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { Field } from "@/lib/types";

export function AmenitiesList({ field }: { field: Field }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge icon={<Goal className="h-3.5 w-3.5" />} label={field.type} />
      <Badge
        icon={<CloudSun className="h-3.5 w-3.5" />}
        label={field.indoor ? "Indoor" : "Outdoor"}
      />
      {field.lights ? (
        <Badge icon={<Lightbulb className="h-3.5 w-3.5" />} label="Lights" />
      ) : null}
    </div>
  );
}
