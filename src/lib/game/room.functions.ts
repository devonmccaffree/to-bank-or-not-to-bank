import { createServerFn } from "@tanstack/react-start";
import {
  advanceRound,
  applyRoll,
  confirmBank,
  createGameFromPlayers,
  rematch,
  skipTurn,
} from "./engine";
import type { GameState, RoundCount } from "./types";
import type { RoomResult, RoomSeat, RoomSnapshot, RoomStatus } from "./room-types";
import { pokeRoom } from "./room-live.server";

type Payload = { game: GameState | null; undo: GameState[] };

type RoomRow = {
  code: string;
  host_token: string;
  status: string;
  total_rounds: number;
  version: number;
  payload: Payload | string | null;
};

type PlayerRow = {
  id: string;
  display_name: string;
  player_token: string;
  seat: number;
};

const ROUNDS = new Set([10, 15, 20]);

function fail(error: string): RoomResult {
  return { ok: false, error };
}

function uid(): string {
  return crypto.randomUUID();
}

function randomCode(): string {
  return String(Math.floor(Math.random() * 10000)).padStart(4, "0");
}

function cleanName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.replace(/\s+/g, " ").trim();
  if (name.length < 1 || name.length > 18) return null;
  return name;
}

function asCode(raw: unknown): string | null {
  if (typeof raw !== "string" || !/^\d{4}$/.test(raw)) return null;
  return raw;
}

function asRounds(raw: unknown): RoundCount {
  const n = typeof raw === "number" ? raw : Number(raw);
  return ROUNDS.has(n) ? (n as RoundCount) : 20;
}

function parsePayload(raw: RoomRow["payload"]): Payload {
  const value = typeof raw === "string" ? (JSON.parse(raw) as Payload) : raw;
  if (!value || typeof value !== "object") return { game: null, undo: [] };
  return {
    game: value.game ?? null,
    undo: Array.isArray(value.undo) ? value.undo : [],
  };
}

async function db() {
  const { getSql } = await import("@/lib/db");
  return getSql();
}

async function loadRoom(code: string): Promise<{ room: RoomRow; players: PlayerRow[] } | null> {
  const sql = await db();
  const rooms = await sql<RoomRow>`
    select code, host_token, status, total_rounds, version, payload
    from rooms
    where code = ${code}
  `;
  const room = rooms[0];
  if (!room) return null;
  const players = await sql<PlayerRow>`
    select id, display_name, player_token, seat
    from room_players
    where room_code = ${code}
    order by seat asc
  `;
  return { room, players };
}

function snapshotFor(
  room: RoomRow,
  players: PlayerRow[],
  token: string,
): RoomSnapshot | null {
  const seats: RoomSeat[] = players.map((p) => ({
    id: p.id,
    name: p.display_name,
    seat: p.seat,
  }));
  const payload = parsePayload(room.payload);
  const status = room.status as RoomStatus;
  const base = {
    code: room.code,
    status,
    version: Number(room.version),
    totalRounds: asRounds(room.total_rounds),
    players: seats,
    game: payload.game,
    canUndo: payload.undo.length > 0,
  };
  if (token === room.host_token) {
    return { ...base, you: "host" as const, youId: null };
  }
  const me = players.find((p) => p.player_token === token);
  if (!me) return null;
  return { ...base, you: "player" as const, youId: me.id };
}

async function writePayload(
  code: string,
  version: number,
  status: RoomStatus,
  payload: Payload,
  totalRounds?: RoundCount,
): Promise<number | null> {
  const sql = await db();
  const body = JSON.stringify(payload);
  const rows =
    totalRounds === undefined
      ? await sql<{ version: number }>`
          update rooms
          set payload = ${body}::jsonb,
              status = ${status},
              version = version + 1,
              updated_at = now()
          where code = ${code} and version = ${version}
          returning version
        `
      : await sql<{ version: number }>`
          update rooms
          set payload = ${body}::jsonb,
              status = ${status},
              total_rounds = ${totalRounds},
              version = version + 1,
              updated_at = now()
          where code = ${code} and version = ${version}
          returning version
        `;
  const next = rows[0]?.version;
  if (next !== undefined) pokeRoom(code);
  return next === undefined ? null : Number(next);
}

