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

