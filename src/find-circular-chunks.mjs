/**
 * Every static import cycle between the chunks of a Rollup or Vite output
 * bundle.
 *
 * Bundle shape: the object Rollup hands to its `generateBundle` hook. Each key
 * is an output file name and equals that entry's `fileName`. A chunk entry has
 * `type: 'chunk'`, `fileName`, `imports` and `dynamicImports`. An asset entry
 * has `type: 'asset'` and takes no part in the graph.
 *
 * Edges: chunk A's `imports` containing chunk B's file name is the edge A to B.
 * `dynamicImports` is ignored unless `options.includeDynamic` is true, in which
 * case dynamic edges join the static ones. An import target that is not a chunk
 * in the bundle is ignored, which covers assets and externals. A repeated
 * target counts once. A missing `imports` or `dynamicImports` reads as empty.
 *
 * Result: every elementary cycle, each reported once. A cycle is an array of
 * file names in import order with no repeated element, and the edge from its
 * last element back to its first is implied. A chunk importing itself is the
 * one element cycle `[fileName]`.
 *
 * Canonical form: each cycle is rotated to start at its lexicographically
 * smallest file name, by rotation only and never by reversal. The result is
 * sorted by comparing cycles element by element, and a cycle that is a prefix
 * of another sorts first.
 *
 * Throws a TypeError when `bundle` is not a non-null object.
 *
 * @param {Record<string, { type?: string, fileName?: string, imports?: string[], dynamicImports?: string[] }>} bundle
 * @param {{ includeDynamic?: boolean }} [options]
 * @returns {string[][]}
 */
export function findCircularChunks(bundle, options = {}) {
  throw new Error('findCircularChunks is not implemented');
}

/**
 * One cycle as the closed path a build log can print, for example
 * `native-sdk -> vendor -> native-sdk`: the cycle's elements joined by ` -> `
 * with its first element repeated at the end. A one element cycle renders as
 * `a -> a`.
 *
 * Throws a TypeError when `cycle` is not a non-empty array of strings.
 *
 * @param {string[]} cycle
 * @returns {string}
 */
export function formatCycle(cycle) {
  throw new Error('formatCycle is not implemented');
}
