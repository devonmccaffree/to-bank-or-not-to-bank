/**
 * iOS app (Capacitor) extras: haptics and the native share sheet.
 *
 * App-only file, not part of the Grok export: `scripts/merge-grok-latest.sh`
 * keeps it when mirroring src/, and `patches/native-hooks.patch` re-adds the
 * one-line calls into Grok's files. Everything here is a safe no-op on the
 * web (and during SSR), so the hooks never change web behavior.
 */
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { Share } from "@capacitor/share";

/** Public site; `?join=CODE` pre-fills the join screen. */
const SITE_URL = (import.meta.env.VITE_API_BASE as string | undefined) || "https://bankgame.grok.me";

export type ShareOutcome = "shared" | "copied" | "cancelled" | "failed";

function isNative(): boolean {
  return typeof window !== "undefined" && Capacitor.isNativePlatform();
}

/** Medium impact when someone taps BANK. */
export function hapticBank(): void {
  if (!isNative()) return;
  void Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
}

/** Error notification when a seven busts the round. */
export function hapticBust(): void {
  if (!isNative()) return;
  void Haptics.notification({ type: NotificationType.Error }).catch(() => {});
}

export function joinUrl(code: string): string {
  return `${SITE_URL.replace(/\/+$/, "")}/?join=${encodeURIComponent(code)}`;
}

function isCancel(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err ?? "");
  return (err instanceof DOMException && err.name === "AbortError") || /cancel/i.test(message);
}

/** Native share sheet → Web Share API → clipboard. */
export async function shareTable(code: string): Promise<ShareOutcome> {
  if (typeof window === "undefined") return "failed";
  const text = `Join my BANK! table: ${code}`;
  const url = joinUrl(code);

  if (isNative()) {
    try {
      await Share.share({ title: "BANK!", text, url, dialogTitle: "Share table" });
      return "shared";
    } catch (err) {
      if (isCancel(err)) return "cancelled";
      // fall through to the web paths
    }
  }

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title: "BANK!", text, url });
      return "shared";
    } catch (err) {
      if (isCancel(err)) return "cancelled";
    }
  }

  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    return "copied";
  } catch {
    return "failed";
  }
}
