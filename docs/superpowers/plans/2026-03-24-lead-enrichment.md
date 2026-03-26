# Lead Enrichment Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich imported leads with industry (from Google categories), website quality scores, and email addresses scraped from websites — achieving near-100% field hydration.

**Architecture:** Three independent enrichment modules exposed as API routes (`/api/enrich/*`), each callable per-lead or in bulk. A shared `enrichLead` server action orchestrates all three. Category→industry mapping is a pure lookup. Website scoring uses `fetch` + heuristics. Email extraction uses `fetch` + regex/pattern matching on website HTML.

**Tech Stack:** Next.js API routes, Supabase, Node `fetch` (built-in), `cheerio` for HTML parsing

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/lib/enrich/category-map.ts` | Google category → industry mapping dictionary |
| `src/lib/enrich/industry.ts` | Resolve industry from lead's google_categories |
| `src/lib/enrich/website-score.ts` | Fetch website and score 1-5 |
| `src/lib/enrich/email-scraper.ts` | Scrape email from website HTML |
| `src/lib/actions/enrich.ts` | Server actions: enrichLead, enrichAllLeads |
| `src/app/api/enrich/route.ts` | POST endpoint to trigger bulk enrichment |

---

### Task 1: Install cheerio

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install cheerio**

```bash
cd /home/ubuntu/calldeck && npm install cheerio
```

- [ ] **Step 2: Verify installation**

```bash
cd /home/ubuntu/calldeck && node -e "require('cheerio'); console.log('ok')"
```

Expected: `ok`

- [ ] **Step 3: Commit**

```bash
cd /home/ubuntu/calldeck && git add package.json package-lock.json && git commit -m "feat: add cheerio for HTML parsing"
```

---

### Task 2: Category → Industry Mapping

**Files:**
- Create: `src/lib/enrich/category-map.ts`
- Create: `src/lib/enrich/industry.ts`

- [ ] **Step 1: Create the category mapping dictionary**

Create `src/lib/enrich/category-map.ts`:

```typescript
// Maps Google Places category strings to CallDeck industry labels.
// Keys are lowercase Google category slugs (from places API `types` field).
// Values match INDUSTRIES labels from prospect-categories.ts.

export const CATEGORY_TO_INDUSTRY: Record<string, string> = {
  // Direct matches to INDUSTRIES labels in prospect-categories.ts
  accountant: "Accountant",
  accounting: "Accountant",
  auto_repair: "Auto Repair",
  car_repair: "Auto Repair",
  car_dealer: "Auto Repair",
  chiropractor: "Chiropractor",
  cleaning_service: "Cleaning Services",
  dentist: "Dentist",
  electrician: "Electrician",
  gym: "Gym / Fitness",
  hair_care: "Hair Salon",
  hair_salon: "Hair Salon",
  beauty_salon: "Hair Salon",
  hvac: "HVAC",
  insurance_agency: "Insurance",
  finance: "Insurance",
  landscaping: "Landscaping",
  lawyer: "Lawyer",
  law_firm: "Lawyer",
  pest_control: "Pest Control",
  pet_grooming: "Pet Grooming",
  plumber: "Plumber",
  real_estate_agency: "Real Estate",
  restaurant: "Restaurant",
  bakery: "Restaurant",
  bar: "Restaurant",
  cafe: "Restaurant",
  meal_takeaway: "Restaurant",
  food: "Restaurant",
  roofing_contractor: "Roofing",
  general_contractor: "Construction",
  spa: "Spa / Wellness",
  health: "Healthcare",
  doctor: "Healthcare",
  hospital: "Healthcare",
  physiotherapist: "Healthcare",
  veterinary_care: "Veterinarian",
  pet_store: "Pet Grooming",

  // Additional categories found in current data
  church: "Religious Organization",
  place_of_worship: "Religious Organization",
  funeral_home: "Funeral Services",
  cemetery: "Funeral Services",
  school: "Education",
  secondary_school: "Education",
  university: "Education",
  library: "Education",
  clothing_store: "Retail",
  department_store: "Retail",
  electronics_store: "Retail",
  furniture_store: "Retail",
  hardware_store: "Retail",
  home_goods_store: "Retail",
  shoe_store: "Retail",
  shopping_mall: "Retail",
  store: "Retail",
  grocery_or_supermarket: "Retail",
  supermarket: "Retail",
  lodging: "Hospitality",
  movie_theater: "Entertainment",
  courthouse: "Government",
  local_government_office: "Government",
  police: "Government",
};
```

- [ ] **Step 2: Create the industry resolver**

Create `src/lib/enrich/industry.ts`:

```typescript
import { CATEGORY_TO_INDUSTRY } from "./category-map";

