import { headers } from "next/headers";

/**
 * Resolves the absolute site origin for building email links (invites,
 * password resets). Prefers the actual incoming request host over
 * NEXT_PUBLIC_SITE_URL — that env var has repeatedly drifted out of sync
 * across environments (stuck on localhost after a domain change), which
 * silently breaks invite/reset links via a stale `redirectTo`. The request
 * host is always correct for whatever domain the admin is actually using.
 */
export async function getSiteUrl(): Promise<string> {
  try {
    const headerList = await headers();
    const forwardedHost = headerList.get("x-forwarded-host");
    const host = forwardedHost ?? headerList.get("host");
    if (host) {
      const protocol = headerList.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
      return `${protocol}://${host}`;
    }
  } catch {
    // headers() unavailable outside a request context (e.g. cron job)
  }
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";
}
