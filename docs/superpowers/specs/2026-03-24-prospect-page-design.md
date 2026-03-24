# Prospect Page — Lead Hydrator Design Spec

## Overview

A built-in prospecting page for CallDeck that lets operators discover local businesses using the Google Places API, view them on an interactive map, and bulk-import them as leads. Each operator runs their own searches — no territories, no shared state. Imported leads auto-assign to whoever imports them.

**URL:** `/prospect`
**Sidebar placement:** Workflow section, between Browse and Follow-ups, with `Search` Lucide icon
**Data source:** Google Places API (New) — $200/mo free credit covers ~11,700 Place Details or ~40,000 Nearby Search calls

## Layout

50/50 split: interactive dark-themed map (left) + scrollable rich result cards (right).

### Search Bar (top)

Three inputs + search button:
- **Location** — autocomplete dropdown powered by Google Places Autocomplete API. Type-ahead suggests cities/addresses.
- **Industry** — dropdown with predefined categories that map to Google Places types: Accountant, Auto Repair, Dentist, Electrician, Gym/Fitness, HVAC, Insurance, Landscaping, Lawyer, Plumber, Restaurant, Roofing, Salon/Spa, Veterinarian. Plus "Custom keyword..." option for free-text search.
- **Radius** — dropdown: 5 mi, 10 mi, 15 mi, 25 mi. Default 10 mi.
- **Search button** — green, Bold & Heavy style.

### Topbar Stats

Two stat badges:
- **New** (green) — count of results not already in CallDeck
- **In DB** (amber) — count of results already in CallDeck (matched by phone or company name)

### Map Panel (left, 50%)

Interactive map using **Leaflet.js** with **CartoDB Dark Matter** tile layer (free, dark-themed, matches Obsidian Wine).

- Shows search radius as a dashed green circle
- Center marker (green, glowing) at search location
- **Green teardrop pins** — new businesses (not in DB)
- **Amber teardrop pins** (dimmed) — businesses already in CallDeck
- **Hover tooltip** on each pin: business name, phone, rating
- Zoom controls (+/−) top-right
- Legend bottom-left: green dot = New, amber dot = In DB
- Location label bottom-right: "Austin, TX · 10mi"
- Clicking a pin scrolls the corresponding result card into view on the right

### Results Panel (right, 50%)

#### Sort Bar
Chips: Rating (default, descending), Reviews, Distance. "Select all new (N)" link on the right.

#### Rich Result Cards
Each card shows:
- **Company name** (bold) + **city, distance**
- **Rating** (star + number, color-coded: green ≥4.0, amber 3.0-3.9, red <3.0) + **review count**
- **Checkbox** (right side) for selecting to import
- **Phone** (green mono), **Website** (cyan, or red "No website"), **Hours** (green "Open" / red "Closed" / text schedule)
- **Category tags** (purple pills) from Google's business types
- **Maps link** (blue pill, opens Google Maps in new tab)
- **Low rating flag** — if rating < 3.0, show red pill "Low rating — opportunity"

#### Duplicate Handling
Businesses already in CallDeck (matched by phone OR company_name case-insensitive):
- Card has amber border, 45% opacity
- "IN DB" badge next to name
- No checkbox (can't re-import)

#### Bottom Import Bar
- "N selected · auto-assigned to you"
- **"Import N Leads"** button (green, Bold & Heavy, box-shadow depth)

## Data Pulled from Google Places API

Per business (single Place Details call):
- `name` → `company_name`
- `formatted_phone_number` → `phone`
- `website` → `website`
- `formatted_address` → `address`, parsed into `city`, `state`
- `rating` → stored in `google_rating` (new field)
- `user_ratings_total` → stored in `google_reviews` (new field)
- `types` → stored in `google_categories` (new field, text array)
- `opening_hours.weekday_text` → stored in `google_hours` (new field, text array)
- `url` → stored in `google_maps_url` (new field)
- `business_status` → skip if "CLOSED_PERMANENTLY"
- `geometry.location` → used for map pin placement, stored in `latitude`/`longitude` (new fields)

## Database Changes

Add columns to `leads` table:
```sql
ALTER TABLE leads ADD COLUMN google_rating NUMERIC(2,1);
ALTER TABLE leads ADD COLUMN google_reviews INT;
ALTER TABLE leads ADD COLUMN google_categories TEXT[];
ALTER TABLE leads ADD COLUMN google_hours TEXT[];
ALTER TABLE leads ADD COLUMN google_maps_url TEXT;
ALTER TABLE leads ADD COLUMN google_place_id TEXT;
ALTER TABLE leads ADD COLUMN latitude NUMERIC(10,7);
ALTER TABLE leads ADD COLUMN longitude NUMERIC(10,7);
```

Index on `google_place_id` for dedup:
```sql
CREATE INDEX idx_leads_google_place_id ON leads(google_place_id);
```

## API Route

`POST /api/prospect/search`

Request body:
```json
{
  "location": "Austin, TX",
  "keyword": "dentist",
  "radius": 16093,
  "lat": 30.2672,
  "lng": -97.7431
}
```

Flow:
1. Call Google Places Nearby Search with `location`, `radius`, `keyword`
2. For each result, call Place Details to get full data (phone, website, hours, etc.)
3. Check each against existing leads in DB (match by phone or company_name)
4. Return results with `isInDB` flag

Response:
```json
{
  "results": [
    {
      "place_id": "ChIJ...",
      "name": "Bright Dental Care",
      "phone": "(555) 100-1001",
      "website": "brightdentalcare.com",
      "address": "123 Main St, Austin, TX 78701",
      "city": "Austin",
      "state": "TX",
      "rating": 4.2,
      "reviews": 127,
      "categories": ["dentist", "cosmetic_dentistry"],
      "hours": ["Monday: 8:00 AM – 5:00 PM", ...],
      "maps_url": "https://maps.google.com/?cid=...",
      "lat": 30.2672,
      "lng": -97.7431,
      "isOpen": true,
      "isInDB": false
    }
  ],
  "total": 47,
  "newCount": 35,
  "existingCount": 12
}
```

## Import Flow

Server action `importProspects(prospects[])`:
1. For each selected prospect, insert into `leads` with:
   - All Google data mapped to fields
   - `source: "Google Maps"`
   - `status: "new"`, `temperature: "cold"`
   - `assigned_to: current user`
   - `google_place_id` for future dedup
2. Skip duplicates (by phone, company_name, or google_place_id)
3. Return `{ imported: N, skipped: N }`
4. Revalidate `/leads`, `/queue`, `/prospect`

## Environment Variables

```env
GOOGLE_PLACES_API_KEY=<key>
```

Server-side only (not NEXT_PUBLIC_). All API calls happen on the server.

## Tech Stack

- **Map:** Leaflet.js + react-leaflet (lightweight, free, dark tiles available)
- **Tiles:** CartoDB Dark Matter (`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`)
- **Autocomplete:** Google Places Autocomplete API (client-side, needs NEXT_PUBLIC key) OR server-side geocoding
- **API calls:** Server-side only via API route (keeps API key secure)

## Mockup Reference

Final approved mockup: `/home/ubuntu/calldeck/.superpowers/brainstorm/1188893-1774316917/prospect-full-v5.html`
