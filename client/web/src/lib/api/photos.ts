import { apiFetch } from "./client";
import { API_BASE_URL } from "@/lib/constants";

export const photoUrl = (path: string) => `${API_BASE_URL}${path}`;
export type PhotoTarget = "complexes" | "fields";

export function uploadPhoto(kind: PhotoTarget, id: string, file: File) {
  return apiFetch<{ images: string[] }>(`/api/venues/${kind}/${id}/photos`, {
    method: "POST", headers: { "Content-Type": file.type }, body: file,
  });
}
export function reorderPhotos(kind: PhotoTarget, id: string, images: string[]) {
  return apiFetch<{ images: string[] }>(`/api/venues/${kind}/${id}/photos`, { method: "PUT", body: JSON.stringify({ images }) });
}
export function removePhoto(kind: PhotoTarget, id: string, path: string) {
  return apiFetch<{ images: string[] }>(`/api/venues/${kind}/${id}/photos/${encodeURIComponent(path.split("/").pop()!)}`, { method: "DELETE" });
}
