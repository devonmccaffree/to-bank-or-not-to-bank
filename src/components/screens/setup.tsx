import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MAX_PLAYERS, MIN_PLAYERS, type DiceMode, type RoundCount } from "@/lib/game/types";
import { useGameStore } from "@/lib/game/store";
import { cn } from "@/lib/utils";

const ROUND_OPTIONS: RoundCount[] = [10, 15, 20];

export function SetupScreen() {
  const setupPlayers = useGameStore((s) => s.setupPlayers);
  const setupRounds = useGameStore((s) => s.setupRounds);
  const setupDiceMode = useGameStore((s) => s.setupDiceMode);
  const setSetupPlayers = useGameStore((s) => s.setSetupPlayers);
  const setSetupRounds = useGameStore((s) => s.setSetupRounds);
  const setSetupDiceMode = useGameStore((s) => s.setSetupDiceMode);
  const setScreen = useGameStore((s) => s.setScreen);
  const startGame = useGameStore((s) => s.startGame);
  const [error, setError] = useState<string | null>(null);

  const named = setupPlayers.filter((n) => n.trim()).length;

  function updateName(index: number, value: string) {
    const next = [...setupPlayers];
    next[index] = value;
    setSetupPlayers(next);
  }

  function addPlayer() {
    if (setupPlayers.length >= MAX_PLAYERS) return;
    setSetupPlayers([...setupPlayers, ""]);
  }

  function removePlayer(index: number) {
    if (setupPlayers.length <= MIN_PLAYERS) {
      updateName(index, "");
      return;
    }
    setSetupPlayers(setupPlayers.filter((_, i) => i !== index));
  }

  function move(index: number, dir: -1 | 1) {
    const next = [...setupPlayers];
    const swap = index + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[index], next[swap]] = [next[swap], next[index]];
    setSetupPlayers(next);
  }

  function onStart() {
    const message = startGame();
    setError(message);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-10 pt-8">
      <header className="mb-8">
        <button
          type="button"
          className="text-sm text-muted hover:text-fg"
          onClick={() => setScreen("home")}
        >
          Back
        </button>
        <h1 className="font-display mt-3 text-title font-medium tracking-tight">Players</h1>
        <p className="mt-1 text-sm text-muted">
          Two to one hundred. The first name rolls first, then play goes down the list.
        </p>
      </header>

      <ol className="flex flex-col gap-2">
        {setupPlayers.map((name, index) => (
          <li key={index} className="flex items-center gap-2">
            <span className="w-6 text-center text-xs tabular-nums text-faint">{index + 1}</span>
            <Input
              value={name}
              onChange={(e) => updateName(index, e.target.value)}
              placeholder={`Player ${index + 1}`}
              maxLength={18}
              autoComplete="off"
              aria-label={`Player ${index + 1} name`}
            />
            <div className="flex shrink-0">
              <button
                type="button"
                className="rounded-sm p-2 text-muted hover:text-fg"
                onClick={() => move(index, -1)}
                aria-label="Move up"
              >
                <ChevronUp className="size-4" />
              </button>
              <button
                type="button"
                className="rounded-sm p-2 text-muted hover:text-fg"
                onClick={() => move(index, 1)}
                aria-label="Move down"
              >
                <ChevronDown className="size-4" />
              </button>
              <button
                type="button"
                className="rounded-sm p-2 text-muted hover:text-danger"
                onClick={() => removePlayer(index)}
                aria-label="Remove player"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </li>
        ))}
      </ol>

      <Button
        variant="outline"
        className="mt-3 rounded-lg"
        onClick={addPlayer}
        disabled={setupPlayers.length >= MAX_PLAYERS}
      >
        <Plus className="size-4" />
        Add player
      </Button>

      <section className="mt-8">
        <h2 className="text-kicker font-medium uppercase tracking-[0.18em] text-muted">Rounds</h2>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {ROUND_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setSetupRounds(n)}
              className={cn(
                "h-12 rounded-md border text-sm font-medium tabular-nums transition-colors duration-150",
                setupRounds === n
                  ? "border-accent bg-accent text-accent-fg"
                  : "border-border bg-raised text-fg hover:border-accent/40",
              )}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-faint">Most tables play 20.</p>
      </section>

      <section className="mt-8">
        <h2 className="text-kicker font-medium uppercase tracking-[0.18em] text-muted">Dice</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {(
            [
              ["physical", "Real dice"],
              ["digital", "Virtual dice"],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => setSetupDiceMode(mode as DiceMode)}
              className={cn(
                "h-12 rounded-md border text-sm font-medium transition-colors duration-150",
                setupDiceMode === mode
                  ? "border-accent bg-accent text-accent-fg"
                  : "border-border bg-raised text-fg hover:border-accent/40",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-faint">
          {setupDiceMode === "digital"
            ? "The screen rolls two dice for you."
            : "Roll real dice and enter each total."}
        </p>
      </section>

      {error ? <p className="mt-6 text-sm text-danger">{error}</p> : null}

      <Button size="xl" className="mt-8 w-full rounded-lg" onClick={onStart} disabled={named < MIN_PLAYERS}>
        Deal them in
      </Button>
    </main>
  );
}