async function mutateGame(
  code: string,
  hostToken: string,
  change: (game: GameState, payload: Payload) => { game: GameState; status?: RoomStatus } | null,
): Promise<RoomResult> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const loaded = await loadRoom(code);
    if (!loaded) return fail("That table is gone.");
    if (loaded.room.host_token !== hostToken) return fail("Only the host can do that.");
    if (loaded.room.status === "closed") return fail("This table is closed.");
    const payload = parsePayload(loaded.room.payload);
    if (!payload.game) return fail("The game has not started.");
    const changed = change(payload.game, payload);
    if (!changed || changed.game === payload.game) {
      const snap = snapshotFor(loaded.room, loaded.players, hostToken);
      return snap ? { ok: true, snapshot: snap } : fail("Only the host can do that.");
    }
    const status = changed.status ?? (changed.game.phase === "gameOver" ? "over" : "playing");
    const nextPayload: Payload = {
      game: changed.game,
      undo: [...payload.undo, payload.game].slice(-30),
    };
    const version = await writePayload(code, Number(loaded.room.version), status, nextPayload);
    if (version === null) continue;
    const again = await loadRoom(code);
    if (!again) return fail("That table is gone.");
    const snap = snapshotFor(again.room, again.players, hostToken);
    return snap ? { ok: true, snapshot: snap } : fail("Only the host can do that.");
  }
  return fail("Someone else updated the table. Try again.");
}

export const createRoom = createServerFn({ method: "POST" }).handler(async (): Promise<RoomResult> => {
  const sql = await db();
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const code = randomCode();
    const existing = await sql<{ status: string; fresh: boolean }>`
      select status, updated_at > now() - interval '6 hours' as fresh
      from rooms
      where code = ${code}
    `;
    const row = existing[0];
    if (row && row.status !== "closed" && row.fresh) continue;
    if (row) {
      await sql`delete from rooms where code = ${code}`;
    }
    const hostToken = uid();
    try {
      await sql`
        insert into rooms (code, host_token, status, total_rounds, version, payload)
        values (${code}, ${hostToken}, 'lobby', 20, 0, ${JSON.stringify({ game: null, undo: [] })}::jsonb)
      `;
    } catch {
      continue;
    }
    const loaded = await loadRoom(code);
    if (!loaded) return fail("Could not open a table.");
    const snapshot = snapshotFor(loaded.room, loaded.players, hostToken);
    if (!snapshot) return fail("Could not open a table.");
    return { ok: true, snapshot, token: hostToken };
  }
  return fail("Every code is in use. Try again in a moment.");
});

export const joinRoom = createServerFn({ method: "POST" })
  .validator((input: { code: string; name: string }) => input)
  .handler(async ({ data }): Promise<RoomResult> => {
    const code = asCode(data?.code);
    const name = cleanName(data?.name);
    if (!code) return fail("Enter the 4-digit code.");
    if (!name) return fail("Enter a name, up to 18 characters.");
    const loaded = await loadRoom(code);
    if (!loaded || loaded.room.status === "closed") return fail("No open table with that code.");
    if (loaded.room.status !== "lobby") return fail("That table has already started.");
    if (loaded.players.length >= 100) return fail("This table is full.");
    if (loaded.players.some((p) => p.display_name.toLowerCase() === name.toLowerCase())) {
      return fail("That name is already at this table.");
    }
    const id = uid();
    const playerToken = uid();
    const seat = (loaded.players.at(-1)?.seat ?? 0) + 1;
    const sql = await db();
    try {
      await sql`
        insert into room_players (id, room_code, display_name, player_token, seat)
        values (${id}, ${code}, ${name}, ${playerToken}, ${seat})
      `;
      await sql`
        update rooms
        set version = version + 1, updated_at = now()
        where code = ${code}
      `;
    } catch {
      return fail("Could not join. Try again.");
    }
    pokeRoom(code);
    const again = await loadRoom(code);
    if (!again) return fail("No open table with that code.");
    const snapshot = snapshotFor(again.room, again.players, playerToken);
    if (!snapshot) return fail("Could not join.");
    return { ok: true, snapshot, token: playerToken, playerId: id };
  });

export async function readRoomForTokens(
  code: string,
  tokens: string[],
): Promise<Record<string, RoomResult>> {
  const clean = asCode(code);
  const out: Record<string, RoomResult> = {};
  if (!clean) {
    for (const token of tokens) out[token] = fail("Missing table.");
    return out;
  }
  const loaded = await loadRoom(clean);
  for (const token of tokens) {
    if (!token) {
      out[token] = fail("Missing table.");
      continue;
    }
    if (!loaded || loaded.room.status === "closed") {
      out[token] = fail("That table is closed.");
      continue;
    }
    const snapshot = snapshotFor(loaded.room, loaded.players, token);
    out[token] = snapshot ? { ok: true, snapshot } : fail("You are not at this table.");
  }
  return out;
}

export const fetchRoom = createServerFn({ method: "POST" })
  .validator((input: { code: string; token: string }) => input)
  .handler(async ({ data }): Promise<RoomResult> => {
    const code = asCode(data?.code);
    if (!code || typeof data?.token !== "string" || !data.token) return fail("Missing table.");
    const found = await readRoomForTokens(code, [data.token]);
    return found[data.token] ?? fail("Missing table.");
  });

