import { create } from "zustand";
import { playerName } from "./engine";
import {
  closeRoom,
  createRoom,
  fetchRoom,
  hostBank,
  hostContinue,
  hostCountdown,
  hostLobby,
  hostNextRoll,
  hostRematch,
  hostRoll,
  hostSkip,
  hostUndo,
  joinRoom,
  leaveRoom,
  playerBank,
  setRoomRounds,
  startRoom,
} from "./room.functions";
import type { RoomResult, RoomSnapshot } from "./room-types";
import type { DiceMode, Flash, RoundCount } from "./types";
import { playAdd, playBank, playBust, playDouble, playSafeSeven, playWin, unlockAudio } from "./sounds";

const SESSION_KEY = "bank-table-session";

type Session = {
  role: "host" | "player";
  code: string;
  token: string;
  playerId: string | null;
};

type RoomStore = {
  mode: "join" | "lobby" | "play" | null;
  session: Session | null;
  snapshot: RoomSnapshot | null;
  flash: Flash | null;
  error: string | null;
  busy: boolean;
  diceMode: DiceMode;
  restore: () => Promise<void>;
  openJoin: () => void;
  hostTable: () => Promise<void>;
  join: (code: string, name: string) => Promise<void>;
  setRounds: (rounds: RoundCount) => Promise<void>;
  setDiceMode: (mode: DiceMode) => void;
  start: () => Promise<void>;
  roll: (sum: number, doubles: boolean) => Promise<void>;
  nextRoll: () => Promise<void>;
  startCountdown: () => Promise<void>;
  skip: () => Promise<void>;
  undo: () => Promise<void>;
  next: () => Promise<void>;
  bank: (playerId: string) => Promise<void>;
  bankSelf: () => Promise<void>;
  rematch: () => Promise<void>;
  backToLobby: () => Promise<void>;
  leave: () => Promise<void>;
};

function saveSession(session: Session | null) {
  try {
    if (!session) localStorage.removeItem(SESSION_KEY);
    else localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* private mode */
  }
}

function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    if (!parsed?.code || !parsed.token || (parsed.role !== "host" && parsed.role !== "player")) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function modeFor(snapshot: RoomSnapshot): "lobby" | "play" {
  if (snapshot.status === "lobby" || snapshot.status === "closed" || !snapshot.game) return "lobby";
  return "play";
}

function flashFor(prev: RoomSnapshot | null, next: RoomSnapshot): Flash | null {
  const game = next.game;
  const before = prev?.game;
  if (!game || !before || prev?.version === next.version) return null;
  if (game.lastRoll && game.lastRoll !== before.lastRoll && game.rollsThisRound !== before.rollsThisRound) {
    const roll = game.lastRoll;
    if (roll.busted) return { text: "Seven — bank is gone", kind: "bust" };
    if (roll.doubled) return { text: `Doubles · ${before.bankTotal} → ${roll.bankAfter}`, kind: "double" };
    if (roll.sum === 7 && roll.isSafe) return { text: "Safe seven · +70", kind: "safe" };
    return { text: roll.display, kind: "add" };
  }
  const added = game.bankedThisRound.find((id) => !before.bankedThisRound.includes(id));
  if (added) {
    return { text: `${playerName(game, added)} banked ${game.roundGains[added] ?? 0}`, kind: "bank" };
  }
  if (game.phase === "gameOver" && before.phase !== "gameOver") return null;
  return null;
}

function soundFor(flash: Flash | null, muted = false) {
  if (!flash || muted) return;
  if (flash.kind === "bust") playBust();
  else if (flash.kind === "double") playDouble();
  else if (flash.kind === "safe") playSafeSeven();
  else if (flash.kind === "bank") playBank();
  else playAdd();
}

