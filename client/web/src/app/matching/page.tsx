"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  Clock,
  Lock,
  Plus,
  Send,
  ShieldCheck,
  Trophy,
  UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { useRequireAuth } from "@/lib/auth/hooks";
import { mockFields } from "@/lib/mock/fields";
import {
  mockLobbies,
  mockMatchRequests,
  mockTeams,
} from "@/lib/mock/matchmaking";
import type {
  Field,
  Lobby,
  LobbyStatus,
  MatchRequest,
  MatchRequestStatus,
  MatchRequestVisibility,
  Team,
} from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import {
  combineDateAndTime,
  formatCurrency,
  formatDateRange,
  todayInputValue,
} from "@/lib/utils/format";

type TeamForm = {
  name: string;
  size: string;
};

type MatchRequestForm = {
  teamId: string;
  fieldId: string;
  date: string;
  start: string;
  end: string;
  visibility: MatchRequestVisibility;
};

type LobbyForm = {
  fieldId: string;
  date: string;
  start: string;
  end: string;
  initialSize: string;
};

const initialTeamForm: TeamForm = {
  name: "",
  size: "5",
};

const initialRequestForm: MatchRequestForm = {
  teamId: mockTeams[0]?.id ?? "",
  fieldId: mockFields[0]?.id ?? "",
  date: todayInputValue(),
  start: "18:00",
  end: "20:00",
  visibility: "public",
};

const initialLobbyForm: LobbyForm = {
  fieldId: mockFields[0]?.id ?? "",
  date: todayInputValue(),
  start: "18:00",
  end: "20:00",
  initialSize: "1",
};

