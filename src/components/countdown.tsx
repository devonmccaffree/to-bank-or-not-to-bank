import { useEffect, useState } from "react";

export function Countdown({
  endsAt,
  full = false,
}: {
  endsAt?: number | null;
  full?: boolean;
}) {
  const [seconds, setSeconds] = useState<number | null>(null);

  useEffect(() => {
    if (!endsAt) {
      setSeconds(null);
      return;
    }
    const tick = () => {
      const left = endsAt - Date.now();
      const shown = Math.min(5, Math.ceil(left / 1000));
      setSeconds(left > 0 ? shown : null);
    };
    tick();
    const id = window.setInterval(tick, 100);
    return () => window.clearInterval(id);
  }, [endsAt]);

  if (seconds == null) return null;

  if (full) {
    const stamps = Array.from({ length: 24 }, (_, i) => i);
    return (
      <div className="fixed inset-0 z-[60] overflow-hidden bg-bg text-fg">
        <div
          className="absolute inset-0 grid grid-cols-2 content-evenly gap-x-4 gap-y-2 px-4 sm:grid-cols-4"
          aria-hidden="true"
        >
          {stamps.map((i) => (
            <p
              key={i}
              className="animate-[lock-breathe_2.8s_ease-in-out_infinite] text-center font-display text-[clamp(1.1rem,3.2vw,2.4rem)] font-medium uppercase leading-none tracking-[0.18em] text-accent"
              style={{ animationDelay: `${(i % 6) * 0.18}s` }}
            >
              Lock in
            </p>
          ))}
        </div>
        <div className="relative flex h-full flex-col items-center justify-center">
          <p className="text-kicker font-medium uppercase tracking-[0.28em] text-muted">Lock in</p>
          <p className="font-display mt-2 text-[28vh] font-medium leading-none tabular-nums text-fg">{seconds}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center">
      <p className="font-display rounded-full border border-border bg-surface px-7 py-2 text-5xl font-medium leading-none tabular-nums text-fg shadow-panel">
        {seconds}
      </p>
    </div>
  );
}
