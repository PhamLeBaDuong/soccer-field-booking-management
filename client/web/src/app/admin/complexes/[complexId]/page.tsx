"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
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
      <Link className="text-sm font-medium text-green-700" href={ROUTES.adminComplexes}>
        Back to complexes
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-gray-900">{complex.name}</h1>
      <p className="mt-1 text-sm text-gray-500">{complex.address}</p>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_2fr]">
        <Card>
          <CardContent>
            <h2 className="text-lg font-semibold text-gray-900">Details</h2>
            <div className="mt-4 space-y-3 text-sm">
              <p><span className="font-medium text-gray-900">Owner:</span> {complex.owner}</p>
              <p><span className="font-medium text-gray-900">Lat:</span> {complex.lat || "-"}</p>
              <p><span className="font-medium text-gray-900">Lng:</span> {complex.lng || "-"}</p>
              <p className="text-gray-600">{complex.description}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <h2 className="text-lg font-semibold text-gray-900">Fields</h2>
            <div className="mt-4 divide-y divide-gray-100">
              {complexFields.map((field) => (
                <Link
                  key={field.id}
                  className="flex items-center justify-between py-3"
                  href={`/admin/fields/${field.id}`}
                >
                  <span>
                    <span className="block font-medium text-gray-900">{field.name}</span>
                    <span className="text-sm text-gray-500">{field.type}</span>
                  </span>
                  <span className="font-mono text-sm text-green-700">
                    {formatCurrency(field.metadata.price, field.metadata.currency)}
                  </span>
                </Link>
              ))}
              {!complexFields.length ? (
                <p className="py-4 text-sm text-gray-500">No fields yet.</p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

