import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

const WORD = "BOOOOOOOOOOOOOO";
const INTRO_MS = 2000;
const COUNT_MS = 3000;
const SING_MS = 6000;

export function BooCue({
  startedAt,
  active,
  name,
}: {
  startedAt?: number | null;
  active: boolean;
  name: string;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active || !startedAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 50);
    return () => window.clearInterval(id);
  }, [active, startedAt]);

  if (!active || !startedAt) return null;
  const elapsed = Math.max(0, now - startedAt);
  if (elapsed >= INTRO_MS + COUNT_MS + SING_MS) return null;

  if (elapsed < INTRO_MS) {
    return (
      <FullScreen>
      <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-hidden bg-black px-6 text-center">
        <p
          className="relative font-display text-5xl font-medium tracking-tight text-white sm:text-7xl"
          style={{ WebkitTextStroke: "0.03em #000", paintOrder: "stroke fill" }}
        >
          {name} rolled a 7
        </p>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center animate-[lock-strobe_0.45s_steps(2,end)_infinite]"
        >
          <span className="absolute h-[145vh] w-3 -rotate-45 rounded-full bg-[#d01212] sm:w-4" />
          <span className="absolute h-[145vh] w-3 rotate-45 rounded-full bg-[#d01212] sm:w-4" />
        </div>
      </div>
      </FullScreen>
    );
  }

  if (elapsed < INTRO_MS + COUNT_MS) {
    const left = INTRO_MS + COUNT_MS - elapsed;
    const n = Math.min(3, Math.max(1, Math.ceil(left / 1000)));
    return (
      <FullScreen>
      <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black px-6 text-center text-white">
        <p className="font-display text-4xl font-medium tracking-tight sm:text-6xl">
          Everyone Boo {name} in…
        </p>
        <p
          className="font-display mt-6 text-[28vh] font-medium leading-none tabular-nums"
          style={{ WebkitTextStroke: "0.045em #000", paintOrder: "stroke fill" }}
        >
          {n}
        </p>
      </div>
      </FullScreen>
    );
  }

  const booElapsed = elapsed - INTRO_MS - COUNT_MS;
  const progress = Math.min(1, booElapsed / SING_MS);
  const showGhost = booElapsed >= 2000;
  return (
    <FullScreen>
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-4 bg-black px-3 text-white">
      <BooWord progress={progress} />
      {showGhost ? (
        <img
          src="/boo-ghost.png"
          alt=""
          className="h-36 w-auto animate-[ghost-dance_8s_linear_infinite] sm:h-44"
        />
      ) : (
        <div className="h-36 sm:h-44" />
      )}
    </div>
    </FullScreen>
  );
}

function FullScreen({ children }: { children: ReactNode }) {
  const [node, setNode] = useState<HTMLElement | null>(null);
  useEffect(() => setNode(document.body), []);
  if (!node) return null;
  return createPortal(children, node);
}

function BooWord({ progress }: { progress: number }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const [fontSize, setFontSize] = useState(32);

  useEffect(() => {
    const box = boxRef.current;
    const text = textRef.current;
    if (!box || !text) return;
    let cancelled = false;

    const fit = () => {
      if (cancelled) return;
      const available = box.clientWidth - 20;
      const probe = text.cloneNode(true) as HTMLElement;
      probe.style.position = "absolute";
      probe.style.visibility = "hidden";
      probe.style.fontSize = "100px";
      probe.style.width = "max-content";
      probe.style.maxWidth = "none";
      document.body.appendChild(probe);
      const widthAt100 = probe.scrollWidth;
      probe.remove();
      if (available < 40 || widthAt100 <= 0) return;
      setFontSize((available / widthAt100) * 96);
    };

    void document.fonts.ready.then(fit);
    fit();
    const frame = window.requestAnimationFrame(fit);
    window.addEventListener("resize", fit);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", fit);
    };
  }, []);

  return (
    <div ref={boxRef} className="w-full px-2">
      <p
        ref={textRef}
        className="relative mx-auto w-max whitespace-nowrap font-display font-medium leading-none text-white/35"
        style={{ fontSize, WebkitTextStroke: "0.03em #000", paintOrder: "stroke fill" }}
      >
        {WORD}
        <span
          className="absolute inset-y-0 left-0 overflow-hidden text-[#ffe14a]"
          style={{ width: `${progress * 100}%`, WebkitTextStroke: "0.03em #000", paintOrder: "stroke fill" }}
        >
          <span className="absolute top-0 left-0 whitespace-nowrap">{WORD}</span>
        </span>
      </p>
    </div>
  );
}

