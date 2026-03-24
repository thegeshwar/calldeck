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
