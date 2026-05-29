"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Clock, CloudSun, MapPinned, Zap } from "lucide-react";
import { AmenitiesList } from "@/components/fields/AmenitiesList";
import { Card, CardContent } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { ROUTES } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils/format";
import { useAdminData } from "@/hooks/useAdmin";

export default function AdminFieldDetailPage() {
  const params = useParams<{ fieldId: string }>();
  const { fields, loading, error, refresh } = useAdminData();
  const field = fields.find((item) => item.id === params.fieldId);

  if (loading) {
    return <Skeleton className="h-96" />;
  }

  if (error || !field) {
    return <ErrorState message={error ?? "Field not found."} onRetry={refresh} />;
  }

  return (
    <div>
      <Link className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-900 hover:underline" href={ROUTES.adminFields}>
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to fields
      </Link>
      <section className="pitch-hero-bg mt-4 rounded-[8px] p-6 text-white">
        <AmenitiesList field={field} />
        <h1 className="mt-5 text-3xl font-semibold text-white">{field.name}</h1>
        <p className="mt-2 text-sm text-white/74">
          {field.complex?.name ?? "Complex"}
        </p>
      </section>
      <Card className="mt-6">
        <CardContent>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Detail icon={MapPinned} label="Price" value={`${formatCurrency(field.metadata.price, field.metadata.currency)}/hr`} />
            <Detail icon={Clock} label="Hours" value={`${field.startTime}-${field.endTime}`} />
            <Detail icon={CloudSun} label="Indoor" value={field.indoor ? "Yes" : "No"} />
            <Detail icon={Zap} label="Lights" value={field.lights ? "Yes" : "No"} />
          </div>
          <div className="mt-6 rounded-[8px] bg-stone-50 p-4 ring-1 ring-stone-200/70">
            <p className="text-sm font-semibold text-neutral-950">Address</p>
            <p className="mt-1 text-sm text-stone-600">{field.address}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPinned;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[8px] border border-stone-200 p-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase text-stone-500">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </p>
      <p className="mt-2 font-mono text-sm text-neutral-950">{value}</p>
    </div>
  );
}
