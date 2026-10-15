import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import type { Field } from "@/lib/types";
import { buttonClasses } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils/format";
import { photoUrl } from "@/lib/api/photos";

export function ComplexCard({ fields, distanceKm }: { fields: Field[]; distanceKm?: number | null }) {
  const field = fields.reduce((cheapest, current) => current.metadata.price < cheapest.metadata.price ? current : cheapest);
  const complex = field.complex;
  const cover = complex?.images?.[0];
  const name = complex?.name || field.name;
  return <div className="flex h-full flex-col overflow-hidden rounded-[10px] border border-stone-200/75 bg-white shadow-sm">
    <div className="pitch-card-bg relative h-52 overflow-hidden">
      {cover && <>{/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photoUrl(cover)} alt={name} className="h-full w-full object-cover" loading="lazy" /></>}
    </div>
    <div className="flex flex-1 flex-col gap-3 p-5">
      <h2 className="text-lg font-semibold text-neutral-950">{name}</h2>
      <p className="flex items-center gap-1 text-xs text-stone-500"><MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />{complex?.address || field.address}</p>
      {typeof distanceKm === "number" && <p className="text-sm font-semibold text-green-800">{distanceKm.toFixed(1)} km away</p>}
      <p className="text-sm text-stone-600">{fields.length} {fields.length === 1 ? "field" : "fields"} · {Array.from(new Set(fields.map(f => f.type))).join(", ")}</p>
      {complex?.description && <p className="line-clamp-2 text-sm text-stone-500">{complex.description}</p>}
      <p className="mt-auto pt-3 text-sm text-stone-600">From <span className="font-mono font-semibold text-neutral-950">{formatCurrency(field.metadata.price, field.metadata.currency)}</span> / hour</p>
      <Link href={complex ? `/complexes/${complex.id}` : `/fields/${field.id}`} className={buttonClasses("primary", "md", "w-full")}>
        Choose field & book <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  </div>;
}
