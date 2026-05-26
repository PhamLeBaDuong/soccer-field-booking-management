"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/lib/auth/hooks";
import { ROUTES } from "@/lib/constants";
import { formatCurrency, formatDateRange } from "@/lib/utils/format";
import { useAdminData } from "@/hooks/useAdmin";
import { useBookings } from "@/hooks/useBookings";

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const { complexes, fields, loading, error, refresh } = useAdminData();
  const {
    bookings,
    loading: bookingsLoading,
    error: bookingsError,
  } = useBookings(user?.id);

  if (loading || bookingsLoading) {
    return <AdminDashboardSkeleton />;
  }

  const pendingBookings = bookings.filter((booking) => booking.status === "pending");
  const recentBookings = bookings.slice(0, 10);

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Admin overview</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage complexes, fields, and booking activity.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            href={ROUTES.adminComplexes}
          >
            Complexes
          </Link>
          <Link
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            href={ROUTES.adminFields}
          >
            Fields
          </Link>
        </div>
      </div>

      {error ? <div className="mt-6"><ErrorState message={error} onRetry={refresh} /></div> : null}
      {bookingsError ? (
        <div className="mt-6 text-sm text-amber-700">{bookingsError}</div>
      ) : null}

      <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total Complexes" value={complexes.length} />
        <Stat label="Total Fields" value={fields.length} />
        <Stat label="Total Bookings" value={bookings.length} />
        <Stat label="Pending Bookings" value={pendingBookings.length} />
      </section>

      <Card className="mt-8 overflow-hidden">
        <CardContent className="p-0">
          <div className="border-b border-gray-100 p-5">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent bookings
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-3">ID</th>
                  <th className="px-5 py-3">Field</th>
                  <th className="px-5 py-3">Time</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {recentBookings.map((booking) => (
                  <tr key={booking.id}>
                    <td className="px-5 py-4 font-mono text-xs text-gray-600">
                      {booking.id}
                    </td>
                    <td className="px-5 py-4 font-medium text-gray-900">
                      {booking.field?.name ?? "Field"}
                    </td>
                    <td className="px-5 py-4 font-mono text-gray-600">
                      {formatDateRange(booking.startTime, booking.endTime)}
                    </td>
                    <td className="px-5 py-4 capitalize text-gray-700">
                      {booking.status}
                    </td>
                    <td className="px-5 py-4 text-right font-mono text-gray-900">
                      {formatCurrency(booking.totalPrice, booking.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="mt-3 font-mono text-3xl font-semibold text-gray-900">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function AdminDashboardSkeleton() {
  return (
    <div>
      <Skeleton className="h-8 w-64" />
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28" />
        ))}
      </div>
      <Skeleton className="mt-8 h-80" />
    </div>
  );
}

