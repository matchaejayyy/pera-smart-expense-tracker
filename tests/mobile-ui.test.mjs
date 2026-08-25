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
  assert.match(styles, /left: max\(20px, calc\(\(100% - 520px\) \/ 2\)\)/);
  assert.match(styles, /right: max\(20px, calc\(\(100% - 520px\) \/ 2\)\); bottom: 0;/);
  assert.match(styles, /width: auto; height: 64px/);
  assert.match(styles, /height: 64px/);
  assert.match(styles, /contain: paint; transform: none;/);
  assert.match(styles, /border-radius: 26px/);
  assert.match(styles, /@media \(display-mode: standalone\) and \(max-width: 720px\)/);
  assert.match(styles, /\.sidebar \{ bottom: 12px; -webkit-backdrop-filter: none; backdrop-filter: none; \}/);
  assert.match(styles, /\.topbar \{ isolation: isolate; z-index: 2; -webkit-transform: none !important; transform: none !important; \}/);
  assert.match(styles, /\.topbar-title \{ animation: none;/);
  assert.match(styles, /body::before, body::after \{ display: none; \}/);
  assert.match(styles, /\.topbar \.eyebrow \{ color: #666a60; font-size: 10px; font-weight: 900; \}/);
  assert.match(styles, /\.page-stage \{ animation: standalone-page-enter/);
  assert.match(styles, /\.sidebar \.nav-item svg, \.sidebar \.nav-item\.active svg \{ -webkit-transform: none; transform: none; filter: none;/);
  assert.match(styles, /@keyframes standalone-page-enter/);
  assert.match(styles, /-webkit-backdrop-filter: saturate\(180%\) blur\(22px\)/);
  assert.match(styles, /transition: left \.38s cubic-bezier/);
  assert.match(styles, /@keyframes mobile-page-enter/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
  assert.match(layout, /statusBarStyle: "default"/);
  assert.doesNotMatch(layout, /statusBarStyle: "black-translucent"/);
});
