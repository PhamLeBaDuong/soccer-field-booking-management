"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link className="text-sm font-medium text-green-700" href={ROUTES.fields}>
          Back to fields
        </Link>
        <h1 className="mt-3 text-3xl font-semibold text-gray-900">{field.name}</h1>
        <p className="mt-1 text-gray-500">
          {field.complex?.name ?? "Independent field"}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(340px,2fr)]">
        <div className="space-y-6">
          <Card>
            <CardContent>
              <AmenitiesList field={field} />
              <p className="mt-5 text-gray-600">
                {field.description ||
                  "A well-maintained football pitch ready for your next match."}
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Info label="Address" value={field.address} />
                <Info
                  label="Operating hours"
                  value={`${field.startTime}-${field.endTime}`}
                />
                <Info
                  label="Price"
                  value={`${formatCurrency(
                    field.metadata.price,
                    field.metadata.currency,
                  )}/hr`}
                />
                <Info label="Surface" value={field.indoor ? "Indoor" : "Outdoor"} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <h2 className="text-lg font-semibold text-gray-900">Amenities</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Amenity title="Field type" value={field.type} />
                <Amenity title="Lighting" value={field.lights ? "Available" : "No lights"} />
                <Amenity title="Weather" value={field.indoor ? "Covered" : "Open air"} />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bottom-0 lg:sticky lg:top-24 lg:self-start">
          <CardContent>
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-gray-900">Book this field</h2>
              <p className="mt-1 text-sm text-gray-500">
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <p className="text-xs font-medium uppercase text-gray-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-gray-900">{value}</p>
    </div>
  );
}

function Amenity({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-4">
      <p className="text-sm font-medium text-gray-900">{title}</p>
      <p className="mt-1 text-sm text-gray-500">{value}</p>
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

