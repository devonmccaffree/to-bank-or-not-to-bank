export const SAFE_ROLLS = 3;
export const MAX_PLAYERS = 100;
export const MIN_PLAYERS = 2;
export const SAVE_VERSION = 1 as const;

export type RoundCount = 10 | 15 | 20;
export type DiceMode = "physical" | "digital";
export type GamePhase = "playing" | "banking" | "roundEnd" | "gameOver";
export type Screen = "home" | "setup" | "play" | "how" | "history";
export type RoundEndReason = "seven" | "allBanked";
export type FlashKind = "add" | "double" | "bust" | "bank" | "safe";

export type Player = {
  id: string;
  name: string;
};

export type RollEvent = {
  sum: number;
  isDoubles: boolean;
  isSafe: boolean;
  added: number;
  doubled: boolean;
  busted: boolean;
  bankAfter: number;
  rollerId: string;
  display: string;
};

export type GameState = {
  version: typeof SAVE_VERSION;
  phase: GamePhase;
  players: Player[];
  scores: Record<string, number>;
  bankedThisRound: string[];
  roundGains: Record<string, number>;
  bankTotal: number;
  round: number;
  totalRounds: RoundCount;
  rollsThisRound: number;
  currentPlayerId: string;
  lastRollerId: string | null;
  lastRoll: RollEvent | null;
  roundHistory: RollEvent[];
  diceMode: DiceMode;
  roundEndReason: RoundEndReason | null;
};

export type PastGame = {
  id: string;
  playedAt: number;
  totalRounds: RoundCount;
  results: { name: string; score: number }[];
  winnerNames: string[];
};

export type Flash = {
  text: string;
  kind: FlashKind;
};
