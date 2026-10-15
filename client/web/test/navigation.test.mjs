import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";
import { ROUTES } from "../src/lib/constants.ts";
import * as returnTo from "../src/lib/auth/returnTo.ts";

async function load(path, dependencies, globals = {}) {
  const context = vm.createContext(globals);
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const module = new vm.SourceTextModule(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText, { context });
  await module.link(name => {
    const exports = dependencies[name];
    assert.ok(exports, `Unexpected dependency: ${name}`);
    return new vm.SyntheticModule(Object.keys(exports), function () {
      for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
    }, { context });
  });
  await module.evaluate();
  return module.namespace;
}

const navigation = await load("../src/lib/navigation.ts", { "./constants": { ROUTES } });

test("booking and venue management have separate navigation with admin tools restricted by role", () => {
  const booking = navigation.sectionNavigation(false, true);
  assert.ok(booking.some(link => link.href === "/"));
  assert.ok(booking.some(link => link.href === "/bookings"));
  assert.ok(booking.every(link => !navigation.isManagementRoute(link.href)));
  const owner = navigation.sectionNavigation(true, false);
  assert.deepEqual(Array.from(owner, link => link.href), ["/admin"]);
  const admin = navigation.sectionNavigation(true, true);
  assert.ok(admin.some(link => link.href === "/admin/overview"));
  assert.ok(admin.some(link => link.href === "/admin/complexes"));
  assert.ok(admin.every(link => navigation.isManagementRoute(link.href)));
});

test("nested management routes keep the right section and only their own menu item active", () => {
  assert.equal(navigation.isManagementRoute("/admin/complexes/venue"), true);
  assert.equal(navigation.isManagementRoute("/administrator"), false);
  assert.equal(navigation.isNavigationActive("/admin/fields/field", "/admin"), false);
  assert.equal(navigation.isNavigationActive("/admin/fields/field", "/admin/fields"), true);
  assert.equal(navigation.isNavigationActive("/bookings/booking", "/bookings"), true);
});

test("management login returns to its requested route, and owners cannot enter platform admin tools", async () => {
  for (const user of [null, { role: "user" }, { role: "admin" }]) {
    const redirects = [];
    const hooks = await load("../src/lib/auth/hooks.ts", {
      react: { useContext: () => ({ user, loading: false }), useEffect: callback => callback() },
      "next/navigation": { useRouter: () => ({ replace: path => redirects.push(path) }) },
      "@/lib/auth/context": { AuthContext: {} },
      "@/lib/constants": { ROUTES },
      "@/lib/auth/returnTo": returnTo,
    }, { window: { location: { pathname: "/admin/complexes", search: "?date=2099-10-15" } } });
    assert.equal(hooks.useRequireAuth().authorized, !!user);
    if (!user) assert.equal(redirects[0], "/login?next=%2Fadmin%2Fcomplexes%3Fdate%3D2099-10-15");
    redirects.length = 0;
    assert.equal(hooks.useRequireAdmin().authorized, user?.role === "admin");
    if (user?.role === "user") assert.deepEqual(redirects, ["/admin"]);
    if (user?.role === "admin") assert.deepEqual(redirects, []);
  }
});
