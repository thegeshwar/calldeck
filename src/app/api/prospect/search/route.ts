import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

interface NearbyResult {
  place_id: string;
  name: string;
  geometry: { location: { lat: number; lng: number } };
  rating?: number;
  user_ratings_total?: number;
  business_status?: string;
  types?: string[];
}

interface PlaceDetails {
  formatted_phone_number?: string;
  website?: string;
  formatted_address?: string;
  opening_hours?: {
    open_now?: boolean;
    weekday_text?: string[];
  };
  url?: string;
  address_components?: { long_name: string; types: string[] }[];
}

export async function POST(request: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json(
      { error: "Google Places API key not configured" },
      { status: 500 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { lat, lng, keyword, radius = 16093 } = body;

  if (!lat || !lng) {
    return NextResponse.json(
      { error: "Location coordinates required" },
      { status: 400 }
    );
  }

  // Step 1: Nearby Search (paginate to get up to 60 results)
  const baseUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=establishment${keyword ? `&keyword=${encodeURIComponent(keyword)}` : ""}&key=${API_KEY}`;

  const allPlaces: NearbyResult[] = [];
  let nextPageToken: string | null = null;
  let pageUrl = baseUrl;

  for (let page = 0; page < 3; page++) {
    if (page > 0 && nextPageToken) {
      // Google requires a short delay before using next_page_token
      await new Promise((r) => setTimeout(r, 2000));
      pageUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?pagetoken=${nextPageToken}&key=${API_KEY}`;
    } else if (page > 0) {
      break;
    }

    const nearbyRes = await fetch(pageUrl);
    const nearbyData = await nearbyRes.json();

    if (nearbyData.status !== "OK" && nearbyData.status !== "ZERO_RESULTS") {
      if (page === 0) {
        return NextResponse.json(
          { error: `Google API error: ${nearbyData.status}` },
          { status: 502 }
        );
      }
      break;
    }

    const pageResults = (nearbyData.results || []).filter(
      (p: NearbyResult) => p.business_status !== "CLOSED_PERMANENTLY"
    );
    allPlaces.push(...pageResults);

    nextPageToken = nearbyData.next_page_token || null;
    if (!nextPageToken) break;
  }

  const places = allPlaces;

  // Step 2: Get details for each place (batch)
  const results = await Promise.all(
    places.slice(0, 60).map(async (place) => {
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=formatted_phone_number,website,formatted_address,opening_hours,url,address_components&key=${API_KEY}`;

      let details: PlaceDetails = {};
      try {
        const detailsRes = await fetch(detailsUrl);
        const detailsData = await detailsRes.json();
        if (detailsData.status === "OK") {
          details = detailsData.result;
        }
      } catch {
        // Skip details if fetch fails
      }

      // Parse city/state from address components
      let city = "";
      let state = "";
      if (details.address_components) {
        for (const comp of details.address_components) {
          if (comp.types.includes("locality")) city = comp.long_name;
          if (comp.types.includes("administrative_area_level_1"))
            state = comp.long_name;
        }
      }

      // Clean up categories
      const categories = (place.types || []).filter(
        (t) =>
          !["point_of_interest", "establishment", "political"].includes(t)
      );

      return {
        place_id: place.place_id,
        name: place.name,
        phone: details.formatted_phone_number || null,
        website: details.website || null,
        address: details.formatted_address || "",
        city,
        state,
        rating: place.rating || null,
        reviews: place.user_ratings_total || null,
        categories,
        hours: details.opening_hours?.weekday_text || [],
        maps_url: details.url || `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
        isOpen: details.opening_hours?.open_now ?? null,
        isInDB: false,
      };
    })
  );

  // Step 3: Check duplicates against DB
  const phones = results
    .map((r) => r.phone)
    .filter(Boolean) as string[];
  const names = results.map((r) => r.name);
  const placeIds = results.map((r) => r.place_id);

  // Check by google_place_id
  const { data: existingByPlaceId } = await supabase
    .from("leads")
    .select("google_place_id")
    .in("google_place_id", placeIds);
  const existingPlaceIds = new Set(
    (existingByPlaceId || []).map((l) => l.google_place_id)
  );

  // Check by phone
  const { data: existingByPhone } = phones.length > 0
    ? await supabase.from("leads").select("phone").in("phone", phones)
    : { data: [] };
  const existingPhones = new Set(
    (existingByPhone || []).map((l) => l.phone)
  );

  // Check by company name
  const { data: existingByName } = await supabase
    .from("leads")
    .select("company_name");
  const existingNames = new Set(
    (existingByName || []).map((l) => l.company_name.toLowerCase())
  );

  // Mark duplicates
  for (const result of results) {
    if (
      existingPlaceIds.has(result.place_id) ||
      (result.phone && existingPhones.has(result.phone)) ||
      existingNames.has(result.name.toLowerCase())
    ) {
      result.isInDB = true;
    }
  }

  const newCount = results.filter((r) => !r.isInDB).length;
  const existingCount = results.filter((r) => r.isInDB).length;

  return NextResponse.json({
    results,
    total: results.length,
    newCount,
    existingCount,
  });
}
