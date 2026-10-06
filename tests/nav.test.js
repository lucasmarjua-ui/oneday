// Collisions and pathfinding: characters walk around things, never through them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createNavGrid, setRect, blockShape, isFree, findPath, lineClear, nearestFree } from '../shared/stage/nav.js';

function openRoom() {
  const grid = createNavGrid({ minX: -5, maxX: 5, minZ: -5, maxZ: 5 });
  setRect(grid, 0, 0, 10, 10, 1);
  return grid;
}

function pathIsClear(grid, from, path) {
  let at = from;
  for (const point of path) {
    assert.ok(lineClear(grid, at, point), `segment ${at} -> ${point} crosses something`);
    at = point;
  }
}

test('an empty room is a straight walk', () => {
  const grid = openRoom();
  assert.deepEqual(findPath(grid, [-3, -3], [3, 3]), [[3, 3]]);
});

test('a wall in the way is walked around, never through', () => {
  const grid = openRoom();
  blockShape(grid, { type: 'rect', x: 0, z: 0, w: 1, d: 7, rot: 0 }, 0.28);
  const from = [-3, 0];
  const path = findPath(grid, from, [3, 0]);
  assert.ok(path && path.length >= 2, 'expected a detour');
  pathIsClear(grid, from, path);
  assert.deepEqual(path[path.length - 1], [3, 0]);
});

test('solid shapes are grown by the character radius, and rotate', () => {
  const grid = openRoom();
  blockShape(grid, { type: 'circle', x: 0, z: 0, r: 0.5 }, 0.3);
  assert.equal(isFree(grid, 0.6, 0), false);
  assert.equal(isFree(grid, 1.2, 0), true);
  const rotated = openRoom();
  blockShape(rotated, { type: 'rect', x: 0, z: 0, w: 4, d: 0.5, rot: Math.PI / 2 }, 0);
  assert.equal(isFree(rotated, 0, 1.5), false, 'a box rotated 90 degrees runs along z');
  assert.equal(isFree(rotated, 1.5, 0), true);
});

test('a goal inside something resolves to the nearest free spot', () => {
  const grid = openRoom();
  blockShape(grid, { type: 'rect', x: 2, z: 2, w: 1, d: 1, rot: 0 }, 0);
  const near = nearestFree(grid, 2, 2);
  assert.ok(near && isFree(grid, ...near));
  assert.ok(Math.hypot(near[0] - 2, near[1] - 2) < 1);
  const path = findPath(grid, [-3, -3], [2, 2]);
  assert.ok(path);
  assert.ok(isFree(grid, ...path[path.length - 1]));
});

test('an unreachable goal gives no path', () => {
  const grid = openRoom();
  setRect(grid, 3, 0, 0.6, 10, 0);
  setRect(grid, -3, 0, 0.6, 10, 0);
  // A sealed pocket in the middle third cannot reach the right-hand third.
  assert.equal(findPath(grid, [0, 0], [4, 0]), null);
});

test('diagonal steps never cut blocked corners', () => {
  const grid = openRoom();
  setRect(grid, 0.5, -2, 1, 6, 0);
  setRect(grid, -2, 0.5, 6, 1, 0);
  const from = [-1.5, -1.5];
  const path = findPath(grid, from, [2, 2]);
  if (path) pathIsClear(grid, from, path);
});