/**
 * Resolves an industry label from an array of Google Places categories.
 * Returns the first matching industry, prioritizing more specific categories.
 * Returns null if no categories match.
 */
export function resolveIndustry(categories: string[] | null): string | null {
  if (!categories || categories.length === 0) return null;

  for (const cat of categories) {
    const industry = CATEGORY_TO_INDUSTRY[cat];
    if (industry) return industry;
  }

  return null;
}
```

- [ ] **Step 3: Verify mapping covers current data**

```bash
cd /home/ubuntu/calldeck && PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres -c "
SELECT DISTINCT unnest(google_categories) as cat FROM leads
WHERE google_categories IS NOT NULL
ORDER BY cat;" | while read cat; do
  echo "$cat"
done
```

Cross-check every category in the output appears in `CATEGORY_TO_INDUSTRY`. Add any missing ones.

- [ ] **Step 4: Commit**

```bash
cd /home/ubuntu/calldeck && git add src/lib/enrich/ && git commit -m "feat: add google category to industry mapping"
```

---

### Task 3: Website Quality Scorer

**Files:**
- Create: `src/lib/enrich/website-score.ts`

- [ ] **Step 1: Create the website scorer**

Create `src/lib/enrich/website-score.ts`:

```typescript
/**
 * Scores a website 1-5 based on quick heuristics.
 *
 * 1 = Broken / parked / unreachable
 * 2 = Loads but very basic (tiny page, no HTTPS, slow)
 * 3 = Functional (has content, loads OK)
 * 4 = Good (HTTPS, decent size, reasonable response time)
 * 5 = Great (HTTPS, fast, substantial content)
 */
