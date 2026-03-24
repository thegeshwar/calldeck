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
