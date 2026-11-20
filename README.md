# chunk-cycle-guard

Find circular dependencies between the output chunks of a Rollup or Vite build,
and name the cycle that was found.

A static import cycle between two chunks is a real defect. Rollup has to pick an
evaluation order, and the chunk that loses is read before it initialises, which
reaches the browser as a temporal dead zone `ReferenceError` thrown from vendor
code. The page renders its background and nothing else, and the stack trace
points far away from the cause. A cycle that exists only through dynamic imports
is harmless, because each side is fetched on demand.

Rollup already knows the chunk graph: it hands the whole bundle to the
`generateBundle` hook, with every chunk's static `imports` and `dynamicImports`.
The missing piece is turning that into every static cycle, in a stable form, so a
build can fail with `native-sdk -> vendor -> native-sdk` instead of a blank
screen.

## State

`src/find-circular-chunks.mjs` is a stub with the full contract in its doc
comments. `test/find-circular-chunks.test.mjs` is the specification, and it
fails. The open issue describes the task.

## Run the tests

```
node --test
```

No dependencies and no install step. Node 20 or newer.

## Contributing

Read CONTRIBUTING.md first. Contributions are accepted under the MIT license in
LICENSE.
