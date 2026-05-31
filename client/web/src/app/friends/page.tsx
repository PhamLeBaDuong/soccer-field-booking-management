"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  MessageCircle,
  Search,
  Send,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { useRequireAuth } from "@/lib/auth/hooks";
import { useTeams } from "@/hooks/useTeams";
import {
  type ChatMessage,
  type FriendRequest,
  type FriendUser,
  acceptFriendRequest,
  getFriendRequests,
  getFriends,
  getConversation,
  removeFriend,
  searchUsers,
  sendFriendRequest,
  sendMessage,
  sendTeamInvite,
} from "@/lib/api/friends";
import { cn } from "@/lib/utils/cn";

type Tab = "friends" | "requests" | "search";

export default function FriendsPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const { showToast } = useToast();
  const { teams } = useTeams();

  // ─── State ───────────────────────────────────────────────────────────────────
  const [tab, setTab]             = useState<Tab>("friends");
  const [friends, setFriends]     = useState<FriendUser[]>([]);
  const [requests, setRequests]   = useState<FriendRequest[]>([]);
  const [searchQ, setSearchQ]     = useState("");
  const [results, setResults]     = useState<FriendUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeFriend, setActiveFriend] = useState<FriendUser | null>(null);
  const [messages, setMessages]   = useState<ChatMessage[]>([]);
  const [msgInput, setMsgInput]   = useState("");
  const [loading, setLoading]     = useState(true);
  const [inviteOpen, setInviteOpen] = useState<string | null>(null); // friendId
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Load friends + requests ─────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [f, r] = await Promise.all([getFriends(), getFriendRequests()]);
      setFriends(f);
      setRequests(r);
    } catch {/* ignore */}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ─── Chat polling ─────────────────────────────────────────────────────────────
  const fetchMessages = useCallback(async (friendId: string) => {
    try {
      const msgs = await getConversation(friendId);
      setMessages(msgs);
    } catch {/* ignore */}
  }, []);

  useEffect(() => {
    if (!activeFriend) { setMessages([]); return; }
    fetchMessages(activeFriend.id);
    pollRef.current = setInterval(() => fetchMessages(activeFriend.id), 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeFriend, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ─── Search users ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!searchQ.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try { setResults(await searchUsers(searchQ)); }
      catch {/* ignore */}
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [searchQ]);

  // ─── Actions ─────────────────────────────────────────────────────────────────
  async function handleAddFriend(userId: string) {
    try { await sendFriendRequest(userId); showToast("Friend request sent."); }
    catch (e) { showToast(e instanceof Error ? e.message : "Failed.", "error"); }
  }

  async function handleAccept(senderId: string) {
    try {
      await acceptFriendRequest(senderId);
      showToast("Friend request accepted.");
      await load();
    } catch (e) { showToast(e instanceof Error ? e.message : "Failed.", "error"); }
  }

  async function handleRemove(userId: string) {
    try {
      await removeFriend(userId);
      setFriends((f) => f.filter((x) => x.id !== userId));
      if (activeFriend?.id === userId) setActiveFriend(null);
      showToast("Friend removed.");
    } catch (e) { showToast(e instanceof Error ? e.message : "Failed.", "error"); }
  }

  async function handleSend() {
    if (!activeFriend || !msgInput.trim()) return;
    const text = msgInput.trim();
    setMsgInput("");
    try {
      const msg = await sendMessage(activeFriend.id, text);
      setMessages((m) => [...m, msg]);
    } catch (e) { showToast(e instanceof Error ? e.message : "Send failed.", "error"); }
  }

  async function handleInviteToTeam(teamId: string, friendId: string) {
    try {
      await sendTeamInvite(teamId, friendId);
      showToast("Team invite sent.");
      setInviteOpen(null);
    } catch (e) { showToast(e instanceof Error ? e.message : "Invite failed.", "error"); }
  }

  const isFriend = (id: string) => friends.some((f) => f.id === id);

  if (authLoading || !user) return <FriendsSkeleton />;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="hairline-panel rounded-[8px] p-6">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase text-stone-500">
          <Users className="h-4 w-4" aria-hidden="true" />
          Social
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[0] text-neutral-950">Friends</h1>
        <p className="mt-2 text-sm text-stone-500">
          Connect with other players, chat, and invite them to your team.
        </p>
      </section>

      <div className="mt-6 grid gap-5 lg:grid-cols-[320px_1fr]">

        {/* ── Left panel ── */}
        <div className="flex flex-col gap-4">
          {/* Tabs */}
          <div className="flex gap-2">
            {(
              [
                { tabId: "friends"  as Tab, label: "Friends",  count: friends.length },
                { tabId: "requests" as Tab, label: "Requests", count: requests.length },
                { tabId: "search"   as Tab, label: "Find",     count: 0 },
              ]
            ).map(({ tabId, label, count }) => (
              <button key={tabId} type="button" onClick={() => setTab(tabId)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-[8px] border px-3 py-1.5 text-xs font-semibold transition-colors",
                  tab === tabId
                    ? "border-neutral-950 bg-neutral-950 text-white"
                    : "border-stone-200 bg-white/78 text-stone-600 hover:bg-white",
                )}>
                {label}
                {count > 0 && (
                  <span className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                    tab === tabId ? "bg-white/20 text-white" : "bg-stone-100 text-stone-600",
                  )}>{count}</span>
                )}
              </button>
            ))}
          </div>

          {/* Friends list */}
          {tab === "friends" && (
            <Card>
              <CardContent>
                {loading ? (
                  <><Skeleton className="h-12 mb-2" /><Skeleton className="h-12 mb-2" /><Skeleton className="h-12" /></>
                ) : friends.length === 0 ? (
                  <EmptyState icon={<Users className="h-5 w-5" />}
                    title="No friends yet"
                    description='Use "Find" to search for players.' />
                ) : (
                  <div className="grid gap-2">
                    {friends.map((f) => (
                      <FriendRow
                        key={f.id}
                        friend={f}
                        isActive={activeFriend?.id === f.id}
                        teams={teams}
                        inviteOpen={inviteOpen === f.id}
                        onChat={() => { setActiveFriend(f); setInviteOpen(null); }}
                        onRemove={() => handleRemove(f.id)}
                        onInviteOpen={() => setInviteOpen(inviteOpen === f.id ? null : f.id)}
                        onInviteTeam={(teamId) => handleInviteToTeam(teamId, f.id)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Requests */}
          {tab === "requests" && (
            <Card>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-12" />
                ) : requests.length === 0 ? (
                  <EmptyState icon={<UserPlus className="h-5 w-5" />}
                    title="No pending requests"
                    description="Friend requests you receive will appear here." />
                ) : (
                  <div className="grid gap-2">
                    {requests.map((r) => (
                      <div key={r.id} className="flex items-center justify-between gap-2 rounded-[8px] border border-stone-200 px-3 py-2">
                        <div>
                          <p className="text-sm font-semibold text-neutral-950">{r.sender.name}</p>
                          <p className="text-xs text-stone-500">@{r.sender.username}</p>
                        </div>
                        <Button size="sm" onClick={() => handleAccept(r.senderId)}>
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                          Accept
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Search / find users */}
          {tab === "search" && (
            <Card>
              <CardContent>
                <Input
                  label="Search players"
                  placeholder="Name or username…"
                  leadingIcon={<Search className="h-4 w-4" aria-hidden="true" />}
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                />
                <div className="mt-3 grid gap-2">
                  {searching && <Skeleton className="h-10" />}
                  {!searching && searchQ && results.length === 0 && (
                    <p className="text-sm text-stone-500">No players found.</p>
                  )}
                  {results.map((u) => (
                    <div key={u.id} className="flex items-center justify-between gap-2 rounded-[8px] border border-stone-200 px-3 py-2">
                      <div>
                        <p className="text-sm font-semibold text-neutral-950">{u.name}</p>
                        <p className="text-xs text-stone-500">@{u.username}</p>
                      </div>
                      {isFriend(u.id) ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Friends</span>
                      ) : (
                        <Button size="sm" variant="secondary" onClick={() => handleAddFriend(u.id)}>
                          <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                          Add
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Right panel: Chat ── */}
        <Card className="flex flex-col overflow-hidden">
          {!activeFriend ? (
            <CardContent className="flex flex-1 items-center justify-center">
              <EmptyState icon={<MessageCircle className="h-6 w-6" />}
                title="Select a friend to chat"
                description="Pick a friend from the list to start messaging." />
            </CardContent>
          ) : (
            <>
              {/* Chat header */}
              <div className="flex items-center justify-between gap-3 border-b border-stone-100 px-4 py-3">
                <div>
                  <p className="font-semibold text-neutral-950">{activeFriend.name}</p>
                  <p className="text-xs text-stone-500">@{activeFriend.username}</p>
                </div>
                <button type="button" onClick={() => setActiveFriend(null)}
                  className="rounded-[6px] p-1 text-stone-400 hover:bg-stone-100">
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-3" style={{ minHeight: 300, maxHeight: 480 }}>
                {messages.length === 0 ? (
                  <p className="text-center text-sm text-stone-400 mt-8">No messages yet. Say hi!</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {messages.map((m) => {
                      const isMine = m.senderId === user.id;
                      return (
                        <div key={m.id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
                          <div className={cn(
                            "max-w-[75%] rounded-[12px] px-3 py-2 text-sm",
                            isMine
                              ? "rounded-br-[4px] bg-neutral-950 text-white"
                              : "rounded-bl-[4px] bg-stone-100 text-neutral-950",
                          )}>
                            <p>{m.content}</p>
                            <p className={cn("mt-0.5 text-[10px]", isMine ? "text-white/50" : "text-stone-400")}>
                              {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Message input */}
              <div className="flex items-center gap-2 border-t border-stone-100 px-4 py-3">
                <input
                  className="flex-1 rounded-[8px] border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400"
                  placeholder="Type a message…"
                  value={msgInput}
                  onChange={(e) => setMsgInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                />
                <Button onClick={handleSend} disabled={!msgInput.trim()}>
                  <Send className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

// ─── Friend Row ───────────────────────────────────────────────────────────────

function FriendRow({
  friend, isActive, teams, inviteOpen,
  onChat, onRemove, onInviteOpen, onInviteTeam,
}: {
  friend: FriendUser;
  isActive: boolean;
  teams: { id: string; name: string; size: number }[];
  inviteOpen: boolean;
  onChat: () => void;
  onRemove: () => void;
  onInviteOpen: () => void;
  onInviteTeam: (teamId: string) => void;
}) {
  return (
    <div className={cn(
      "relative rounded-[8px] border px-3 py-2 transition-colors",
      isActive ? "border-neutral-950 bg-neutral-50" : "border-stone-200 bg-white",
    )}>
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={onChat} className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm font-semibold text-neutral-950">{friend.name}</p>
          <p className="text-xs text-stone-500">@{friend.username}</p>
        </button>
        <div className="flex shrink-0 gap-1">
          <button type="button" title="Chat" onClick={onChat}
            className="rounded-[6px] p-1.5 text-stone-400 hover:bg-stone-100 hover:text-neutral-950">
            <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button type="button" title="Invite to team" onClick={onInviteOpen}
            className="rounded-[6px] p-1.5 text-stone-400 hover:bg-stone-100 hover:text-neutral-950">
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button type="button" title="Remove friend" onClick={onRemove}
            className="rounded-[6px] p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600">
            <UserMinus className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Team invite dropdown */}
      {inviteOpen && (
        <div className="mt-2 rounded-[8px] border border-stone-200 bg-white p-2 shadow-md">
          <p className="mb-2 text-xs font-semibold text-stone-500">Invite to team</p>
          {teams.length === 0 ? (
            <p className="text-xs text-stone-400">You have no teams.</p>
          ) : (
            teams.map((t) => (
              <button key={t.id} type="button" onClick={() => onInviteTeam(t.id)}
                className="flex w-full items-center justify-between rounded-[6px] px-2 py-1.5 text-left text-xs hover:bg-stone-50">
                <span className="font-semibold">{t.name}</span>
                <span className="text-stone-400">{t.size}v{t.size}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function FriendsSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Skeleton className="h-28" />
      <div className="mt-6 grid gap-5 lg:grid-cols-[320px_1fr]">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}