export async function scoreWebsite(
  url: string
): Promise<{ score: number; reason: string }> {
  // Normalize URL
  let normalizedUrl = url.trim();
  if (
    !normalizedUrl.startsWith("http://") &&
    !normalizedUrl.startsWith("https://")
  ) {
    normalizedUrl = `https://${normalizedUrl}`;
  }

  // Skip obviously invalid URLs
  if (normalizedUrl.length < 10 || !normalizedUrl.includes(".")) {
    return { score: 1, reason: "Invalid URL" };
  }

  let score = 0;
  const reasons: string[] = [];

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const start = Date.now();
    const res = await fetch(normalizedUrl, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; CalldeckBot/1.0; +https://calldeck.app)",
      },
    });
    clearTimeout(timeout);
    const elapsed = Date.now() - start;

    if (!res.ok) {
      return { score: 1, reason: `HTTP ${res.status}` };
    }

    const html = await res.text();
    const finalUrl = res.url;

    // HTTPS check
    if (finalUrl.startsWith("https://")) {
      score += 1;
      reasons.push("HTTPS");
    }

    // Response time
    if (elapsed < 2000) {
      score += 1;
      reasons.push(`Fast (${elapsed}ms)`);
    } else if (elapsed < 5000) {
      score += 0.5;
      reasons.push(`Moderate (${elapsed}ms)`);
    } else {
      reasons.push(`Slow (${elapsed}ms)`);
    }

    // Content size (rough indicator of real content vs. parked page)
    const contentLength = html.length;
    if (contentLength > 50000) {
      score += 1.5;
      reasons.push("Substantial content");
    } else if (contentLength > 10000) {
      score += 1;
      reasons.push("Decent content");
    } else if (contentLength > 2000) {
      score += 0.5;
      reasons.push("Minimal content");
    } else {
      reasons.push("Very little content");
    }

    // Check for parked domain indicators
    const lowerHtml = html.toLowerCase();
    const parkedIndicators = [
      "domain is for sale",
      "buy this domain",
      "parked domain",
      "godaddy",
      "this page is under construction",
      "coming soon",
      "website coming soon",
    ];
    const isParked = parkedIndicators.some((p) => lowerHtml.includes(p));
    if (isParked) {
      return { score: 1, reason: "Parked/placeholder domain" };
    }

    // Viewport meta tag (mobile-friendly indicator)
    if (lowerHtml.includes('name="viewport"')) {
      score += 0.5;
      reasons.push("Mobile viewport");
    }

    // Clamp to 1-5
    const finalScore = Math.max(1, Math.min(5, Math.round(score)));
    return { score: finalScore, reason: reasons.join(", ") };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      return { score: 1, reason: "Timeout (>8s)" };
    }
    return { score: 1, reason: "Connection failed" };
  }
}
```

- [ ] **Step 2: Quick manual test**

```bash
cd /home/ubuntu/calldeck && npx tsx -e "
const { scoreWebsite } = require('./src/lib/enrich/website-score');
(async () => {
  console.log(await scoreWebsite('google.com'));
  console.log(await scoreWebsite('tyiytg'));
  console.log(await scoreWebsite('https://www.bestwestern.com'));
})();
"
```

Expected: google.com scores 4-5, tyiytg scores 1, bestwestern scores 3-5.

- [ ] **Step 3: Commit**

```bash
cd /home/ubuntu/calldeck && git add src/lib/enrich/website-score.ts && git commit -m "feat: add website quality scorer"
```

---

### Task 4: Email Scraper

**Files:**
- Create: `src/lib/enrich/email-scraper.ts`

- [ ] **Step 1: Create the email scraper**

Create `src/lib/enrich/email-scraper.ts`:

```typescript
import * as cheerio from "cheerio";

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Emails to skip (generic/useless)
const SKIP_PATTERNS = [
  /^(info|admin|support|noreply|no-reply|webmaster|postmaster|abuse)@/i,
  /@(example|test|localhost|sentry)\./i,
  /@.*\.(png|jpg|gif|svg|webp|css|js)$/i,
  /wixpress\.com/i,
  /wordpress\.(com|org)/i,
  /squarespace\.com/i,
  /godaddy/i,
];

function isUsefulEmail(email: string): boolean {
  return !SKIP_PATTERNS.some((p) => p.test(email));
}

/**
 * Scrapes a website for email addresses.
 * Fetches the homepage and optionally a /contact page.
 * Returns the best email found, or null.
 */
