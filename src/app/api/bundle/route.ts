/**
 * GET /api/bundle?appid=<appid>&defid=<theme item defid>
 *
 * The background, mini background, avatar frame and animated avatar inside
 * a Points Shop profile theme (which is really a bundle). Cached about a day.
 */
import { getBundle, SteamError } from "@/lib/steam/api";
import { cached, error } from "@/lib/http/json";

const ID = /^\d{1,10}$/;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const appid = params.get("appid") ?? "";
  const defid = params.get("defid") ?? "";
  if (!ID.test(appid) || !ID.test(defid) || Number(appid) <= 0) return error("Need a numeric appid and defid", 400);

  try {
    const items = await getBundle(Number(appid), Number(defid));
    if (!items) return error("That isn't a profile bundle", 404);
    return cached({ items }, 86_400);
  } catch (e) {
    if (e instanceof SteamError) return error(e.message, e.status);
    throw e;
  }
}
