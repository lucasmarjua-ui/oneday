// Collision and pathfinding for the stage. Every scene is rasterised into a
// grid of walkable cells: the ground (an island's tiles, a room's floor) is
// opened up, then water and every solid prop (a wall, a boat, a hedgehog, a
// palm trunk) is closed again, grown by the radius of a character so nobody
// clips through anything. Characters then walk A* paths, straightened wherever
// a straight line is clear. Pure module, covered by tests.

export const CELL = 0.25;
export const ACTOR_RADIUS = 0.28;

export function createNavGrid({ minX, maxX, minZ, maxZ, cell = CELL }) {
  const cols = Math.ceil((maxX - minX) / cell);
  const rows = Math.ceil((maxZ - minZ) / cell);
  return { minX, minZ, cell, cols, rows, cells: new Uint8Array(cols * rows) }; // 0 = blocked, 1 = free
}

const index = (grid, c, r) => r * grid.cols + c;
export const cellOf = (grid, x, z) => [Math.floor((x - grid.minX) / grid.cell), Math.floor((z - grid.minZ) / grid.cell)];
export const centerOf = (grid, c, r) => [grid.minX + (c + 0.5) * grid.cell, grid.minZ + (r + 0.5) * grid.cell];
const inside = (grid, c, r) => c >= 0 && r >= 0 && c < grid.cols && r < grid.rows;

export function isFree(grid, x, z) {
  const [c, r] = cellOf(grid, x, z);
  return inside(grid, c, r) && grid.cells[index(grid, c, r)] === 1;
}

/** Set every cell whose centre satisfies `test(x, z)` to `value` (1 free, 0 blocked). */
function paint(grid, bounds, test, value) {
  const [c0, r0] = cellOf(grid, bounds[0], bounds[1]);
  const [c1, r1] = cellOf(grid, bounds[2], bounds[3]);
  for (let r = Math.max(0, r0); r <= Math.min(grid.rows - 1, r1); r++) {
    for (let c = Math.max(0, c0); c <= Math.min(grid.cols - 1, c1); c++) {
      const [x, z] = centerOf(grid, c, r);
      if (test(x, z)) grid.cells[index(grid, c, r)] = value;
    }
  }
}

/** Open (walkable) or close an axis-aligned rectangle given by its centre and size. */
export function setRect(grid, x, z, w, d, value) {
  paint(grid, [x - w / 2, z - d / 2, x + w / 2, z + d / 2], (px, pz) => Math.abs(px - x) <= w / 2 && Math.abs(pz - z) <= d / 2, value);
}

/**
 * Block a solid shape, grown by `pad`:
 * - { type: 'rect', x, z, w, d, rot } an oriented box footprint (rot about Y);
 * - { type: 'circle', x, z, r } a round one.
 */
export function blockShape(grid, shape, pad = ACTOR_RADIUS) {
  if (shape.type === 'circle') {
    const r = shape.r + pad;
    paint(grid, [shape.x - r, shape.z - r, shape.x + r, shape.z + r], (px, pz) => Math.hypot(px - shape.x, pz - shape.z) <= r, 0);
    return;
  }
  const hw = shape.w / 2 + pad;
  const hd = shape.d / 2 + pad;
  const cos = Math.cos(shape.rot || 0);
  const sin = Math.sin(shape.rot || 0);
  const reach = Math.hypot(hw, hd);
  paint(grid, [shape.x - reach, shape.z - reach, shape.x + reach, shape.z + reach], (px, pz) => {
    const dx = px - shape.x;
    const dz = pz - shape.z;
    // Into the box's own frame (three.js rotates about +Y: x' = x cos + z sin).
    const lx = dx * cos - dz * sin;
    const lz = dx * sin + dz * cos;
    return Math.abs(lx) <= hw && Math.abs(lz) <= hd;
  }, 0);
}

