// The descriptor schema — a superset repo-identity spec that extends the trellis
// node. One authored source per repo, projected to README, graph node, org-map
// row, and (later) a bounded.tools product page. Zod so the spec is the contract.
import { z } from "zod";

export const ClaimSchema = z.object({
  claim: z.string().min(1),
  /** A test file, relative to the repo root. Must exist; pinned to its last-touching commit. */
  provenBy: z.string().min(1),
  /** Optional detail rendered after the file, e.g. "→ `deniedDoors` in `mod.ts`". */
  via: z.string().min(1).optional(),
});
export type Claim = z.infer<typeof ClaimSchema>;

export const StatusSchema = z.enum(["Enforced", "Partial", "Aspirational"]);
export type Status = z.infer<typeof StatusSchema>;

export const DescriptorSchema = z.object({
  tagline: z.string().min(1),
  what: z.string().min(1),
  role: z.object({ hotel: z.string(), kind: z.string() }),
  status: StatusSchema,
  proof: z.object({ suite: z.string().min(1), claims: z.array(ClaimSchema).min(1) }),
  positioning: z.string().min(1),
  links: z.record(z.string(), z.string().url().or(z.string().min(1))),
});
export type Descriptor = z.infer<typeof DescriptorSchema>;

const ContractSchema = z.object({
  type: z.string(),
  kind: z.string().optional(),
  spec: z.record(z.string(), z.string()).optional(),
});

/** The full per-repo trellis node: lattice edges + the descriptor superset. */
export const TrellisNodeSchema = z.object({
  node: z.string().min(1),
  visibility: z.enum(["public", "private"]),
  provides: z.array(ContractSchema).default([]),
  consumes: z.array(ContractSchema).default([]),
  descriptor: DescriptorSchema,
});
export type TrellisNode = z.infer<typeof TrellisNodeSchema>;

export function parseNode(raw: unknown): TrellisNode {
  const r = TrellisNodeSchema.safeParse(raw);
  if (!r.success) {
    const issues = r.error.issues.map((i) => `  ${i.path.join(".") || "(root)"}: ${i.message}`).join("\n");
    throw new Error(`trellis.json failed descriptor schema:\n${issues}`);
  }
  return r.data;
}
