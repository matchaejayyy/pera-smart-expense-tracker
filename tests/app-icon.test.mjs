import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pngSize = (buffer) => ({
  width: buffer.readUInt32BE(16),
  height: buffer.readUInt32BE(20),
  colorType: buffer[25],
});

test("uses crisp opaque app icons for Apple and installed PWA surfaces", async () => {
  const [apple, small, large, source, layout, manifest, serviceWorker] = await Promise.all([
    readFile(new URL("../public/pera-icon-180.png", import.meta.url)),
    readFile(new URL("../public/pera-icon-192.png", import.meta.url)),
    readFile(new URL("../public/pera-icon-512.png", import.meta.url)),
    readFile(new URL("../public/pera-icon-1024.png", import.meta.url)),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/manifest.ts", import.meta.url), "utf8"),
    readFile(new URL("../public/sw.js", import.meta.url), "utf8"),
  ]);

  for (const [buffer, expected] of [
    [apple, 180],
    [small, 192],
    [large, 512],
    [source, 1024],
  ]) {
    assert.deepEqual(pngSize(buffer), { width: expected, height: expected, colorType: 2 });
  }

  assert.match(layout, /apple: "\/pera-icon-180\.png"/);
  assert.match(manifest, /pera-icon-1024\.png/);
  assert.match(serviceWorker, /CACHE_NAME = "pera-shell-v2"/);
  assert.match(serviceWorker, /pera-icon-180\.png/);
  assert.doesNotMatch(serviceWorker, /pera-icon\.svg/);
});
