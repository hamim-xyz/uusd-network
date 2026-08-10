import React from "react";

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-white/10 rounded-xl ${className}`}
      aria-hidden
    />
  );
}
