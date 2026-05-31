import { apiFetch } from "@/lib/api/client";

export interface ScheduleBooking {
  id: string;
  matchId: string;
  startTime: string;
  endTime: string;
  status: string;
  totalPrice: number;
  currency: string;
  user: { id: string; name: string; username: string };
  match: {
    id: string;
    source: "post" | "lobby" | "manual";
    status: string;
    homeScore: number | null;
    awayScore: number | null;
    resultNote: string | null;
    matchPost?: {
      team: { id: string; name: string; size: number };
    } | null;
    lobbies?: { id: string; teamSize: number }[];
  };
}

export async function getFieldSchedule(fieldId: string, date: string): Promise<ScheduleBooking[]> {
  return apiFetch<ScheduleBooking[]>(`/api/admin/fields/${fieldId}/schedule?date=${date}`);
}

export async function setMatchResult(
  matchId: string,
  homeScore: number,
  awayScore: number,
  resultNote?: string,
): Promise<void> {
  await apiFetch(`/api/admin/matches/${matchId}/result`, {
    method: "PUT",
    body:   JSON.stringify({ homeScore, awayScore, resultNote }),
  });
}
