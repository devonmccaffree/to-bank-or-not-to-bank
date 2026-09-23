import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  SAFE_ROLLS,
  SAVE_VERSION,
  type GameState,
  type Player,
  type RollEvent,
  type RoundCount,
  type DiceMode,
} from "./types";

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `p_${Math.random().toString(36).slice(2, 10)}`;
}

export function isAlwaysDoubles(sum: number): boolean {
  return sum === 2 || sum === 12;
}

export function canBeDoubles(sum: number): boolean {
  return sum === 2 || sum === 4 || sum === 6 || sum === 8 || sum === 10 || sum === 12;
}

export function resolveDoubles(sum: number, flagged: boolean): boolean {
  if (sum === 7 || sum === 3 || sum === 5 || sum === 9 || sum === 11) return false;
  if (isAlwaysDoubles(sum)) return true;
  return flagged;
}

export function nextActivePlayerId(state: GameState, afterId: string): string | null {
  const ids = state.players.map((p) => p.id);
  if (ids.length === 0) return null;
  const start = Math.max(0, ids.indexOf(afterId));
  for (let i = 1; i <= ids.length; i++) {
    const id = ids[(start + i) % ids.length];
    if (!state.bankedThisRound.includes(id)) return id;
  }
  return null;
}

export function activePlayerIds(state: GameState): string[] {
  return state.players.map((p) => p.id).filter((id) => !state.bankedThisRound.includes(id));
}

export function winners(state: GameState): Player[] {
  if (state.players.length === 0) return [];
  const max = Math.max(...state.players.map((p) => state.scores[p.id] ?? 0));
  return state.players.filter((p) => (state.scores[p.id] ?? 0) === max);
}

export function createGame(
  names: string[],
  totalRounds: RoundCount,
  diceMode: DiceMode,
): GameState {
  const cleaned = names.map((n) => n.trim()).filter(Boolean).slice(0, MAX_PLAYERS);
  if (cleaned.length < MIN_PLAYERS) {
    throw new Error(`Need at least ${MIN_PLAYERS} players`);
  }
  const players: Player[] = cleaned.map((name) => ({ id: newId(), name }));
  const scores: Record<string, number> = {};
  for (const p of players) scores[p.id] = 0;
  return {
    version: SAVE_VERSION,
    phase: "playing",
    players,
    scores,
    bankedThisRound: [],
    roundGains: {},
    bankTotal: 0,
    round: 1,
    totalRounds,
    rollsThisRound: 0,
    currentPlayerId: players[0].id,
    lastRollerId: null,
    lastRoll: null,
    roundHistory: [],
    diceMode,
    roundEndReason: null,
  };
}

export function createGameFromPlayers(
  people: Player[],
  totalRounds: RoundCount,
): GameState {
  if (people.length < MIN_PLAYERS) throw new Error(`Need at least ${MIN_PLAYERS} players`);
  const players = people.slice(0, MAX_PLAYERS);
  const scores: Record<string, number> = {};
  for (const p of players) scores[p.id] = 0;
  return {
    version: SAVE_VERSION,
    phase: "playing",
    players,
    scores,
    bankedThisRound: [],
    roundGains: {},
    bankTotal: 0,
    round: 1,
    totalRounds,
    rollsThisRound: 0,
    currentPlayerId: players[0].id,
    lastRollerId: null,
    lastRoll: null,
    roundHistory: [],
    diceMode: "physical",
    roundEndReason: null,
  };
}

