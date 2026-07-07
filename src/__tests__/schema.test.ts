import { expect, test } from "bun:test";
import { parseNode } from "../schema.ts";
import { check, DescriptorError } from "../index.ts";
import { propState, renderStatus, renderValueProps, type ValueProp } from "../value-props.ts";
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

test("parseNode requires either claims or valueProps in proof", () => {
  const d = { ...validNode.descriptor, proof: { suite: "bun test" } };
  expect(() => parseNode({ ...validNode, descriptor: d })).toThrow(/claims.*valueProps|valueProps/);
});

test("check rejects when a repo has no trellis.json", async () => {
  const dir = mkdtempSync(join(tmpdir(), "descriptor-"));
  await expect(check(dir)).rejects.toThrow(DescriptorError);
});

// ── the executed value-prop model (prx-parity) ───────────────────────────────
const props: ValueProp[] = [
  { claim: "A", whyNot: "x", forcing: [{ name: "live", check: () => true, exercises: ["a.ts:f"] }] },
  { claim: "B", whyNot: "y", forcing: [{ name: "ev", evidence: "PR #1", exercises: ["b.ts:g"] }] },
  { claim: "C", whyNot: "z", forcing: [{ name: "todo", pending: "later" }] },
];

test("propState: a live check backs, a pending does not", () => {
  expect(propState(props[0]).backed).toBe(true);
  expect(propState(props[2]).backed).toBe(false);
});

test("propState: a FAILING live check is not backed (cannot overclaim)", () => {
  const failing: ValueProp = { claim: "D", whyNot: "", forcing: [{ name: "nope", check: () => false, exercises: [] }] };
  expect(propState(failing).backed).toBe(false);
});

test("renderStatus rolls up backed / evidence / learning", () => {
  const s = renderStatus(props, "example");
  expect(s).toContain("1 of 3 value props fully backed");
  expect(s).toContain("_(evidence-backed)_");
  expect(s).toContain("later");
});

test("renderValueProps marks BACKED, learning goals, and the exercises map", () => {
  const d = renderValueProps(props, "example");
  expect(d).toContain("— BACKED");
  expect(d).toContain("[learning goal]");
  expect(d).toContain("exercises: a.ts:f");
});
