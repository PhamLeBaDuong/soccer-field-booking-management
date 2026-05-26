import Link from "next/link";
import { AmenitiesList } from "@/components/fields/AmenitiesList";
import { buttonClasses } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import type { Field } from "@/lib/types";
import { formatCurrency } from "@/lib/utils/format";

export function FieldCard({ field }: { field: Field }) {
  return (
    <Card className="flex h-full flex-col">
      <CardContent className="flex flex-1 flex-col">
        <p className="text-sm text-gray-500">
          {field.complex?.name ?? "Independent field"}
        </p>
        <h2 className="mt-2 text-lg font-semibold text-gray-900">{field.name}</h2>
        <p className="mt-2 line-clamp-2 text-sm text-gray-500">
          {field.description || field.address}
        </p>
        <div className="mt-4">
          <AmenitiesList field={field} />
        </div>
        <div className="mt-5 flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xl font-semibold text-green-700">
              {formatCurrency(field.metadata.price, field.metadata.currency)}
            </p>
            <p className="text-xs text-gray-500">per hour</p>
          </div>
          <p className="font-mono text-sm text-gray-600">
            {field.startTime}-{field.endTime}
          </p>
        </div>
        <Link
          className={buttonClasses("primary", "md", "mt-5 w-full")}
          href={`/fields/${field.id}`}
        >
          View & Book
        </Link>
      </CardContent>
    </Card>
  );
}

