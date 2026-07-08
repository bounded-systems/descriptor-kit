#!/usr/bin/env bun
import { readFileSync, writeFileSync } from "node:fs";
import { render, check, fillBlock, DescriptorError } from "./index.ts";
import { collectNodes, renderOrgMap, renderLattice } from "./aggregate.ts";

async function main() {
  const mode = process.argv[2];
  const repo = process.argv[3] ?? ".";
  const runSuite = process.argv.includes("--run-suite");
  const arg = (flag: string) => { const i = process.argv.indexOf(flag); return i === -1 ? undefined : process.argv[i + 1]; };

  try {
    if (mode === "aggregate") {
      const nodes = collectNodes(repo);
      const lattice = process.argv.includes("--lattice");
      const into = arg("--into");
      if (!into) {
        process.stdout.write(lattice ? renderLattice(nodes) : renderOrgMap(nodes));
        return;
      }
      // Fill a managed block in an existing doc (preserves its surrounding prose).
      const name = lattice ? "lattice" : "orgmap";
      const body = (lattice ? renderLattice(nodes, { heading: false }) : renderOrgMap(nodes, { heading: false })).trimEnd();
      const current = readFileSync(into, "utf8");
      const filled = fillBlock(current, name, body);
      if (process.argv.includes("--check")) {
        if (filled === current) { console.log(`descriptor: ✓ ${name} up to date in ${into}`); return; }
        console.error(`descriptor: ✗ ${name} drift in ${into} — run \`descriptor aggregate ${repo} --into ${into}\``);
        process.exit(1);
      }
      if (filled !== current) writeFileSync(into, filled);
      console.log(`descriptor: ${filled === current ? "no change" : "wrote"} ${name} block in ${into}`);
      return;
    }
    if (mode === "render") {
      const changed = await render(repo);
      console.log(changed.length ? `descriptor: rendered ${changed.join(", ")}` : "descriptor: all outputs up to date.");
      return;
    }
    if (mode === "check") {
      const r = await check(repo, { runSuite });
      if (r.ok) {
        console.log("descriptor: ✓ no drift — generated files match trellis.json.");
        return;
      }
      console.error(`descriptor: ✗ DRIFT in ${r.drifted.join(", ")} (run \`descriptor render\`).`);
      for (const d of r.diff) {
        console.error(`   ${d.path}:${d.line}  on-disk: ${JSON.stringify(d.onDisk)}`);
        console.error(`   ${d.path}:${d.line}  wanted : ${JSON.stringify(d.wanted)}`);
      }
      process.exit(1);
    }
    console.error("usage: descriptor <render|check> [repoDir] [--run-suite]");
    process.exit(2);
  } catch (e) {
    console.error(`descriptor: ${e instanceof DescriptorError ? e.message : e}`);
    process.exit(2);
  }
}

await main();