export function applyRoll(state: GameState, sum: number, flaggedDoubles: boolean): GameState {
  if (state.phase !== "playing") return state;
  if (sum < 2 || sum > 12) return state;

  const isSafe = state.rollsThisRound < SAFE_ROLLS;
  const isDoubles = resolveDoubles(sum, flaggedDoubles);

  let bankTotal = state.bankTotal;
  let added = 0;
  let doubled = false;
  let busted = false;
  let display: string;

  if (sum === 7) {
    if (isSafe) {
      added = 70;
      bankTotal += 70;
      display = "+70";
    } else {
      busted = true;
      display = "7";
    }
  } else if (isDoubles) {
    if (isSafe) {
      added = sum;
      bankTotal += sum;
      display = `+${sum}`;
    } else {
      doubled = true;
      bankTotal = bankTotal * 2;
      display = "×2";
    }
  } else {
    added = sum;
    bankTotal += sum;
    display = `+${sum}`;
  }

  const event: RollEvent = {
    sum,
    isDoubles,
    isSafe,
    added,
    doubled,
    busted,
    bankAfter: busted ? state.bankTotal : bankTotal,
    rollerId: state.currentPlayerId,
    display,
  };

  if (busted) {
    return {
      ...state,
      lastRoll: event,
      roundHistory: [...state.roundHistory, event],
      rollsThisRound: state.rollsThisRound + 1,
      lastRollerId: state.currentPlayerId,
      phase: "roundEnd",
      roundEndReason: "seven",
    };
  }

  const next = nextActivePlayerId(
    { ...state, lastRollerId: state.currentPlayerId },
    state.currentPlayerId,
  );

  return {
    ...state,
    bankTotal,
    lastRoll: event,
    roundHistory: [...state.roundHistory, event],
    rollsThisRound: state.rollsThisRound + 1,
    lastRollerId: state.currentPlayerId,
    currentPlayerId: next ?? state.currentPlayerId,
  };
}

export function beginBank(state: GameState): GameState {
  if (state.phase !== "playing") return state;
  if (state.bankTotal <= 0) return state;
  const open = activePlayerIds(state);
  if (open.length === 0) return state;
  return { ...state, phase: "banking" };
}

export function cancelBank(state: GameState): GameState {
  if (state.phase !== "banking") return state;
  return { ...state, phase: "playing" };
}

export function confirmBank(state: GameState, playerId: string): GameState {
  if (state.phase !== "banking" && state.phase !== "playing") return state;
  if (state.bankTotal <= 0) return state;
  if (state.bankedThisRound.includes(playerId)) return state;
  if (!state.players.some((p) => p.id === playerId)) return state;

  const scores = { ...state.scores, [playerId]: (state.scores[playerId] ?? 0) + state.bankTotal };
  const bankedThisRound = [...state.bankedThisRound, playerId];
  const roundGains = { ...state.roundGains, [playerId]: state.bankTotal };
  const nextState: GameState = {
    ...state,
    scores,
    bankedThisRound,
    roundGains,
    phase: "playing",
  };

  const remaining = activePlayerIds(nextState);
  if (remaining.length === 0) {
    return { ...nextState, phase: "roundEnd", roundEndReason: "allBanked" };
  }

  if (state.currentPlayerId === playerId) {
    const next = nextActivePlayerId(nextState, playerId);
    return { ...nextState, currentPlayerId: next ?? playerId };
  }
  return nextState;
}

export function skipTurn(state: GameState): GameState {
  if (state.phase !== "playing") return state;
  const next = nextActivePlayerId(state, state.currentPlayerId);
  if (!next || next === state.currentPlayerId) return state;
  return { ...state, currentPlayerId: next };
}

export function advanceRound(state: GameState): GameState {
  if (state.phase !== "roundEnd") return state;
  if (state.round >= state.totalRounds) {
    return { ...state, phase: "gameOver" };
  }

  const after = state.lastRollerId ?? state.currentPlayerId;
  const ids = state.players.map((p) => p.id);
  const start = Math.max(0, ids.indexOf(after));
  const nextStarter = ids[(start + 1) % ids.length] ?? ids[0];

  return {
    ...state,
    phase: "playing",
    round: state.round + 1,
    bankTotal: 0,
    bankedThisRound: [],
    roundGains: {},
    rollsThisRound: 0,
    lastRoll: null,
    roundHistory: [],
    roundEndReason: null,
    currentPlayerId: nextStarter,
  };
}

export function rematch(state: GameState): GameState {
  const scores: Record<string, number> = {};
  for (const p of state.players) scores[p.id] = 0;
  return {
    ...state,
    phase: "playing",
    scores,
    bankedThisRound: [],
    roundGains: {},
    bankTotal: 0,
    round: 1,
    rollsThisRound: 0,
    currentPlayerId: state.players[0]?.id ?? "",
    lastRollerId: null,
    lastRoll: null,
    roundHistory: [],
    roundEndReason: null,
  };
}

export function playerName(state: GameState, id: string): string {
  return state.players.find((p) => p.id === id)?.name ?? "Player";
}
