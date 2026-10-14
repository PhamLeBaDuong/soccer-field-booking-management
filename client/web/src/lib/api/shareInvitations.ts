import { apiFetch } from "./client";

export type InvitationKind = "team" | "match" | "lobby";
export type Invitation = {
  id: string; kind: InvitationKind; status: string; expiresAt: string | null; permanent?: boolean;
  alreadyJoined: boolean;
  response: { decision: "accepted" | "declined"; resultId: string | null } | null;
  detail: { ownerId: string; title: string; size: number; count?: number;
    teamId?: string; status: string; fieldId?: string; fieldName?: string; startTime?: string; endTime?: string; timeZone?: string };
};
export const getPermanentResourceLink = (kind: InvitationKind, targetId: string) =>
  apiFetch<{ id: string; token: string; expiresAt: null }>(`/api/invites/resource-link/${kind}/${encodeURIComponent(targetId)}`);
export const getInvitation = (token: string, signedIn: boolean) =>
  apiFetch<Invitation>(`/api/invites/links/${encodeURIComponent(token)}${signedIn ? "/mine" : ""}`);
export const respondInvitation = (token: string, decision: "accepted" | "declined", options: Record<string, string> = {}) =>
  apiFetch<{ decision: string; resultId: string | null }>(`/api/invites/links/${encodeURIComponent(token)}/respond`, {
    method: "POST", body: JSON.stringify({ ...options, decision }),
  });
