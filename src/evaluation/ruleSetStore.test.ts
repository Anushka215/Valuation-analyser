// TEST-ONLY FAKE FIXTURES — not real bank guideline rules.
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadRuleSets } from "./ruleSetStore.js";

const FAKE_RULE_SET = {
  version: "test-v1",
  effective_from: "2024-01-01",
  rules: [
    {
      id: "FAKE-001",
      description: "Fake: valuation report must not be older than 90 days",
      severity: "HIGH",
      effective_from: "2024-01-01",
      field: "reportDate",
      check: "max_age_days",
      params: { maxDays: 90 },
      clause_ref: "FAKE-CLAUSE-1.1",
    },
  ],
};

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), "rules-store-test-"));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe("loadRuleSets", () => {
  it("loads and validates a single rule set object", () => {
    const filePath = join(tempDir, "rules.json");
    writeFileSync(filePath, JSON.stringify(FAKE_RULE_SET));

    const ruleSets = loadRuleSets(filePath);

    expect(ruleSets).toHaveLength(1);
    expect(ruleSets[0]?.version).toBe("test-v1");
  });

  it("loads and validates an array of rule sets", () => {
    const filePath = join(tempDir, "rules.json");
    const secondVersion = { ...FAKE_RULE_SET, version: "test-v2", effective_from: "2025-01-01" };
    writeFileSync(filePath, JSON.stringify([FAKE_RULE_SET, secondVersion]));

    const ruleSets = loadRuleSets(filePath);

    expect(ruleSets).toHaveLength(2);
    expect(ruleSets.map((r) => r.version)).toEqual(["test-v1", "test-v2"]);
  });

  it("throws a clear error when the file doesn't exist", () => {
    expect(() => loadRuleSets(join(tempDir, "missing.json"))).toThrow();
  });

  it("throws a clear error when the file isn't valid JSON", () => {
    const filePath = join(tempDir, "rules.json");
    writeFileSync(filePath, "{ not valid json");

    expect(() => loadRuleSets(filePath)).toThrow();
  });

  it("throws a clear error when a rule set fails schema validation", () => {
    const filePath = join(tempDir, "rules.json");
    const broken = { ...FAKE_RULE_SET, rules: [{ ...FAKE_RULE_SET.rules[0], check: "not_a_real_check" }] };
    writeFileSync(filePath, JSON.stringify(broken));

    expect(() => loadRuleSets(filePath)).toThrow(/invalid/);
  });
});
