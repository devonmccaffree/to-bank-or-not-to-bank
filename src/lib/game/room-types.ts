import type { GameState, RoundCount } from "./types";

export type RoomStatus = "lobby" | "playing" | "over" | "closed";

export type RoomSeat = {
  id: string;
  name: string;
  seat: number;
};

export type RoomSnapshot = {
  code: string;
  status: RoomStatus;
  version: number;
  totalRounds: RoundCount;
  players: RoomSeat[];
  game: GameState | null;
  canUndo: boolean;
  you: "host" | "player";
  youId: string | null;
};

export type RoomOk = {
  ok: true;
  snapshot: RoomSnapshot;
  token?: string;
  playerId?: string;
};

export type RoomErr = { ok: false; error: string };

export type RoomResult = RoomOk | RoomErr;
