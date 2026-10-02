/**
 * Share button next to the table code (host lobby). App-only file, kept across
 * Grok merges by scripts/merge-grok-latest.sh; see src/lib/native.ts.
 */
import { Share as ShareIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { shareTable, type ShareOutcome } from "@/lib/native";

const LABELS: Partial<Record<ShareOutcome, string>> = {
  copied: "Copied",
  failed: "Couldn’t share",
};

export function ShareTableButton({ code, className }: { code: string; className?: string }) {
  const [status, setStatus] = useState<ShareOutcome | null>(null);

  useEffect(() => {
    if (!status) return;
    const timer = window.setTimeout(() => setStatus(null), 2000);
    return () => window.clearTimeout(timer);
  }, [status]);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className}
      aria-label={`Share table code ${code}`}
      onClick={async () => setStatus(await shareTable(code))}
    >
      <ShareIcon className="size-4" aria-hidden />
      {(status && LABELS[status]) || "Share"}
    </Button>
  );
}
