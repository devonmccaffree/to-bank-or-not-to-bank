import { useEffect } from "react";
import { HistoryScreen } from "@/components/screens/history";
import { HomeScreen } from "@/components/screens/home";
import { HostLobby } from "@/components/screens/host-lobby";
import { HowToScreen } from "@/components/screens/how-to";
import { JoinTable } from "@/components/screens/join-table";
import { PlayerRemote } from "@/components/screens/player-remote";
import { PlayScreen } from "@/components/screens/play";
import { SetupScreen } from "@/components/screens/setup";
import { TableProvider, type TableApi } from "@/components/table-context";
import { useGameStore } from "@/lib/game/store";
import { useRoomStore } from "@/lib/game/room-store";

function ConnectedTable() {
  const snapshot = useRoomStore((s) => s.snapshot);
  const flash = useRoomStore((s) => s.flash);
  const roll = useRoomStore((s) => s.roll);
  const nextRoll = useRoomStore((s) => s.nextRoll);
  const startCountdown = useRoomStore((s) => s.startCountdown);
  const skip = useRoomStore((s) => s.skip);
  const undo = useRoomStore((s) => s.undo);
  const next = useRoomStore((s) => s.next);
  const bank = useRoomStore((s) => s.bank);
  const rematch = useRoomStore((s) => s.rematch);
  const backToLobby = useRoomStore((s) => s.backToLobby);
  const leave = useRoomStore((s) => s.leave);

  if (!snapshot?.game) return null;
  const api: TableApi = {
    code: snapshot.code,
    game: snapshot.game,
    flash,
    canUndo: snapshot.canUndo,
    enterRoll: (sum, doubles) => void roll(sum, doubles),
    nextRoll: () => void nextRoll(),
    startCountdown: () => void startCountdown(),
    skip: () => void skip(),
    undo: () => void undo(),
    next: () => void next(),
    bank: (playerId) => void bank(playerId),
    playAgain: () => void rematch(),
    backToLobby: () => void backToLobby(),
    leave: () => void leave(),
  };
  return (
    <TableProvider value={api}>
      <PlayScreen />
    </TableProvider>
  );
}

export function GameApp() {
  const screen = useGameStore((s) => s.screen);
  const game = useGameStore((s) => s.game);
  const hydrated = useGameStore((s) => s.hydrated);
  const setHydrated = useGameStore((s) => s.setHydrated);
  const mode = useRoomStore((s) => s.mode);
  const role = useRoomStore((s) => s.session?.role ?? null);
  const restore = useRoomStore((s) => s.restore);

  useEffect(() => {
    const finish = () => setHydrated();
    const unsub = useGameStore.persist.onFinishHydration(finish);
    if (useGameStore.persist.hasHydrated()) finish();
    return unsub;
  }, [setHydrated]);

  useEffect(() => {
    void restore();
  }, [restore]);

  if (!hydrated) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-5">
        <p className="text-kicker font-medium uppercase tracking-[0.22em] text-muted">
          Table dice game
        </p>
        <h1 className="font-display mt-3 text-display font-medium leading-[0.9] tracking-[-0.04em]">
          BANK
        </h1>
      </main>
    );
  }

  if (mode === "join") return <JoinTable />;
  if (mode === "lobby" && role === "host") return <HostLobby />;
  if (role === "player" && (mode === "lobby" || mode === "play")) return <PlayerRemote />;
  if (mode === "play" && role === "host") return <ConnectedTable />;

  if (screen === "setup") return <SetupScreen />;
  if (screen === "how") return <HowToScreen />;
  if (screen === "history") return <HistoryScreen />;
  if (screen === "play" && game) return <PlayScreen />;
  return <HomeScreen />;
}
