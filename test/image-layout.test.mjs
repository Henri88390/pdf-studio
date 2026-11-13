import { test } from "node:test";
import assert from "node:assert/strict";
import { combinedImageSize, MAX_IMAGE_DIMENSION, MAX_IMAGE_PIXELS } from "../src/lib/image-layout.ts";

test("stacks page dimensions and uses the widest page", () => {
  assert.deepEqual(combinedImageSize([{ width: 400, height: 600 }, { width: 600, height: 400 }]), { width: 600, height: 1000 });
});

test("rejects images exceeding dimension or pixel limits", () => {
  assert.throws(() => combinedImageSize([{ width: 1, height: MAX_IMAGE_DIMENSION + 1 }]), /one image per page/);
  assert.throws(() => combinedImageSize([{ width: 8000, height: Math.floor(MAX_IMAGE_PIXELS / 8000) + 1 }]), /one image per page/);
});
