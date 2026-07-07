// descriptor-kit's own value props — the executed proof model, dogfooded.
// descriptor-kit imports this, runs each `check`, and generates STATUS.md +
// docs/value-props.md. A claim goes BACKED only if its checks pass right now.
import type { ValueProp } from "./value-props.ts";
import { parseNode } from "./schema.ts";

export const VALUE_PROPS: readonly ValueProp[] = [
  {
    claim: "A malformed descriptor is rejected before it can generate anything.",
    whyNot: "vs hand-written docs: a typo in the source fails fast at parse, not silently in the output.",
    forcing: [
      {
        name: "the schema rejects an empty node",
        check: () => {
          try {
            parseNode({} as unknown);
            return false;
          } catch {
            return true;
          }
        },
        exercises: ["src/schema.ts:parseNode", "src/schema.ts:TrellisNodeSchema"],
      },
    ],
  },
  {
    claim: "A README's facts cannot drift from their source without failing CI.",
    whyNot: "vs a hand-maintained README: drift is a build failure, not a stale line nobody notices.",
    forcing: [
      {
        name: "dogfooded — descriptor-kit's own README + status are generated and gated",
        evidence: "self:check runs in CI on every push (.github/workflows/standard.yml)",
        exercises: ["src/index.ts:check", "src/index.ts:projectAll"],
      },
    ],
  },
  {
    claim: "The org's upstream maps generate from the same per-repo descriptors.",
    whyNot: "vs hand-maintained maps: the audit found all three describers ~half-stale; generation removes the class.",
    forcing: [
      {
        name: "descriptor aggregate (org-map / profile / knowledge nodes)",
        pending: "not built yet — planned as the next capability after prx-parity",
      },
    ],
  },
];
