import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import {
  attachmentFileKey,
  cacheStagedFiles,
  localUploadsFromCache,
  pendingAttachmentIdsFromCache,
  rememberPendingAttachment,
  uploadCachedAttachmentsToSlip,
} from "./case-design-attachment-cache.ts";

globalThis.window = globalThis.window ?? {};

const cache = () => globalThis.window.__caseDesignAttachments ?? [];
const file = (name, content, lastModified) => new File([content], name, { lastModified });
const staged = (f) => ({ file: f, url: `blob:${f.name}` });

beforeEach(() => {
  delete globalThis.window.__caseDesignAttachments;
});

describe("attachmentFileKey", () => {
  it("differs for same-name files with different size or date", () => {
    const a = file("upper.stl", "aaaa", 1000);
    assert.notEqual(attachmentFileKey(a), attachmentFileKey(file("upper.stl", "bb", 1000)));
    assert.notEqual(attachmentFileKey(a), attachmentFileKey(file("upper.stl", "aaaa", 2000)));
    assert.equal(attachmentFileKey(a), attachmentFileKey(file("upper.stl", "cccc", 1000)));
  });
});

describe("cacheStagedFiles (no slip yet)", () => {
  it("keeps two different scans that share a name", () => {
    const first = file("upper.stl", "scan-one", 1000);
    const second = file("upper.stl", "scan-two-longer", 2000);
    assert.equal(cacheStagedFiles([staged(first), staged(second)]), 2);
    assert.deepEqual(cache().map((i) => i.file), [first, second]);
  });

  it("does not re-add files already cached (dialog reopened) or repeated in a batch", () => {
    const a = file("upper.stl", "a", 1000);
    const b = file("lower.stl", "b", 1000);
    cacheStagedFiles([staged(a)]);
    assert.equal(cacheStagedFiles([staged(a), staged(b), staged(b)]), 1);
    assert.equal(cache().length, 2);
  });

  it("skips files already cached by the impression STL flow", () => {
    const a = file("upper.stl", "a", 1000);
    globalThis.window.__caseDesignAttachments = [{ file: a, url: "blob:x", _impressionKey: "stl" }];
    assert.equal(cacheStagedFiles([staged(a)]), 0);
    assert.equal(cache().length, 1);
  });
});

describe("uploadCachedAttachmentsToSlip (after submit)", () => {
  it("uploads only local files, not pending server uploads", async () => {
    const local = file("upper.stl", "a", 1000);
    cacheStagedFiles([staged(local)]);
    rememberPendingAttachment({ remoteId: 7, file: file("lower.stl", "b", 1000), url: "blob:y" });
    assert.equal(localUploadsFromCache().length, 1);

    const sent = [];
    const result = await uploadCachedAttachmentsToSlip(42, async (slipId, f) => sent.push([slipId, f]));
    assert.deepEqual(sent, [[42, local]]);
    assert.equal(result.uploaded, 1);
    assert.deepEqual(result.failed, []);
    // The pending id is still there for the create payload; the uploaded file is gone.
    assert.deepEqual(pendingAttachmentIdsFromCache(), [7]);
    assert.equal(localUploadsFromCache().length, 0);
  });

  it("keeps failed files in the cache and a retry sends only those", async () => {
    const ok = file("upper.stl", "a", 1000);
    const bad = file("upper.stl", "bbbb", 2000);
    cacheStagedFiles([staged(ok), staged(bad)]);

    const progress = [];
    const first = await uploadCachedAttachmentsToSlip(
      42,
      async (_slipId, f) => {
        if (f === bad) throw new Error("Network down");
      },
      (p) => progress.push(p.completed)
    );
    assert.equal(first.uploaded, 1);
    assert.deepEqual(first.failed, [{ name: "upper.stl", error: "Network down" }]);
    assert.deepEqual(progress, [0, 1, 2]);
    assert.deepEqual(localUploadsFromCache().map((i) => i.file), [bad]);

    const sent = [];
    const retry = await uploadCachedAttachmentsToSlip(42, async (_slipId, f) => sent.push(f));
    assert.deepEqual(sent, [bad]);
    assert.equal(retry.failed.length, 0);
    assert.equal(localUploadsFromCache().length, 0);
  });

  it("passes notes through and reports nothing to do on an empty cache", async () => {
    const result = await uploadCachedAttachmentsToSlip(1, async () => {
      throw new Error("should not be called");
    });
    assert.deepEqual(result, { total: 0, completed: 0, failed: [], uploaded: 0 });

    globalThis.window.__caseDesignAttachments = [{ file: file("a.stl", "a", 1), url: "", notes: "upper arch" }];
    const calls = [];
    await uploadCachedAttachmentsToSlip(5, async (...args) => calls.push(args[2]));
    assert.deepEqual(calls, [{ notes: "upper arch" }]);
  });
});
