/**
 * iOS app only: haptics driven by game state (without editing Grok's stores),
 * plus two small workarounds for talking to the live server cross-origin
 * (server-fn response header shim, polling instead of the table WebSocket).
 *
 * Imported by the app build's root-route transform (scripts/cap/app-mode-plugin.mjs),
 * never by the web build. Listens for a new "bust" flash in both the
 * single-device store and the hosted-table store (host and players), so it
 * keeps working when Grok changes store.ts / room-store.ts internals.
 * App-only file, kept across Grok merges by scripts/merge-grok-latest.sh.
 */
import { useGameStore } from "@/lib/game/store";
import { useRoomStore } from "@/lib/game/room-store";
import { hapticBust } from "@/lib/native";
import type { Flash } from "@/lib/game/types";

function onNewFlash(next: Flash | null, prev: Flash | null) {
  if (next && next !== prev && next.kind === "bust") hapticBust();
}

/**
 * Cross-origin server-fn responses: TanStack's client only deserializes a
 * response when it can read the `x-tss-serialized` header, and browsers hide
 * non-safelisted headers from cross-origin callers unless the server sends
 * `Access-Control-Expose-Headers`. Until bankgame.grok.me exposes it, re-add
 * the header for JSON responses from the live server's /_serverFn/ endpoints
 * (every one of them is a serialized result or error). Becomes a no-op as soon
 * as the header is readable.
 */
function installServerFnHeaderShim() {
  const base = String(import.meta.env.VITE_API_BASE ?? "").replace(/\/$/, "");
  if (!base || typeof window.fetch !== "function") return;
  const prefix = `${base}/_serverFn/`;
  const original = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await original(input, init);
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (
      !url.startsWith(prefix) ||
      response.headers.has("x-tss-serialized") ||
      !(response.headers.get("content-type") ?? "").includes("application/json")
    ) {
      return response;
    }
    const headers = new Headers(response.headers);
    headers.set("x-tss-serialized", "true");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}

/**
 * Live table updates: from the app's origin (capacitor://localhost) the live
 * server accepts the /api/table-ws upgrade but never sends frames (the
 * website's same-origin socket works), so the room store would sit on a
 * silent socket. Hide WebSocket in the app so room-store.ts uses its built-in
 * fetchRoom polling (every 1.2 s) instead. Remove once the server's
 * table-ws path works cross-origin.
 */
function pollInsteadOfTableSocket() {
  if (!import.meta.env.VITE_API_BASE) return;
  try {
    (window as { WebSocket?: unknown }).WebSocket = undefined;
  } catch {
    /* leave it; the room store then relies on the socket */
  }
}

let installed = false;

/**
 * Called once from the app build's root route (scripts/cap/app-mode-plugin.mjs).
 * An explicit call, not an import side effect: package.json declares
 * "sideEffects": false, so a bare `import "./native-hooks"` would be dropped.
 */
export function installNativeHooks(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  installServerFnHeaderShim();
  pollInsteadOfTableSocket();
  useGameStore.subscribe((state, prev) => onNewFlash(state.flash, prev.flash));
  useRoomStore.subscribe((state, prev) => onNewFlash(state.flash, prev.flash));
}
