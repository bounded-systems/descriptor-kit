#!/usr/bin/env bun
import { render, check, DescriptorError } from "./index.ts";

function main() {
  const mode = process.argv[2];
  const repo = process.argv[3] ?? ".";
  const runSuite = process.argv.includes("--run-suite");

  try {
    if (mode === "render") {
      console.log(render(repo) ? "descriptor: README managed blocks re-rendered." : "descriptor: README already up to date.");
      return;
    }
    if (mode === "check") {
      const r = check(repo, { runSuite });
      if (r.ok) {
        console.log("descriptor: ✓ no drift — README matches trellis.json.");
        return;
      }
      console.error("descriptor: ✗ DRIFT — README managed blocks are out of date (run `descriptor render`).");
      for (const [line, disk, want] of r.diff) {
        console.error(`   L${line}  on-disk: ${JSON.stringify(disk)}`);
        console.error(`   L${line}  wanted : ${JSON.stringify(want)}`);
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

main();
