"use client";

import { useState } from "react";
import { useGame } from "@/hooks/use-game";
import { useToast } from "./toaster";
import { Button } from "@/components/ui/button";

export function NpcTickButton({ size = "sm" }: { size?: "sm" | "default" | "lg" }) {
  const { act } = useGame();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size={size}
      variant="outline"
      className="border-violet-300 text-violet-800 hover:bg-violet-50"
      disabled={busy}
      title="Fast-forward NPC needs by 3 minutes and let every NPC agent act now"
      onClick={async () => {
        setBusy(true);
        const res = await act<{ fastForwardMinutes: number }>("/api/npc-tick");
        setBusy(false);
        if (res) toast(`🤖 NPC agents acted (needs fast-forwarded ${res.fastForwardMinutes} min). Check the feed.`, "success");
      }}
    >
      🤖 Run NPC tick
    </Button>
  );
}
