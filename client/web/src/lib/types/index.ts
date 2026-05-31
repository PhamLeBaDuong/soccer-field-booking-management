export type UserRole = "player" | "admin";

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  role: UserRole;
}

export interface Complex {
  id: string;
  name: string;
  description: string;
  address: string;
  lat: number;
  lng: number;
  owner: string;
  fieldsCount?: number;
}

export interface Field {
  id: string;
  complexId: string;
  name: string;
  description: string;
  address: string;
  type: string;
  startTime: string;
  endTime: string;
  indoor: boolean;
  lights: boolean;
  metadata: {
    price: number;
    currency?: string;
  };
  occupiedTimes?: { startTime: string; endTime: string }[];
  complex?: Complex;
}

export type BookingStatus = "pending" | "confirmed" | "canceled" | "matching";

export interface Booking {
  id: string;
  userId: string;
  fieldId: string;
  startTime: string;
  endTime: string;
  needMatching: boolean;
  teamSize: number;
  status: BookingStatus;
  totalPrice: number;
  currency: string;
  field?: Field;
  user?: User;
}

export interface AuthTokens {
  token: string;
}

export interface ApiError {
  message: string;
  status: number;
}

export interface LoginResponse {
  token: string;
  user?: User;
}

export interface RegisterPayload {
  name: string;
  username: string;
  email: string;
  phone: string;
  password: string;
}

export interface BookingPayload {
  userId: string;
  fieldId: string;
  startTime: string;
  endTime: string;
  needMatching: boolean;
  teamSize: number;
  fieldPrice: number;
  currency: string;
}

export interface ComplexPayload {
  ownerId: string;
  name: string;
  description: string;
  address: string;
  lat?: number;
  lng?: number;
}

export interface FieldPayload {
  complexId: string;
  name: string;
  description: string;
  address: string;
  type: string;
  startTime: string;
  endTime: string;
  indoor: boolean;
  lights: boolean;
  price: number;
  currency: string;
}

export interface MatchingSearch {
  teamSize: number;
  startTime: string;
  endTime: string;
  fieldId?: string;
}

export type MatchRequestStatus = "open" | "matched" | "canceled";
export type MatchRequestVisibility = "public" | "private";

export interface Team {
  id: string;
  name: string;
  size: number;
  rating: number;
  leaderId: string;
  membersCount: number;
}

export interface MatchRequest {
  id: string;
  teamId: string;
  teamName: string;
  teamSize: number;
  fieldId: string;
  field?: Field;
  preferredStartTime: string;
  preferredEndTime: string;
  visibility: MatchRequestVisibility;
  status: MatchRequestStatus;
  code?: string;
  note?: string;
}

export type MatchSource = "post" | "lobby";
export type MatchStatus = "confirmed" | "canceled";

export interface Match {
  id: string;
  source: MatchSource;
  status: MatchStatus;
  fieldId: string;
  startTime: string;
  endTime: string;
  homeScore: number | null;
  awayScore: number | null;
  resultNote: string | null;
  matchPostId?: string | null;
  createdAt: string;
  bookings?: Booking[];
  matchPost?: MatchRequest | null;
  field?: Field;
}

export type LobbyStatus = "open" | "full" | "confirmed" | "canceled";

export interface Lobby {
  id: string;
  fieldId: string;
  field?: Field;
  startTime: string;
  endTime: string;
  teamSize: number;
  initialSize: number;
  joinedCount: number;
  creatorId?: string;
  creatorName: string;
  status: LobbyStatus;
  visibility: MatchRequestVisibility;
  code?: string;
}
