// descriptor-kit — project a repo's trellis.json `descriptor` into managed README
// regions, git-pinned and drift-gated. One source, many surfaces; the README's
// facts cannot drift from the code, because CI regenerates and diffs them.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve, dirname } from "node:path";
import { parseNode, type TrellisNode } from "./schema.ts";
import { loadValueProps, renderValueProps, renderStatus } from "./value-props.ts";

const STATUS_BADGE = {
  Enforced: "🟢 **Enforced** — proven against the running code.",
  Partial: "🟡 **Partial** — mechanism present; named gaps remain.",
  Aspirational: "⚪ **Aspirational** — declared intent; tracked, not yet built.",
} as const;

export class DescriptorError extends Error {}

/** The commit that last touched a proof file — so a pin can never go stale, and a
 *  claim for a file that doesn't exist is impossible to write. */
function pin(repo: string, file: string): string {
  if (!existsSync(join(repo, file))) {
    throw new DescriptorError(`claim is "proven by" a file that does not exist: ${file}`);
  }
  const sha = execFileSync("git", ["-C", repo, "log", "-1", "--format=%h", "--", file], { encoding: "utf8" }).trim();
  if (!sha) throw new DescriptorError(`proof file has no git history (cannot pin): ${file}`);
  return sha;
}

// ── block projectors — each fills one <!-- descriptor:NAME --> region ──────────
function projectHeader(_repo: string, n: TrellisNode): string {
  const d = n.descriptor;
  return [`# ${n.node}`, ``, `**${d.tagline}**`, ``, d.what, ``, STATUS_BADGE[d.status]].join("\n");
}

function projectFit(_repo: string, n: TrellisNode): string {
  const prov = n.provides.map((p) => `\`${p.type}\``).join(", ") || "—";
  const cons = n.consumes.map((c) => `\`${c.type}\``).join(", ") || "nothing (a leaf)";
  return [
    `**Where it fits:** ${n.descriptor.role.hotel} (${n.descriptor.role.kind}).`,
    `_${n.descriptor.positioning}._`,
    ``,
    `- **Provides** — ${prov}`,
    `- **Consumes** — ${cons}`,
  ].join("\n");
}

function projectClaims(repo: string, n: TrellisNode): string {
  const claims = n.descriptor.proof.claims;
  if (!claims || claims.length === 0) {
    throw new DescriptorError(`README has a "claims" block but trellis.json proof has no \`claims\` (uses \`valueProps\`?)`);
  }
  const rows = claims.map(
    (c) => `| ${c.claim} | \`${c.provenBy}\`${c.via ? " " + c.via : ""} | \`${pin(repo, c.provenBy)}\` |`,
  );
  return [
    `Every row is generated from \`descriptor.proof\` in \`trellis.json\`: the \`Proven by\``,
    `file must exist, and \`Pinned at\` is its last-touching commit — so the table cannot`,
    `cite a test that isn't there, and a pin cannot go stale.`,
    ``,
    `| Claim | Proven by | Pinned at |`,
    `|---|---|---|`,
    ...rows,
    ``,
    "```sh",
    n.descriptor.proof.suite,
    "```",
  ].join("\n");
}

function projectLinks(_repo: string, n: TrellisNode): string {
  return Object.entries(n.descriptor.links).map(([k, v]) => `- **${k}** — ${v}`).join("\n");
}

const BLOCKS: Record<string, (repo: string, n: TrellisNode) => string> = {
  header: projectHeader,
  fit: projectFit,
  claims: projectClaims,
  links: projectLinks,
};

function count(hay: string, needle: string): number {
  let n = 0;
  for (let i = hay.indexOf(needle); i !== -1; i = hay.indexOf(needle, i + needle.length)) n++;
  return n;
}

function fillBlock(md: string, name: string, body: string): string {
  const start = `<!-- descriptor:${name} start -->`;
  const end = `<!-- descriptor:${name} end -->`;
  const i = md.indexOf(start);
  const j = md.indexOf(end);
  if (i === -1 || j === -1 || j < i) {
    throw new DescriptorError(`README.md is missing managed-block markers for "${name}" (${start} … ${end})`);
  }
  if (count(md, start) > 1 || count(md, end) > 1) {
    throw new DescriptorError(`README.md has duplicate "${name}" markers — a managed block must appear exactly once (are they in a docs example? use a placeholder name).`);
  }
  return md.slice(0, i) + start + "\n" + body + "\n" + end + md.slice(j + end.length);
}

export function loadNode(repo: string): TrellisNode {
  const p = join(repo, "trellis.json");
  if (!existsSync(p)) throw new DescriptorError(`no trellis.json in ${repo}`);
  return parseNode(JSON.parse(readFileSync(p, "utf8")));
}

/** The README with every managed block it declares filled. Blocks the README
 *  doesn't use are skipped, so a repo adopts only the regions it wants. */
export function projectReadme(repo: string, node: TrellisNode): string {
  let md = readFileSync(join(repo, "README.md"), "utf8");
  for (const [name, fn] of Object.entries(BLOCKS)) {
    if (md.includes(`<!-- descriptor:${name} start -->`)) md = fillBlock(md, name, fn(repo, node));
  }
  return md;
}

export interface Output { path: string; content: string; }

/** Every file descriptor-kit generates for this repo: the README, plus
 *  docs/value-props.md + STATUS.md when the descriptor declares a `valueProps`
 *  module (prx-parity — the checks are executed, so the status can't overclaim). */
export async function projectAll(repo: string): Promise<Output[]> {
  const node = loadNode(repo);
  const outputs: Output[] = [{ path: "README.md", content: projectReadme(repo, node) }];
  const vpPath = node.descriptor.proof.valueProps;
  if (vpPath) {
    const props = await loadValueProps(resolve(repo, vpPath));
    outputs.push({ path: "docs/value-props.md", content: renderValueProps(props, node.node) });
    outputs.push({ path: "STATUS.md", content: renderStatus(props, node.node) });
  }
  return outputs;
}

export async function render(repo: string): Promise<string[]> {
  const changed: string[] = [];
  for (const o of await projectAll(repo)) {
    const abs = join(repo, o.path);
    const cur = existsSync(abs) ? readFileSync(abs, "utf8") : null;
    if (cur !== o.content) {
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, o.content);
      changed.push(o.path);
    }
  }
  return changed;
}

export interface Drift { path: string; line: number; onDisk: string; wanted: string; }
export interface CheckResult { ok: boolean; drifted: string[]; diff: Drift[]; }

export async function check(repo: string, opts: { runSuite?: boolean } = {}): Promise<CheckResult> {
  const node = loadNode(repo);
  const diff: Drift[] = [];
  const drifted: string[] = [];
  for (const o of await projectAll(repo)) {
    const abs = join(repo, o.path);
    const cur = existsSync(abs) ? readFileSync(abs, "utf8") : "";
    if (cur !== o.content) {
      drifted.push(o.path);
      const a = cur.split("\n"), b = o.content.split("\n");
      for (let k = 0; k < Math.max(a.length, b.length) && diff.length < 8; k++) {
        if (a[k] !== b[k]) diff.push({ path: o.path, line: k + 1, onDisk: a[k] ?? "", wanted: b[k] ?? "" });
      }
    }
  }
  // Optional teeth: also run the suite, so a claim can't cite a red test.
  if (opts.runSuite && node.descriptor.proof.suite) {
    const [cmd, ...args] = node.descriptor.proof.suite.split(/\s+/);
    execFileSync(cmd, args, { cwd: repo, stdio: "inherit" });
  }
  return { ok: drifted.length === 0, drifted, diff };
}
