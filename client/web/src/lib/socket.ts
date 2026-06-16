import { io, type Socket } from "socket.io-client";

let _socket: Socket | null = null;

export function connectSocket(token: string): void {
  if (_socket?.connected) return;
  _socket = io(process.env.NEXT_PUBLIC_API_URL!, {
    auth: { token },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
  });
}

export function getSocket(): Socket | null {
  return _socket;
}

export function disconnectSocket(): void {
  _socket?.disconnect();
  _socket = null;
}
