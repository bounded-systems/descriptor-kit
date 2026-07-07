<!-- descriptor:header start -->
<!-- descriptor:header end -->

> This README's header, "where it fits", claims table, and links are **generated**
> from [`trellis.json`](trellis.json) by descriptor-kit itself. `descriptor check`
> runs in CI and fails on drift — so this page cannot lie about the code.

<!-- descriptor:fit start -->
<!-- descriptor:fit end -->

## Why

Across an org, hand-written READMEs drift from the code they describe: a shipped
feature stays marked "deferred", a dependency pin goes stale, a claims table cites
a test that was renamed. The one repo that never drifts is the one whose README is
**generated from source and gated in CI**. descriptor-kit makes that pattern shared
instead of bespoke.

One authored source per repo — the `descriptor` block inside `trellis.json` (the
same file that declares the repo's contract-lattice node) — projects to many
surfaces. Today: the README. Next: the org knowledge graph node, the org-map row,
and a bounded.tools product page. Author once, project everywhere, gate on drift.

## Use

Add markers to your `README.md` for the blocks you want managed:

```md
<!-- descriptor:header start --><!-- descriptor:header end -->
<!-- descriptor:fit start --><!-- descriptor:fit end -->
<!-- descriptor:claims start --><!-- descriptor:claims end -->
<!-- descriptor:links start --><!-- descriptor:links end -->
```

Author the source in `trellis.json` (see this repo's own for the shape), then:

```sh
bunx @bounded-systems/descriptor-kit render .   # fill the managed blocks
bunx @bounded-systems/descriptor-kit check .     # exit 1 if the README has drifted
```

Wire `check` into CI (see `.github/workflows/standard.yml`) and drift becomes a
build failure. `--run-suite` additionally runs `descriptor.proof.suite`, so a claim
can't cite a test that isn't green.

## The claims table cannot go stale

`Pinned at` is the **last-touching commit** of each `provenBy` file, read from git at
render time — never hand-typed. And a claim whose `provenBy` file doesn't exist fails
the render outright. Stale pins and phantom claims become structurally impossible.

<!-- descriptor:claims start -->
<!-- descriptor:claims end -->

## Links

<!-- descriptor:links start -->
<!-- descriptor:links end -->

## Status

Early. Projects README blocks today; the graph-node / org-map / product-page
projections and Zod-shared-with-trellis validation are the next steps. See the
descriptor schema in [`src/schema.ts`](src/schema.ts).

## License

[MIT](LICENSE).