export async function scrapeEmail(
  url: string
): Promise<{ email: string | null; source: string | null }> {
  let normalizedUrl = url.trim();
  if (
    !normalizedUrl.startsWith("http://") &&
    !normalizedUrl.startsWith("https://")
  ) {
    normalizedUrl = `https://${normalizedUrl}`;
  }

  if (normalizedUrl.length < 10 || !normalizedUrl.includes(".")) {
    return { email: null, source: null };
  }

  const allEmails: { email: string; source: string }[] = [];

  // Fetch a page and extract emails
  async function extractFromPage(
    pageUrl: string,
    label: string
  ): Promise<void> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(pageUrl, {
        signal: controller.signal,
        redirect: "follow",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; CalldeckBot/1.0; +https://calldeck.app)",
        },
      });
      clearTimeout(timeout);

      if (!res.ok) return;

      const html = await res.text();
      const $ = cheerio.load(html);

      // 1. Check mailto: links first (highest quality)
      $('a[href^="mailto:"]').each((_, el) => {
        const href = $(el).attr("href") || "";
        const email = href.replace("mailto:", "").split("?")[0].trim();
        if (email && isUsefulEmail(email)) {
          allEmails.push({ email: email.toLowerCase(), source: label });
        }
      });

      // 2. Regex scan the visible text
      const text = $.text();
      const matches = text.match(EMAIL_REGEX) || [];
      for (const email of matches) {
        if (isUsefulEmail(email)) {
          allEmails.push({ email: email.toLowerCase(), source: label });
        }
      }
    } catch {
      // Skip failed pages
    }
  }

  // Try homepage
  await extractFromPage(normalizedUrl, "homepage");

  // Try /contact page if homepage didn't yield results
  if (allEmails.length === 0) {
    const base = new URL(normalizedUrl);
    await extractFromPage(`${base.origin}/contact`, "contact page");
    if (allEmails.length === 0) {
      await extractFromPage(`${base.origin}/contact-us`, "contact page");
    }
  }

  if (allEmails.length === 0) {
    return { email: null, source: null };
  }

  // Dedupe and pick the best one (prefer non-generic, from mailto)
  const seen = new Set<string>();
  const unique = allEmails.filter((e) => {
    if (seen.has(e.email)) return false;
    seen.add(e.email);
    return true;
  });

  // Prefer mailto-sourced, then shortest (likely most direct)
  const best =
    unique.find(
      (e) => e.source.includes("contact") || e.source.includes("mailto")
    ) || unique[0];

  return { email: best.email, source: best.source };
}
```

- [ ] **Step 2: Quick manual test**

```bash
cd /home/ubuntu/calldeck && npx tsx -e "
const { scrapeEmail } = require('./src/lib/enrich/email-scraper');
(async () => {
  console.log(await scrapeEmail('https://www.bestwestern.com'));
})();
"
```

- [ ] **Step 3: Commit**

```bash
cd /home/ubuntu/calldeck && git add src/lib/enrich/email-scraper.ts && git commit -m "feat: add email scraper for lead enrichment"
```

---

### Task 5: Enrichment Server Actions

**Files:**
- Create: `src/lib/actions/enrich.ts`

- [ ] **Step 1: Create the enrichment server actions**

Create `src/lib/actions/enrich.ts`:

```typescript
"use server";

import { createClient } from "@/lib/supabase/server";
import { resolveIndustry } from "@/lib/enrich/industry";
import { scoreWebsite } from "@/lib/enrich/website-score";
import { scrapeEmail } from "@/lib/enrich/email-scraper";
import { revalidatePath } from "next/cache";

interface EnrichResult {
  id: string;
  company_name: string;
  industry: string | null;
  website_quality: number | null;
  email: string | null;
  errors: string[];
}

/**
 * Enrich a single lead with industry, website quality, and email.
 * Only fills in fields that are currently null.
 */
export async function enrichLead(leadId: string): Promise<EnrichResult> {
  const supabase = await createClient();

  const { data: lead, error } = await supabase
    .from("leads")
    .select(
      "id, company_name, industry, website, website_quality, email, google_categories"
    )
    .eq("id", leadId)
    .single();

  if (error || !lead) {
    return {
      id: leadId,
      company_name: "Unknown",
      industry: null,
      website_quality: null,
      email: null,
      errors: ["Lead not found"],
    };
  }

  const updates: Record<string, unknown> = {};
  const errors: string[] = [];

  // 1. Industry from categories
  if (!lead.industry && lead.google_categories) {
    const industry = resolveIndustry(lead.google_categories);
    if (industry) {
      updates.industry = industry;
    }
  }

  // 2. Website quality score
  if (!lead.website_quality && lead.website) {
    try {
      const { score } = await scoreWebsite(lead.website);
      updates.website_quality = score;
    } catch (err) {
      errors.push(`Website score failed: ${err}`);
    }
  }

  // 3. Email scraping
  if (!lead.email && lead.website) {
    try {
      const { email } = await scrapeEmail(lead.website);
      if (email) {
        updates.email = email;
      }
    } catch (err) {
      errors.push(`Email scrape failed: ${err}`);
    }
  }

  // Apply updates
  if (Object.keys(updates).length > 0) {
    const { error: updateError } = await supabase
      .from("leads")
      .update(updates)
      .eq("id", leadId);

    if (updateError) {
      errors.push(`DB update failed: ${updateError.message}`);
    }
  }

  revalidatePath(`/leads/${leadId}`);

  return {
    id: lead.id,
    company_name: lead.company_name,
    industry: (updates.industry as string) || lead.industry,
    website_quality:
      (updates.website_quality as number) || lead.website_quality,
    email: (updates.email as string) || lead.email,
    errors,
  };
}