/** The free cell nearest to a point (the point itself if it is free). */
export function nearestFree(grid, x, z, maxRadius = 4) {
  if (isFree(grid, x, z)) return [x, z];
  const [c0, r0] = cellOf(grid, x, z);
  const steps = Math.ceil(maxRadius / grid.cell);
  for (let ring = 1; ring <= steps; ring++) {
    let best = null;
    let bestD = Infinity;
    for (let dr = -ring; dr <= ring; dr++) {
      for (let dc = -ring; dc <= ring; dc++) {
        if (Math.max(Math.abs(dc), Math.abs(dr)) !== ring) continue;
        const c = c0 + dc;
        const r = r0 + dr;
        if (!inside(grid, c, r) || grid.cells[index(grid, c, r)] !== 1) continue;
        const [cx, cz] = centerOf(grid, c, r);
        const d = Math.hypot(cx - x, cz - z);
        if (d < bestD) { bestD = d; best = [cx, cz]; }
      }
    }
    if (best) return best;
  }
  return null;
}

/** True if a character can walk in a straight line from a to b. */
export function lineClear(grid, a, b) {
  const dist = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const steps = Math.max(1, Math.ceil(dist / (grid.cell * 0.5)));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    if (!isFree(grid, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)) return false;
  }
  return true;
}

class Heap {
  constructor() { this.items = []; }
  push(node, f) {
    const items = this.items;
    items.push([f, node]);
    let i = items.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (items[p][0] <= items[i][0]) break;
      [items[p], items[i]] = [items[i], items[p]];
      i = p;
    }
  }
  pop() {
    const items = this.items;
    const top = items[0];
    const last = items.pop();
    if (items.length) {
      items[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < items.length && items[l][0] < items[m][0]) m = l;
        if (r < items.length && items[r][0] < items[m][0]) m = r;
        if (m === i) break;
        [items[m], items[i]] = [items[i], items[m]];
        i = m;
      }
    }
    return top[1];
  }
  get size() { return this.items.length; }
}

const NEIGHBOURS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];

/**
 * A walkable path from `from` to `to` as a list of [x, z] waypoints, ending
 * exactly at the (nearest free) goal. Returns null when the goal cannot be
 * reached. Diagonal moves never cut a blocked corner.
 */
export function findPath(grid, from, to) {
  const start = nearestFree(grid, from[0], from[1]);
  const goal = nearestFree(grid, to[0], to[1]);
  if (!start || !goal) return null;
  if (lineClear(grid, start, goal)) return [goal];
  const [sc, sr] = cellOf(grid, start[0], start[1]);
  const [gc, gr] = cellOf(grid, goal[0], goal[1]);
  const total = grid.cols * grid.rows;
  const g = new Float32Array(total).fill(Infinity);
  const came = new Int32Array(total).fill(-1);
  const closed = new Uint8Array(total);
  const h = (c, r) => {
    const dx = Math.abs(c - gc);
    const dr = Math.abs(r - gr);
    return dx + dr + (Math.SQRT2 - 2) * Math.min(dx, dr);
  };
  const open = new Heap();
  const s = index(grid, sc, sr);
  g[s] = 0;
  open.push(s, h(sc, sr));
  const goalIndex = index(grid, gc, gr);
  while (open.size) {
    const current = open.pop();
    if (current === goalIndex) break;
    if (closed[current]) continue;
    closed[current] = 1;
    const c = current % grid.cols;
    const r = (current - c) / grid.cols;
    for (const [dc, dr, cost] of NEIGHBOURS) {
      const nc = c + dc;
      const nr = r + dr;
      if (!inside(grid, nc, nr)) continue;
      const n = index(grid, nc, nr);
      if (grid.cells[n] !== 1 || closed[n]) continue;
      if (dc && dr && (grid.cells[index(grid, c + dc, r)] !== 1 || grid.cells[index(grid, c, r + dr)] !== 1)) continue;
      const tentative = g[current] + cost;
      if (tentative < g[n]) {
        g[n] = tentative;
        came[n] = current;
        open.push(n, tentative + h(nc, nr));
      }
    }
  }
  if (came[goalIndex] === -1 && goalIndex !== s) return null;
  const cells = [];
  for (let at = goalIndex; at !== -1 && at !== s; at = came[at]) cells.push(at);
  cells.reverse();
  const points = cells.map(i => centerOf(grid, i % grid.cols, Math.floor(i / grid.cols)));
  points[points.length - 1] = goal;
  // String-pulling: skip every waypoint that a straight line can bypass.
  const smooth = [];
  let anchor = start;
  for (let i = 0; i < points.length; i++) {
    const next = points[i + 1];
    if (next && lineClear(grid, anchor, next)) continue;
    smooth.push(points[i]);
    anchor = points[i];
  }
  return smooth;
}
