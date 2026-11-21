import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Server-side cache lifetimes for Steam data (used with `cacheLife()` in
  // src/lib/steam/api.ts). Times are in seconds.
  cacheLife: {
    // A profile: refresh in the background after 10 minutes.
    profile: { stale: 60, revalidate: 600, expire: 3600 },
    // Points Shop catalogue pages and vanity-name lookups: about a day.
    catalogue: { stale: 3600, revalidate: 86_400, expire: 7 * 86_400 },
  },
};

export default nextConfig;