/**
 * Enrich all leads that have missing fields.
 * Returns a summary of what was enriched.
 */
export async function enrichAllLeads(): Promise<{
  total: number;
  enriched: number;
  results: EnrichResult[];
}> {
  const supabase = await createClient();

  // Get leads missing at least one enrichable field
  const { data: leads, error } = await supabase
    .from("leads")
    .select("id")
    .or(
      "industry.is.null,website_quality.is.null,email.is.null"
    )
    .order("created_at", { ascending: false });

  if (error || !leads) {
    return { total: 0, enriched: 0, results: [] };
  }

  const results: EnrichResult[] = [];
  let enriched = 0;

  for (const lead of leads) {
    const result = await enrichLead(lead.id);
    results.push(result);
    if (result.industry || result.website_quality || result.email) {
      enriched++;
    }
  }

  revalidatePath("/leads");
  revalidatePath("/queue");

  return { total: leads.length, enriched, results };
}
```

- [ ] **Step 2: Commit**

```bash
cd /home/ubuntu/calldeck && git add src/lib/actions/enrich.ts && git commit -m "feat: add enrichLead and enrichAllLeads server actions"
```

---

### Task 6: Bulk Enrichment API Route

**Files:**
- Create: `src/app/api/enrich/route.ts`

- [ ] **Step 1: Create the API route**

Create `src/app/api/enrich/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enrichAllLeads } from "@/lib/actions/enrich";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await enrichAllLeads();
  return NextResponse.json(result);
}
```

- [ ] **Step 2: Commit**

```bash
cd /home/ubuntu/calldeck && git add src/app/api/enrich/route.ts && git commit -m "feat: add bulk enrichment API route"
```

---

### Task 7: Auto-Enrich on Prospect Import

**Files:**
- Modify: `src/lib/actions/prospect.ts`

- [ ] **Step 1: Update importProspects to enrich after import**

In `src/lib/actions/prospect.ts`, add industry resolution at import time (the fast, free enrichment). After the `supabase.from("leads").insert(...)` block, add industry from categories:

Add import at top:
```typescript
import { resolveIndustry } from "@/lib/enrich/industry";
```

Then modify the insert object (line ~48) to include industry:

```typescript
const industry = resolveIndustry(p.categories);

const { error } = await supabase.from("leads").insert({
  company_name: p.name,
  phone: p.phone,
  website: p.website,
  address: p.address,
  city: p.city,
  state: p.state,
  industry,  // <-- NEW: auto-set industry from categories
  source: "Google Maps",
  status: "new",
  temperature: "cold",
  assigned_to: user?.id,
  google_rating: p.rating,
  google_reviews: p.reviews,
  google_categories: p.categories,
  google_hours: p.hours,
  google_maps_url: p.maps_url,
  google_place_id: p.place_id,
  latitude: p.lat,
  longitude: p.lng,
});
```

- [ ] **Step 2: Commit**

```bash
cd /home/ubuntu/calldeck && git add src/lib/actions/prospect.ts && git commit -m "feat: auto-resolve industry on prospect import"
```

---

### Task 8: Test Bulk Enrichment End-to-End

- [ ] **Step 1: Start dev server**

```bash
cd /home/ubuntu/calldeck && npm run dev -- -p 3002
```

- [ ] **Step 2: Run bulk enrichment via curl**

```bash
# Login first to get a session cookie, then hit the enrich endpoint
curl -X POST http://localhost:3002/api/enrich \
  -H "Content-Type: application/json" \
  -b "your-auth-cookie"
```

Or trigger via the app — call `enrichAllLeads()` from a button or the browser console.

- [ ] **Step 3: Verify hydration improved**

```bash
PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres -c "
SELECT count(*) as total,
  count(industry) as has_industry,
  count(website_quality) as has_website_quality,
  count(email) as has_email
FROM leads;
"
```

Expected: industry should be ~57/58 (from categories), website_quality ~55/58 (from websites), email varies.

- [ ] **Step 4: Commit any fixes**

```bash
cd /home/ubuntu/calldeck && git add -A && git commit -m "fix: enrichment pipeline adjustments"
```
