import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

export async function GET(request: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json(
      { error: "Google Places API key not configured" },
      { status: 500 }
    );
  }

  const address = request.nextUrl.searchParams.get("address");
  if (!address) {
    return NextResponse.json(
      { error: "Address required" },
      { status: 400 }
    );
  }

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== "OK" || !data.results?.length) {
    return NextResponse.json(
      { error: "Location not found" },
      { status: 404 }
    );
  }

  const { lat, lng } = data.results[0].geometry.location;
  const formatted = data.results[0].formatted_address;

  return NextResponse.json({ lat, lng, formatted });
}
