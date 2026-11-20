import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { findCircularChunks, formatCycle } from '../src/find-circular-chunks.mjs';

function chunk(fileName, imports = [], dynamicImports = []) {
  return { type: 'chunk', fileName, imports, dynamicImports };
}

function bundleOf(...entries) {
  return Object.fromEntries(entries.map((entry) => [entry.fileName, entry]));
}

function fixture(name) {
  return JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));
}

test('rejects a bundle that is not an object', () => {
  for (const value of [null, undefined, 'index.js', 7]) {
    assert.throws(() => findCircularChunks(value), TypeError);
  }
});

test('an empty bundle has no cycles', () => {
  assert.deepEqual(findCircularChunks({}), []);
});

test('an acyclic graph has no cycles', () => {
  const bundle = bundleOf(
    chunk('index.js', ['vendor.js', 'ui.js']),
    chunk('ui.js', ['vendor.js']),
    chunk('vendor.js'),
  );
  assert.deepEqual(findCircularChunks(bundle), []);
});

test('finds a cycle between two chunks', () => {
  const bundle = bundleOf(chunk('a.js', ['b.js']), chunk('b.js', ['a.js']));
  assert.deepEqual(findCircularChunks(bundle), [['a.js', 'b.js']]);
});

test('rotates a longer cycle to start at its smallest file name', () => {
  const bundle = bundleOf(chunk('c.js', ['a.js']), chunk('b.js', ['c.js']), chunk('a.js', ['b.js']));
  assert.deepEqual(findCircularChunks(bundle), [['a.js', 'b.js', 'c.js']]);
});

test('a chunk that imports itself is a one element cycle', () => {
  const bundle = bundleOf(chunk('a.js', ['a.js']));
  assert.deepEqual(findCircularChunks(bundle), [['a.js']]);
});

test('ignores dynamic imports by default and follows them on request', () => {
  const bundle = bundleOf(chunk('a.js', [], ['b.js']), chunk('b.js', [], ['a.js']));
  assert.deepEqual(findCircularChunks(bundle), []);
  assert.deepEqual(findCircularChunks(bundle, { includeDynamic: true }), [['a.js', 'b.js']]);
});

test('mixes static and dynamic edges when dynamic imports are included', () => {
  const bundle = bundleOf(chunk('a.js', ['b.js']), chunk('b.js', [], ['a.js']));
  assert.deepEqual(findCircularChunks(bundle), []);
  assert.deepEqual(findCircularChunks(bundle, { includeDynamic: true }), [['a.js', 'b.js']]);
});

test('assets take no part in the graph', () => {
  const bundle = bundleOf(
    chunk('a.js', ['style.css']),
    { type: 'asset', fileName: 'style.css' },
  );
  assert.deepEqual(findCircularChunks(bundle), []);
});

test('an import target outside the bundle is ignored', () => {
  const bundle = bundleOf(chunk('a.js', ['https://cdn.example.com/x.js', 'missing.js']));
  assert.deepEqual(findCircularChunks(bundle), []);
});

test('a repeated import target counts once', () => {
  const bundle = bundleOf(chunk('a.js', ['b.js', 'b.js']), chunk('b.js', ['a.js']));
  assert.deepEqual(findCircularChunks(bundle), [['a.js', 'b.js']]);
});

test('a missing imports field reads as empty', () => {
  const bundle = {
    'a.js': { type: 'chunk', fileName: 'a.js' },
    'b.js': { type: 'chunk', fileName: 'b.js', imports: ['a.js'] },
  };
  assert.deepEqual(findCircularChunks(bundle), []);
});

test('reports two independent cycles in a stable order', () => {
  const bundle = bundleOf(
    chunk('c.js', ['d.js']),
    chunk('d.js', ['c.js']),
    chunk('a.js', ['b.js']),
    chunk('b.js', ['a.js']),
  );
  assert.deepEqual(findCircularChunks(bundle), [
    ['a.js', 'b.js'],
    ['c.js', 'd.js'],
  ]);
});

test('reports both cycles through a shared chunk', () => {
  const bundle = bundleOf(
    chunk('a.js', ['b.js', 'c.js']),
    chunk('b.js', ['a.js']),
    chunk('c.js', ['a.js']),
  );
  assert.deepEqual(findCircularChunks(bundle), [
    ['a.js', 'b.js'],
    ['a.js', 'c.js'],
  ]);
});

test('a cycle that is a prefix of another sorts first', () => {
  const bundle = bundleOf(
    chunk('a.js', ['b.js']),
    chunk('b.js', ['a.js', 'c.js']),
    chunk('c.js', ['a.js']),
  );
  assert.deepEqual(findCircularChunks(bundle), [
    ['a.js', 'b.js'],
    ['a.js', 'b.js', 'c.js'],
  ]);
});

test('the result does not depend on the order of the bundle keys', () => {
  const forward = bundleOf(
    chunk('a.js', ['b.js']),
    chunk('b.js', ['c.js']),
    chunk('c.js', ['a.js', 'd.js']),
    chunk('d.js', ['c.js']),
  );
  const reversed = Object.fromEntries(Object.entries(forward).reverse());
  const expected = [
    ['a.js', 'b.js', 'c.js'],
    ['c.js', 'd.js'],
  ];
  assert.deepEqual(findCircularChunks(forward), expected);
  assert.deepEqual(findCircularChunks(reversed), expected);
});

test('handles a long chain closed by one back edge', () => {
  const names = Array.from({ length: 200 }, (_, index) => `c${String(index).padStart(3, '0')}.js`);
  const bundle = bundleOf(
    ...names.map((name, index) => chunk(name, [names[(index + 1) % names.length]])),
  );
  const cycles = findCircularChunks(bundle);
  assert.equal(cycles.length, 1);
  assert.equal(cycles[0].length, 200);
  assert.deepEqual(cycles[0].slice(0, 3), ['c000.js', 'c001.js', 'c002.js']);
});

test('a real bundle without cycles reports none', () => {
  assert.deepEqual(findCircularChunks(fixture('clean-bundle.json')), []);
});

test('a real bundle reports its static cycle and holds back its dynamic one', () => {
  const bundle = fixture('native-sdk-cycle.json');
  assert.deepEqual(findCircularChunks(bundle), [
    ['assets/native-sdk-9f2c1a.js', 'assets/vendor-3b7d04.js'],
  ]);
  assert.deepEqual(findCircularChunks(bundle, { includeDynamic: true }), [
    ['assets/index-a71c02.js', 'assets/route-settings-2cc8f1.js'],
    ['assets/native-sdk-9f2c1a.js', 'assets/vendor-3b7d04.js'],
  ]);
});

test('formats a cycle as a closed path', () => {
  assert.equal(formatCycle(['a.js', 'b.js']), 'a.js -> b.js -> a.js');
  assert.equal(formatCycle(['native-sdk', 'vendor']), 'native-sdk -> vendor -> native-sdk');
  assert.equal(formatCycle(['a.js', 'b.js', 'c.js']), 'a.js -> b.js -> c.js -> a.js');
});

test('formats a one element cycle', () => {
  assert.equal(formatCycle(['a.js']), 'a.js -> a.js');
});

test('rejects a cycle that is not a non-empty array of strings', () => {
  for (const value of [null, undefined, [], 'a.js', ['a.js', 2]]) {
    assert.throws(() => formatCycle(value), TypeError);
  }
});
