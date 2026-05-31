"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  CalendarClock,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  Zap,
} from "lucide-react";
import { FieldSchedulePanel } from "@/components/schedule/FieldSchedulePanel";
import { ComplexScheduleGrid } from "@/components/schedule/ComplexScheduleGrid";
import { getVenueFieldSchedule, createManualBooking } from "@/lib/api/venues";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { useRequireAuth } from "@/lib/auth/hooks";
import {
  getMyVenueComplexes, createVenueComplex, updateVenueComplex, deleteVenueComplex,
  getVenueFields,      createVenueField,   updateVenueField,   deleteVenueField,
} from "@/lib/api/venues";
import type { Complex, Field } from "@/lib/types";
import { FIELD_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/format";

type ComplexForm = { name: string; address: string; description: string };
type FieldForm   = { name: string; type: string; startTime: string; endTime: string; price: string; indoor: boolean; lights: boolean; description: string };

const EMPTY_COMPLEX: ComplexForm = { name: "", address: "", description: "" };
const EMPTY_FIELD: FieldForm     = { name: "", type: "5v5", startTime: "06:00", endTime: "22:00", price: "", indoor: false, lights: false, description: "" };

export default function MyVenuesPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const { showToast } = useToast();

  const [complexes,   setComplexes]   = useState<Complex[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [expandedId,  setExpandedId]  = useState<string | null>(null);
  const [scheduleId,  setScheduleId]  = useState<string | null>(null);
  const [fieldsMap,   setFieldsMap]   = useState<Record<string, Field[]>>({});

  // Create/edit complex
  const [complexForm, setComplexForm] = useState<ComplexForm>(EMPTY_COMPLEX);
  const [editingComplex, setEditingComplex] = useState<Complex | null>(null);
  const [showComplexForm, setShowComplexForm] = useState(false);

  // Create/edit field
  const [fieldForm, setFieldForm]     = useState<FieldForm>(EMPTY_FIELD);
  const [editingField, setEditingField] = useState<Field | null>(null);
  const [addingFieldToComplex, setAddingFieldToComplex] = useState<string | null>(null);

  const loadComplexes = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      setComplexes(await getMyVenueComplexes());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load venues.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadComplexes(); }, [loadComplexes]);

  async function loadFields(complexId: string) {
    try {
      const fields = await getVenueFields(complexId);
      setFieldsMap((prev) => ({ ...prev, [complexId]: fields }));
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to load fields.", "error");
    }
  }

  function toggleExpand(complexId: string) {
    if (expandedId === complexId) {
      setExpandedId(null);
    } else {
      setExpandedId(complexId);
      if (!fieldsMap[complexId]) loadFields(complexId);
    }
  }

  // ─── Complex CRUD ────────────────────────────────────────────────────────────

  function startCreateComplex() {
    setEditingComplex(null);
    setComplexForm(EMPTY_COMPLEX);
    setShowComplexForm(true);
  }

  function startEditComplex(complex: Complex) {
    setEditingComplex(complex);
    setComplexForm({ name: complex.name, address: complex.address, description: complex.description ?? "" });
    setShowComplexForm(true);
  }

  async function submitComplex(e: React.FormEvent) {
    e.preventDefault();
    if (!complexForm.name.trim() || !complexForm.address.trim()) {
      showToast("Name and address are required.", "error"); return;
    }
    try {
      if (editingComplex) {
        await updateVenueComplex(editingComplex.id, complexForm);
        showToast("Complex updated.");
      } else {
        await createVenueComplex(complexForm);
        showToast("Complex created.");
      }
      setShowComplexForm(false);
      await loadComplexes();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to save complex.", "error");
    }
  }

  async function handleDeleteComplex(id: string) {
    try {
      await deleteVenueComplex(id);
      showToast("Complex deleted.");
      await loadComplexes();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to delete complex.", "error");
    }
  }

  // ─── Field CRUD ───────────────────────────────────────────────────────────────

  function startAddField(complexId: string) {
    setEditingField(null);
    setFieldForm(EMPTY_FIELD);
    setAddingFieldToComplex(complexId);
  }

  function startEditField(field: Field) {
    setEditingField(field);
    setAddingFieldToComplex(field.complexId);
    setFieldForm({
      name:        field.name,
      type:        field.type,
      startTime:   field.startTime,
      endTime:     field.endTime,
      price:       String(field.metadata.price),
      indoor:      field.indoor,
      lights:      field.lights,
      description: field.description ?? "",
    });
  }

  async function submitField(e: React.FormEvent, complexId: string) {
    e.preventDefault();
    if (!fieldForm.name.trim()) { showToast("Name is required.", "error"); return; }
    const price = Number(fieldForm.price);
    if (Number.isNaN(price) || price < 0) { showToast("Invalid price.", "error"); return; }
    try {
      const payload = {
        name:        fieldForm.name,
        type:        fieldForm.type,
        startTime:   `2000-01-01T${fieldForm.startTime}:00.000Z`,
        endTime:     `2000-01-01T${fieldForm.endTime}:00.000Z`,
        indoor:      fieldForm.indoor,
        lights:      fieldForm.lights,
        price,
        description: fieldForm.description || undefined,
      };
      if (editingField) {
        await updateVenueField(editingField.id, payload);
        showToast("Field updated.");
      } else {
        await createVenueField(complexId, payload);
        showToast("Field created.");
      }
      setAddingFieldToComplex(null);
      setEditingField(null);
      await loadFields(complexId);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to save field.", "error");
    }
  }

  async function handleDeleteField(field: Field) {
    try {
      await deleteVenueField(field.id);
      showToast("Field deleted.");
      await loadFields(field.complexId);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to delete field.", "error");
    }
  }

  if (authLoading || !user) return <VenuesSkeleton />;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="hairline-panel rounded-[8px] p-6">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase text-stone-500">
          <Building2 className="h-4 w-4" aria-hidden="true" />
          Venue management
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[0] text-neutral-950">My Venues</h1>
        <p className="mt-2 text-sm text-stone-500">
          Register your complexes and add fields for players to discover and book.
        </p>
      </section>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-950">My complexes</h2>
        <Button onClick={startCreateComplex}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add complex
        </Button>
      </div>

      {/* Create/Edit complex form */}
      {showComplexForm && (
        <Card className="mt-4">
          <CardContent>
            <h3 className="text-base font-semibold text-neutral-950">
              {editingComplex ? "Edit complex" : "New complex"}
            </h3>
            <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={submitComplex}>
              <Input label="Name" placeholder="e.g. Binh Thanh FC Center"
                value={complexForm.name}
                onChange={(e) => setComplexForm((p) => ({ ...p, name: e.target.value }))} />
              <Input label="Address" placeholder="120 Đinh Tiên Hoàng…"
                value={complexForm.address}
                onChange={(e) => setComplexForm((p) => ({ ...p, address: e.target.value }))} />
              <div className="sm:col-span-2">
                <Input label="Description (optional)" placeholder="Daytime only, no lights…"
                  value={complexForm.description}
                  onChange={(e) => setComplexForm((p) => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit">
                  {editingComplex ? "Save changes" : "Create complex"}
                </Button>
                <Button variant="secondary" type="button" onClick={() => setShowComplexForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && <div className="mt-4"><ErrorState message={error} onRetry={loadComplexes} /></div>}

      {/* Complex list */}
      <div className="mt-4 grid gap-3">
        {loading ? (
          <><Skeleton className="h-16" /><Skeleton className="h-16" /></>
        ) : complexes.length === 0 ? (
          <Card><CardContent>
            <EmptyState icon={<Building2 className="h-5 w-5" />}
              title="No complexes yet"
              description="Add your first complex to start listing fields." />
          </CardContent></Card>
        ) : (
          complexes.map((complex) => (
            <div key={complex.id}>
              {/* Complex card */}
              <Card>
                <CardContent>
                  <div className="flex items-center justify-between gap-3">
                    <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      onClick={() => toggleExpand(complex.id)}>
                      {expandedId === complex.id
                        ? <ChevronDown className="h-4 w-4 shrink-0 text-stone-400" aria-hidden="true" />
                        : <ChevronRight className="h-4 w-4 shrink-0 text-stone-400" aria-hidden="true" />}
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-neutral-950">{complex.name}</p>
                        <p className="flex items-center gap-1 text-xs text-stone-500">
                          <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                          {complex.address}
                        </p>
                      </div>
                    </button>
                    <div className="flex shrink-0 gap-2">
                      <button type="button" title="Schedule"
                        onClick={() => setScheduleId(scheduleId === complex.id ? null : complex.id)}
                        className={cn(
                          "rounded-[6px] p-1.5 transition-colors",
                          scheduleId === complex.id
                            ? "bg-neutral-950 text-white"
                            : "text-stone-400 hover:bg-stone-100 hover:text-neutral-950",
                        )}>
                        <CalendarDays className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button type="button" onClick={() => startEditComplex(complex)}
                        className="rounded-[6px] p-1.5 text-stone-400 hover:bg-stone-100 hover:text-neutral-950">
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button type="button" onClick={() => handleDeleteComplex(complex.id)}
                        className="rounded-[6px] p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600">
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {/* Fields section (expanded) */}
                  {expandedId === complex.id && (
                    <div className="mt-4 border-t border-stone-100 pt-4">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase text-stone-500">Fields</p>
                        <Button variant="secondary" onClick={() => startAddField(complex.id)}>
                          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                          Add field
                        </Button>
                      </div>

                      {/* Add/edit field form */}
                      {addingFieldToComplex === complex.id && (
                        <form className="mt-3 grid gap-3 rounded-[8px] bg-stone-50 p-4 ring-1 ring-stone-200 sm:grid-cols-2"
                          onSubmit={(e) => submitField(e, complex.id)}>
                          <p className="text-sm font-semibold text-neutral-950 sm:col-span-2">
                            {editingField ? "Edit field" : "New field"}
                          </p>
                          <Input label="Name" placeholder="Sân A1 – 5v5 Indoor"
                            value={fieldForm.name}
                            onChange={(e) => setFieldForm((p) => ({ ...p, name: e.target.value }))} />
                          <label className="block space-y-1.5">
                            <span className="text-sm font-semibold text-neutral-900">Type</span>
                            <select className="select-control" value={fieldForm.type}
                              onChange={(e) => setFieldForm((p) => ({ ...p, type: e.target.value }))}>
                              {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </label>
                          <Input label="Opens (HH:MM)" placeholder="06:00"
                            value={fieldForm.startTime}
                            onChange={(e) => setFieldForm((p) => ({ ...p, startTime: e.target.value }))} />
                          <Input label="Closes (HH:MM)" placeholder="22:00"
                            value={fieldForm.endTime}
                            onChange={(e) => setFieldForm((p) => ({ ...p, endTime: e.target.value }))} />
                          <Input label="Price per hour (VND)" type="number" min={0} placeholder="200000"
                            value={fieldForm.price}
                            onChange={(e) => setFieldForm((p) => ({ ...p, price: e.target.value }))} />
                          <Input label="Description (optional)"
                            value={fieldForm.description}
                            onChange={(e) => setFieldForm((p) => ({ ...p, description: e.target.value }))} />
                          <div className="flex gap-4 sm:col-span-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-neutral-800 cursor-pointer">
                              <input type="checkbox" checked={fieldForm.indoor}
                                onChange={(e) => setFieldForm((p) => ({ ...p, indoor: e.target.checked }))}
                                className="h-4 w-4 rounded border-stone-300 accent-neutral-950" />
                              Indoor
                            </label>
                            <label className="flex items-center gap-2 text-sm font-medium text-neutral-800 cursor-pointer">
                              <input type="checkbox" checked={fieldForm.lights}
                                onChange={(e) => setFieldForm((p) => ({ ...p, lights: e.target.checked }))}
                                className="h-4 w-4 rounded border-stone-300 accent-neutral-950" />
                              Lights available
                            </label>
                          </div>
                          <div className="flex gap-2 sm:col-span-2">
                            <Button type="submit">
                              {editingField ? "Save field" : "Create field"}
                            </Button>
                            <Button variant="secondary" type="button"
                              onClick={() => { setAddingFieldToComplex(null); setEditingField(null); }}>
                              Cancel
                            </Button>
                          </div>
                        </form>
                      )}

                      {/* Field list */}
                      {!fieldsMap[complex.id] ? (
                        <div className="mt-3"><Skeleton className="h-14" /></div>
                      ) : fieldsMap[complex.id].length === 0 ? (
                        <p className="mt-3 text-sm text-stone-500">No fields yet — add one above.</p>
                      ) : (
                        <div className="mt-3 grid gap-2">
                          {fieldsMap[complex.id].map((field) => (
                            <FieldRow
                              key={field.id}
                              field={field}
                              onEdit={() => startEditField(field)}
                              onDelete={() => handleDeleteField(field)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Combined schedule grid */}
                  {scheduleId === complex.id && (
                    <div className="mt-4 border-t border-stone-100 pt-4">
                      <ComplexScheduleGrid complexId={complex.id} />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Field Row ────────────────────────────────────────────────────────────────

function FieldRow({ field, onEdit, onDelete }: { field: Field; onEdit: () => void; onDelete: () => void }) {
  const [showSchedule, setShowSchedule] = useState(false);

  return (
    <div className="rounded-[8px] border border-stone-200 bg-white/80">
      {/* Header row */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-neutral-950">{field.name}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-stone-500">
            <span className="flex items-center gap-1">
              <CalendarClock className="h-3 w-3" aria-hidden="true" />
              {field.startTime}–{field.endTime}
            </span>
            <span className="font-mono">{formatCurrency(field.metadata.price, field.metadata.currency)}/hr</span>
            {field.indoor && <span className="flex items-center gap-1"><Zap className="h-3 w-3" aria-hidden="true" />Indoor</span>}
            {field.lights && <span className="flex items-center gap-1"><Zap className="h-3 w-3" aria-hidden="true" />Lights</span>}
          </div>
        </div>
        <div className="flex shrink-0 gap-1 ml-2">
          <button type="button" title="Schedule & bookings"
            onClick={() => setShowSchedule((v) => !v)}
            className={cn(
              "rounded-[6px] p-1.5 transition-colors",
              showSchedule
                ? "bg-neutral-950 text-white"
                : "text-stone-400 hover:bg-stone-100 hover:text-neutral-950",
            )}>
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button type="button" onClick={onEdit}
            className="rounded-[6px] p-1.5 text-stone-400 hover:bg-stone-100 hover:text-neutral-950">
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button type="button" onClick={onDelete}
            className="rounded-[6px] p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600">
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Inline schedule panel */}
      {showSchedule && (
        <div className="border-t border-stone-100 px-3 py-4">
          <FieldSchedulePanel
            fieldId={field.id}
            fieldStart={field.startTime}
            fieldEnd={field.endTime}
            pricePerHour={field.metadata.price}
            currency={field.metadata.currency}
            fetchSchedule={getVenueFieldSchedule}
            createManual={createManualBooking}
          />
        </div>
      )}
    </div>
  );
}

function VenuesSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Skeleton className="h-28" />
      <div className="mt-6 grid gap-3">
        <Skeleton className="h-16" /><Skeleton className="h-16" />
      </div>
    </div>
  );
}