export const closeRoom = createServerFn({ method: "POST" })
  .validator((input: { code: string; token: string }) => input)
  .handler(async ({ data }): Promise<RoomResult> => {
    const code = asCode(data?.code);
    if (!code || typeof data?.token !== "string") return fail("Missing table.");
    const sql = await db();
    const rows = await sql<{ code: string }>`
      update rooms
      set status = 'closed', updated_at = now(), version = version + 1
      where code = ${code} and host_token = ${data.token} and status <> 'closed'
      returning code
    `;
    if (!rows[0]) return fail("Only the host can close this table.");
    pokeRoom(code);
    const loaded = await loadRoom(code);
    if (!loaded) return fail("That table is closed.");
    const snapshot = snapshotFor(loaded.room, loaded.players, data.token);
    return snapshot ? { ok: true, snapshot } : fail("That table is closed.");
  });

export const setRoomRounds = createServerFn({ method: "POST" })
  .validator((input: { code: string; token: string; rounds: number }) => input)
  .handler(async ({ data }): Promise<RoomResult> => {
    const code = asCode(data?.code);
    const rounds = asRounds(data?.rounds);
    if (!code || typeof data?.token !== "string") return fail("Missing table.");
    const sql = await db();
    const rows = await sql<{ code: string }>`
      update rooms
      set total_rounds = ${rounds}, version = version + 1, updated_at = now()
      where code = ${code} and host_token = ${data.token} and status = 'lobby'
      returning code
    `;
    if (!rows[0]) return fail("Rounds can only change before the game starts.");
    pokeRoom(code);
    const loaded = await loadRoom(code);
    if (!loaded) return fail("That table is gone.");
    const snapshot = snapshotFor(loaded.room, loaded.players, data.token);
    return snapshot ? { ok: true, snapshot } : fail("Only the host can do that.");
  });

export const startRoom = createServerFn({ method: "POST" })
  .validator((input: { code: string; token: string }) => input)
  .handler(async ({ data }): Promise<RoomResult> => {
    const code = asCode(data?.code);
    if (!code || typeof data?.token !== "string") return fail("Missing table.");
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const loaded = await loadRoom(code);
      if (!loaded) return fail("That table is gone.");
      if (loaded.room.host_token !== data.token) return fail("Only the host can start.");
      if (loaded.room.status !== "lobby") return fail("That table has already started.");
      if (loaded.players.length < 2) return fail("Wait for at least two players.");
      let game: GameState;
      try {
        game = createGameFromPlayers(
          loaded.players.map((p) => ({ id: p.id, name: p.display_name })),
          asRounds(loaded.room.total_rounds),
        );
      } catch (err) {
        return fail(err instanceof Error ? err.message : "Could not start.");
      }
      const version = await writePayload(
        code,
        Number(loaded.room.version),
        "playing",
        { game, undo: [] },
      );
      if (version === null) continue;
      const again = await loadRoom(code);
      if (!again) return fail("That table is gone.");
      const snapshot = snapshotFor(again.room, again.players, data.token);
      return snapshot ? { ok: true, snapshot } : fail("Only the host can start.");
    }
    return fail("Could not start. Try again.");
  });

export const hostRoll = createServerFn({ method: "POST" })
  .validator((input: { code: string; token: string; sum: number; doubles: boolean }) => input)
  .handler(async ({ data }): Promise<RoomResult> => {
    const code = asCode(data?.code);
    const sum = Number(data?.sum);
    if (!code || typeof data?.token !== "string" || sum < 2 || sum > 12) return fail("Bad roll.");
    return mutateGame(code, data.token, (game) => {
      const next = applyRoll(game, sum, Boolean(data.doubles));
      if (next === game) return null;
      return { game: next };
    });
  });

export const hostSkip = createServerFn({ method: "POST" })
  .validator((input: { code: string; token: string }) => input)
  .handler(async ({ data }): Promise<RoomResult> => {
    const code = asCode(data?.code);
    if (!code || typeof data?.token !== "string") return fail("Missing table.");
    return mutateGame(code, data.token, (game) => {
      const next = skipTurn(game);
      if (next === game) return null;
      return { game: next };
    });
  });

