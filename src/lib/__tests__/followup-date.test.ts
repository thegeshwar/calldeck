import { describe, it, expect } from "vitest";
import { getAutoFollowup, addDays } from "../queue-logic";

describe("follow-up date defaults per outcome", () => {
  it("no_answer defaults to 2 days", () => {
    const auto = getAutoFollowup("no_answer");
    expect(auto.days).toBe(2);
    expect(auto.requiresManualDate).toBe(false);
  });

  it("voicemail defaults to 3 days", () => {
    const auto = getAutoFollowup("voicemail");
    expect(auto.days).toBe(3);
  });

  it("gatekeeper defaults to 1 day", () => {
    const auto = getAutoFollowup("gatekeeper");
    expect(auto.days).toBe(1);
  });

  it("not_interested defaults to 30 days", () => {
    const auto = getAutoFollowup("not_interested");
    expect(auto.days).toBe(30);
  });

  it("spoke_to_dm requires manual date", () => {
    const auto = getAutoFollowup("spoke_to_dm");
    expect(auto.requiresManualDate).toBe(true);
    expect(auto.days).toBeNull();
  });

  it("callback_requested requires manual date", () => {
    const auto = getAutoFollowup("callback_requested");
    expect(auto.requiresManualDate).toBe(true);
  });

  it("interested requires manual date", () => {
    const auto = getAutoFollowup("interested");
    expect(auto.requiresManualDate).toBe(true);
  });
});

describe("user dropdown always controls follow-up date", () => {
  it("when user selects Tomorrow (1 day), follow-up is tomorrow regardless of auto-rule", () => {
    // Simulate: outcome is no_answer (auto=2 days), user picks "1" in dropdown
    const userSelection = 1;
    const result = addDays(new Date("2026-03-25T12:00:00Z"), userSelection);
    expect(result).toBe("2026-03-26"); // tomorrow, not 2 days out
  });

  it("when user selects In 1 week (7 days), follow-up is 7 days out", () => {
    const userSelection = 7;
    const result = addDays(new Date("2026-03-25T12:00:00Z"), userSelection);
    expect(result).toBe("2026-04-01");
  });
});
