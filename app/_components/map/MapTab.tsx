"use client";

import { lazy, Suspense } from "react";

const WalkMap = lazy(() => import("../walk-map/WalkMap"));

export default function MapTab() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen text-quest-muted text-sm">
          Loading map…
        </div>
      }
    >
      <WalkMap />
    </Suspense>
  );
}
