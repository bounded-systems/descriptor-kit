import { expect, test } from "bun:test";
import { parseNode } from "../schema.ts";
import { check, DescriptorError } from "../index.ts";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const validNode = {
  node: "example",
  visibility: "public",
  provides: [{ type: "example-wire", kind: "wire" }],
  consumes: [],
  descriptor: {
    tagline: "does a thing",
    what: "the longer thing",
    role: { hotel: "room-sdk", kind: "library" },
    status: "Partial",
    proof: { suite: "bun test", claims: [{ claim: "it works", provenBy: "x.test.ts" }] },
    positioning: "a thing for people",
    links: { repo: "https://example.com" },
  },
};

test("parseNode accepts a well-formed node and defaults empty edge arrays", () => {
  const n = parseNode({ ...validNode, consumes: undefined });
  expect(n.node).toBe("example");
  expect(n.consumes).toEqual([]);
});

test("parseNode rejects a bad status with a path-scoped message", () => {
  const bad = { ...validNode, descriptor: { ...validNode.descriptor, status: "Shipped" } };
  expect(() => parseNode(bad)).toThrow(/descriptor.status/);
});

test("parseNode rejects a missing tagline", () => {
  const d = { ...validNode.descriptor } as Record<string, unknown>;
  delete d.tagline;
  expect(() => parseNode({ ...validNode, descriptor: d })).toThrow(/tagline/);
});

test("parseNode requires at least one claim", () => {
  const d = { ...validNode.descriptor, proof: { suite: "bun test", claims: [] } };
  expect(() => parseNode({ ...validNode, descriptor: d })).toThrow(/claims/);
});

test("check throws when a repo has no trellis.json", () => {
  const dir = mkdtempSync(join(tmpdir(), "descriptor-"));
  expect(() => check(dir)).toThrow(DescriptorError);
});
