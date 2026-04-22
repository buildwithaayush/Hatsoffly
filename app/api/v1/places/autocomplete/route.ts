import { autocompletePlaces, PlacesApiError } from "@/lib/places";
import { jsonError, jsonOk } from "@/lib/api-envelope";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const session = req.nextUrl.searchParams.get("session") ?? "default-session";
  if (q.trim().length < 1) {
    return jsonOk({ predictions: [] as { place_id: string; description: string }[] });
  }
  try {
    const predictions = await autocompletePlaces(q, session);
    return jsonOk({ predictions });
  } catch (e) {
    if (e instanceof PlacesApiError) {
      const hint =
        e.googleMessage ??
        "Enable Places API + billing on Google Cloud and verify GOOGLE_MAPS_API_KEY restrictions.";
      return jsonError("places_unavailable", hint, 503);
    }
    return jsonError("places_unavailable", "Business search is temporarily unavailable.", 503);
  }
}
