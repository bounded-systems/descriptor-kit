#!/usr/bin/env bun
import { render, check, DescriptorError } from "./index.ts";
import { collectNodes, renderOrgMap, renderLattice } from "./aggregate.ts";

async function main() {
  const mode = process.argv[2];
  const repo = process.argv[3] ?? ".";
  const runSuite = process.argv.includes("--run-suite");

  try {
    if (mode === "aggregate") {
      const nodes = collectNodes(repo);
      process.stdout.write(process.argv.includes("--lattice") ? renderLattice(nodes) : renderOrgMap(nodes));
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
