import { Button } from "@/components/ui/button";
import { useGameStore } from "@/lib/game/store";

export function HistoryScreen() {
  const pastGames = useGameStore((s) => s.pastGames);
  const setScreen = useGameStore((s) => s.setScreen);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-12 pt-8">
      <button
        type="button"
        className="self-start text-sm text-muted hover:text-fg"
        onClick={() => setScreen("home")}
      >
        Back
      </button>
      <h1 className="font-display mt-3 text-title font-medium tracking-tight">Past games</h1>
      <p className="mt-2 text-sm text-muted">Kept on this device only.</p>

      {pastGames.length === 0 ? (
        <p className="mt-12 text-sm text-muted">No games yet. Finish a table and it will show up here.</p>
      ) : (
        <ul className="mt-8 space-y-3">
          {pastGames.map((g) => {
            const date = new Date(g.playedAt);
            return (
              <li key={g.id} className="rounded-lg border border-border bg-surface p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-medium">
                    {g.winnerNames.length > 1
                      ? `${g.winnerNames.join(" & ")} tied`
                      : `${g.winnerNames[0] ?? "—"} won`}
                  </p>
                  <p className="text-xs tabular-nums text-faint">
                    {date.toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {g.totalRounds}r
                  </p>
                </div>
                <ol className="mt-3 space-y-1">
                  {[...g.results]
                    .sort((a, b) => b.score - a.score)
                    .map((r) => (
                      <li
                        key={r.name + r.score}
                        className="flex justify-between text-sm text-muted"
                      >
                        <span>{r.name}</span>
                        <span className="tabular-nums text-fg">{r.score}</span>
                      </li>
                    ))}
                </ol>
              </li>
            );
          })}
        </ul>
      )}

      <Button variant="outline" className="mt-10 rounded-lg" onClick={() => setScreen("setup")}>
        Start a game
      </Button>
    </main>
  );
}
