import type { RoomResult } from "./room-types";

type Watcher = {
  token: string;
  send: (json: string) => void;
  lastVersion: number;
  sawError: boolean;
};

type Table = {
  watchers: Set<Watcher>;
  timer: ReturnType<typeof setTimeout> | null;
  running: boolean;
};

const tables = new Map<string, Table>();

function tableFor(code: string): Table {
  let table = tables.get(code);
  if (!table) {
    table = { watchers: new Set(), timer: null, running: false };
    tables.set(code, table);
  }
  return table;
}

function schedule(code: string, delay: number) {
  const table = tables.get(code);
  if (!table) return;
  if (table.timer) clearTimeout(table.timer);
  table.timer = setTimeout(() => void flush(code), delay);
}

async function flush(code: string) {
  const table = tables.get(code);
  if (!table) return;
  if (table.running) {
    schedule(code, 40);
    return;
  }
  table.running = true;
  table.timer = null;
  try {
    const tokens = [...new Set([...table.watchers].map((w) => w.token))];
    if (tokens.length > 0) {
      const { readRoomForTokens } = await import("./room.functions");
      const results = await readRoomForTokens(code, tokens);
      for (const watcher of table.watchers) {
        const result = results[watcher.token];
        if (!result) continue;
        if (!result.ok) {
          if (!watcher.sawError) {
            watcher.sawError = true;
            watcher.send(JSON.stringify(result));
          }
          continue;
        }
        watcher.sawError = false;
        if (watcher.lastVersion === result.snapshot.version) continue;
        watcher.lastVersion = result.snapshot.version;
        watcher.send(JSON.stringify(result));
      }
    }
  } catch {
    /* the next tick retries */
  } finally {
    const current = tables.get(code);
    if (current) {
      current.running = false;
      if (current.watchers.size > 0) schedule(code, 500);
    }
  }
}

/** Wake every socket on this server that is watching the table. */
export function pokeRoom(code: string) {
  if (!tables.has(code)) return;
  schedule(code, 0);
}

export function watchRoom(code: string, token: string, send: (json: string) => void) {
  const table = tableFor(code);
  const watcher: Watcher = { token, send, lastVersion: -1, sawError: false };
  table.watchers.add(watcher);
  schedule(code, 0);
  return () => {
    table.watchers.delete(watcher);
    if (table.watchers.size === 0) {
      if (table.timer) clearTimeout(table.timer);
      tables.delete(code);
    }
  };
}

export type { RoomResult };