export const useRoomStore = create<RoomStore>((set, get) => {
  let pollTimer: ReturnType<typeof setTimeout> | null = null;
  let socket: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let live = false;

  function stopLive() {
    live = false;
    if (pollTimer) clearTimeout(pollTimer);
    pollTimer = null;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = null;
    if (socket) {
      socket.onclose = null;
      socket.close();
      socket = null;
    }
  }

  function schedulePoll(delay: number) {
    if (pollTimer || !get().session) return;
    pollTimer = setTimeout(async () => {
      pollTimer = null;
      if (!get().session || live) return;
      const session = get().session;
      if (!session) return;
      try {
        const result = await fetchRoom({ data: { code: session.code, token: session.token } });
        if (get().session?.token !== session.token) return;
        applyResult(result, true);
      } catch {
        /* next tick */
      }
      if (get().session && !live) schedulePoll(1200);
    }, delay);
  }

  function connectSocket() {
    const session = get().session;
    if (!session || live) return;
    if (typeof WebSocket === "undefined") {
      schedulePoll(200);
      return;
    }
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    const q = new URLSearchParams({ code: session.code, token: session.token });
    const ws = new WebSocket(`${proto}//${location.host}/api/table-ws?${q}`);
    socket = ws;
    const opened = { ok: false };
    const giveUp = setTimeout(() => {
      if (!opened.ok && socket === ws) schedulePoll(0);
    }, 2000);
    ws.onopen = () => {
      opened.ok = true;
      clearTimeout(giveUp);
      if (socket !== ws) return;
      live = true;
      if (pollTimer) clearTimeout(pollTimer);
      pollTimer = null;
    };
    ws.onmessage = (event) => {
      if (socket !== ws || get().session?.token !== session.token) return;
      try {
        applyResult(JSON.parse(String(event.data)) as RoomResult, true);
      } catch {
        /* ignore malformed frames */
      }
    };
    ws.onerror = () => {
      ws.close();
    };
    ws.onclose = () => {
      clearTimeout(giveUp);
      if (socket === ws) socket = null;
      const wasLive = live;
      live = false;
      if (!get().session) return;
      if (!wasLive) schedulePoll(0);
      else schedulePoll(200);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        if (get().session) connectSocket();
      }, 800);
    };
  }

  function startLive() {
    if (socket || reconnectTimer) return;
    connectSocket();
  }

  function applyResult(result: RoomResult, sound: boolean) {
    if (!result.ok) {
      if (result.error.includes("closed") || result.error.includes("gone") || result.error.includes("not at")) {
        saveSession(null);
        stopLive();
        set({ session: null, snapshot: null, mode: null, error: result.error, busy: false });
        return;
      }
      set({ error: result.error, busy: false });
      return;
    }
    const prev = get().snapshot;
    if (prev && result.snapshot.version < prev.version) return;
    const flash = prev && prev.version !== result.snapshot.version ? flashFor(prev, result.snapshot) : null;
    if (sound && result.snapshot.you === "host") soundFor(flash);
    if (
      result.snapshot.game?.phase === "gameOver" &&
      prev?.game?.phase !== "gameOver" &&
      result.snapshot.you === "host"
    ) {
      playWin();
    }
    set({
      snapshot: result.snapshot,
      mode: modeFor(result.snapshot),
      error: null,
      busy: false,
      flash: prev && prev.version !== result.snapshot.version ? flash : get().flash,
    });
  }

  async function hostCall(run: (session: Session) => Promise<RoomResult>) {
    const session = get().session;
    if (!session || session.role !== "host" || get().busy) return;
    set({ busy: true, error: null });
    try {
      applyResult(await run(session), true);
    } catch {
      set({ busy: false, error: "Could not reach the table." });
    }
  }

  return {
    mode: null,
    session: null,
    snapshot: null,
    flash: null,
    error: null,
    busy: false,
    diceMode: "physical",
    restore: async () => {
      const session = readSession();
      if (!session || get().session) return;
      set({ session, busy: true });
      try {
        const result = await fetchRoom({ data: { code: session.code, token: session.token } });
        if (!result.ok) {
          saveSession(null);
          set({ session: null, mode: null, busy: false, error: null });
          return;
        }
        applyResult(result, false);
        startLive();
      } catch {
        set({ busy: false });
      }
    },
    openJoin: () => {
      stopLive();
      set({ mode: "join", error: null });
    },
    hostTable: async () => {
      if (get().busy) return;
      unlockAudio();
      set({ busy: true, error: null });
      try {
        const result = await createRoom();
        if (!result.ok || !result.token) {
          set({ busy: false, error: result.ok ? "Could not open a table." : result.error });
          return;
        }
        const session: Session = {
          role: "host",
          code: result.snapshot.code,
          token: result.token,
          playerId: null,
        };
        saveSession(session);
        set({ session, busy: false });
        applyResult(result, false);
        startLive();
      } catch {
        set({ busy: false, error: "Could not open a table." });
      }
    },
    join: async (code, name) => {
      if (get().busy) return;
      unlockAudio();
      set({ busy: true, error: null });
      try {
        const result = await joinRoom({ data: { code, name } });
        if (!result.ok || !result.token) {
          set({ busy: false, error: result.ok ? "Could not join." : result.error });
          return;
        }
        const session: Session = {
          role: "player",
          code: result.snapshot.code,
          token: result.token,
          playerId: result.playerId ?? result.snapshot.youId,
        };
        saveSession(session);
        set({ session });
        applyResult(result, false);
        startLive();
      } catch {
        set({ busy: false, error: "Could not join that table." });
      }
    },
    setRounds: async (rounds) => {
      await hostCall((session) =>
        setRoomRounds({ data: { code: session.code, token: session.token, rounds } }),
      );
    },
    setDiceMode: (diceMode) => set({ diceMode }),
    start: async () => {
      unlockAudio();
      const diceMode = get().diceMode;
      await hostCall((session) =>
        startRoom({ data: { code: session.code, token: session.token, diceMode } }),
      );
    },
    roll: async (sum, doubles) => {
      unlockAudio();
      await hostCall((session) =>
        hostRoll({ data: { code: session.code, token: session.token, sum, doubles } }),
      );
    },
    nextRoll: async () => {
      await hostCall((session) => hostNextRoll({ data: { code: session.code, token: session.token } }));
    },
    startCountdown: async () => {
      await hostCall((session) => hostCountdown({ data: { code: session.code, token: session.token } }));
    },
    skip: async () => {
      await hostCall((session) => hostSkip({ data: { code: session.code, token: session.token } }));
    },
    undo: async () => {
      await hostCall((session) => hostUndo({ data: { code: session.code, token: session.token } }));
    },
    next: async () => {
      await hostCall((session) => hostContinue({ data: { code: session.code, token: session.token } }));
    },
    bank: async (playerId) => {
      unlockAudio();
      await hostCall((session) =>
        hostBank({ data: { code: session.code, token: session.token, playerId } }),
      );
    },
    bankSelf: async () => {
      const session = get().session;
      if (!session || session.role !== "player" || get().busy) return;
      unlockAudio();
      set({ busy: true, error: null });
      try {
        const result = await playerBank({ data: { code: session.code, token: session.token } });
        if (result.ok) playBank();
        applyResult(result, false);
      } catch {
        set({ busy: false, error: "Could not bank." });
      }
    },
    rematch: async () => {
      await hostCall((session) => hostRematch({ data: { code: session.code, token: session.token } }));
    },
    backToLobby: async () => {
      await hostCall((session) => hostLobby({ data: { code: session.code, token: session.token } }));
    },
    leave: async () => {
      const session = get().session;
      stopLive();
      saveSession(null);
      set({ session: null, snapshot: null, mode: null, flash: null, error: null, busy: false });
      if (session?.role === "host") {
        try {
          await closeRoom({ data: { code: session.code, token: session.token } });
        } catch {
          /* already left locally */
        }
      } else if (session) {
        try {
          await leaveRoom({ data: { code: session.code, token: session.token } });
        } catch {
          /* already left locally */
        }
      }
    },
  };
});
