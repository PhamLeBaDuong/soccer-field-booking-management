"use client";

import { useParams } from "next/navigation";
import { ComplexDetail } from "@/components/fields/ComplexDetail";

export default function ComplexPage() {
  const { complexId } = useParams<{ complexId: string }>();
  return <ComplexDetail key={complexId} complexId={complexId} />;
}
