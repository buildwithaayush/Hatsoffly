import { autocompletePlaces } from "@/lib/places";
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
  } catch {
    return jsonError("places_unavailable", "Business search is temporarily unavailable.", 503);
  }
}
