import { createContext, useContext, type ReactNode } from "react";
import type { Flash, GameState } from "@/lib/game/types";

export type TableApi = {
  code: string;
  game: GameState;
  flash: Flash | null;
  canUndo: boolean;
  enterRoll: (sum: number, doubles: boolean) => void;
  nextRoll: () => void;
  startCountdown: () => void;
  skip: () => void;
  undo: () => void;
  next: () => void;
  bank: (playerId: string) => void;
  playAgain: () => void;
  backToLobby: () => void;
  leave: () => void;
};

const TableContext = createContext<TableApi | null>(null);

export function TableProvider({ value, children }: { value: TableApi; children: ReactNode }) {
  return <TableContext.Provider value={value}>{children}</TableContext.Provider>;
}

export function useTable() {
  return useContext(TableContext);
}
