// ─────────────────────────────────────────────
//  ApplyOnce AI – AI Status Badge
// ─────────────────────────────────────────────
import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff } from "lucide-react";
import { ai } from "@/lib/ai";

export const StatusBadge: React.FC = () => {
  const [status, setStatus] = useState<"checking" | "ok" | "error">("checking");
  const [primaryProvider, setPrimaryProvider] = useState<string>("");

  useEffect(() => {
    const active = ai.getConfiguredProviders();
    if (active.length > 0) {
      setStatus("ok");
      setPrimaryProvider(active[0].name);
    } else {
      setStatus("error");
    }
  }, []);

  if (status === "checking") {
    return (
      <Badge variant="secondary" className="gap-1 text-xs">
        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-pulse" />
        Checking AI...
      </Badge>
    );
  }

  if (status === "error") {
    return (
      <Badge variant="destructive" className="gap-1 text-xs">
        <WifiOff className="w-3 h-3" />
        AI Key Missing
      </Badge>
    );
  }

  return (
    <Badge variant="success" className="gap-1 text-xs">
      <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
      <Wifi className="w-3 h-3" />
      AI Ready ({primaryProvider})
    </Badge>
  );
};
