"use client";

import { useParams } from "next/navigation";
import { ComplexDetail } from "@/components/fields/ComplexDetail";

export default function FieldPage() {
  const { fieldId } = useParams<{ fieldId: string }>();
  return <ComplexDetail key={fieldId} initialFieldId={fieldId} />;
}
