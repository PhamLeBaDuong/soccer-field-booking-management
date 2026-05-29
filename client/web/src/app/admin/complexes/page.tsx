"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Building2, Edit3, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import {
  createComplex,
  deleteComplex,
  updateComplex,
} from "@/lib/api/admin";
import { useAuth } from "@/lib/auth/hooks";
import type { Complex, ComplexPayload } from "@/lib/types";
import { useAdminData } from "@/hooks/useAdmin";

type ComplexForm = {
  name: string;
  description: string;
  address: string;
  lat: string;
  lng: string;
};

const emptyForm: ComplexForm = {
  name: "",
  description: "",
  address: "",
  lat: "",
  lng: "",
};

export default function AdminComplexesPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { complexes, fields, loading, error, refresh } = useAdminData();
  const [items, setItems] = useState<Complex[]>([]);
  const [form, setForm] = useState<ComplexForm>(emptyForm);
  const [editing, setEditing] = useState<Complex | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState("");

  useEffect(() => {
    setItems(complexes);
  }, [complexes]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(complex: Complex) {
    setEditing(complex);
    setForm({
      name: complex.name,
      description: complex.description,
      address: complex.address,
      lat: complex.lat ? String(complex.lat) : "",
      lng: complex.lng ? String(complex.lng) : "",
    });
    setModalOpen(true);
  }

  function buildPayload(): ComplexPayload {
    return {
      ownerId: user?.id ?? "demo-user",
      name: form.name,
      description: form.description,
      address: form.address,
      lat: form.lat ? Number(form.lat) : undefined,
      lng: form.lng ? Number(form.lng) : undefined,
    };
  }

  async function saveComplex() {
    if (!form.name.trim() || !form.address.trim()) {
      showToast("Name and address are required.", "error");
      return;
    }

    setSaving(true);
    try {
      const saved = editing
        ? await updateComplex(editing.id, buildPayload())
        : await createComplex(buildPayload());
      setItems((current) =>
        editing
          ? current.map((item) => (item.id === saved.id ? saved : item))
          : [saved, ...current],
      );
      showToast(editing ? "Complex updated." : "Complex created.");
      setModalOpen(false);
    } catch (caught) {
      showToast(
        caught instanceof Error ? caught.message : "Unable to save complex.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeComplex(id: string) {
    try {
      await deleteComplex(id);
      setItems((current) => current.filter((item) => item.id !== id));
      setConfirmDelete("");
      showToast("Complex deleted.");
    } catch (caught) {
      showToast(
        caught instanceof Error ? caught.message : "Unable to delete complex.",
        "error",
      );
    }
  }

  if (loading) {
    return <Skeleton className="h-96" />;
  }

  return (
    <div>
      <div className="hairline-panel flex items-center justify-between gap-4 rounded-[8px] p-6">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase text-stone-500">
            <Building2 className="h-4 w-4" aria-hidden="true" />
            Locations
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-neutral-950">Complexes</h1>
          <p className="mt-1 text-sm text-stone-500">
            Create and maintain field locations.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Complex
        </Button>
      </div>
      {error ? <div className="mt-6"><ErrorState message={error} onRetry={refresh} /></div> : null}
      <Card className="mt-6 overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-100 text-sm">
              <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500">
                <tr>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Address</th>
                  <th className="px-5 py-3">Owner</th>
                  <th className="px-5 py-3">Fields</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 bg-white">
                {items.map((complex) => (
                  <tr key={complex.id} className="hover:bg-stone-50/70">
                    <td className="px-5 py-4 font-semibold text-neutral-950">
                      <Link href={`/admin/complexes/${complex.id}`}>
                        {complex.name}
                      </Link>
                    </td>
                    <td className="max-w-md px-5 py-4 text-stone-600">
                      {complex.address}
                    </td>
                    <td className="px-5 py-4 text-stone-600">{complex.owner}</td>
                    <td className="px-5 py-4 font-mono text-neutral-950">
                      {fields.filter((field) => field.complexId === complex.id).length}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openEdit(complex)}
                        >
                          <Edit3 className="h-4 w-4" aria-hidden="true" />
                          Edit
                        </Button>
                        {confirmDelete === complex.id ? (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => removeComplex(complex.id)}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                            Confirm
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmDelete(complex.id)}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                            Delete
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <Modal
        open={modalOpen}
        title={editing ? "Edit complex" : "Add complex"}
        onClose={() => setModalOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button loading={saving} onClick={saveComplex}>
              Save
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
          <Input
            label="Description"
            value={form.description}
            onChange={(event) =>
              setForm({ ...form, description: event.target.value })
            }
          />
          <Input
            label="Address"
            value={form.address}
            onChange={(event) => setForm({ ...form, address: event.target.value })}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Lat"
              value={form.lat}
              onChange={(event) => setForm({ ...form, lat: event.target.value })}
            />
            <Input
              label="Lng"
              value={form.lng}
              onChange={(event) => setForm({ ...form, lng: event.target.value })}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
