import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("public pages cannot loop stale JWT claims back to the dashboard", async () => {
  const [proxy, home, login, dashboard] = await Promise.all([
    readFile(new URL("../lib/supabase/proxy.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/login/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/dashboard/page.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(proxy, /supabase\.auth\.getClaims\(\)/);
  assert.match(proxy, /!isAuthenticated && isProtectedPage/);
  assert.match(proxy, /!isAuthenticated && isProtectedApi/);
  assert.doesNotMatch(proxy, /isAuthenticated[\s\S]{0,180}pathname === "\/login"/);
  assert.doesNotMatch(proxy, /isAuthenticated[\s\S]{0,180}pathname === "\/"/);
  assert.match(home, /supabase\.auth\.getUser\(\)/);
  assert.match(login, /supabase\.auth\.getUser\(\)/);
  assert.match(dashboard, /supabase\.auth\.getUser\(\)/);
});
