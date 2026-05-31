import { apiFetch } from "@/lib/api/client";

export interface FriendUser {
  id: string;
  name: string;
  username: string;
  role?: string;
}

export interface FriendRequest {
  id: string;
  senderId: string;
  sender: FriendUser;
  receiverId: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  sender: FriendUser;
  receiverId: string;
  receiver: FriendUser;
  content: string;
  readAt: string | null;
  createdAt: string;
}

export interface Conversation {
  partner: FriendUser;
  lastMessage: ChatMessage;
  unreadCount: number;
}

export interface TeamInvite {
  id: string;
  teamId: string;
  team: { id: string; name: string; size: number };
  invitedBy: FriendUser;
  inviteeId: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function searchUsers(q: string): Promise<FriendUser[]> {
  if (!q.trim()) return [];
  return apiFetch<FriendUser[]>(`/api/users/search?q=${encodeURIComponent(q)}`);
}

// ─── Friends ──────────────────────────────────────────────────────────────────

export async function getFriends(): Promise<FriendUser[]> {
  return apiFetch<FriendUser[]>("/api/friends");
}

export async function getFriendRequests(): Promise<FriendRequest[]> {
  return apiFetch<FriendRequest[]>("/api/friends/requests");
}

export async function sendFriendRequest(userId: string): Promise<void> {
  await apiFetch(`/api/friends/request/${userId}`, { method: "POST" });
}

export async function acceptFriendRequest(senderId: string): Promise<void> {
  await apiFetch(`/api/friends/accept/${senderId}`, { method: "POST" });
}

export async function removeFriend(userId: string): Promise<void> {
  await apiFetch(`/api/friends/${userId}`, { method: "DELETE" });
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export async function getConversation(userId: string): Promise<ChatMessage[]> {
  return apiFetch<ChatMessage[]>(`/api/messages/${userId}`);
}

export async function sendMessage(userId: string, content: string): Promise<ChatMessage> {
  return apiFetch<ChatMessage>(`/api/messages/${userId}`, {
    method: "POST",
    body:   JSON.stringify({ content }),
  });
}

// ─── Team invites ─────────────────────────────────────────────────────────────

export async function sendTeamInvite(teamId: string, inviteeId: string): Promise<void> {
  await apiFetch(`/api/invites/team/${teamId}/user/${inviteeId}`, { method: "POST" });
}

export async function getMyInvites(): Promise<TeamInvite[]> {
  return apiFetch<TeamInvite[]>("/api/invites/mine");
}

export async function acceptTeamInvite(inviteId: string): Promise<void> {
  await apiFetch(`/api/invites/${inviteId}/accept`, { method: "POST" });
}

export async function declineTeamInvite(inviteId: string): Promise<void> {
  await apiFetch(`/api/invites/${inviteId}/decline`, { method: "POST" });
}
