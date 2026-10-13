import test from "node:test";
import assert from "node:assert/strict";
import { safeReturnTo, authDestination } from "../src/lib/auth/returnTo.ts";

test("invitation survives switching between login and registration", () => {
  const invitation = "/invite/" + "a".repeat(64);
  for (const route of ["/login", "/register"]) {
    const destination = new URL(authDestination(route, invitation), "https://pitchbook.invalid");
    assert.equal(safeReturnTo(destination.searchParams.get("next")), invitation);
  }
});
test("external and malformed auth return destinations are rejected", () => {
  for (const value of [null, "https://example.com", "//example.com", "/\\example.com", "/\nexample.com", "/login", "/register?next=/login"]) {
    assert.equal(safeReturnTo(value), "/dashboard");
  }
});
