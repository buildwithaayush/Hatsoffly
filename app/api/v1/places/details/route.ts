import { jsonError, jsonOk } from "@/lib/api-envelope";
import { placeDetails, PlacesApiError } from "@/lib/places";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

/**
 * Returns Google Business / Maps-derived review URL for a Place ID
 * (`…/local/writereview?placeid=…`), same construction as signup place details.
 */
export async function GET(req: NextRequest) {
  const placeId = req.nextUrl.searchParams.get("place_id")?.trim() ?? "";
  const session = req.nextUrl.searchParams.get("session")?.trim();
  if (!placeId) {
    return jsonError("validation", "place_id is required.", 422);
  }

  try {
    const details = await placeDetails(placeId, session || undefined);
    if (!details) {
      return jsonError("places_not_found", "Could not load that place.", 404);
    }
    return jsonOk({
      place_id: placeId,
      name: details.name,
      formatted_address: details.formatted_address,
      google_review_url: details.google_review_url,
    });
  } catch (e) {
    if (e instanceof PlacesApiError) {
      const hint =
        e.googleMessage ??
        "Enable Places API + billing on Google Cloud and verify GOOGLE_MAPS_API_KEY.";
      return jsonError("places_unavailable", hint, 503);
    }
    return jsonError(
      "places_unavailable",
      "Place details are temporarily unavailable.",
      503,
    );
  }
}
