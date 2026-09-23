import { Button } from "@/components/ui/button";
import { SAFE_ROLLS } from "@/lib/game/types";
import { winners } from "@/lib/game/engine";
import { useRoomStore } from "@/lib/game/room-store";
import { cn } from "@/lib/utils";

export function PlayerRemote() {
  const snapshot = useRoomStore((s) => s.snapshot);
  const error = useRoomStore((s) => s.error);
  const busy = useRoomStore((s) => s.busy);
  const bankSelf = useRoomStore((s) => s.bankSelf);
  const leave = useRoomStore((s) => s.leave);

  if (!snapshot) return null;
  const game = snapshot.game;
  const me = snapshot.players.find((p) => p.id === snapshot.youId);
  const waiting = !game || snapshot.status === "lobby";

  if (waiting) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-10 pt-8">
        <button type="button" className="self-start text-sm text-muted hover:text-fg" onClick={() => void leave()}>
          Leave
        </button>
        <p className="mt-10 text-kicker font-medium uppercase tracking-[0.22em] text-muted">
          Code {snapshot.code}
        </p>
        <h1 className="font-display mt-3 text-title font-medium tracking-tight">
          {me?.name ?? "You’re in"}
        </h1>
        <p className="mt-3 text-sm text-muted">
          Waiting for the host to start. You’ll tap BANK on this phone once the dice are rolling.
        </p>
        <p className="mt-8 text-sm tabular-nums text-faint">{snapshot.players.length} joined</p>
      </main>
    );
  }

  const banked = game.bankedThisRound.includes(snapshot.youId ?? "");
  const gain = snapshot.youId ? game.roundGains[snapshot.youId] : undefined;
  const score = snapshot.youId ? (game.scores[snapshot.youId] ?? 0) : 0;
  const canBank = game.phase === "playing" && game.bankTotal > 0 && !banked && !busy;
  const isSafe = game.rollsThisRound < SAFE_ROLLS;
  const ranked = [...game.players].sort(
    (a, b) => (game.scores[b.id] ?? 0) - (game.scores[a.id] ?? 0),
  );
  const champs = winners(game);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-8 pt-6">
      <header className="flex items-center justify-between">
        <button type="button" className="text-sm text-muted hover:text-fg" onClick={() => void leave()}>
          Leave
        </button>
        <p className="text-sm tabular-nums text-muted">
          Round {game.round}/{game.totalRounds}
        </p>
      </header>

      <p className="mt-8 text-center text-kicker font-medium uppercase tracking-[0.28em] text-muted">Bank</p>
      <p className="font-display text-bank text-center font-medium leading-none tabular-nums">
        {game.phase === "roundEnd" && game.roundEndReason === "seven" ? 0 : game.bankTotal}
      </p>
      <p className="mt-3 text-center text-sm text-muted">
        {me?.name} · <span className="tabular-nums text-fg">{score}</span>
        {gain ? <span className="text-safe"> · +{gain} this round</span> : null}
      </p>
      <p className="mt-2 text-center text-xs uppercase tracking-[0.16em] text-faint">
        {game.phase === "playing" ? (isSafe ? "Safe rolls" : "A 7 busts") : game.phase === "gameOver" ? "Game over" : "Between rounds"}
      </p>

      {game.phase === "playing" ? (
        <Button
          size="xl"
          className={cn("mt-10 h-24 w-full rounded-xl text-2xl", !canBank && "opacity-40")}
          disabled={!canBank}
          onClick={() => void bankSelf()}
        >
          {banked ? "You’re out this round" : "BANK"}
        </Button>
      ) : null}

      {game.phase === "gameOver" ? (
        <h2 className="font-display mt-8 text-center text-2xl font-medium">
          {champs.length > 1
            ? `${champs.map((p) => p.name).join(" & ")} tie`
            : `${champs[0]?.name} wins`}
        </h2>
      ) : null}

      {game.phase !== "playing" ? (
        <ol className="mt-6 max-h-[50dvh] overflow-y-auto rounded-lg border border-border">
          {ranked.map((p, i) => (
            <li
              key={p.id}
              className={cn(
                "flex items-baseline justify-between border-t border-border px-3 py-2.5 first:border-t-0",
                p.id === snapshot.youId && "bg-raised",
              )}
            >
              <span className="truncate">
                <span className="mr-3 tabular-nums text-faint">{i + 1}</span>
                {p.name}
              </span>
              <span className="font-display text-xl tabular-nums">{game.scores[p.id] ?? 0}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-6 text-center text-sm text-muted">
          {banked
            ? "Your points are locked. Watch the pot until the next round."
            : "Tap BANK to take the pot before someone rolls a 7."}
        </p>
      )}

      {error ? <p className="mt-4 text-center text-sm text-danger">{error}</p> : null}
    </main>
  );
}
