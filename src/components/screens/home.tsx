import { BookOpen, History, Play, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/lib/game/store";
import { useRoomStore } from "@/lib/game/room-store";

export function HomeScreen() {
  const setScreen = useGameStore((s) => s.setScreen);
  const game = useGameStore((s) => s.game);
  const hostTable = useRoomStore((s) => s.hostTable);
  const openJoin = useRoomStore((s) => s.openJoin);
  const busy = useRoomStore((s) => s.busy);
  const error = useRoomStore((s) => s.error);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-between px-5 pb-10 pt-16 sm:pt-24">
      <div>
        <p className="text-kicker font-medium uppercase tracking-[0.22em] text-muted">
          Table dice game
        </p>
        <h1 className="font-display mt-3 text-display font-medium leading-[0.9] tracking-[-0.04em]">
          BANK
        </h1>
        <p className="mt-6 max-w-sm text-lg leading-snug text-muted">
          One screen keeps score. Everyone else joins with a code and taps BANK from their phone.
        </p>
      </div>

      <div className="mt-12 flex flex-col gap-3">
        <Button size="xl" className="w-full rounded-lg" disabled={busy} onClick={() => void hostTable()}>
          <Play className="size-4" />
          Host a table
        </Button>
        <Button size="xl" variant="outline" className="w-full rounded-lg" onClick={openJoin}>
          <Smartphone className="size-4" />
          Join with a code
        </Button>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" size="lg" className="rounded-lg" onClick={() => setScreen("setup")}>
            This device only
          </Button>
          <Button variant="outline" size="lg" className="rounded-lg" onClick={() => setScreen("how")}>
            <BookOpen className="size-4" />
            Rules
          </Button>
        </div>
        <Button variant="ghost" className="text-muted" onClick={() => setScreen("history")}>
          <History className="size-4" />
          Past games
        </Button>
        {game && game.phase !== "gameOver" ? (
          <Button variant="ghost" className="text-muted" onClick={() => setScreen("play")}>
            Resume on this device
          </Button>
        ) : null}
      </div>
    </main>
  );
}
