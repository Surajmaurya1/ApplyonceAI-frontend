// ─────────────────────────────────────────────
//  ApplyOnce AI – AI Status Badge
// ─────────────────────────────────────────────
import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff } from "lucide-react";

export const StatusBadge: React.FC = () => {
  const [status, setStatus] = useState<"checking" | "ok" | "error">("checking");

  useEffect(() => {
    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
    if (!apiKey || apiKey === "YOUR_OPENROUTER_API_KEY_HERE") {
      setStatus("error");
    } else {
      setStatus("ok");
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
        API Key Missing
      </Badge>
    );
  }

  return (
    <Badge variant="success" className="gap-1 text-xs">
      <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
      <Wifi className="w-3 h-3" />
      OpenRouter Ready
    </Badge>
  );
};
