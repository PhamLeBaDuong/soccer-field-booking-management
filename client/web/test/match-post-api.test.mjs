import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";

async function apiFixture(fetch) {
  const context = vm.createContext({ console, URLSearchParams });
  const values = {
    "@/lib/api/client": { apiFetch: fetch },
    "@/lib/api/normalizers": { normalizeField: value => value },
    "./matches": { normalizeMatch: value => value },
  };
  const code = ts.transpileModule(await readFile(new URL("../src/lib/api/matchPosts.ts", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = new vm.SourceTextModule(code, { context });
  await module.link(specifier => new vm.SyntheticModule(Object.keys(values[specifier]), function () {
    for (const [key, value] of Object.entries(values[specifier])) this.setExport(key, value);
  }, { context }));
  await module.evaluate(); return module.namespace;
}

test("acceptance never turns an API error into a mock confirmation", async () => {
  const api = await apiFixture(async () => { throw new Error("API unavailable"); });
  await assert.rejects(api.acceptMatchPost("post", { acceptingTeamId: "opponent" }), /API unavailable/);
});
test("only a confirmed match for the selected request counts as acceptance", async () => {
  for (const value of [{ message: "Mock accepted" }, { id: "match", status: "open", matchPostId: "post" }, { id: "match", status: "confirmed", matchPostId: "another-post" }]) {
    const api = await apiFixture(async () => value);
    await assert.rejects(api.acceptMatchPost("post", { acceptingTeamId: "opponent" }), /did not confirm/);
  }
  const confirmed = { id: "match", status: "confirmed", matchPostId: "post" };
  const api = await apiFixture(async (path, options) => {
    assert.equal(path, "/api/match-posts/post/accept"); assert.equal(options.method, "POST"); return confirmed;
  });
  assert.equal(await api.acceptMatchPost("post", { acceptingTeamId: "opponent" }), confirmed);
});
