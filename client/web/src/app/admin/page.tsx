"use client";

import Link from "next/link";
import { Building2, CalendarCheck, MapPinned, TimerReset } from "lucide-react";
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
      <section className="hairline-panel rounded-[8px] p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-stone-500">Control room</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[0] text-neutral-950">Admin overview</h1>
          <p className="mt-2 text-sm text-stone-500">
            Manage complexes, fields, and booking activity.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            className="inline-flex items-center gap-2 rounded-[8px] border border-stone-200 bg-white/80 px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-white"
            href={ROUTES.adminComplexes}
          >
            <Building2 className="h-4 w-4" aria-hidden="true" />
            Complexes
          </Link>
          <Link
            className="inline-flex items-center gap-2 rounded-[8px] bg-neutral-950 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
            href={ROUTES.adminFields}
          >
            <MapPinned className="h-4 w-4" aria-hidden="true" />
            Fields
          </Link>
        </div>
      </div>
      </section>

      {error ? <div className="mt-6"><ErrorState message={error} onRetry={refresh} /></div> : null}
      {bookingsError ? (
        <div className="mt-6 text-sm text-amber-700">{bookingsError}</div>
      ) : null}

      <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={Building2} label="Total Complexes" value={complexes.length} />
        <Stat icon={MapPinned} label="Total Fields" value={fields.length} />
        <Stat icon={CalendarCheck} label="Total Bookings" value={bookings.length} />
        <Stat icon={TimerReset} label="Pending Bookings" value={pendingBookings.length} />
      </section>

      <Card className="mt-8 overflow-hidden">
        <CardContent className="p-0">
          <div className="border-b border-stone-100 p-5">
            <h2 className="text-lg font-semibold text-neutral-950">
              Recent bookings
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-100 text-sm">
              <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500">
                <tr>
                  <th className="px-5 py-3">ID</th>
                  <th className="px-5 py-3">Field</th>
                  <th className="px-5 py-3">Time</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 bg-white">
                {recentBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-stone-50/70">
                    <td className="px-5 py-4 font-mono text-xs text-stone-600">
                      {booking.id}
                    </td>
                    <td className="px-5 py-4 font-semibold text-neutral-950">
                      {booking.field?.name ?? "Field"}
                    </td>
                    <td className="px-5 py-4 font-mono text-stone-600">
                      {formatDateRange(booking.startTime, booking.endTime)}
                    </td>
                    <td className="px-5 py-4 capitalize text-stone-700">
                      {booking.status}
                    </td>
                    <td className="px-5 py-4 text-right font-mono text-neutral-950">
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

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-stone-500">{label}</p>
          <Icon className="h-4 w-4 text-stone-500" aria-hidden="true" />
        </div>
        <p className="mt-3 font-mono text-3xl font-semibold text-neutral-950">
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
