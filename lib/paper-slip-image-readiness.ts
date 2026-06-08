type ImageLike = {
  complete: boolean;
  addEventListener: (type: "load" | "error", listener: () => void, options?: { once?: boolean }) => void;
  removeEventListener: (type: "load" | "error", listener: () => void) => void;
};

export function waitForImageLikes(images: ImageLike[], timeoutMs = 5000): Promise<void> {
  if (images.length === 0) return Promise.resolve();

  return new Promise((resolve) => {
    let settled = false;
    let remaining = images.filter((image) => !image.complete).length;

    if (remaining === 0) {
      resolve();
      return;
    }

    const finish = () => {
      if (settled) return;
      settled = true;
      globalThis.clearTimeout(timeoutId);
      cleanup();
      resolve();
    };

    const handleDone = () => {
      remaining -= 1;
      if (remaining <= 0) finish();
    };

    const cleanupFns: Array<() => void> = [];
    const cleanup = () => {
      cleanupFns.forEach((fn) => fn());
    };

    for (const image of images) {
      if (image.complete) continue;
      image.addEventListener("load", handleDone, { once: true });
      image.addEventListener("error", handleDone, { once: true });
      cleanupFns.push(() => {
        image.removeEventListener("load", handleDone);
        image.removeEventListener("error", handleDone);
      });
    }

    const timeoutId = globalThis.setTimeout(finish, timeoutMs);
  });
}
