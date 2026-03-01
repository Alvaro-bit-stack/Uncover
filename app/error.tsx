"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-quest-dark text-white flex flex-col items-center justify-center px-6">
      <h1 className="text-quest-glow font-bold text-sm tracking-widest uppercase mb-3">
        Something went wrong
      </h1>
      <p className="text-quest-muted text-sm text-center mb-6 max-w-xs">
        {error.message || "A client-side error occurred. Check the browser console for details."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="px-5 py-2.5 rounded-lg bg-quest-accent text-white text-xs font-semibold tracking-widest uppercase hover:bg-quest-accent/85 transition-colors"
      >
        Try again
      </button>
      <a
        href="/"
        className="mt-4 text-quest-muted text-xs hover:text-white transition-colors"
      >
        Back to home
      </a>
    </div>
  );
}
