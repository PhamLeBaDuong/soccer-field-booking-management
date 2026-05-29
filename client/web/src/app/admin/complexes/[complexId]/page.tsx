"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Building2, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { ROUTES } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils/format";
import { useAdminData } from "@/hooks/useAdmin";

export default function AdminComplexDetailPage() {
  const params = useParams<{ complexId: string }>();
  const { complexes, fields, loading, error, refresh } = useAdminData();
  const complex = complexes.find((item) => item.id === params.complexId);
  const complexFields = fields.filter((field) => field.complexId === params.complexId);

  if (loading) {
    return <Skeleton className="h-96" />;
  }

  if (error || !complex) {
    return <ErrorState message={error ?? "Complex not found."} onRetry={refresh} />;
  }

  return (
    <div>
      <Link className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-900 hover:underline" href={ROUTES.adminComplexes}>
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to complexes
      </Link>
      <section className="hairline-panel mt-4 rounded-[8px] p-6">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase text-stone-500">
          <Building2 className="h-4 w-4" aria-hidden="true" />
          Complex
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-neutral-950">{complex.name}</h1>
        <p className="mt-2 flex items-center gap-2 text-sm text-stone-500">
          <MapPin className="h-4 w-4" aria-hidden="true" />
          {complex.address}
        </p>
      </section>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_2fr]">
        <Card>
          <CardContent>
            <h2 className="text-lg font-semibold text-neutral-950">Details</h2>
            <div className="mt-4 space-y-3 text-sm">
              <p><span className="font-semibold text-neutral-950">Owner:</span> {complex.owner}</p>
              <p><span className="font-semibold text-neutral-950">Lat:</span> {complex.lat || "-"}</p>
              <p><span className="font-semibold text-neutral-950">Lng:</span> {complex.lng || "-"}</p>
              <p className="text-stone-600">{complex.description}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <h2 className="text-lg font-semibold text-neutral-950">Fields</h2>
            <div className="mt-4 divide-y divide-stone-100">
              {complexFields.map((field) => (
                <Link
                  key={field.id}
                  className="flex items-center justify-between py-3"
                  href={`/admin/fields/${field.id}`}
                >
                  <span>
                    <span className="block font-semibold text-neutral-950">{field.name}</span>
                    <span className="text-sm text-stone-500">{field.type}</span>
                  </span>
                  <span className="font-mono text-sm font-semibold text-neutral-950">
                    {formatCurrency(field.metadata.price, field.metadata.currency)}
                  </span>
                </Link>
              ))}
              {!complexFields.length ? (
                <p className="py-4 text-sm text-stone-500">No fields yet.</p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
