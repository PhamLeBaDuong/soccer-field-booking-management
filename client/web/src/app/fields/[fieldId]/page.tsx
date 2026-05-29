"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Clock, CloudSun, MapPin, Trophy, Zap } from "lucide-react";
import { AmenitiesList } from "@/components/fields/AmenitiesList";
import { BookingForm } from "@/components/bookings/BookingForm";
import { Card, CardContent } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { ROUTES } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils/format";
import { useField } from "@/hooks/useFields";

export default function FieldDetailPage() {
  const params = useParams<{ fieldId: string }>();
  const { field, loading, error, refresh } = useField(params.fieldId);

  if (loading) {
    return <FieldDetailSkeleton />;
  }

  if (error || !field) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <ErrorState message={error ?? "Field not found."} onRetry={refresh} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <section className="pitch-hero-bg mb-6 overflow-hidden rounded-[8px] px-5 py-8 text-white shadow-[0_30px_90px_rgba(23,23,23,0.18)] sm:px-8 lg:px-10">
        <Link className="inline-flex items-center gap-2 text-sm font-semibold text-white/82 hover:text-white" href={ROUTES.fields}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to fields
        </Link>
        <div className="mt-12 max-w-3xl">
          <AmenitiesList field={field} />
          <h1 className="mt-5 text-4xl font-semibold tracking-[0] sm:text-5xl">{field.name}</h1>
          <p className="mt-3 flex items-center gap-2 text-white/74">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            {field.complex?.name ?? "Independent field"}
          </p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(340px,2fr)]">
        <div className="space-y-6">
          <Card>
            <CardContent>
              <p className="text-base leading-7 text-stone-600">
                {field.description ||
                  "A well-maintained football pitch ready for your next match."}
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Info icon={MapPin} label="Address" value={field.address} />
                <Info
                  icon={Clock}
                  label="Operating hours"
                  value={`${field.startTime}-${field.endTime}`}
                />
                <Info
                  icon={Trophy}
                  label="Price"
                  value={`${formatCurrency(
                    field.metadata.price,
                    field.metadata.currency,
                  )}/hr`}
                />
                <Info icon={CloudSun} label="Surface" value={field.indoor ? "Indoor" : "Outdoor"} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <h2 className="text-lg font-semibold text-neutral-950">Amenities</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Amenity icon={Trophy} title="Field type" value={field.type} />
                <Amenity icon={Zap} title="Lighting" value={field.lights ? "Available" : "No lights"} />
                <Amenity icon={CloudSun} title="Weather" value={field.indoor ? "Covered" : "Open air"} />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bottom-0 lg:sticky lg:top-24 lg:self-start">
          <CardContent>
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-neutral-950">Book this field</h2>
              <p className="mt-1 text-sm text-stone-500">
                {formatCurrency(field.metadata.price, field.metadata.currency)} per hour
              </p>
            </div>
            <BookingForm field={field} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Info({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[8px] border border-stone-200 bg-white/66 p-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase text-stone-500">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-neutral-950">{value}</p>
    </div>
  );
}

function Amenity({
  icon: Icon,
  title,
  value,
}: {
  icon: typeof Trophy;
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-[8px] bg-stone-50 p-4 ring-1 ring-stone-200/70">
      <Icon className="h-4 w-4 text-stone-500" aria-hidden="true" />
      <p className="mt-3 text-sm font-semibold text-neutral-950">{title}</p>
      <p className="mt-1 text-sm text-stone-500">{value}</p>
    </div>
  );
}

function FieldDetailSkeleton() {
  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[minmax(0,3fr)_minmax(340px,2fr)]">
      <Skeleton className="h-96" />
      <Skeleton className="h-[34rem]" />
    </div>
  );
}
