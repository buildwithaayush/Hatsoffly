import tzlookup from "tz-lookup";

export type PlacePrediction = { place_id: string; description: string };

export type PlaceDetails = {
  name: string;
  formatted_address: string;
  latitude: number;
  longitude: number;
  primary_type: string | null;
  google_review_url: string | null;
  international_phone_number: string | null;
  utc_offset_minutes: number | null;
  timezone: string;
};

function mockPredictions(query: string): PlacePrediction[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2)
    return [
      {
        place_id: "mock_demo_1",
        description: "ABC Plumbing — Newark, NJ",
      },
    ];
  return [
    {
      place_id: `mock_${Buffer.from(q).toString("hex").slice(0, 24)}`,
      description: `${query.trim()} — Sample City, NJ`,
    },
    {
      place_id: "mock_demo_2",
      description: "Bright Smile Dental — Austin, TX",
    },
  ];
}

export async function autocompletePlaces(
  query: string,
  _sessionToken: string,
): Promise<PlacePrediction[]> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return mockPredictions(query);

  const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
  url.searchParams.set("input", query);
  url.searchParams.set("components", "country:us|country:ca");
  url.searchParams.set("sessiontoken", _sessionToken);
  url.searchParams.set("key", key);

  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!res.ok) throw new Error("places_autocomplete_http");
  const data = (await res.json()) as {
    predictions?: { place_id: string; description: string }[];
    status: string;
  };
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(`places_autocomplete_${data.status}`);
  }
  return (data.predictions ?? []).map((p) => ({
    place_id: p.place_id,
    description: p.description,
  }));
}

export async function placeDetails(placeId: string): Promise<PlaceDetails | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    const lat = 40.7359;
    const lng = -74.1724;
    const tz = safeTz(lat, lng);
    return {
      name: "Demo Business",
      formatted_address: "123 Main St, Newark, NJ 07102, USA",
      latitude: lat,
      longitude: lng,
      primary_type: "plumber",
      google_review_url: `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`,
      international_phone_number: "+19735550123",
      utc_offset_minutes: -240,
      timezone: tz,
    };
  }

  const fields = [
    "place_id",
    "name",
    "formatted_address",
    "address_component",
    "geometry",
    "type",
    "international_phone_number",
    "utc_offset_minutes",
    "business_status",
    "url",
  ].join(",");

  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", fields);
  url.searchParams.set("key", key);

  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!res.ok) throw new Error("places_details_http");
  const data = (await res.json()) as {
    status: string;
    result?: {
      name?: string;
      formatted_address?: string;
      geometry?: { location?: { lat: number; lng: number } };
      types?: string[];
      international_phone_number?: string;
      utc_offset_minutes?: number;
    };
  };

  if (data.status !== "OK" || !data.result) return null;

  const r = data.result;
  const lat = r.geometry?.location?.lat ?? 0;
  const lng = r.geometry?.location?.lng ?? 0;
  const primary = r.types?.[0] ?? null;
  const tz = safeTz(lat, lng);

  return {
    name: r.name ?? "Business",
    formatted_address: r.formatted_address ?? "",
    latitude: lat,
    longitude: lng,
    primary_type: primary,
    google_review_url: `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`,
    international_phone_number: r.international_phone_number ?? null,
    utc_offset_minutes: r.utc_offset_minutes ?? null,
    timezone: tz,
  };
}

function safeTz(lat: number, lng: number): string {
  try {
    return tzlookup(lat, lng);
  } catch {
    return "America/New_York";
  }
}
