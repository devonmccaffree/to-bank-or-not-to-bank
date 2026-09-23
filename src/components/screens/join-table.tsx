import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRoomStore } from "@/lib/game/room-store";

export function JoinTable() {
  const join = useRoomStore((s) => s.join);
  const leave = useRoomStore((s) => s.leave);
  const error = useRoomStore((s) => s.error);
  const busy = useRoomStore((s) => s.busy);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-10 pt-8">
      <button type="button" className="self-start text-sm text-muted hover:text-fg" onClick={() => void leave()}>
        Back
      </button>
      <h1 className="font-display mt-6 text-title font-medium tracking-tight">Join a table</h1>
      <p className="mt-2 text-sm text-muted">Enter the 4-digit code from the host’s screen.</p>

      <label className="mt-8 text-kicker font-medium uppercase tracking-[0.18em] text-muted" htmlFor="table-code">
        Code
      </label>
      <Input
        id="table-code"
        inputMode="numeric"
        autoComplete="off"
        maxLength={4}
        value={code}
        placeholder="0000"
        className="mt-2 text-center font-display text-3xl tracking-[0.3em] tabular-nums"
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
      />

      <label className="mt-6 text-kicker font-medium uppercase tracking-[0.18em] text-muted" htmlFor="table-name">
        Your name
      </label>
      <Input
        id="table-name"
        value={name}
        maxLength={18}
        autoComplete="off"
        placeholder="Name at the table"
        className="mt-2"
        onChange={(e) => setName(e.target.value)}
      />

      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}

      <Button
        size="xl"
        className="mt-8 w-full rounded-lg"
        disabled={busy || code.length !== 4 || name.trim().length === 0}
        onClick={() => void join(code, name)}
      >
        Join
      </Button>
    </main>
  );
}
