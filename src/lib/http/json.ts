/** Small helpers for the API routes' JSON responses. */

/** Public CDN caching: Vercel's edge serves repeats without running the function. */
export function cached(body: unknown, seconds: number) {
  return Response.json(body, {
    headers: {
      "Cache-Control": `public, max-age=60, s-maxage=${seconds}, stale-while-revalidate=${seconds}`,
    },
  });
}

export function error(message: string, status: number) {
  return Response.json(
    { error: message },
    // Errors are cached briefly so a burst of bad requests doesn't hit Steam.
    { status, headers: { "Cache-Control": "public, max-age=30, s-maxage=30" } },
  );
}
