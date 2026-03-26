import { describe, it, expect } from "vitest";
import { addDays, getAutoFollowup, getQueuePriority } from "@/lib/queue-logic";
import type { Lead } from "@/lib/types";

describe("addDays", () => {
  // Use midday UTC so PST (UTC-8/UTC-7) conversion stays on the same calendar day
  it("adds positive days to a date", () => {
    const result = addDays(new Date("2026-01-10T12:00:00Z"), 5);
    expect(result).toBe("2026-01-15");
  });

  it("handles month rollover", () => {
    const result = addDays(new Date("2026-01-30T12:00:00Z"), 3);
    expect(result).toBe("2026-02-02");
  });

  it("handles year rollover", () => {
    const result = addDays(new Date("2025-12-30T12:00:00Z"), 5);
    expect(result).toBe("2026-01-04");
  });

  it("adds zero days", () => {
    const result = addDays(new Date("2026-03-25T12:00:00Z"), 0);
    expect(result).toBe("2026-03-25");
  });

  it("returns YYYY-MM-DD format", () => {
    const result = addDays(new Date("2026-06-01T12:00:00Z"), 1);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("getAutoFollowup", () => {
  it("no_answer: 2 days, no manual date", () => {
    const result = getAutoFollowup("no_answer");
    expect(result.days).toBe(2);
    expect(result.requiresManualDate).toBe(false);
  });

  it("voicemail: 3 days, no manual date", () => {
    const result = getAutoFollowup("voicemail");
    expect(result.days).toBe(3);
    expect(result.requiresManualDate).toBe(false);
  });

  it("gatekeeper: 1 day, no manual date", () => {
    const result = getAutoFollowup("gatekeeper");
    expect(result.days).toBe(1);
    expect(result.requiresManualDate).toBe(false);
  });

  it("callback_requested: requires manual date, sets contacted", () => {
    const result = getAutoFollowup("callback_requested");
    expect(result.days).toBeNull();
    expect(result.requiresManualDate).toBe(true);
    expect(result.autoStatus).toBe("contacted");
  });

  it("spoke_to_dm: requires manual date, sets contacted", () => {
    const result = getAutoFollowup("spoke_to_dm");
    expect(result.days).toBeNull();
    expect(result.requiresManualDate).toBe(true);
    expect(result.autoStatus).toBe("contacted");
  });

  it("interested: requires manual date, sets hot temperature", () => {
    const result = getAutoFollowup("interested");
    expect(result.days).toBeNull();
    expect(result.requiresManualDate).toBe(true);
    expect(result.autoStatus).toBe("interested");
    expect(result.autoTemperature).toBe("hot");
  });

  it("not_interested: 30 days, no manual date", () => {
    const result = getAutoFollowup("not_interested");
    expect(result.days).toBe(30);
    expect(result.requiresManualDate).toBe(false);
  });
});

describe("getQueuePriority", () => {
  const baseLead: Lead = {
    id: "1",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    company_name: "Test Co",
    industry: null,
    website: null,
    website_quality: null,
    phone: "555-0100",
    email: null,
    address: null,
    city: null,
    state: null,
    employee_count: null,
    revenue_estimate: null,
    source: null,
    import_id: null,
    status: "new",
    temperature: "cold",
    next_followup: null,
    followup_reason: null,
    interested_services: null,
    objections: null,
    notes: null,
    assigned_to: null,
    google_rating: null,
    google_reviews: null,
    google_categories: null,
    google_hours: null,
    google_maps_url: null,
    google_place_id: null,
    latitude: null,
    longitude: null,
    tech_stack: null,
    page_speed_score: null,
    seo_issues: null,
    is_mobile_responsive: null,
    is_chain: null,
    parent_company: null,
    hq_location: null,
    review_summary: null,
    competitors: null,
    research_data: null,
    research_brief: null,
    research_status: null,
    researched_at: null,
  };

  it("new leads get priority 4_000_000+", () => {
    const priority = getQueuePriority({ ...baseLead, status: "new" });
    expect(priority).toBeGreaterThanOrEqual(4_000_000);
    expect(priority).toBeLessThan(5_000_000);
  });

  it("leads with no special condition get priority 5_000_000", () => {
    const priority = getQueuePriority({ ...baseLead, status: "contacted", temperature: "cold" });
    expect(priority).toBe(5_000_000);
  });

  it("hot non-closed leads get priority 3_000_000", () => {
    const priority = getQueuePriority({
      ...baseLead,
      status: "contacted",
      temperature: "hot",
    });
    expect(priority).toBe(3_000_000);
  });

  it("overdue followups have highest priority (lowest number)", () => {
    const overdue = getQueuePriority({
      ...baseLead,
      next_followup: "2020-01-01",
    });
    const normal = getQueuePriority({ ...baseLead, status: "contacted" });
    expect(overdue).toBeLessThan(normal);
  });

  it("contacted lead with future followup goes to back of queue (priority 5)", () => {
    const contacted = getQueuePriority({
      ...baseLead,
      status: "contacted",
      temperature: "cold",
      next_followup: "2099-01-01", // far future
    });
    // Should be priority 5 (everything else), NOT priority 4 (new)
    expect(contacted).toBe(5_000_000);
  });

  it("new leads rank higher than contacted leads", () => {
    const newLead = getQueuePriority({ ...baseLead, status: "new" });
    const contacted = getQueuePriority({ ...baseLead, status: "contacted" });
    expect(newLead).toBeLessThan(contacted);
  });
});