export default function MatchingPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const { showToast } = useToast();
  const [teams, setTeams] = useState<Team[]>(mockTeams);
  const [activeTeamId, setActiveTeamId] = useState(mockTeams[0]?.id ?? "");
  const [teamForm, setTeamForm] = useState<TeamForm>(initialTeamForm);
  const [requestForm, setRequestForm] =
    useState<MatchRequestForm>(initialRequestForm);
  const [lobbyForm, setLobbyForm] = useState<LobbyForm>(initialLobbyForm);
  const [matchRequests, setMatchRequests] =
    useState<MatchRequest[]>(mockMatchRequests);
  const [lobbies, setLobbies] = useState<Lobby[]>(mockLobbies);

  const activeTeam = useMemo(
    () => teams.find((team) => team.id === activeTeamId) ?? teams[0],
    [activeTeamId, teams],
  );
  const openRequests = matchRequests.filter((request) => request.status === "open");
  const openLobbies = lobbies.filter((lobby) => lobby.status !== "canceled");

  if (authLoading || !user) {
    return <MatchingSkeleton />;
  }

  function createTeam(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const size = Number(teamForm.size);

    if (!teamForm.name.trim() || size < 2) {
      showToast("Team name and size are required.", "error");
      return;
    }

    const team: Team = {
      id: `team-${Date.now()}`,
      name: teamForm.name.trim(),
      size,
      rating: 4,
      leaderId: user?.id ?? "demo-user",
      membersCount: size,
    };

    setTeams((current) => [team, ...current]);
    setActiveTeamId(team.id);
    setRequestForm((current) => ({ ...current, teamId: team.id }));
    setTeamForm(initialTeamForm);
    showToast("Team created.");
  }

  function postMatchRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const team = teams.find((item) => item.id === requestForm.teamId);
    const field = findField(requestForm.fieldId);

    if (!team || !field) {
      showToast("Choose a team and field.", "error");
      return;
    }

    const request: MatchRequest = {
      id: `request-${Date.now()}`,
      teamId: team.id,
      teamName: team.name,
      teamSize: team.size,
      fieldId: field.id,
      field,
      preferredStartTime: combineDateAndTime(requestForm.date, requestForm.start),
      preferredEndTime: combineDateAndTime(requestForm.date, requestForm.end),
      visibility: requestForm.visibility,
      status: "open",
      code:
        requestForm.visibility === "private"
          ? Math.random().toString(36).slice(2, 8).toUpperCase()
          : undefined,
      note: "Posted from frontend preview flow.",
    };

    setMatchRequests((current) => [request, ...current]);
    showToast("Match request posted.");
  }

  function acceptMatchRequest(request: MatchRequest) {
    if (!activeTeam) {
      showToast("Create a team first.", "error");
      return;
    }

    if (activeTeam.id === request.teamId) {
      showToast("Choose another team to accept this request.", "error");
      return;
    }

    if (activeTeam.size !== request.teamSize) {
      showToast(`Use a ${request.teamSize}v${request.teamSize} team.`, "error");
      return;
    }

    setMatchRequests((current) =>
      current.map((item) =>
        item.id === request.id ? { ...item, status: "matched" } : item,
      ),
    );
    showToast(`Accepted with ${activeTeam.name}.`);
  }

  function createLobby(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const field = findField(lobbyForm.fieldId);

    if (!field) {
      showToast("Choose a field.", "error");
      return;
    }

    const teamSize = playersForField(field);
    const initialSize = Number(lobbyForm.initialSize);

    if (initialSize < 1 || initialSize > teamSize) {
      showToast(`Initial players must be 1-${teamSize}.`, "error");
      return;
    }

    const status: LobbyStatus = initialSize >= teamSize ? "confirmed" : "open";
    const lobby: Lobby = {
      id: `lobby-${Date.now()}`,
      fieldId: field.id,
      field,
      startTime: combineDateAndTime(lobbyForm.date, lobbyForm.start),
      endTime: combineDateAndTime(lobbyForm.date, lobbyForm.end),
      teamSize,
      initialSize,
      joinedCount: initialSize,
      creatorName: user?.name || user?.username || "Demo Player",
      status,
    };

    setLobbies((current) => [lobby, ...current]);
    showToast(
      status === "confirmed" ? "Lobby is full. Booking confirmed." : "Lobby posted.",
    );
  }

  function joinLobby(lobby: Lobby) {
    if (lobby.status === "confirmed") {
      showToast("This lobby is already confirmed.", "info");
      return;
    }

    setLobbies((current) =>
      current.map((item) => {
        if (item.id !== lobby.id) {
          return item;
        }

        const joinedCount = Math.min(item.teamSize, item.joinedCount + 1);
        return {
          ...item,
          joinedCount,
          status: joinedCount >= item.teamSize ? "confirmed" : "open",
        };
      }),
    );

    showToast(
      lobby.joinedCount + 1 >= lobby.teamSize
        ? "Lobby is full. Booking confirmed."
        : "Joined lobby.",
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="pitch-hero-bg rounded-[8px] p-6 text-white shadow-[0_30px_90px_rgba(23,23,23,0.18)] sm:p-8">
        <p className="inline-flex items-center gap-2 rounded-full bg-white/14 px-3 py-1 text-xs font-semibold text-white/86 ring-1 ring-white/18 backdrop-blur">
          <UsersRound className="h-3.5 w-3.5" aria-hidden="true" />
          Matchmaking
        </p>
        <h1 className="mt-5 text-4xl font-semibold tracking-[0] sm:text-5xl">
          Match list and lobby list
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-white/76">
          Team requests for organized opponents, open lobbies for individual players.
        </p>
      </section>

      <section className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Card>
          <CardContent>
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-stone-500">
                  My teams
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-neutral-950">
                  Create and select
                </h2>
              </div>
              {activeTeam ? (
                <div className="rounded-[8px] bg-stone-50 px-3 py-2 text-sm ring-1 ring-stone-200">
                  <span className="font-semibold text-neutral-950">
                    {activeTeam.name}
                  </span>
                  <span className="ml-2 text-stone-500">{activeTeam.size}v{activeTeam.size}</span>
                </div>
              ) : null}
            </div>

            <div className="mt-5 grid gap-3">
              {teams.map((team) => (
                <button
                  key={team.id}
                  className={cn(
                    "flex items-center justify-between rounded-[8px] border p-3 text-left transition-colors",
                    activeTeamId === team.id
                      ? "border-neutral-950 bg-neutral-950 text-white"
                      : "border-stone-200 bg-white/80 text-neutral-950 hover:bg-stone-50",
                  )}
                  onClick={() => setActiveTeamId(team.id)}
                  type="button"
                >
                  <span>
                    <span className="block text-sm font-semibold">{team.name}</span>
                    <span
                      className={cn(
                        "text-xs",
                        activeTeamId === team.id ? "text-white/70" : "text-stone-500",
                      )}
                    >
                      {team.membersCount} players - rating {team.rating.toFixed(1)}
                    </span>
                  </span>
                  <span className="font-mono text-sm">{team.size}v{team.size}</span>
                </button>
              ))}
            </div>

            <form className="mt-5 grid gap-3 sm:grid-cols-[1fr_110px_auto]" onSubmit={createTeam}>
              <Input
                label="Team name"
                value={teamForm.name}
                onChange={(event) =>
                  setTeamForm((current) => ({ ...current, name: event.target.value }))
                }
              />
              <Input
                label="Size"
                min={2}
                type="number"
                value={teamForm.size}
                onChange={(event) =>
                  setTeamForm((current) => ({ ...current, size: event.target.value }))
                }
              />
              <div className="flex items-end">
                <Button className="w-full" type="submit">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Team
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div>
              <p className="text-xs font-semibold uppercase text-stone-500">
                Post request
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-neutral-950">
                Create a match request
              </h2>
            </div>
            <form className="mt-5 grid gap-3 md:grid-cols-2" onSubmit={postMatchRequest}>
              <SelectField
                label="Team"
                value={requestForm.teamId}
                onChange={(value) =>
                  setRequestForm((current) => ({ ...current, teamId: value }))
                }
              >
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name} - {team.size}v{team.size}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Field"
                value={requestForm.fieldId}
                onChange={(value) =>
                  setRequestForm((current) => ({ ...current, fieldId: value }))
                }
              >
                {mockFields.map((field) => (
                  <option key={field.id} value={field.id}>
                    {field.name}
                  </option>
                ))}
              </SelectField>
              <Input
                label="Date"
                type="date"
                leadingIcon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}
                value={requestForm.date}
                onChange={(event) =>
                  setRequestForm((current) => ({ ...current, date: event.target.value }))
                }
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Start"
                  type="time"
                  leadingIcon={<Clock className="h-4 w-4" aria-hidden="true" />}
                  value={requestForm.start}
                  onChange={(event) =>
                    setRequestForm((current) => ({ ...current, start: event.target.value }))
                  }
                />
                <Input
                  label="End"
                  type="time"
                  leadingIcon={<Clock className="h-4 w-4" aria-hidden="true" />}
                  value={requestForm.end}
                  onChange={(event) =>
                    setRequestForm((current) => ({ ...current, end: event.target.value }))
                  }
                />
              </div>
              <SelectField
                label="Visibility"
                value={requestForm.visibility}
                onChange={(value) =>
                  setRequestForm((current) => ({
                    ...current,
                    visibility: value as MatchRequestVisibility,
                  }))
                }
              >
                <option value="public">Public</option>
                <option value="private">Private code</option>
              </SelectField>
              <div className="flex items-end">
                <Button className="w-full" type="submit">
                  <Send className="h-4 w-4" aria-hidden="true" />
                  Post request
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardContent>
            <SectionTitle
              eyebrow={`${openRequests.length} open`}
              icon={Trophy}
              title="Match list"
            />
            <div className="mt-5 grid gap-3">
              {matchRequests.length ? (
                matchRequests.map((request) => (
                  <MatchRequestCard
                    key={request.id}
                    activeTeam={activeTeam}
                    request={request}
                    onAccept={acceptMatchRequest}
                  />
                ))
              ) : (
                <EmptyState
                  icon={<Trophy className="h-5 w-5" aria-hidden="true" />}
                  title="No match requests"
                  description="Post a request from your team to populate this list."
                />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <SectionTitle
              eyebrow={`${openLobbies.length} active`}
              icon={UsersRound}
              title="Lobby list"
            />
            <form className="mt-5 grid gap-3 md:grid-cols-2" onSubmit={createLobby}>
              <SelectField
                label="Field"
                value={lobbyForm.fieldId}
                onChange={(value) =>
                  setLobbyForm((current) => ({ ...current, fieldId: value }))
                }
              >
                {mockFields.map((field) => (
                  <option key={field.id} value={field.id}>
                    {field.name} - target {playersForField(field)}
                  </option>
                ))}
              </SelectField>
              <Input
                label="Initial players"
                min={1}
                type="number"
                leadingIcon={<UsersRound className="h-4 w-4" aria-hidden="true" />}
                value={lobbyForm.initialSize}
                onChange={(event) =>
                  setLobbyForm((current) => ({
                    ...current,
                    initialSize: event.target.value,
                  }))
                }
              />
              <Input
                label="Date"
                type="date"
                leadingIcon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}
                value={lobbyForm.date}
                onChange={(event) =>
                  setLobbyForm((current) => ({ ...current, date: event.target.value }))
                }
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Start"
                  type="time"
                  leadingIcon={<Clock className="h-4 w-4" aria-hidden="true" />}
                  value={lobbyForm.start}
                  onChange={(event) =>
                    setLobbyForm((current) => ({ ...current, start: event.target.value }))
                  }
                />
                <Input
                  label="End"
                  type="time"
                  leadingIcon={<Clock className="h-4 w-4" aria-hidden="true" />}
                  value={lobbyForm.end}
                  onChange={(event) =>
                    setLobbyForm((current) => ({ ...current, end: event.target.value }))
                  }
                />
              </div>
              <div className="md:col-span-2">
                <Button className="w-full" type="submit">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Create lobby
                </Button>
              </div>
            </form>

            <div className="mt-5 grid gap-3">
              {lobbies.map((lobby) => (
                <LobbyCard key={lobby.id} lobby={lobby} onJoin={joinLobby} />
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-semibold text-neutral-900">{label}</span>
      <select
        className="select-control"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </label>
  );
}

function SectionTitle({
  eyebrow,
  icon: Icon,
  title,
}: {
  eyebrow: string;
  icon: typeof Trophy;
  title: string;
}) {
  return (
    <div>
      <p className="flex items-center gap-2 text-xs font-semibold uppercase text-stone-500">
        <Icon className="h-4 w-4" aria-hidden="true" />
        {eyebrow}
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-neutral-950">{title}</h2>
    </div>
  );
}

function MatchRequestCard({
  activeTeam,
  request,
  onAccept,
}: {
  activeTeam?: Team;
  request: MatchRequest;
  onAccept: (request: MatchRequest) => void;
}) {
  const disabled =
    request.status !== "open" ||
    !activeTeam ||
    activeTeam.id === request.teamId ||
    activeTeam.size !== request.teamSize;

  return (
    <div className="rounded-[8px] border border-stone-200 bg-white/72 p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-neutral-950">
              {request.teamName}
            </h3>
            <StatusPill status={request.status} />
            {request.visibility === "private" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-700">
                <Lock className="h-3 w-3" aria-hidden="true" />
                {request.code}
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-stone-500">
            {request.field?.name ?? "Selected field"} - {request.teamSize}v{request.teamSize}
          </p>
          <p className="mt-2 font-mono text-sm text-neutral-700">
            {formatDateRange(request.preferredStartTime, request.preferredEndTime)}
          </p>
          <p className="mt-2 text-sm text-stone-500">{request.note}</p>
        </div>
        <div className="text-left md:text-right">
          <p className="font-mono text-lg font-semibold text-neutral-950">
            {formatCurrency(
              (request.field?.metadata.price ?? 0) * 2,
              request.field?.metadata.currency,
            )}
          </p>
          <p className="text-xs text-stone-500">estimated slot</p>
          <Button
            className="mt-3 w-full md:w-auto"
            disabled={disabled}
            onClick={() => onAccept(request)}
            variant={disabled ? "secondary" : "primary"}
          >
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}

function LobbyCard({
  lobby,
  onJoin,
}: {
  lobby: Lobby;
  onJoin: (lobby: Lobby) => void;
}) {
  const filledPercent = Math.min(100, (lobby.joinedCount / lobby.teamSize) * 100);
  const confirmed = lobby.status === "confirmed";

  return (
    <div className="rounded-[8px] border border-stone-200 bg-white/72 p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-neutral-950">
              {lobby.field?.name ?? "Open lobby"}
            </h3>
            <LobbyStatusPill status={lobby.status} />
          </div>
          <p className="mt-2 text-sm text-stone-500">
            Host: {lobby.creatorName} - Initial {lobby.initialSize}
          </p>
          <p className="mt-2 font-mono text-sm text-neutral-700">
            {formatDateRange(lobby.startTime, lobby.endTime)}
          </p>
          <div className="mt-4">
            <div className="flex justify-between text-xs font-semibold text-stone-500">
              <span>{lobby.joinedCount}/{lobby.teamSize} players</span>
              <span>{Math.round(filledPercent)}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100">
              <div
                className={cn(
                  "h-full rounded-full",
                  confirmed ? "bg-emerald-500" : "bg-neutral-950",
                )}
                style={{ width: `${filledPercent}%` }}
              />
            </div>
          </div>
        </div>
        <div className="text-left md:text-right">
          <p className="font-mono text-lg font-semibold text-neutral-950">
            {formatCurrency(
              lobby.field?.metadata.price ?? 0,
              lobby.field?.metadata.currency,
            )}
          </p>
          <p className="text-xs text-stone-500">per hour</p>
          <Button
            className="mt-3 w-full md:w-auto"
            disabled={confirmed}
            onClick={() => onJoin(lobby)}
            variant={confirmed ? "secondary" : "primary"}
          >
            {confirmed ? (
              <Check className="h-4 w-4" aria-hidden="true" />
            ) : (
              <UsersRound className="h-4 w-4" aria-hidden="true" />
            )}
            {confirmed ? "Confirmed" : "Join"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: MatchRequestStatus }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-1 text-xs font-semibold capitalize",
        status === "open" && "bg-emerald-50 text-emerald-800",
        status === "matched" && "bg-sky-50 text-sky-800",
        status === "canceled" && "bg-red-50 text-red-700",
      )}
    >
      {status}
    </span>
  );
}

function LobbyStatusPill({ status }: { status: LobbyStatus }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-1 text-xs font-semibold capitalize",
        status === "open" && "bg-emerald-50 text-emerald-800",
        status === "full" && "bg-amber-50 text-amber-800",
        status === "confirmed" && "bg-sky-50 text-sky-800",
        status === "canceled" && "bg-red-50 text-red-700",
      )}
    >
      {status}
    </span>
  );
}

function findField(fieldId: string): Field | undefined {
  return mockFields.find((field) => field.id === fieldId);
}

function playersForField(field: Field): number {
  const sideSize = Number.parseInt(field.type, 10);
  return Number.isNaN(sideSize) ? 10 : sideSize * 2;
}

function MatchingSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Skeleton className="h-56" />
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>
    </div>
  );
}
