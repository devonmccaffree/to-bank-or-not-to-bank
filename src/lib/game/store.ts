import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  applyRoll,
  advanceRound,
  confirmBank,
  createGame,
  playerName,
  rematch,
  skipTurn,
  winners,
} from "./engine";
import {
  playAdd,
  playBank,
  playBust,
  playDouble,
  playRoll,
  playSafeSeven,
  playWin,
  unlockAudio,
} from "./sounds";
import type {
  DiceMode,
  Flash,
  GameState,
  PastGame,
  RoundCount,
  Screen,
} from "./types";

const UNDO_LIMIT = 40;
const HISTORY_LIMIT = 20;

type GameStore = {
  screen: Screen;
  game: GameState | null;
  undo: GameState[];
  pastGames: PastGame[];
  muted: boolean;
  setupPlayers: string[];
  setupRounds: RoundCount;
  setupDiceMode: DiceMode;
  doublesOn: boolean;
  rolling: boolean;
  dice: [number, number];
  flash: Flash | null;
  hydrated: boolean;
  setHydrated: () => void;
  setScreen: (screen: Screen) => void;
  setSetupPlayers: (players: string[]) => void;
  setSetupRounds: (rounds: RoundCount) => void;
  setSetupDiceMode: (mode: DiceMode) => void;
  setDoublesOn: (on: boolean) => void;
  toggleMute: () => void;
  startGame: () => string | null;
  enterRoll: (sum: number, flaggedDoubles?: boolean) => void;
  rollDigital: () => void;
  pickBanker: (playerId: string) => void;
  skip: () => void;
  undoLast: () => void;
  continueRound: () => void;
  playAgain: () => void;
  changePlayers: () => void;
  abandonGame: () => void;
};

function snapshot(game: GameState): GameState {
  return structuredClone(game);
}

function pushUndo(undo: GameState[], game: GameState): GameState[] {
  return [...undo, snapshot(game)].slice(-UNDO_LIMIT);
}

function soundForRoll(game: GameState, muted: boolean) {
  if (muted) return;
  const roll = game.lastRoll;
  if (!roll) return;
  if (roll.busted) playBust();
  else if (roll.doubled) playDouble();
  else if (roll.sum === 7 && roll.isSafe) playSafeSeven();
  else playAdd();
}

