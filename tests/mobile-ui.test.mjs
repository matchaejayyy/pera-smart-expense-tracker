import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("mobile dashboard uses safe areas, glass navigation, and animated page changes", async () => {
  const [dashboard, styles, layout] = await Promise.all([
    readFile(new URL("../app/dashboard/dashboard-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(dashboard, /mobile-nav-indicator/);
  assert.match(dashboard, /"--active-index": activeNavIndex/);
  assert.match(dashboard, /className="page-stage" key=\{activePage\}/);
  assert.match(styles, /env\(safe-area-inset-top\)/);
  assert.match(styles, /width: min\(calc\(100% - 40px\), 520px\)/);
  assert.match(styles, /bottom: 8px/);
  assert.match(styles, /height: 64px/);
  assert.match(styles, /transform: translateX\(-50%\)/);
  assert.match(styles, /border-radius: 26px/);
  assert.match(styles, /-webkit-backdrop-filter: saturate\(180%\) blur\(22px\)/);
  assert.match(styles, /transition: left \.38s cubic-bezier/);
  assert.match(styles, /@keyframes mobile-page-enter/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
  assert.match(layout, /statusBarStyle: "default"/);
  assert.doesNotMatch(layout, /statusBarStyle: "black-translucent"/);
});
