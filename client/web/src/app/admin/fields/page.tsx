"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { createField, deleteField, updateField } from "@/lib/api/admin";
import { FIELD_TYPES } from "@/lib/constants";
import type { Field, FieldPayload } from "@/lib/types";
import { formatCurrency } from "@/lib/utils/format";
import { useAdminData } from "@/hooks/useAdmin";

type FieldForm = {
  complexId: string;
  name: string;
  description: string;
  address: string;
  type: string;
  startTime: string;
  endTime: string;
  indoor: boolean;
  lights: boolean;
  price: string;
  currency: string;
};

const emptyForm: FieldForm = {
  complexId: "",
  name: "",
  description: "",
  address: "",
  type: "5v5",
  startTime: "06:00",
  endTime: "22:00",
  indoor: false,
  lights: true,
  price: "250000",
  currency: "VND",
};

export default function AdminFieldsPage() {
  const { showToast } = useToast();
  const { complexes, fields, loading, error, refresh } = useAdminData();
  const [items, setItems] = useState<Field[]>([]);
  const [form, setForm] = useState<FieldForm>(emptyForm);
  const [editing, setEditing] = useState<Field | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState("");

  useEffect(() => {
    setItems(fields);
  }, [fields]);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, complexId: complexes[0]?.id ?? "" });
    setModalOpen(true);
  }

  function openEdit(field: Field) {
    setEditing(field);
    setForm({
      complexId: field.complexId,
      name: field.name,
      description: field.description,
      address: field.address,
      type: field.type,
      startTime: field.startTime,
      endTime: field.endTime,
      indoor: field.indoor,
      lights: field.lights,
      price: String(field.metadata.price),
      currency: field.metadata.currency ?? "VND",
    });
    setModalOpen(true);
  }

  function payload(): FieldPayload {
    return {
      complexId: form.complexId,
      name: form.name,
      description: form.description,
      address: form.address,
      type: form.type,
      startTime: form.startTime,
      endTime: form.endTime,
      indoor: form.indoor,
      lights: form.lights,
      price: Number(form.price),
      currency: form.currency,
    };
  }

  async function saveField() {
    if (!form.complexId || !form.name.trim() || !form.price) {
      showToast("Complex, name, and price are required.", "error");
      return;
    }

    setSaving(true);
    try {
      const saved = editing
        ? await updateField(editing.id, payload())
        : await createField(payload());
      setItems((current) =>
        editing
          ? current.map((item) => (item.id === saved.id ? saved : item))
          : [saved, ...current],
      );
      showToast(editing ? "Field updated." : "Field created.");
      setModalOpen(false);
    } catch (caught) {
      showToast(
        caught instanceof Error ? caught.message : "Unable to save field.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeField(id: string) {
    try {
      await deleteField(id);
      setItems((current) => current.filter((item) => item.id !== id));
      setConfirmDelete("");
      showToast("Field deleted.");
    } catch (caught) {
      showToast(
        caught instanceof Error ? caught.message : "Unable to delete field.",
        "error",
      );
    }
  }

  if (loading) {
    return <Skeleton className="h-96" />;
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Fields</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage pitch availability, prices, and amenities.
          </p>
        </div>
        <Button onClick={openCreate}>Add Field</Button>
      </div>
      {error ? <div className="mt-6"><ErrorState message={error} onRetry={refresh} /></div> : null}
      <Card className="mt-6 overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-3">Complex</th>
                  <th className="px-5 py-3">Field</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Indoor</th>
                  <th className="px-5 py-3">Lights</th>
                  <th className="px-5 py-3">Price</th>
                  <th className="px-5 py-3">Hours</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {items.map((field) => (
                  <tr key={field.id}>
                    <td className="px-5 py-4 text-gray-600">
                      {field.complex?.name ?? "Complex"}
                    </td>
                    <td className="px-5 py-4 font-medium text-gray-900">
                      <Link href={`/admin/fields/${field.id}`}>{field.name}</Link>
                    </td>
                    <td className="px-5 py-4 text-gray-600">{field.type}</td>
                    <td className="px-5 py-4 text-gray-600">
                      {field.indoor ? "Yes" : "No"}
                    </td>
                    <td className="px-5 py-4 text-gray-600">
                      {field.lights ? "Yes" : "No"}
                    </td>
                    <td className="px-5 py-4 font-mono text-gray-900">
                      {formatCurrency(field.metadata.price, field.metadata.currency)}
                    </td>
                    <td className="px-5 py-4 font-mono text-gray-600">
                      {field.startTime}-{field.endTime}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openEdit(field)}
                        >
                          Edit
                        </Button>
                        {confirmDelete === field.id ? (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => removeField(field.id)}
                          >
                            Confirm
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmDelete(field.id)}
                          >
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
      <FieldModal
        open={modalOpen}
        editing={Boolean(editing)}
        form={form}
        complexes={complexes}
        saving={saving}
        setForm={setForm}
        onClose={() => setModalOpen(false)}
        onSave={saveField}
      />
    </div>
  );
}

function FieldModal({
  open,
  editing,
  form,
  complexes,
  saving,
  setForm,
  onClose,
  onSave,
}: {
  open: boolean;
  editing: boolean;
  form: FieldForm;
  complexes: { id: string; name: string }[];
  saving: boolean;
  setForm: (form: FieldForm) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <Modal
      open={open}
      title={editing ? "Edit field" : "Add field"}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} onClick={onSave}>
            Save
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5 sm:col-span-2">
          <span className="text-sm font-medium text-gray-800">Complex</span>
          <select
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            value={form.complexId}
            onChange={(event) => setForm({ ...form, complexId: event.target.value })}
          >
            {complexes.map((complex) => (
              <option key={complex.id} value={complex.id}>
                {complex.name}
              </option>
            ))}
          </select>
        </label>
        <Input
          label="Name"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
        />
        <Input
          label="Type"
          list="field-types"
          value={form.type}
          onChange={(event) => setForm({ ...form, type: event.target.value })}
        />
        <datalist id="field-types">
          {FIELD_TYPES.map((fieldType) => (
            <option key={fieldType} value={fieldType} />
          ))}
        </datalist>
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
        <Input
          label="Start"
          type="time"
          value={form.startTime}
          onChange={(event) => setForm({ ...form, startTime: event.target.value })}
        />
        <Input
          label="End"
          type="time"
          value={form.endTime}
          onChange={(event) => setForm({ ...form, endTime: event.target.value })}
        />
        <Input
          label="Price"
          type="number"
          value={form.price}
          onChange={(event) => setForm({ ...form, price: event.target.value })}
        />
        <Input
          label="Currency"
          value={form.currency}
          onChange={(event) => setForm({ ...form, currency: event.target.value })}
        />
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            className="h-4 w-4 accent-green-600"
            type="checkbox"
            checked={form.indoor}
            onChange={(event) => setForm({ ...form, indoor: event.target.checked })}
          />
          Indoor
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            className="h-4 w-4 accent-green-600"
            type="checkbox"
            checked={form.lights}
            onChange={(event) => setForm({ ...form, lights: event.target.checked })}
          />
          Lights
        </label>
      </div>
    </Modal>
  );
}

