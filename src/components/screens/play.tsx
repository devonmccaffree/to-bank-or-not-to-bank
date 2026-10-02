import type { ReactNode } from "react";
import { useState } from "react";
import { BookOpen, Undo2, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BooCue } from "@/components/boo-cue";
import { Countdown } from "@/components/countdown";
import { DicePair } from "@/components/dice-pair";
import { SAFE_ROLLS } from "@/lib/game/types";
import { isAlwaysDoubles, nextActivePlayerId, playerName, winners } from "@/lib/game/engine";
import { playRoll } from "@/lib/game/sounds";
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
  const rollDigital = useGameStore((s) => s.rollDigital);
  const localDice = useGameStore((s) => s.dice);
  const localRolling = useGameStore((s) => s.rolling);
  const nextRollLocal = useGameStore((s) => s.nextRoll);
  const startCountdownLocal = useGameStore((s) => s.startCountdown);
  const pickBankerLocal = useGameStore((s) => s.pickBanker);
  const skipLocal = useGameStore((s) => s.skip);
  const undoLocal = useGameStore((s) => s.undoLast);
  const continueLocal = useGameStore((s) => s.continueRound);
  const playAgainLocal = useGameStore((s) => s.playAgain);
  const changePlayersLocal = useGameStore((s) => s.changePlayers);
  const abandonLocal = useGameStore((s) => s.abandonGame);
  const toggleMute = useGameStore((s) => s.toggleMute);
  const setScreen = useGameStore((s) => s.setScreen);
  const [tableDice, setTableDice] = useState<[number, number]>([1, 1]);
  const [tableRolling, setTableRolling] = useState(false);
  const [pendingBankId, setPendingBankId] = useState<string | null>(null);

  const game = table?.game ?? localGame;
  const flash = table ? table.flash : localFlash;
  const canUndo = table ? table.canUndo : undo.length > 0;
  const enterRoll = table ? table.enterRoll : enterRollLocal;
  const nextRoll = table ? table.nextRoll : nextRollLocal;
  const beginCountdown = table ? table.startCountdown : startCountdownLocal;
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
  const bankWindow = game.bankWindow ?? "closed";
  const upcomingId =
    game.phase === "playing"
      ? bankWindow === "open"
        ? game.currentPlayerId
        : nextActivePlayerId(game, game.currentPlayerId)
      : null;
  const upcoming = upcomingId ? playerName(game, upcomingId) : null;
  const canEnter = canAct && bankWindow === "closed";
  const virtual = game.diceMode === "digital";
  const dice = table ? tableDice : localDice;
  const spinning = table ? tableRolling : localRolling;
  const champs = winners(game);
  const ranked = [...game.players].sort(
    (a, b) => (game.scores[b.id] ?? 0) - (game.scores[a.id] ?? 0),
  );
  const pendingPlayer = game.players.find((p) => p.id === pendingBankId) ?? null;
  const confirmBank =
    pendingPlayer != null &&
    bankWindow === "open" &&
    game.bankTotal > 0 &&
    !game.bankedThisRound.includes(pendingPlayer.id);

  function throwVirtual() {
    if (!canEnter || spinning) return;
    if (!table) {
      rollDigital();
      return;
    }
    const d1 = 1 + Math.floor(Math.random() * 6);
    const d2 = 1 + Math.floor(Math.random() * 6);
    if (!muted) playRoll();
    setTableRolling(true);
    window.setTimeout(() => {
      setTableDice([d1, d2]);
      setTableRolling(false);
      enterRoll(d1 + d2, d1 === d2);
    }, 700);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-4 pb-8 pt-4 sm:px-6">
      <Countdown endsAt={game.countdownEndsAt} full />
      <BooCue
        startedAt={game.booStartedAt}
        active={game.phase === "roundEnd" && game.roundEndReason === "seven"}
        name={playerName(game, game.lastRoll?.rollerId ?? game.lastRollerId ?? "")}
      />
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

      <div className="mt-4 flex flex-1 flex-col gap-6">
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
            ) : null}
            <p className="text-sm text-muted">
              {bankWindow === "open"
                ? "Banking is open"
                : canAct
                  ? "Enter the roll. Players can’t bank."
                  : "\u00a0"}
            </p>
            {canAct && upcoming ? (
              <div className="mt-1 rounded-xl border border-border bg-surface px-5 py-3 text-center">
                <p className="text-kicker font-medium uppercase tracking-[0.18em] text-muted">
                  {bankWindow === "open" ? "Next to roll" : "Rolling now"}
                </p>
                <p className="font-display mt-1 text-3xl font-medium tracking-tight">
                  {bankWindow === "open" ? upcoming : roller}
                </p>
                {bankWindow === "closed" && upcoming !== roller ? (
                  <p className="mt-1 text-sm text-muted">Next · {upcoming}</p>
                ) : null}
              </div>
            ) : null}
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

        <aside className="order-3 rounded-xl border border-border bg-surface p-3 sm:p-4">
          <div className="flex items-baseline justify-between gap-3 px-1">
            <h2 className="text-kicker font-medium uppercase tracking-[0.18em] text-muted">
              Players
            </h2>
            <p className="text-xs text-faint">
              {bankWindow === "open" && game.bankTotal > 0
                ? "Tap a name to confirm a bank"
                : "Banking is closed"}
            </p>
          </div>
          <ol className="mt-2">
            {game.players.map((p) => {
              const banked = game.bankedThisRound.includes(p.id);
              const isTurn = p.id === game.currentPlayerId && game.phase === "playing";
              const gain = game.roundGains[p.id];
              const canTap = bankWindow === "open" && !banked && game.bankTotal > 0;
              return (
                <li key={p.id} className="border-t border-border first:border-t-0">
                  <button
                    type="button"
                    disabled={!canTap}
                    onClick={() => setPendingBankId(p.id)}
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

        <section className="order-2 flex flex-col">
          {virtual ? (
            <>
              <DicePair values={dice} rolling={spinning} />
              <p className="mt-3 text-center text-sm tabular-nums text-muted">
                {spinning ? "Rolling" : dice[0] + dice[1] > 2 || game.lastRoll ? `${dice[0] + dice[1]}` : "\u00a0"}
              </p>
              <Button
                size="lg"
                className="mt-4 w-full rounded-lg"
                disabled={!canEnter || spinning}
                onClick={throwVirtual}
              >
                Roll
              </Button>
              <p className="mt-2 text-center text-xs text-faint">
                {isSafe
                  ? "First three rolls add the number. Matching dice do not double yet."
                  : "Matching dice double the bank. A seven ends the round."}
              </p>
            </>
          ) : (
            <>
          <div className="grid grid-cols-3 gap-2">
            {PAD.map((n) => {
              const isSeven = n === 7;
              const always = isAlwaysDoubles(n);
              return (
                <Button
                  key={n}
                  variant="keypad"
                  size="keypad"
                  disabled={!canEnter}
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
              disabled={!canEnter || isSafe}
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
            </>
          )}

          {bankWindow === "open" ? (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button
                size="lg"
                variant="subtle"
                className="h-auto min-h-12 whitespace-normal rounded-lg px-2 text-center text-sm leading-tight"
                onClick={beginCountdown}
              >
                5 Second Countdown
              </Button>
              <Button size="lg" className="rounded-lg" onClick={nextRoll}>
                Next roll
              </Button>
            </div>
          ) : null}

          <Button
            size="lg"
            variant="subtle"
            className="mt-4 w-full rounded-lg"
            disabled={!canEnter}
            onClick={skip}
          >
            Skip {roller}
          </Button>
        </section>
      </div>

      {confirmBank && pendingPlayer ? (
        <Overlay>
          <p className="text-kicker font-medium uppercase tracking-[0.22em] text-muted">Confirm</p>
          <h2 className="font-display mt-2 text-3xl font-medium tracking-tight">
            Bank {pendingPlayer.name}?
          </h2>
          <p className="mt-3 text-sm text-muted">
            They take {game.bankTotal} and sit out the rest of this round.
          </p>
          <Button
            size="lg"
            className="mt-6 w-full rounded-lg"
            onClick={() => {
              const id = pendingPlayer.id;
              setPendingBankId(null);
              pickBanker(id);
            }}
          >
            Bank {pendingPlayer.name}
          </Button>
          <Button
            size="lg"
            variant="subtle"
            className="mt-2 w-full rounded-lg"
            onClick={() => setPendingBankId(null)}
          >
            Cancel
          </Button>
        </Overlay>
      ) : null}

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
