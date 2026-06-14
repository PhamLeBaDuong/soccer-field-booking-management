"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Crown, Mail, Plus, Search, Trash2, UserMinus, UserPlus, Users, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { useRequireAuth } from "@/lib/auth/hooks";
import { createTeam as apiCreateTeam, disbandTeam as apiDisbandTeam, removeTeamMember } from "@/lib/api/teams";
import {
  searchUsers, sendTeamInvite,
  getMyInvites, acceptTeamInvite, declineTeamInvite,
  type FriendUser, type TeamInvite,
} from "@/lib/api/friends";
import { useTeams } from "@/hooks/useTeams";
import { useI18n } from "@/lib/i18n/context";
import type { Team } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

type CreateForm = { name: string; size: string };

export default function TeamsPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const { showToast } = useToast();
  const { t } = useI18n();
  const { teams, loading, error, refresh } = useTeams();

  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateForm>({ name: "", size: "5" });

  // Received invites (pending team join requests)
  const [pendingInvites,  setPendingInvites]  = useState<TeamInvite[]>([]);
  const [loadingInvites,  setLoadingInvites]  = useState(false);

  const loadInvites = useCallback(async () => {
    setLoadingInvites(true);
    try { setPendingInvites(await getMyInvites()); }
    catch {/* ignore */}
    finally { setLoadingInvites(false); }
  }, []);

  useEffect(() => { loadInvites(); }, [loadInvites]);

  // Outgoing invite
  const [inviteQuery,   setInviteQuery]   = useState("");
  const [inviteResults, setInviteResults] = useState<FriendUser[]>([]);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [showInvite,    setShowInvite]    = useState(false);

  const activeTeam = teams.find((t) => t.id === (activeTeamId ?? teams[0]?.id));

  if (authLoading || !user) return <TeamsSkeleton />;

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    const size = Number(form.size);
    if (!form.name.trim() || size < 2) {
      showToast("Team name and valid size (≥ 2) are required.", "error"); return;
    }
    try {
      const team = await apiCreateTeam({ name: form.name.trim(), size });
      await refresh();
      setActiveTeamId(team.id);
      setForm({ name: "", size: "5" });
      showToast(`Team "${team.name}" created.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to create team.", "error");
    }
  }

  async function handleDisband(teamId: string) {
    try {
      await apiDisbandTeam(teamId);
      await refresh();
      setActiveTeamId(null);
      showToast("Team disbanded.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to disband.", "error");
    }
  }

  async function handleRemoveMember(teamId: string, userId: string) {
    try {
      await removeTeamMember(teamId, userId);
      await refresh();
      showToast("Member removed.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to remove member.", "error");
    }
  }

  async function handleInviteSearch(q: string) {
    setInviteQuery(q);
    if (!q.trim()) { setInviteResults([]); return; }
    setInviteLoading(true);
    try { setInviteResults(await searchUsers(q)); }
    catch {/* ignore */}
    finally { setInviteLoading(false); }
  }

  async function handleSendInvite(teamId: string, userId: string, userName: string) {
    try {
      await sendTeamInvite(teamId, userId);
      showToast(`Invite sent to ${userName}.`);
      setInviteQuery(""); setInviteResults([]);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to send invite.", "error");
    }
  }

  async function handleAcceptInvite(inviteId: string, teamName: string) {
    try {
      await acceptTeamInvite(inviteId);
      showToast(`Joined ${teamName}!`);
      setPendingInvites((p) => p.filter((i) => i.id !== inviteId));
      await refresh(); // refresh team list
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed.", "error");
    }
  }

  async function handleDeclineInvite(inviteId: string) {
    try {
      await declineTeamInvite(inviteId);
      showToast("Invite declined.");
      setPendingInvites((p) => p.filter((i) => i.id !== inviteId));
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed.", "error");
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="pitch-hero-bg rounded-[8px] p-6 text-white shadow-[0_30px_90px_rgba(23,23,23,0.18)] sm:p-8">
        <p className="inline-flex items-center gap-2 rounded-full bg-white/14 px-3 py-1 text-xs font-semibold text-white/86 ring-1 ring-white/18 backdrop-blur">
          <Users className="h-3.5 w-3.5" aria-hidden="true" />
          {t("teams.management")}
        </p>
        <h1 className="mt-5 text-4xl font-semibold tracking-[0] sm:text-5xl">{t("teams.title")}</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-white/76">
          {t("teams.subtitle")}
        </p>
      </section>

      {/* ── Pending team invitations ── */}
      {(loadingInvites || pendingInvites.length > 0) && (
        <Card className="mt-6">
          <CardContent>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase text-stone-500">
              <Mail className="h-4 w-4" aria-hidden="true" />
              {t("teams.invitations")}
              {pendingInvites.length > 0 && (
                <span className="ml-1 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                  {pendingInvites.length}
                </span>
              )}
            </p>
            {loadingInvites ? (
              <Skeleton className="mt-3 h-12" />
            ) : pendingInvites.length === 0 ? (
              <p className="mt-3 text-sm text-stone-500">{t("teams.noInvites")}</p>
            ) : (
              <div className="mt-3 grid gap-2">
                {pendingInvites.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between gap-3 rounded-[8px] border border-stone-200 bg-white/80 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-neutral-950">{inv.team.name}</p>
                      <p className="text-xs text-stone-500">
                        {inv.team.size}v{inv.team.size} · {t("teams.invitedBy")} <span className="font-medium">{inv.invitedBy.name}</span>
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button size="sm" onClick={() => handleAcceptInvite(inv.id, inv.team.name)}>
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        {t("teams.join")}
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => handleDeclineInvite(inv.id)}>
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                        {t("teams.decline")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        {/* Team list + create */}
        <Card>
          <CardContent>
            <p className="text-xs font-semibold uppercase text-stone-500">{t("teams.myTeams")}</p>
            <h2 className="mt-1 text-2xl font-semibold text-neutral-950">{t("teams.selectTeam")}</h2>

            {error && <ErrorState message={error} onRetry={refresh} />}

            <div className="mt-5 grid gap-3">
              {loading ? (
                <><Skeleton className="h-16" /><Skeleton className="h-16" /></>
              ) : teams.length === 0 ? (
                <EmptyState icon={<Users className="h-5 w-5" />}
                  title={t("teams.noTeams")}
                  description={t("teams.noTeamsDesc")} />
              ) : (
                teams.map((team) => {
                  const isActive = team.id === (activeTeamId ?? teams[0]?.id);
                  return (
                    <button key={team.id} type="button"
                      onClick={() => setActiveTeamId(team.id)}
                      className={cn(
                        "flex items-center justify-between rounded-[8px] border p-3 text-left transition-colors",
                        isActive
                          ? "border-neutral-950 bg-neutral-950 text-white"
                          : "border-stone-200 bg-white/80 text-neutral-950 hover:bg-stone-50",
                      )}>
                      <span>
                        <span className="block text-sm font-semibold">{team.name}</span>
                        <span className={cn("text-xs", isActive ? "text-white/70" : "text-stone-500")}>
                          {team.membersCount}/{team.size} {t("common.players")} · {t("teams.rating")} {team.rating.toFixed(1)}
                        </span>
                      </span>
                      <span className="font-mono text-sm">{team.size}v{team.size}</span>
                    </button>
                  );
                })
              )}
            </div>

            <form className="mt-5 grid gap-3 sm:grid-cols-[1fr_110px_auto]" onSubmit={handleCreate}>
              <Input label={t("teams.teamName")} placeholder={t("teams.namePlaceholder")}
                value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              <Input label={t("teams.size")} type="number" min={2} max={22}
                value={form.size} onChange={(e) => setForm((p) => ({ ...p, size: e.target.value }))} />
              <div className="flex items-end">
                <Button className="w-full" type="submit">
                  <Plus className="h-4 w-4" aria-hidden="true" />{t("teams.create")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Team detail */}
        <Card>
          <CardContent>
            {!activeTeam ? (
              <EmptyState icon={<Users className="h-5 w-5" />}
                title={t("teams.noTeamSelected")}
                description={t("teams.noTeamSelectedDesc")} />
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-stone-500">{t("teams.detail")}</p>
                    <h2 className="mt-1 text-2xl font-semibold text-neutral-950">{activeTeam.name}</h2>
                  </div>
                  {activeTeam.leaderId === user.id && (
                    <Button variant="secondary"
                      onClick={() => handleDisband(activeTeam.id)}
                      className="text-red-600 hover:bg-red-50"
                      title={t("teams.disband")}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      {t("teams.disband")}
                    </Button>
                  )}
                </div>

                {/* Stats */}
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    { label: t("teams.format"),  value: `${activeTeam.size}v${activeTeam.size}` },
                    { label: t("teams.members"), value: `${activeTeam.membersCount}/${activeTeam.size}` },
                    { label: t("teams.ratingLabel"), value: activeTeam.rating.toFixed(1) },
                  ].map((s) => (
                    <div key={s.label} className="rounded-[8px] bg-stone-50 p-3 ring-1 ring-stone-200">
                      <p className="text-xs font-semibold text-stone-500">{s.label}</p>
                      <p className="mt-1 text-lg font-semibold text-neutral-950">{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* Team ID */}
                <div className="mt-4 rounded-[8px] bg-stone-50 px-3 py-2 ring-1 ring-stone-200">
                  <p className="text-xs font-semibold text-stone-500">{t("teams.teamId")}</p>
                  <p className="mt-0.5 break-all font-mono text-xs text-neutral-700">{activeTeam.id}</p>
                </div>

                {/* Members */}
                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase text-stone-500">{t("teams.members")}</p>
                  <MemberList
                    team={activeTeam}
                    currentUserId={user.id}
                    onRemove={(userId) => handleRemoveMember(activeTeam.id, userId)}
                    t={t}
                  />
                </div>

                {/* Invite Player */}
                <div className="mt-5 border-t border-stone-100 pt-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase text-stone-500">{t("teams.invitePlayer")}</p>
                    <button type="button" onClick={() => setShowInvite((v) => !v)}
                      className="text-xs font-semibold text-neutral-700 hover:underline">
                      {showInvite ? t("teams.hide") : t("teams.show")}
                    </button>
                  </div>
                  {showInvite && (
                    <div className="mt-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" aria-hidden="true" />
                        <input
                          className="w-full rounded-[8px] border border-stone-200 bg-white py-2 pl-8 pr-3 text-sm outline-none focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400"
                          placeholder={t("teams.searchPlayers")}
                          value={inviteQuery}
                          onChange={(e) => handleInviteSearch(e.target.value)}
                        />
                      </div>
                      {inviteLoading && <p className="mt-2 text-xs text-stone-400">{t("teams.searching")}</p>}
                      {!inviteLoading && inviteQuery && inviteResults.length === 0 && (
                        <p className="mt-2 text-xs text-stone-400">{t("teams.noPlayers")}</p>
                      )}
                      <div className="mt-2 grid gap-1.5">
                        {inviteResults.map((u) => (
                          <div key={u.id} className="flex items-center justify-between rounded-[8px] border border-stone-200 px-3 py-2">
                            <div>
                              <p className="text-sm font-semibold text-neutral-950">{u.name}</p>
                              <p className="text-xs text-stone-500">@{u.username}</p>
                            </div>
                            <button type="button"
                              onClick={() => handleSendInvite(activeTeam.id, u.id, u.name)}
                              className="flex items-center gap-1.5 rounded-[6px] border border-stone-200 px-2 py-1 text-xs font-semibold text-neutral-700 hover:bg-stone-50">
                              <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                              {t("teams.invite")}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Member list ──────────────────────────────────────────────────────────────

function MemberList({ team, currentUserId, onRemove, t }: {
  team: Team;
  currentUserId: string;
  onRemove: (userId: string) => void;
  t: (key: string) => string;
}) {
  const memberCount = team.membersCount;

  return (
    <div className="mt-3 grid gap-2">
      <div className="flex items-center justify-between rounded-[8px] border border-stone-200 bg-white/80 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-stone-950 text-xs font-semibold text-white">
            {currentUserId === team.leaderId ? "Y" : "?"}
          </span>
          <span className="text-sm font-medium text-neutral-950">
            {currentUserId === team.leaderId ? t("teams.youLeader") : t("teams.teamLeader")}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
            <Crown className="h-3 w-3" aria-hidden="true" />{t("teams.leader")}
          </span>
        </div>
      </div>

      {memberCount > 1 && (
        <p className="rounded-[8px] bg-stone-50 px-3 py-2 text-xs text-stone-500 ring-1 ring-stone-100">
          +{memberCount - 1} {t("teams.otherMembers")} · {t("teams.shareIdHint")}
        </p>
      )}

      {memberCount < team.size && (
        <p className="rounded-[8px] bg-blue-50 px-3 py-2 text-xs text-blue-700 ring-1 ring-blue-100">
          {team.size - memberCount} {t("teams.openSlots")} — {t("teams.shareIdToAdd")} ({team.id}) {t("teams.withPlayers")}
        </p>
      )}
    </div>
  );
}

function TeamsSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Skeleton className="h-48" />
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Skeleton className="h-96" /><Skeleton className="h-96" />
      </div>
    </div>
  );
}
