"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/hooks";
import { authDestination } from "@/lib/auth/returnTo";
import { getInvitation, respondInvitation, type Invitation } from "@/lib/api/shareInvitations";
import { apiFetch } from "@/lib/api/client";
import { normalizeTeam } from "@/lib/api/teams";
import { normalizeField } from "@/lib/api/normalizers";
import { formatDateRange, combineDateAndTime, nextCalendarDate, todayInputValue } from "@/lib/utils/format";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { Team, Field } from "@/lib/types";

export default function InvitationPage() {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const [invite, setInvite] = useState<Invitation | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState("");
  const [fields, setFields] = useState<Field[]>([]);
  const [fieldId, setFieldId] = useState("");
  const [date, setDate] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [teamError, setTeamError] = useState("");
  const [response, setResponse] = useState<Invitation["response"]>(null);
  const returnTo = `/invite/${encodeURIComponent(token)}`;
  const refresh = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const result = await getInvitation(token, !!user);
      setInvite(result); setResponse(result.response);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to load invitation."); }
    finally { setLoading(false); }
  }, [token, user]);
  useEffect(() => { if (!authLoading) void refresh(); }, [authLoading, refresh]);
  const loadTeams = useCallback(async () => {
    if (!user) return;
    try {
      const raw = await apiFetch<Record<string, unknown>[]>("/api/teams/mine");
      setTeams(raw.map(normalizeTeam).filter(team => team.leaderId === user.id));
      setTeamError("");
    } catch (err) { setTeamError(err instanceof Error ? err.message : "Unable to load teams."); }
  }, [user]);
  useEffect(() => { if (invite?.kind === "match" && user) void loadTeams(); }, [invite?.kind, user, loadTeams]);
  useEffect(() => {
    if (invite?.kind !== "match" || !user || invite.detail.fieldId) return;
    apiFetch<unknown[]>("/api/fields").then(raw => setFields(raw.map(item => normalizeField(item))))
      .catch(err => setTeamError(err instanceof Error ? err.message : "Unable to load fields."));
  }, [invite?.kind, invite?.detail.fieldId, user]);
  async function respond(decision: "accepted" | "declined") {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const options: Record<string, string> = teamId ? { acceptingTeamId: teamId } : {};
      if (invite?.kind === "match" && decision === "accepted") {
        if (!invite.detail.fieldId && fieldId) options.fieldId = fieldId;
        if (!invite.detail.startTime && date && start) options.startTime = combineDateAndTime(date, start);
        if (!invite.detail.endTime && date && end) options.endTime = combineDateAndTime(end < start ? nextCalendarDate(date) : date, end);
      }
      const result = await respondInvitation(token, decision, options);
      setResponse({ decision: decision, resultId: result.resultId });
      await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to respond."); }
    finally { setBusy(false); }
  }
  const eligibleTeams = teams.filter(team => team.id !== invite?.detail.teamId && team.size === invite?.detail.size);
  const selectedTeam = eligibleTeams.find(team => team.id === teamId);
  const teamReady = !!selectedTeam && selectedTeam.membersCount >= selectedTeam.size;
  const postingTeamReady = (invite?.detail.membersCount ?? 0) >= (invite?.detail.size ?? 1);
  const labels = invite?.kind === "team" ? { title: "Team invitation", accept: "Accept invitation", destination: "/teams" }
    : invite?.kind === "match" ? { title: "Match invitation", accept: "Accept match", destination: "/bookings" }
    : { title: "Lobby invitation", accept: "Join lobby", destination: "/lobbies" };
  return <div className="app-background flex min-h-screen items-center justify-center px-4 py-12">
    <div className="w-full max-w-lg rounded-xl border border-stone-200 bg-white p-6 shadow-xl sm:p-8">
      <Link href="/" className="text-sm font-semibold text-stone-500">PitchBook</Link>
      <h1 className="mt-4 text-2xl font-semibold">{labels.title}</h1>
      {(loading || authLoading) ? <p className="mt-4" role="status">Loading invitation…</p> : invite && <>
        <h2 className="mt-4 text-xl font-semibold">{invite.detail.title}</h2>
        <p className="mt-2 text-sm text-stone-600">{invite.kind === "lobby" ? `${invite.detail.count}/${invite.detail.size} players` : invite.kind === "match" ? `${invite.detail.size}v${invite.detail.size} · ${invite.detail.membersCount ?? 0}/${invite.detail.size} players` : `${invite.detail.size}v${invite.detail.size} team`}</p>
        {invite.detail.fieldName && <p className="mt-1 text-sm">{invite.detail.fieldName}</p>}
        {invite.detail.startTime && invite.detail.endTime && <p className="mt-2 text-sm">{formatDateRange(invite.detail.startTime, invite.detail.endTime, invite.detail.timeZone)}</p>}
        {response ? <div className="mt-6" role="status">
          <p className="font-semibold">{response.decision === "accepted" ? (invite.kind === "lobby" ? "You joined the lobby." : invite.kind === "team" ? "You joined the team." : "Match accepted.") : "Invitation declined."}</p>
          <p className="mt-2 text-sm text-stone-600">{response.decision === "declined" ? "No membership or booking was created." : "Your response has been saved."}</p>
          <Link className="mt-4 inline-block font-semibold underline" href={labels.destination}>Continue</Link>
          {invite.permanent && invite.status === "pending" && response.decision === "declined" && <Button className="mt-4 ml-3" variant="secondary" onClick={() => setResponse(null)}>Review invitation again</Button>}
        </div> : invite.alreadyJoined ? <p role="status" className="mt-6 font-semibold">{invite.kind === "team" ? "You are already on this team." : "You have already joined this lobby."}</p>
          : invite.status !== "pending" ? <p role="status" className="mt-6 font-semibold">{invite.permanent && invite.status === "full"
            ? "This team is full. You can use this same link when a place opens up."
            : `This invitation is ${invite.status}. It can no longer be accepted.`}</p>
          : user?.id === invite.detail.ownerId ? <p className="mt-6">This is your invitation. Share the link with another player.</p>
          : !user ? <div className="mt-6 space-y-4">
            <p className="text-sm text-stone-600">Log in or create an account to respond. You’ll return here afterward.</p>
            <div className="flex gap-3">
              <Link className="rounded-lg bg-neutral-950 px-4 py-2 font-semibold text-white" href={authDestination("/login", returnTo)}>Log in</Link>
              <Link className="rounded-lg border px-4 py-2 font-semibold" href={authDestination("/register", returnTo)}>Create account</Link>
            </div>
          </div> : <div className="mt-6 space-y-4">
            {invite.kind === "match" && <>
              {!postingTeamReady && <p role="status" className="text-sm text-amber-700">The posting team needs {invite.detail.size} players ({invite.detail.membersCount ?? 0}/{invite.detail.size} joined).</p>}
              {eligibleTeams.length > 0 ? <label className="block text-sm font-semibold">Accept with your team
                <select className="mt-2 w-full rounded-lg border p-2" value={teamId} onChange={e => setTeamId(e.target.value)}>
                  <option value="">Choose a team you lead</option>
                  {eligibleTeams.map(team => <option key={team.id} value={team.id} disabled={team.membersCount < team.size}>{team.name} · {team.membersCount}/{team.size} players</option>)}
                </select>
              </label> : <div className="space-y-3">
                <p className="text-sm text-stone-600">You need a team you lead with {invite.detail.size} players.</p>
              </div>}
              {!eligibleTeams.some(team => team.membersCount >= team.size) && <Link className="inline-block text-sm font-semibold underline" href="/teams">Recruit players</Link>}
              <Button variant="secondary" disabled={busy} onClick={() => { void loadTeams(); void refresh(); }}>Refresh teams</Button>
              {teamError && <div><p role="alert" className="text-sm text-red-700">{teamError}</p><Button variant="secondary" onClick={loadTeams}>Retry teams</Button></div>}
              {!invite.detail.fieldId && <label className="block text-sm font-semibold">Field
                <select className="mt-2 w-full rounded-lg border p-2" value={fieldId} onChange={e => setFieldId(e.target.value)}>
                  <option value="">Choose a field</option>{fields.map(field => <option key={field.id} value={field.id}>{field.name}</option>)}
                </select>
              </label>}
              {(!invite.detail.startTime || !invite.detail.endTime) && <div className="grid grid-cols-2 gap-3">
                <Input className="col-span-2" label="Match date" type="date" value={date} min={todayInputValue()} onChange={e => setDate(e.target.value)} />
                <Input label="Start time" type="time" value={start} onChange={e => setStart(e.target.value)} />
                <Input label="End time" type="time" value={end} onChange={e => setEnd(e.target.value)} />
              </div>}
            </>}
            <div className="flex flex-wrap gap-3">
              <Button loading={busy} disabled={invite.kind === "match" && (!teamReady || !postingTeamReady
                || (!invite.detail.fieldId && !fieldId) || (!invite.detail.startTime && !(date && start))
                || (!invite.detail.endTime && !(date && end)))} onClick={() => respond("accepted")}>{labels.accept}</Button>
              <Button variant="secondary" disabled={busy} onClick={() => respond("declined")}>Decline invitation</Button>
            </div>
          </div>}
      </>}
      {error && <div className="mt-4"><p role="alert" className="text-sm text-red-700">{error}</p>{!invite && <Button variant="secondary" className="mt-3" onClick={refresh}>Retry</Button>}</div>}
    </div>
  </div>;
}
