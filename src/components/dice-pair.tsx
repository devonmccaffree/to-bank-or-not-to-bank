import { cn } from "@/lib/utils";

const PIP_MAP: Record<number, Array<[number, number]>> = {
  1: [[50, 50]],
  2: [
    [28, 28],
    [72, 72],
  ],
  3: [
    [28, 28],
    [50, 50],
    [72, 72],
  ],
  4: [
    [28, 28],
    [72, 28],
    [28, 72],
    [72, 72],
  ],
  5: [
    [28, 28],
    [72, 28],
    [50, 50],
    [28, 72],
    [72, 72],
  ],
  6: [
    [28, 24],
    [72, 24],
    [28, 50],
    [72, 50],
    [28, 76],
    [72, 76],
  ],
};

function DieFace({ value }: { value: number }) {
  const pips = PIP_MAP[value] ?? PIP_MAP[1];
  return (
    <svg viewBox="0 0 100 100" className="size-full" aria-hidden="true">
      <rect x="6" y="6" width="88" height="88" rx="18" fill="currentColor" className="text-fg" />
      {pips.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="8" className="fill-accent-fg" />
      ))}
    </svg>
  );
}

export function DicePair({
  values,
  rolling,
}: {
  values: [number, number];
  rolling: boolean;
}) {
  return (
    <div className="flex items-center justify-center gap-3" aria-hidden="true">
      {values.map((v, i) => (
        <div
          key={i}
          className={cn(
            "size-16 text-fg sm:size-20",
            rolling && "animate-[die-tumble_0.7s_ease-in-out]",
          )}
          style={{ animationDelay: i === 1 ? "40ms" : "0ms" }}
        >
          <DieFace value={rolling ? ((v + i + 2) % 6) + 1 : v} />
        </div>
      ))}
    </div>
  );
}
