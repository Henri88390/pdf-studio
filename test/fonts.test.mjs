import { test } from "node:test";
import assert from "node:assert/strict";
import { FONT_FAMILIES, isFontFamily } from "../src/lib/types.ts";

test("provides at least ten font choices including Roboto and an Arial-compatible option", () => {
  assert.ok(Object.keys(FONT_FAMILIES).length >= 10);
  assert.equal(FONT_FAMILIES.roboto.family, "Roboto");
  assert.equal(FONT_FAMILIES.arimo.family, "Arimo");
  assert.match(FONT_FAMILIES.arimo.label, /Arial compatible/);
});

test("validates font identifiers for saved documents", () => {
  for (const id of Object.keys(FONT_FAMILIES)) assert.equal(isFontFamily(id), true);
  assert.equal(isFontFamily("unknown"), false);
  assert.equal(isFontFamily("toString"), false);
});
