/**
 * iOS app only: haptics driven by game state, without editing Grok's stores.
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

let installed = false;

/**
 * Called once from the app build's root route (scripts/cap/app-mode-plugin.mjs).
 * An explicit call, not an import side effect: package.json declares
 * "sideEffects": false, so a bare `import "./native-hooks"` would be dropped.
 */
export function installNativeHooks(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  useGameStore.subscribe((state, prev) => onNewFlash(state.flash, prev.flash));
  useRoomStore.subscribe((state, prev) => onNewFlash(state.flash, prev.flash));
}
