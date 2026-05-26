"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
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
      <Link className="text-sm font-medium text-green-700" href={ROUTES.adminFields}>
        Back to fields
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-gray-900">{field.name}</h1>
      <p className="mt-1 text-sm text-gray-500">
        {field.complex?.name ?? "Complex"}
      </p>
      <Card className="mt-6">
        <CardContent>
          <AmenitiesList field={field} />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Detail label="Price" value={`${formatCurrency(field.metadata.price, field.metadata.currency)}/hr`} />
            <Detail label="Hours" value={`${field.startTime}-${field.endTime}`} />
            <Detail label="Indoor" value={field.indoor ? "Yes" : "No"} />
            <Detail label="Lights" value={field.lights ? "Yes" : "No"} />
          </div>
          <div className="mt-6 rounded-lg bg-gray-50 p-4">
            <p className="text-sm font-medium text-gray-900">Address</p>
            <p className="mt-1 text-sm text-gray-600">{field.address}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <p className="text-xs font-medium uppercase text-gray-500">{label}</p>
      <p className="mt-2 font-mono text-sm text-gray-900">{value}</p>
    </div>
  );
}