function archiveIfOver(game: GameState, pastGames: PastGame[]): PastGame[] {
  if (game.phase !== "gameOver") return pastGames;
  const champ = winners(game);
  const record: PastGame = {
    id: `${Date.now()}`,
    playedAt: Date.now(),
    totalRounds: game.totalRounds,
    results: game.players.map((p) => ({ name: p.name, score: game.scores[p.id] ?? 0 })),
    winnerNames: champ.map((p) => p.name),
  };
  return [record, ...pastGames].slice(0, HISTORY_LIMIT);
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      screen: "home",
      game: null,
      undo: [],
      pastGames: [],
      muted: false,
      setupPlayers: ["", ""],
      setupRounds: 20,
      setupDiceMode: "physical",
      doublesOn: false,
      rolling: false,
      dice: [1, 1],
      flash: null,
      hydrated: false,
      setHydrated: () => set({ hydrated: true }),
      setScreen: (screen) => set({ screen }),
      setSetupPlayers: (setupPlayers) => set({ setupPlayers }),
      setSetupRounds: (setupRounds) => set({ setupRounds }),
      setSetupDiceMode: (setupDiceMode) => set({ setupDiceMode }),
      setDoublesOn: (doublesOn) => set({ doublesOn }),
      toggleMute: () => set({ muted: !get().muted }),
      startGame: () => {
        unlockAudio();
        try {
          const { setupPlayers, setupRounds, setupDiceMode } = get();
          const game = createGame(setupPlayers, setupRounds, "physical");
          set({
            game,
            undo: [],
            screen: "play",
            doublesOn: false,
            rolling: false,
            flash: null,
            dice: [1, 1],
          });
          return null;
        } catch (err) {
          return err instanceof Error ? err.message : "Could not start";
        }
      },
      enterRoll: (sum, flaggedDoubles) => {
        const { game, undo, doublesOn, muted, rolling } = get();
        if (!game || rolling) return;
        unlockAudio();
        const next = applyRoll(game, sum, flaggedDoubles ?? doublesOn);
        if (next === game) return;
        soundForRoll(next, muted);
        const flash: Flash | null = next.lastRoll
          ? next.lastRoll.busted
            ? { text: "Seven — bank is gone", kind: "bust" }
            : next.lastRoll.doubled
              ? { text: `Doubles · ${game.bankTotal} → ${next.bankTotal}`, kind: "double" }
              : next.lastRoll.isDoubles && next.lastRoll.isSafe
                ? { text: `Safe doubles · +${next.lastRoll.added}`, kind: "add" }
                : next.lastRoll.sum === 7
                ? { text: "Safe seven · +70", kind: "safe" }
                : { text: next.lastRoll.display, kind: "add" }
          : null;
        set({
          game: next,
          undo: pushUndo(undo, game),
          doublesOn: false,
          flash,
        });
      },
      rollDigital: () => {
        const { game, rolling, muted } = get();
        if (!game || rolling || game.phase !== "playing") return;
        unlockAudio();
        if (!muted) playRoll();
        set({ rolling: true });
        const d1 = 1 + Math.floor(Math.random() * 6);
        const d2 = 1 + Math.floor(Math.random() * 6);
        window.setTimeout(() => {
          set({ dice: [d1, d2], rolling: false });
          get().enterRoll(d1 + d2, d1 === d2);
        }, 700);
      },
      pickBanker: (playerId) => {
        const { game, undo, muted, rolling } = get();
        if (!game || rolling) return;
        unlockAudio();
        const next = confirmBank(game, playerId);
        if (next === game) return;
        if (!muted) playBank();
        const name = playerName(next, playerId);
        const gained = next.roundGains[playerId] ?? 0;
        set({
          game: next,
          undo: pushUndo(undo, game),
          flash: { text: `${name} banked ${gained}`, kind: "bank" },
        });
      },
      skip: () => {
        const { game, undo } = get();
        if (!game) return;
        const next = skipTurn(game);
        if (next === game) return;
        set({ game: next, undo: pushUndo(undo, game) });
      },
      undoLast: () => {
        const { undo } = get();
        const prev = undo[undo.length - 1];
        if (!prev) return;
        set({
          game: prev,
          undo: undo.slice(0, -1),
          rolling: false,
          doublesOn: false,
          flash: null,
        });
      },
      continueRound: () => {
        const { game, undo, muted, pastGames } = get();
        if (!game) return;
        const next = advanceRound(game);
        const archived = archiveIfOver(next, pastGames);
        if (next.phase === "gameOver" && !muted) playWin();
        set({
          game: next,
          undo: pushUndo(undo, game),
          pastGames: archived,
          flash: null,
        });
      },
      playAgain: () => {
        const { game } = get();
        if (!game) return;
        set({
          game: rematch(game),
          undo: [],
          doublesOn: false,
          flash: null,
          rolling: false,
        });
      },
      changePlayers: () => {
        const { game } = get();
        set({
          screen: "setup",
          setupPlayers: game ? game.players.map((p) => p.name) : get().setupPlayers,
          game: null,
          undo: [],
          flash: null,
        });
      },
      abandonGame: () => {
        set({ game: null, undo: [], screen: "home", flash: null });
      },
    }),
    {
      name: "bank-table-v1",
      version: 1,
      partialize: (s) => ({
        screen: s.screen === "play" && s.game ? "play" : s.screen === "play" ? "home" : s.screen,
        game: s.game,
        pastGames: s.pastGames,
        muted: s.muted,
        setupPlayers: s.setupPlayers,
        setupRounds: s.setupRounds,
        setupDiceMode: s.setupDiceMode,
      }),
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<GameStore>;
        const game = saved.game
          ? { ...saved.game, phase: saved.game.phase === "banking" ? "playing" : saved.game.phase }
          : current.game;
        return { ...current, ...saved, game };
      },
    },
  ),
);
