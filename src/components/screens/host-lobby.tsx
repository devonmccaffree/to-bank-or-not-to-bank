import { Button } from "@/components/ui/button";
import { useRoomStore } from "@/lib/game/room-store";
import type { RoundCount } from "@/lib/game/types";
import { cn } from "@/lib/utils";

const ROUNDS: RoundCount[] = [10, 15, 20];

export function HostLobby() {
  const snapshot = useRoomStore((s) => s.snapshot);
  const error = useRoomStore((s) => s.error);
  const busy = useRoomStore((s) => s.busy);
  const setRounds = useRoomStore((s) => s.setRounds);
  const start = useRoomStore((s) => s.start);
  const leave = useRoomStore((s) => s.leave);

  if (!snapshot) return null;
  const ready = snapshot.players.length >= 2;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-10 pt-8">
      <button type="button" className="self-start text-sm text-muted hover:text-fg" onClick={() => void leave()}>
        Close table
      </button>
      <p className="mt-6 text-kicker font-medium uppercase tracking-[0.22em] text-muted">Table code</p>
      <p className="font-display mt-2 text-display font-medium tracking-[0.18em] tabular-nums">
        {snapshot.code}
      </p>
      <p className="mt-3 max-w-sm text-sm text-muted">
        Everyone else opens this on their phone, taps Join, and enters the code. When the game
        starts they tap BANK themselves.
      </p>

      <section className="mt-8">
        <h2 className="text-kicker font-medium uppercase tracking-[0.18em] text-muted">Rounds</h2>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {ROUNDS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => void setRounds(n)}
              className={cn(
                "h-12 rounded-md border text-sm font-medium tabular-nums",
                snapshot.totalRounds === n
                  ? "border-accent bg-accent text-accent-fg"
                  : "border-border bg-raised text-fg",
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-kicker font-medium uppercase tracking-[0.18em] text-muted">
          Joined · {snapshot.players.length}
        </h2>
        {snapshot.players.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Waiting for the first phone.</p>
        ) : (
          <ol className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-border">
            {snapshot.players.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3 border-t border-border px-3 py-3 first:border-t-0">
                <span className="w-6 tabular-nums text-faint">{i + 1}</span>
                <span className="truncate">{p.name}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}

      <Button size="xl" className="mt-8 w-full rounded-lg" disabled={!ready || busy} onClick={() => void start()}>
        {ready ? "Start the game" : "Need 2 players"}
      </Button>
    </main>
  );
}
