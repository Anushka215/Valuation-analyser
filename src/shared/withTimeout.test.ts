import { describe, expect, it } from "vitest";
import { withTimeout } from "./withTimeout.js";

function delay(ms: number): Promise<string> {
  return new Promise((resolve) => setTimeout(() => resolve("done"), ms));
}

describe("withTimeout", () => {
  it("resolves with the original value when the promise finishes in time", async () => {
    const result = await withTimeout(delay(10), 1000, "timed out");
    expect(result).toBe("done");
  });

  it("rejects with the timeout message when the promise takes too long", async () => {
    await expect(withTimeout(delay(500), 20, "timed out")).rejects.toThrow("timed out");
  });

  it("rejects with the original error when the promise fails before the timeout", async () => {
    const failingPromise = Promise.reject(new Error("boom"));
    await expect(withTimeout(failingPromise, 1000, "timed out")).rejects.toThrow("boom");
  });
});
