import type { Field } from "@/lib/types";

export function groupFieldsByComplex(fields: Field[]) {
  const groups = new Map<string, Field[]>();
  for (const field of fields) {
    const key = field.complexId || field.id;
    const group = groups.get(key) ?? [];
    group.push(field);
    groups.set(key, group);
  }
  return Array.from(groups, ([id, fields]) => ({ id, fields, complex: fields[0].complex }));
}
