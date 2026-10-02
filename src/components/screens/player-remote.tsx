import { Button } from "@/components/ui/button";
import { BooCue } from "@/components/boo-cue";
import { Countdown } from "@/components/countdown";
import { nextActivePlayerId, playerName, winners } from "@/lib/game/engine";
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
          Waiting for the host to start. You’ll tap BANK only while banking is open.
        </p>
        <p className="mt-8 text-sm tabular-nums text-faint">{snapshot.players.length} joined</p>
      </main>
    );
  }

  const banked = game.bankedThisRound.includes(snapshot.youId ?? "");
  const gain = snapshot.youId ? game.roundGains[snapshot.youId] : undefined;
  const score = snapshot.youId ? (game.scores[snapshot.youId] ?? 0) : 0;
  const place =
    1 + game.players.filter((p) => (game.scores[p.id] ?? 0) > score).length;
  const remaining = game.players.filter((p) => !game.bankedThisRound.includes(p.id)).length;
  const bankWindow = game.bankWindow ?? "closed";
  const youId = snapshot.youId ?? "";
  const isRolling = game.phase === "playing" && bankWindow === "closed" && game.currentPlayerId === youId;
  const nextRollerId =
    game.phase !== "playing"
      ? null
      : bankWindow === "open"
        ? game.currentPlayerId
        : nextActivePlayerId(game, game.currentPlayerId);
  const isNext = !isRolling && nextRollerId === youId;
  const canBank = bankWindow === "open" && game.bankTotal > 0 && !banked && !busy;
  const ranked = [...game.players].sort((a, b) => {
    const byScore = (game.scores[b.id] ?? 0) - (game.scores[a.id] ?? 0);
    if (byScore !== 0) return byScore;
    return a.name.localeCompare(b.name);
  });
  const champs = winners(game);

  return (
    <main className="mx-auto flex h-dvh w-full max-w-lg flex-col overflow-hidden px-5 pb-4 pt-6">
      <Countdown endsAt={game.countdownEndsAt} />
      <BooCue
        startedAt={game.booStartedAt}
        active={game.phase === "roundEnd" && game.roundEndReason === "seven"}
        name={playerName(game, game.lastRoll?.rollerId ?? game.lastRollerId ?? "")}
      />
      <header className="flex shrink-0 items-center justify-between">
        <button type="button" className="text-sm text-muted hover:text-fg" onClick={() => void leave()}>
          Leave
        </button>
        <p className="text-sm tabular-nums text-muted">
          Round {game.round}/{game.totalRounds}
        </p>
      </header>

      <p className="mt-4 shrink-0 text-center text-kicker font-medium uppercase tracking-[0.28em] text-muted">Bank</p>
      <p className="font-display text-bank shrink-0 text-center font-medium leading-none tabular-nums">
        {game.phase === "roundEnd" && game.roundEndReason === "seven" ? 0 : game.bankTotal}
      </p>
      <p className="mt-3 shrink-0 text-center text-sm text-muted">
        {me?.name} · <span className="tabular-nums text-fg">{score}</span>
        {gain ? <span className="text-safe"> · +{gain} this round</span> : null}
      </p>
      <div className="mt-4 grid shrink-0 grid-cols-2 gap-3">
        <div className="rounded-lg border border-border bg-surface px-3 py-3 text-center">
          <p className="font-display text-4xl font-medium leading-none tabular-nums">{place}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted">Place</p>
        </div>
        <div className="rounded-lg border border-border bg-surface px-3 py-3 text-center">
          <p className="font-display text-4xl font-medium leading-none tabular-nums">
            {game.phase === "playing" ? remaining : 0}
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted">Still in</p>
        </div>
      </div>
      <p className="mt-2 shrink-0 text-center text-xs uppercase tracking-[0.16em] text-faint">
        {game.phase === "playing"
          ? bankWindow === "open"
            ? "Banking is open"
            : "Dice are out"
          : game.phase === "gameOver"
            ? "Game over"
            : "Between rounds"}
      </p>

      {isRolling ? (
        <div className="mt-4 shrink-0 animate-[flash-in_0.25s_ease-out] rounded-xl border border-accent/50 bg-raised px-4 py-4 text-center">
          <p className="text-kicker font-medium uppercase tracking-[0.22em] text-accent">Your turn</p>
          <p className="font-display mt-1 text-3xl font-medium tracking-tight">Roll the dice</p>
        </div>
      ) : null}
      {isNext ? (
        <div className="mt-4 shrink-0 animate-[flash-in_0.25s_ease-out] rounded-xl border border-border bg-surface px-4 py-3 text-center">
          <p className="text-kicker font-medium uppercase tracking-[0.22em] text-muted">You’re next</p>
          <p className="mt-1 text-sm text-muted">Get ready to roll</p>
        </div>
      ) : null}

      {game.phase === "playing" ? (
        <Button
          size="xl"
          className={cn(
            "mt-4 h-24 w-full shrink-0 rounded-xl text-2xl",
            !canBank &&
              "border border-border bg-faint! text-bg! opacity-100! shadow-none hover:bg-faint! disabled:bg-faint! disabled:text-bg! disabled:opacity-100!",
          )}
          disabled={!canBank}
          onClick={() => void bankSelf()}
        >
          {banked ? "You’re out this round" : "BANK"}
        </Button>
      ) : null}

      {game.phase === "gameOver" ? (
        <h2 className="font-display mt-4 shrink-0 text-center text-2xl font-medium">
          {champs.length > 1
            ? `${champs.map((p) => p.name).join(" & ")} tie`
            : `${champs[0]?.name} wins`}
        </h2>
      ) : null}

      {game.phase !== "playing" ? null : (
        <p className="mt-3 shrink-0 text-center text-sm text-muted">
          {banked
            ? "Your points are locked. Watch the pot until the next round."
            : bankWindow === "open"
              ? "Tap BANK to take the pot."
              : "You can’t bank while the dice are out."}
        </p>
      )}

      {error ? <p className="mt-2 shrink-0 text-center text-sm text-danger">{error}</p> : null}

      <h2 className="mt-4 shrink-0 text-kicker font-medium uppercase tracking-[0.18em] text-muted">
        Leaderboard
      </h2>
      <ol className="mt-2 min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-lg border border-border">
        {ranked.map((p, i) => (
          <li
            key={p.id}
            className={cn(
              "flex items-baseline justify-between gap-3 border-t border-border px-3 py-2.5 first:border-t-0",
              p.id === snapshot.youId && "bg-raised",
            )}
          >
            <span className="min-w-0 truncate">
              <span className="mr-3 tabular-nums text-faint">{i + 1}</span>
              {p.name}
            </span>
            <span className="shrink-0 text-right">
              <span className="font-display text-xl tabular-nums">{game.scores[p.id] ?? 0}</span>
              {game.roundGains[p.id] ? (
                <span className="ml-2 text-xs tabular-nums text-safe">+{game.roundGains[p.id]}</span>
              ) : null}
            </span>
          </li>
        ))}
      </ol>
    </main>
  );
}