export const hostUndo = createServerFn({ method: "POST" })
  .validator((input: { code: string; token: string }) => input)
  .handler(async ({ data }): Promise<RoomResult> => {
    const code = asCode(data?.code);
    if (!code || typeof data?.token !== "string") return fail("Missing table.");
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const loaded = await loadRoom(code);
      if (!loaded) return fail("That table is gone.");
      if (loaded.room.host_token !== data.token) return fail("Only the host can do that.");
      const payload = parsePayload(loaded.room.payload);
      const prev = payload.undo[payload.undo.length - 1];
      if (!prev) {
        const snap = snapshotFor(loaded.room, loaded.players, data.token);
        return snap ? { ok: true, snapshot: snap } : fail("Only the host can do that.");
      }
      const status: RoomStatus = prev.phase === "gameOver" ? "over" : "playing";
      const version = await writePayload(code, Number(loaded.room.version), status, {
        game: prev,
        undo: payload.undo.slice(0, -1),
      });
      if (version === null) continue;
      const again = await loadRoom(code);
      if (!again) return fail("That table is gone.");
      const snapshot = snapshotFor(again.room, again.players, data.token);
      return snapshot ? { ok: true, snapshot: snapshot } : fail("Only the host can do that.");
    }
    return fail("Could not undo. Try again.");
  });

export const hostContinue = createServerFn({ method: "POST" })
  .validator((input: { code: string; token: string }) => input)
  .handler(async ({ data }): Promise<RoomResult> => {
    const code = asCode(data?.code);
    if (!code || typeof data?.token !== "string") return fail("Missing table.");
    return mutateGame(code, data.token, (game) => {
      const next = advanceRound(game);
      if (next === game) return null;
      return { game: next };
    });
  });

export const hostRematch = createServerFn({ method: "POST" })
  .validator((input: { code: string; token: string }) => input)
  .handler(async ({ data }): Promise<RoomResult> => {
    const code = asCode(data?.code);
    if (!code || typeof data?.token !== "string") return fail("Missing table.");
    return mutateGame(code, data.token, (game) => ({ game: rematch(game), status: "playing" }));
  });

export const hostLobby = createServerFn({ method: "POST" })
  .validator((input: { code: string; token: string }) => input)
  .handler(async ({ data }): Promise<RoomResult> => {
    const code = asCode(data?.code);
    if (!code || typeof data?.token !== "string") return fail("Missing table.");
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const loaded = await loadRoom(code);
      if (!loaded) return fail("That table is gone.");
      if (loaded.room.host_token !== data.token) return fail("Only the host can do that.");
      const version = await writePayload(code, Number(loaded.room.version), "lobby", {
        game: null,
        undo: [],
      });
      if (version === null) continue;
      const again = await loadRoom(code);
      if (!again) return fail("That table is gone.");
      const snapshot = snapshotFor(again.room, again.players, data.token);
      return snapshot ? { ok: true, snapshot } : fail("Only the host can do that.");
    }
    return fail("Could not return to the lobby.");
  });

export const hostBank = createServerFn({ method: "POST" })
  .validator((input: { code: string; token: string; playerId: string }) => input)
  .handler(async ({ data }): Promise<RoomResult> => {
    const code = asCode(data?.code);
    if (!code || typeof data?.token !== "string" || typeof data?.playerId !== "string") {
      return fail("Missing table.");
    }
    return mutateGame(code, data.token, (game) => {
      const next = confirmBank(game, data.playerId);
      if (next === game) return null;
      return { game: next };
    });
  });

export const playerBank = createServerFn({ method: "POST" })
  .validator((input: { code: string; token: string }) => input)
  .handler(async ({ data }): Promise<RoomResult> => {
    const code = asCode(data?.code);
    if (!code || typeof data?.token !== "string") return fail("Missing table.");
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const loaded = await loadRoom(code);
      if (!loaded) return fail("That table is gone.");
      if (loaded.room.status === "closed") return fail("This table is closed.");
      const me = loaded.players.find((p) => p.player_token === data.token);
      if (!me) return fail("You are not at this table.");
      const payload = parsePayload(loaded.room.payload);
      if (!payload.game || payload.game.phase !== "playing") return fail("You can't bank right now.");
      const next = confirmBank(payload.game, me.id);
      if (next === payload.game) {
        const snap = snapshotFor(loaded.room, loaded.players, data.token);
        return snap ? { ok: true, snapshot: snap } : fail("You are not at this table.");
      }
      const status: RoomStatus = next.phase === "gameOver" ? "over" : "playing";
      const version = await writePayload(code, Number(loaded.room.version), status, {
        game: next,
        undo: [...payload.undo, payload.game].slice(-30),
      });
      if (version === null) continue;
      const again = await loadRoom(code);
      if (!again) return fail("That table is gone.");
      const snapshot = snapshotFor(again.room, again.players, data.token);
      return snapshot ? { ok: true, snapshot } : fail("You are not at this table.");
    }
    return fail("The table changed. Try BANK again.");
  });
