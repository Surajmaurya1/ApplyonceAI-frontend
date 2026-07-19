// ─────────────────────────────────────────────
//  ApplyOnce AI – AI Status Badge
// ─────────────────────────────────────────────
import React, { useEffect, useState } from "react";
import { Badge } from "./ui/badge.tsx";
import { Wifi, WifiOff } from "lucide-react";

export const StatusBadge: React.FC = () => {
  const [status, setStatus] = useState<"checking" | "ok" | "error">("checking");

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const apiUrl = (import.meta.env.VITE_API_URL as string) ?? "http://localhost:3001";
        const response = await fetch(`${apiUrl}/health`);
        if (response.ok) {
          setStatus("ok");
        } else {
          setStatus("error");
        }
      } catch (err) {
        setStatus("error");
      }
    };

    checkBackend();
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
        Backend Offline
      </Badge>
    );
  }

  return (
    <Badge variant="success" className="gap-1 text-xs">
      <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
      <Wifi className="w-3 h-3" />
      AI Ready (Backend)
    </Badge>
  );
};
