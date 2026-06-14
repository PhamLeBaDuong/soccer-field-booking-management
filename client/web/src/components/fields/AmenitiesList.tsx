"use client";

import { CloudSun, Goal, Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { useI18n } from "@/lib/i18n/context";
import type { Field } from "@/lib/types";

export function AmenitiesList({ field }: { field: Field }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap gap-2">
      <Badge icon={<Goal className="h-3.5 w-3.5" />} label={field.type} />
      <Badge
        icon={<CloudSun className="h-3.5 w-3.5" />}
        label={field.indoor ? t("fields.indoor") : t("fields.outdoor")}
      />
      {field.lights ? (
        <Badge icon={<Lightbulb className="h-3.5 w-3.5" />} label={t("field.lights")} />
      ) : null}
    </div>
  );
}
