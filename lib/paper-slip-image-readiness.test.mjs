import test from "node:test";
import assert from "node:assert/strict";

import { waitForImageLikes } from "./paper-slip-image-readiness.ts";

function createImageLike(complete = false) {
  const listeners = {
    load: new Set(),
    error: new Set(),
  };

  return {
    image: {
      complete,
      addEventListener(type, listener) {
        listeners[type].add(listener);
      },
      removeEventListener(type, listener) {
        listeners[type].delete(listener);
      },
    },
    emit(type) {
      for (const listener of [...listeners[type]]) {
        listener();
      }
    },
    listenerCount(type) {
      return listeners[type].size;
    },
  };
}

test("waitForImageLikes resolves immediately when all images are already complete", async () => {
  const imageA = createImageLike(true);
  const imageB = createImageLike(true);

  await waitForImageLikes([imageA.image, imageB.image], 10);

  assert.equal(imageA.listenerCount("load"), 0);
  assert.equal(imageB.listenerCount("error"), 0);
});

test("waitForImageLikes resolves after pending images finish loading", async () => {
  const imageA = createImageLike(false);
  const imageB = createImageLike(false);
  const waiting = waitForImageLikes([imageA.image, imageB.image], 50);

  assert.equal(imageA.listenerCount("load"), 1);
  assert.equal(imageB.listenerCount("error"), 1);

  imageA.emit("load");
  imageB.emit("error");

  await waiting;

  assert.equal(imageA.listenerCount("load"), 0);
  assert.equal(imageA.listenerCount("error"), 0);
  assert.equal(imageB.listenerCount("load"), 0);
  assert.equal(imageB.listenerCount("error"), 0);
});
