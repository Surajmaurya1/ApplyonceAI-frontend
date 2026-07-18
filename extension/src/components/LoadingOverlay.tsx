// ─────────────────────────────────────────────
//  ApplyOnce AI – Loading Overlay
// ─────────────────────────────────────────────
import React from "react";
import { motion } from "framer-motion";

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  message,
}) => {
  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm rounded-xl"
    >
      <div className="flex flex-col items-center gap-3">
        {/* Spinning ring */}
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
          <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
        {message && (
          <p className="text-xs text-primary font-medium">{message}</p>
        )}
      </div>
    </motion.div>
  );
};
