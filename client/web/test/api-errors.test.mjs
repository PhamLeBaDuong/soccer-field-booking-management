import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";

async function fixture(fetch, browser = {}) {
  const context = vm.createContext({ console, Headers, URLSearchParams, fetch,
    process: { env: { NEXT_PUBLIC_USE_MOCK: "true" } }, ...browser });
  const cache = new Map();
  const values = {
    "@/lib/constants": { API_BASE_URL: "http://localhost:5000", ROUTES: { login: "/login" } },
    "@/lib/auth/returnTo": { authDestination: (route, destination) => `${route}?next=${encodeURIComponent(destination)}` },
    "@/lib/api/normalizers": { normalizeField: value => value, normalizeComplex: value => value, normalizeBooking: value => value },
  };
  async function load(name) {
    if (cache.has(name)) return cache.get(name);
    if (values[name]) {
      const module = new vm.SyntheticModule(Object.keys(values[name]), function () {
        for (const [key, value] of Object.entries(values[name])) this.setExport(key, value);
      }, { context });
      cache.set(name, module);
      return module;
    }
    const filename = name.replace("@/lib/api/", "").replace("./", "");
    const source = await readFile(new URL(`../src/lib/api/${filename}.ts`, import.meta.url), "utf8");
    const code = ts.transpileModule(source, { compilerOptions: {
      module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022,
    } }).outputText;
    const module = new vm.SourceTextModule(code, { context });
    cache.set(name, module);
    await module.link(load);
    return module;
  }
  const apis = {};
  for (const name of ["client", "teams", "fields", "bookings", "lobbies", "matchPosts", "admin"]) {
    const module = await load(`@/lib/api/${name}`);
    await module.evaluate();
    apis[name] = module.namespace;
  }
  return apis;
}

test("API reads preserve network, authentication, permission, missing-route and server errors", async () => {
  for (const status of [0, 401, 403, 404, 500]) {
    const api = await fixture(async () => {
      if (!status) throw new TypeError("Failed to fetch");
      return new Response(JSON.stringify({ error: `Request failed (${status})` }), { status });
    });
    const calls = [
      () => api.teams.getMyTeams(), () => api.fields.getFields(),
      () => api.fields.getComplexes(), () => api.fields.getFieldsByComplexId("complex"),
      () => api.fields.getFieldById("field"), () => api.bookings.getUserBookings("user"),
      () => api.bookings.getBookingById("booking"),
      () => api.bookings.searchMatchingBookings({ teamSize: 5, startTime: "start", endTime: "end" }),
      () => api.lobbies.listLobbies(), () => api.lobbies.getMyLobbies(),
      () => api.matchPosts.listMatchPosts(), () => api.matchPosts.getMyMatchPosts(),
      () => api.admin.getAdminComplexes(), () => api.admin.getAdminFields(),
    ];
    for (const call of calls) {
      await assert.rejects(call(), error => error instanceof api.client.ApiFetchError && error.status === status);
    }
  }
});

test("booking and admin actions cannot report sample success when the API fails", async () => {
  const api = await fixture(async () => { throw new TypeError("Failed to fetch"); });
  for (const call of [
    () => api.bookings.cancelBooking("booking"),
    () => api.bookings.joinMatch("one", "two", "start", "end", "field"),
    () => api.admin.createComplex({ name: "Venue" }),
    () => api.admin.updateComplex("complex", { name: "Venue" }),
    () => api.admin.deleteComplex("complex"),
    () => api.admin.createField({ complexId: "complex", name: "Pitch" }),
    () => api.admin.updateField("field", { complexId: "complex", name: "Pitch" }),
    () => api.admin.deleteField("field"),
  ]) await assert.rejects(call(), error => error.status === 0);
});

test("unauthorized reads still clear the token and preserve the login return destination", async () => {
  const removed = [], redirects = [];
  const api = await fixture(async () => new Response(JSON.stringify({ error: "Expired token" }), { status: 401 }), {
    localStorage: { getItem: () => "expired", removeItem: key => removed.push(key) },
    window: { location: { pathname: "/matching", search: "?field=selected", assign: url => redirects.push(url) } },
  });
  await assert.rejects(api.teams.getMyTeams(), error => error.status === 401 && error.message === "Expired token");
  assert.deepEqual(removed, ["token"]);
  assert.deepEqual(redirects, ["/login?next=%2Fmatching%3Ffield%3Dselected"]);
});

test("teams and fields display the API response and send the saved login token", async () => {
  const paths = [];
  const api = await fixture(async (url, options) => {
    paths.push(url);
    assert.equal(options.headers.get("Authorization"), "Bearer saved-token");
    const data = url.endsWith("/mine")
      ? [{ id: "server-team", name: "My team", size: 5, leaderId: "leader", members: [] }]
      : [{ id: "server-field", name: "My pitch" }];
    return new Response(JSON.stringify(data), { status: 200 });
  }, {
    localStorage: { getItem: () => "saved-token" },
    window: {},
  });
  assert.equal((await api.teams.getMyTeams())[0].id, "server-team");
  assert.equal((await api.fields.getFields())[0].id, "server-field");
  assert.deepEqual(paths, ["http://localhost:5000/api/teams/mine", "http://localhost:5000/api/fields"]);
});
