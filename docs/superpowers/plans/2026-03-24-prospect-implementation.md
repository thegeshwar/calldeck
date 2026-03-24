# Prospect Page Implementation Plan

**Spec:** `/home/ubuntu/calldeck/docs/superpowers/specs/2026-03-24-prospect-page-design.md`

---

## Task 1: Database Migration + Dependencies

- [ ] Write migration SQL adding new columns to leads table (google_rating, google_reviews, google_categories, google_hours, google_maps_url, google_place_id, latitude, longitude)
- [ ] Run migration against local Supabase
- [ ] Install dependencies: `leaflet`, `react-leaflet`, `@types/leaflet`
- [ ] Add `GOOGLE_PLACES_API_KEY` to `.env.local` (placeholder)
- [ ] Update TypeScript types in `src/lib/types.ts` with new Lead fields
- [ ] Commit

## Task 2: Google Places API Route

- [ ] Create `src/app/api/prospect/search/route.ts`
- [ ] Implement Nearby Search → Place Details pipeline
- [ ] Implement duplicate detection (check DB for matching phone, company_name, or google_place_id)
- [ ] Return structured results with `isInDB` flag
- [ ] Create `src/lib/queries/prospect.ts` for DB dedup checks
- [ ] Commit

## Task 3: Prospect Server Action

- [ ] Create `src/lib/actions/prospect.ts` with `importProspects()` server action
- [ ] Map Google data to Lead fields, insert with source "Google Maps"
- [ ] Skip duplicates, return imported/skipped counts
- [ ] Revalidate paths
- [ ] Commit

## Task 4: Industry Data + Constants

- [ ] Create `src/lib/prospect-categories.ts` with industry dropdown options mapped to Google Places types
- [ ] Create radius options constant
- [ ] Commit

## Task 5: Map Component

- [ ] Create `src/components/prospect/prospect-map.tsx` (client component)
- [ ] Leaflet map with CartoDB Dark Matter tiles
- [ ] Custom green/amber teardrop markers
- [ ] Search radius circle overlay (dashed green)
- [ ] Center marker with glow
- [ ] Hover tooltip (name, phone, rating)
- [ ] Click pin → callback to scroll result into view
- [ ] Zoom controls styled to match Obsidian Wine
- [ ] Legend + location label overlays
- [ ] Handle Leaflet CSS import for Next.js
- [ ] Commit

## Task 6: Search Controls

- [ ] Create `src/components/prospect/search-bar.tsx` (client component)
- [ ] Location input with autocomplete (Google Places Autocomplete or simple text + geocode on search)
- [ ] Industry dropdown with predefined categories + custom keyword
- [ ] Radius dropdown
- [ ] Search button triggers API call
- [ ] Loading state while searching
- [ ] Commit

## Task 7: Result Cards + Import

- [ ] Create `src/components/prospect/result-card.tsx`
- [ ] Rich card with all Google data fields
- [ ] Checkbox for selection (disabled + dimmed for duplicates)
- [ ] Rating color coding (green/amber/red)
- [ ] "No website" red indicator, "Low rating" opportunity badge
- [ ] Category pills, Maps link pill
- [ ] Create `src/components/prospect/results-panel.tsx`
- [ ] Sort chips (rating, reviews, distance)
- [ ] "Select all new" action
- [ ] Scrollable card list
- [ ] Bottom import bar with count + Import button
- [ ] Commit

## Task 8: Prospect Page Assembly

- [ ] Create `src/app/(dashboard)/prospect/page.tsx` (server component shell)
- [ ] Create `src/app/(dashboard)/prospect/prospect-client.tsx` (client component, manages state)
- [ ] Wire search → API → map + results
- [ ] Wire import → server action → refresh
- [ ] Add Topbar with stat badges (New count, In DB count)
- [ ] Commit

## Task 9: Sidebar + Navigation

- [ ] Add "Prospect" nav item to sidebar (Search icon, between Browse and Follow-ups)
- [ ] Commit

## Task 10: Test + Polish

- [ ] Add Google Places API key to .env.local
- [ ] Test full flow: search → map pins → select → import → verify in Browse Leads
- [ ] Verify duplicate detection works
- [ ] Visual review against mockup
- [ ] Push to GitHub, create + close issue
- [ ] Commit
