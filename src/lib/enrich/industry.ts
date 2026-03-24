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
