"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global boundary error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-slate-50 p-4 font-sans text-slate-900">
        <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Critical Error Encountered</h2>
          <p className="text-xs text-slate-500">
            {error.message || "A critical error occurred. Please reload the application."}
          </p>
          <button
            onClick={() => reset()}
            className="rounded-md bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            Reload Platform
          </button>
        </div>
      </body>
    </html>
  );
}
