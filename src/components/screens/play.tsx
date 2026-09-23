import type { ReactNode } from "react";
import { BookOpen, Undo2, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SAFE_ROLLS } from "@/lib/game/types";
import { isAlwaysDoubles, playerName, winners } from "@/lib/game/engine";
import { useGameStore } from "@/lib/game/store";
import { useTable } from "@/components/table-context";
import { cn } from "@/lib/utils";

const PAD = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

export function PlayScreen() {
  const table = useTable();
  const localGame = useGameStore((s) => s.game);
  const localFlash = useGameStore((s) => s.flash);
  const undo = useGameStore((s) => s.undo);
  const muted = useGameStore((s) => s.muted);
  const enterRollLocal = useGameStore((s) => s.enterRoll);
  const pickBankerLocal = useGameStore((s) => s.pickBanker);
  const skipLocal = useGameStore((s) => s.skip);
  const undoLocal = useGameStore((s) => s.undoLast);
  const continueLocal = useGameStore((s) => s.continueRound);
  const playAgainLocal = useGameStore((s) => s.playAgain);
  const changePlayersLocal = useGameStore((s) => s.changePlayers);
  const abandonLocal = useGameStore((s) => s.abandonGame);
  const toggleMute = useGameStore((s) => s.toggleMute);
  const setScreen = useGameStore((s) => s.setScreen);

  const game = table?.game ?? localGame;
  const flash = table ? table.flash : localFlash;
  const canUndo = table ? table.canUndo : undo.length > 0;
  const enterRoll = table ? table.enterRoll : enterRollLocal;
  const pickBanker = table ? table.bank : pickBankerLocal;
  const skip = table ? table.skip : skipLocal;
  const undoLast = table ? table.undo : undoLocal;
  const continueRound = table ? table.next : continueLocal;
  const playAgain = table ? table.playAgain : playAgainLocal;
  const changePlayers = table ? table.backToLobby : changePlayersLocal;
  const abandonGame = table ? table.leave : abandonLocal;

  if (!game) return null;

  const roller = playerName(game, game.currentPlayerId);
  const safeLeft = Math.max(0, SAFE_ROLLS - game.rollsThisRound);
  const isSafe = game.rollsThisRound < SAFE_ROLLS;
  const canAct = game.phase === "playing";
  const champs = winners(game);
  const ranked = [...game.players].sort(
    (a, b) => (game.scores[b.id] ?? 0) - (game.scores[a.id] ?? 0),
  );

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-4 pb-8 pt-4 sm:px-6">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="text-sm text-muted hover:text-fg"
            onClick={() => void abandonGame()}
          >
            Exit
          </button>
          {table ? (
            <span className="tabular-nums tracking-[0.16em] text-fg">{table.code}</span>
          ) : null}
          <span className="text-faint">/</span>
          <p className="text-sm tabular-nums text-muted">
            Round {game.round}
            <span className="text-faint">/{game.totalRounds}</span>
          </p>
        </div>
        <div className="flex items-center gap-1">
          {table ? null : (
            <button
              type="button"
              className="rounded-md p-2 text-muted hover:text-fg"
              onClick={() => setScreen("how")}
              aria-label="How to play"
            >
              <BookOpen className="size-4" />
            </button>
          )}
          <button
            type="button"
            className="rounded-md p-2 text-muted hover:text-fg"
            onClick={toggleMute}
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>
          <button
            type="button"
            className="rounded-md p-2 text-muted hover:text-fg disabled:opacity-30"
            onClick={undoLast}
            disabled={!canUndo}
            aria-label="Undo"
          >
            <Undo2 className="size-4" />
          </button>
        </div>
      </header>

      <div className="mt-4 grid flex-1 gap-6 lg:grid-cols-[minmax(0,1.2fr)_20rem] lg:items-start">
        <section className="flex flex-col">
          <p className="text-center text-kicker font-medium uppercase tracking-[0.28em] text-muted">
            Bank
          </p>
          <p
            key={game.bankTotal + (game.lastRoll?.display ?? "")}
            className={cn(
              "font-display text-bank text-center font-medium leading-none tracking-[-0.05em] tabular-nums",
              game.phase === "roundEnd" &&
                game.roundEndReason === "seven" &&
                "animate-[bust-shake_0.4s_ease-in-out] text-danger",
            )}
          >
            {game.phase === "roundEnd" && game.roundEndReason === "seven" ? 0 : game.bankTotal}
          </p>

          <div className="mt-4 flex flex-col items-center gap-2">
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.16em]",
                isSafe && game.phase !== "roundEnd"
                  ? "bg-safe/15 text-safe"
                  : "bg-danger/15 text-danger",
              )}
            >
              {game.phase === "roundEnd"
                ? game.roundEndReason === "seven"
                  ? "Busted"
                  : "All banked"
                : isSafe
                  ? `Safe · ${safeLeft} left`
                  : "Hot · a 7 busts"}
            </span>
            {flash ? (
              <p
                key={flash.text + flash.kind}
                className={cn(
                  "animate-[flash-in_0.25s_ease-out] text-sm",
                  flash.kind === "bust" && "text-danger",
                  flash.kind === "double" && "text-fg",
                  flash.kind === "bank" && "text-safe",
                  flash.kind === "safe" && "text-safe",
                  flash.kind === "add" && "text-muted",
                )}
              >
                {flash.text}
              </p>
            ) : (
              <p className="text-sm text-muted">
                {game.phase === "playing" ? `${roller} rolls` : "\u00a0"}
              </p>
            )}
          </div>

          {game.roundHistory.length > 0 ? (
            <ol className="mt-4 flex flex-wrap justify-center gap-1.5">
              {game.roundHistory.map((roll, i) => (
                <li
                  key={`${roll.display}-${i}`}
                  className={cn(
                    "rounded-full border border-border px-2.5 py-0.5 text-xs tabular-nums text-muted",
                    roll.busted && "border-danger/40 text-danger",
                    roll.doubled && "text-fg",
                  )}
                >
                  {roll.display}
                </li>
              ))}
            </ol>
          ) : null}
        </section>

        <aside className="rounded-xl border border-border bg-surface p-3 sm:p-4 lg:row-span-2 lg:sticky lg:top-4">
          <div className="flex items-baseline justify-between gap-3 px-1">
            <h2 className="text-kicker font-medium uppercase tracking-[0.18em] text-muted">
              Players
            </h2>
            <p className="text-xs text-faint">
              {canAct && game.bankTotal > 0 ? `Tap a name to bank ${game.bankTotal}` : "Tap a name to bank"}
            </p>
          </div>
          <ol className="mt-2 max-h-72 overflow-y-auto overscroll-contain lg:max-h-[calc(100dvh-7rem)]">
            {game.players.map((p) => {
              const banked = game.bankedThisRound.includes(p.id);
              const isTurn = p.id === game.currentPlayerId && game.phase === "playing";
              const gain = game.roundGains[p.id];
              const canTap = canAct && !banked && game.bankTotal > 0;
              return (
                <li key={p.id} className="border-t border-border first:border-t-0">
                  <button
                    type="button"
                    disabled={!canTap}
                    onClick={() => pickBanker(p.id)}
                    className={cn(
                      "flex min-h-12 w-full items-center justify-between gap-3 rounded-md px-2 py-2.5 text-left transition-colors duration-150",
                      canTap && "hover:bg-raised",
                      banked && "opacity-50",
                      !canTap && "cursor-default",
                    )}
                  >
                    <div className="min-w-0">
                      <p className={cn("truncate font-medium", isTurn && "text-accent")}>
                        {p.name}
                        {isTurn ? (
                          <span className="ml-2 text-kicker font-medium uppercase tracking-[0.14em] text-muted">
                            rolls
                          </span>
                        ) : null}
                      </p>
                      {gain ? (
                        <p className="text-xs tabular-nums text-safe">+{gain} this round</p>
                      ) : banked ? (
                        <p className="text-xs text-faint">Sat out</p>
                      ) : canTap ? (
                        <p className="text-xs text-muted">Bank {game.bankTotal}</p>
                      ) : null}
                    </div>
                    <p className="font-display text-xl tabular-nums">{game.scores[p.id] ?? 0}</p>
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>

        <section className="flex flex-col">
          <div className="grid grid-cols-3 gap-2">
            {PAD.map((n) => {
              const isSeven = n === 7;
              const always = isAlwaysDoubles(n);
              return (
                <Button
                  key={n}
                  variant="keypad"
                  size="keypad"
                  disabled={!canAct}
                  onClick={() => enterRoll(n, isAlwaysDoubles(n))}
                  className={cn(
                    "rounded-lg",
                    isSeven && "border-danger/50 text-danger hover:border-danger",
                    always && "border-accent/50",
                  )}
                >
                  {n}
                  {always ? (
                    <span className="block text-kicker font-medium uppercase tracking-wider text-faint">
                      doubles
                    </span>
                  ) : null}
                </Button>
              );
            })}
            <Button
              variant="keypad"
              size="keypad"
              disabled={!canAct || isSafe}
              onClick={() => enterRoll(2, true)}
              className="rounded-lg"
            >
              Doubles
            </Button>
          </div>
          <p className="mt-2 text-center text-xs text-faint">
            {isSafe
              ? "First three rolls add the number. Doubles does not double yet."
              : "A number adds that many. Doubles doubles the bank. 2 and 12 are doubles."}
          </p>

          <Button
            size="lg"
            variant="subtle"
            className="mt-4 w-full rounded-lg"
            disabled={!canAct}
            onClick={skip}
          >
            Skip {roller}
          </Button>
        </section>
      </div>

      {game.phase === "roundEnd" ? (
        <Overlay>
          <p className="text-kicker font-medium uppercase tracking-[0.22em] text-muted">
            Round {game.round} closed
            {game.roundEndReason === "seven" ? " · seven" : ""}
          </p>
          <h2 className="font-display mt-2 text-3xl font-medium tracking-tight">Leaderboard</h2>
          <ol className="mt-6 max-h-[50dvh] w-full overflow-y-auto">
            {ranked.map((p, i) => (
              <li
                key={p.id}
                className="flex items-baseline justify-between gap-3 border-t border-border py-2.5 first:border-t-0"
              >
                <span className="min-w-0 truncate">
                  <span className="mr-3 tabular-nums text-faint">{i + 1}</span>
                  {p.name}
                </span>
                <span className="shrink-0 text-right">
                  <span className="font-display text-2xl tabular-nums">{game.scores[p.id] ?? 0}</span>
                  {game.roundGains[p.id] ? (
                    <span className="ml-2 text-xs tabular-nums text-safe">+{game.roundGains[p.id]}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ol>
          <Button size="lg" className="mt-6 w-full rounded-lg" onClick={continueRound}>
            {game.round >= game.totalRounds ? "See results" : "Next round"}
          </Button>
        </Overlay>
      ) : null}

      {game.phase === "gameOver" ? (
        <Overlay>
          <p className="text-kicker font-medium uppercase tracking-[0.22em] text-muted">
            Final table
          </p>
          <h2 className="font-display mt-2 text-3xl font-medium tracking-tight">
            {champs.length > 1
              ? `${champs.map((p) => p.name).join(" & ")} tie`
              : `${champs[0]?.name} wins`}
          </h2>
          <ol className="mt-6 w-full space-y-2">
            {ranked.map((p, i) => (
              <li key={p.id} className="flex items-baseline justify-between gap-3">
                <span className="text-muted">
                  <span className="mr-3 tabular-nums text-faint">{i + 1}</span>
                  {p.name}
                </span>
                <span className="font-display text-2xl tabular-nums">{game.scores[p.id] ?? 0}</span>
              </li>
            ))}
          </ol>
          <div className="mt-8 grid w-full grid-cols-2 gap-2">
            <Button variant="outline" size="lg" className="rounded-lg" onClick={changePlayers}>
              Change table
            </Button>
            <Button size="lg" className="rounded-lg" onClick={playAgain}>
              Same players
            </Button>
          </div>
        </Overlay>
      ) : null}
    </main>
  );
}

function Overlay({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-bg/80 p-4 sm:items-center">
      <div className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-xl border border-border bg-surface p-6 shadow-panel">
        {children}
      </div>
    </div>
  );
}
