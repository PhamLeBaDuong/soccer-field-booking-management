"use client";

import Link from "next/link";
import { ArrowRight, Clock, MapPin, Swords } from "lucide-react";
import { AmenitiesList } from "@/components/fields/AmenitiesList";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useI18n } from "@/lib/i18n/context";
import type { Field } from "@/lib/types";
import { formatCurrency } from "@/lib/utils/format";

export function FieldCard({ field }: { field: Field }) {
  const { t } = useI18n();
  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-[10px] border border-stone-200/75 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_14px_44px_rgba(12,12,12,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(0,0,0,0.10),0_24px_64px_rgba(12,12,12,0.12)]">
      <div className="pitch-card-bg relative min-h-52 overflow-hidden">
        <div className="absolute left-4 top-4 flex flex-wrap gap-1.5">
          <AmenitiesList field={field} />
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur-sm">
            <MapPin className="h-3 w-3" aria-hidden="true" />
            {field.complex?.name ?? "Independent field"}
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h2 className="text-lg font-semibold tracking-[-0.01em] text-neutral-950">
          {field.name}
        </h2>
        <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-stone-500">
          {field.description || field.address}
        </p>
        <div className="mt-5 flex items-end justify-between gap-4 border-t border-stone-200/80 pt-5">
          <div>
            <p className="font-mono text-xl font-semibold text-neutral-950">
              {formatCurrency(field.metadata.price, field.metadata.currency)}
            </p>
            <p className="text-xs font-medium text-stone-500">{t("common.perHour")}</p>
          </div>
          <p className="flex items-center gap-1.5 font-mono text-sm text-stone-600">
            <Clock className="h-4 w-4" aria-hidden="true" />
            {field.startTime}-{field.endTime}
          </p>
        </div>
        <div className="mt-5 flex flex-col gap-2">
          <Link
            className={buttonClasses("primary", "md", "w-full")}
            href={`/fields/${field.id}`}
          >
            {t("field.viewBook")}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
          <Link
            className={buttonClasses("secondary", "md", "w-full")}
            href={`/matching?fieldId=${field.id}`}
          >
            <Swords className="h-4 w-4" aria-hidden="true" />
            {t("field.postMatch")}
          </Link>
        </div>
      </div>
    </Card>
  );
}
