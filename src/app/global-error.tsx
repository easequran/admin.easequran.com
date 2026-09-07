"use client";

import { useEffect } from "react";

/**
 * Catches errors thrown by the root layout itself. It replaces the whole
 * document, so it can't rely on the app's CSS or components -- inline styles
 * only, kept close to the brand palette.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global (root layout) error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, sans-serif", background: "#eef1f8" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div
            style={{
              maxWidth: 380,
              width: "100%",
              background: "#fff",
              border: "1px solid #d6ddec",
              borderRadius: 16,
              padding: 32,
              textAlign: "center",
              boxShadow: "0 1px 3px rgba(6,13,34,0.08)",
            }}
          >
            <h1 style={{ fontSize: 20, fontWeight: 600, color: "#060d22", margin: 0 }}>
              Ease Quran is temporarily unavailable
            </h1>
            <p style={{ fontSize: 14, color: "#64748b", marginTop: 8 }}>
              An unexpected error occurred. Please try again in a moment.
            </p>
            {error.digest && (
              <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 8 }}>Reference: {error.digest}</p>
            )}
            <button
              type="button"
              onClick={reset}
              style={{
                marginTop: 24,
                background: "#122259",
                color: "#fff",
                border: 0,
                borderRadius: 8,
                padding: "8px 16px",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
