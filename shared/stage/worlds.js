// The six dioramas. Each era is a floating island of voxel tiles with its own
// landmarks built from boxes, cylinders and cones, placed behind the spots in
// places.js where the character stands. Lamps switch on as night falls and a
// few things move (water, fire, boats, drones) so the world feels alive.

const GROUND = {
  greece: { grass: ['#9fbf5a', '#93b552', '#a8c766'], path: '#e3d3a8', dirt: '#b98a5a', rock: '#8c7a6a' },
  cordoba: { grass: ['#b9b46a', '#aaa75f', '#c4be74'], path: '#e8cfa0', dirt: '#b77a4c', rock: '#8e6d55' },
  edo: { grass: ['#7fae62', '#76a45b', '#89b86b'], path: '#cdb991', dirt: '#8a6a4c', rock: '#6d655e' },
  neanderthal: { grass: ['#7d9b58', '#728f50', '#89a561'], path: '#a99572', dirt: '#6f553d', rock: '#6a6660' },
  'future-city': { grass: ['#8a93b4', '#818aab', '#949dbd'], path: '#b3bad3', dirt: '#4a5070', rock: '#3a3f5a' },
  mars: { grass: ['#c4693d', '#b9613a', '#cf7444'], path: '#d99868', dirt: '#93472a', rock: '#7a3a24' },
};

const WATER = { normal: '#3f8fd0', deep: '#2f6fae', future: '#1b6c8c', mars: '#6aa6c9' };

export function buildWorld(THREE, stage, { eraId, island, places, burst }) {
  const { scene } = stage;
  const palette = GROUND[eraId] || GROUND.greece;
  const materials = new Map();
  const waterCells = new Set();
  const groundY = 0;

  function mat(color, emissive) {
    const key = `${color}|${emissive || ''}`;
    if (!materials.has(key)) {
      materials.set(key, new THREE.MeshLambertMaterial({ color, flatShading: true, emissive: emissive || '#000000' }));
    }
    return materials.get(key);
  }

  function place(mesh, x, y, z, { cast = true, receive = true, rotY = 0 } = {}) {
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotY;
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    scene.add(mesh);
    return mesh;
  }

  // Every kit call takes the footprint's centre (x, z) and the height of its base (y).
  const kit = {
    THREE,
    scene,
    /** Repeats `fn` while the stage lives; cleared on dispose. */
    every(ms, fn) {
      stage.timers.push(setInterval(() => { if (!document.hidden) fn(); }, ms));
    },
    box(x, y, z, w, h, d, color, opts = {}) {
      return place(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), opts.material || mat(color, opts.emissive)), x, y + h / 2, z, opts);
    },
    cyl(x, y, z, r, h, color, opts = {}) {
      const geometry = new THREE.CylinderGeometry(opts.rTop ?? r, r, h, opts.seg || 8);
      return place(new THREE.Mesh(geometry, mat(color, opts.emissive)), x, y + h / 2, z, opts);
    },
    cone(x, y, z, r, h, color, opts = {}) {
      const geometry = new THREE.ConeGeometry(r, h, opts.seg || 4);
      return place(new THREE.Mesh(geometry, mat(color, opts.emissive)), x, y + h / 2, z, { rotY: Math.PI / 4, ...opts });
    },
    dome(x, y, z, r, color, opts = {}) {
      const geometry = new THREE.SphereGeometry(r, opts.seg || 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
      return place(new THREE.Mesh(geometry, mat(color, opts.emissive)), x, y, z, opts);
    },
    /** A gabled roof: a triangular prism along x. */
    gable(x, y, z, w, h, d, color, opts = {}) {
      const shape = new THREE.Shape();
      shape.moveTo(-d / 2, 0);
      shape.lineTo(d / 2, 0);
      shape.lineTo(0, h);
      shape.closePath();
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false });
      geometry.translate(0, 0, -w / 2);
      const mesh = new THREE.Mesh(geometry, mat(color));
      mesh.rotation.y = Math.PI / 2 + (opts.rotY || 0);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      return mesh;
    },
    tree(x, z, style = 'round', colors = {}) {
      const trunk = colors.trunk || '#7a5233';
      const leaf = colors.leaf || '#4f8a3a';
      const leaf2 = colors.leaf2 || '#5f9c45';
      const s = 0.85 + ((x * 13 + z * 7) % 5) * 0.06;
      if (style === 'pine') {
        kit.box(x, 0, z, 0.3, 0.8, 0.3, trunk);
        kit.cone(x, 0.6, z, 1.1 * s, 1.4 * s, leaf, { seg: 6 });
        kit.cone(x, 1.4 * s, z, 0.85 * s, 1.2 * s, leaf2, { seg: 6 });
        kit.cone(x, 2.1 * s, z, 0.55 * s, 1 * s, leaf, { seg: 6 });
      } else if (style === 'cypress') {
        kit.box(x, 0, z, 0.25, 0.5, 0.25, trunk);
        kit.box(x, 0.4, z, 0.7, 2.6 * s, 0.7, leaf);
        kit.box(x, 3 * s, z, 0.45, 0.5, 0.45, leaf2);
      } else if (style === 'palm') {
        for (let i = 0; i < 6; i++) kit.box(x + i * 0.06, i * 0.5, z, 0.3, 0.5, 0.3, i % 2 ? trunk : colors.trunk2 || '#8f6a45');
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const leafMesh = kit.box(x + 0.36 + Math.cos(a) * 0.7, 3, z + Math.sin(a) * 0.7, 1.4, 0.12, 0.4, i % 2 ? leaf : leaf2, { rotY: -a });
          leafMesh.rotation.z = -0.25;
        }
      } else if (style === 'olive') {
        kit.box(x, 0, z, 0.3, 0.9, 0.3, '#6f6250');
        kit.box(x, 0.8, z, 1.8 * s, 0.7, 1.5 * s, leaf);
        kit.box(x + 0.2, 1.3, z - 0.1, 1.2 * s, 0.5, 1.1 * s, leaf2);
      } else {
        kit.box(x, 0, z, 0.35, 1.1, 0.35, trunk);
        kit.box(x, 1, z, 1.5 * s, 1.1 * s, 1.5 * s, leaf);
        kit.box(x, 1.9 * s, z, 1 * s, 0.7 * s, 1 * s, leaf2);
      }
    },
    rock(x, z, size = 1, color = palette.rock) {
      kit.box(x, 0, z, size, size * 0.6, size * 0.8, color, { rotY: (x + z) % 3 });
      kit.box(x + size * 0.2, size * 0.5, z, size * 0.6, size * 0.35, size * 0.5, color, { rotY: (x * z) % 2 });
    },
    lamp(x, y, z, color = '#ffcf70', { strength = 6, range = 7, size = 0.22 } = {}) {
      const bulbMaterial = new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0 });
      const bulb = place(new THREE.Mesh(new THREE.BoxGeometry(size, size * 1.3, size), bulbMaterial), x, y, z, { cast: false });
      let light = null;
      if (stage.lamps.length < 8) {
        light = new THREE.PointLight(color, 0, range, 1.6);
        light.position.set(x, y, z);
        scene.add(light);
      }
      stage.lamps.push({ set(night) { bulbMaterial.emissiveIntensity = 0.15 + night * 1.6; if (light) light.intensity = night * strength; } });
      return bulb;
    },
    fire(x, z) {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        kit.box(x + Math.cos(a) * 0.55, 0, z + Math.sin(a) * 0.55, 0.3, 0.22, 0.3, '#7d7770');
      }
      kit.box(x, 0, z, 0.9, 0.15, 0.2, '#5a3a20', { rotY: 0.6 });
      kit.box(x, 0, z, 0.9, 0.15, 0.2, '#5a3a20', { rotY: -0.6 });
      const flames = [0, 1, 2].map(i => kit.box(x, 0.1, z, 0.4 - i * 0.1, 0.4, 0.4 - i * 0.1, ['#ff7a1a', '#ffb52e', '#fff1a8'][i], { emissive: ['#ff5a00', '#ff9a00', '#ffe28a'][i], cast: false }));
      const light = new THREE.PointLight('#ff8a3d', 3, 8, 1.5);
      light.position.set(x, 1, z);
      scene.add(light);
      stage.animators.push((dt, t) => {
        flames.forEach((f, i) => {
          f.scale.y = 1 + Math.sin(t * (9 + i * 3)) * 0.35;
          f.position.y = 0.25 + i * 0.2 + Math.sin(t * 7 + i) * 0.04;
          f.rotation.y = t * (1 + i);
        });
        light.intensity = 2.4 + stage.night * 4 + Math.sin(t * 13) * 0.6;
      });
      kit.every(400, () => burst(new THREE.Vector3(x, 1, z), { count: 1, colors: ['#ffb52e'], up: 1.5, speed: 0.3, life: 0.9, gravity: -0.5, size: 0.08 }));
    },
    water(cx, cz, rx, rz) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        for (let z = Math.floor(cz - rz); z <= Math.ceil(cz + rz); z++) {
          if (((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2 <= 1) waterCells.add(`${x},${z}`);
        }
      }
    },
    animate(fn) {
      stage.animators.push(fn);
    },
    /** A point `dist` beyond a place, away from the island centre: where its landmark goes. */
    behind(placeId, dist = 3) {
      const p = places.find(entry => entry.id === placeId) || places[0];
      const [x, z] = p.pos;
      const len = Math.hypot(x, z) || 1;
      return [x + (x / len) * dist, z + (z / len) * dist];
    },
    pos(placeId) {
      return (places.find(entry => entry.id === placeId) || places[0]).pos;
    },
    scatter(count, fn, { avoid = 3.2, seed = 1 } = {}) {
      let s = seed * 9301 + 49297;
      const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
      let placed = 0;
      for (let tries = 0; placed < count && tries < count * 30; tries++) {
        const x = (rand() * 2 - 1) * (island - 1.5);
        const z = (rand() * 2 - 1) * (island - 1.5);
        if (Math.hypot(x, z) > island - 1.5) continue;
        if (places.some(p => Math.hypot(p.pos[0] - x, p.pos[1] - z) < avoid)) continue;
        if (waterCells.has(`${Math.round(x)},${Math.round(z)}`)) continue;
        if (onPath(x, z, 1.1)) continue;
        fn(x, z, rand);
        placed++;
      }
    },
  };

  // Paths run from home to every other place, so the walks follow roads.
  const home = places[0].pos;
  const segments = places.slice(1).map(p => [home, p.pos]);
  function onPath(x, z, width = 0.7) {
    return segments.some(([a, b]) => {
      const abx = b[0] - a[0];
      const abz = b[1] - a[1];
      const t = Math.max(0, Math.min(1, ((x - a[0]) * abx + (z - a[1]) * abz) / (abx * abx + abz * abz)));
      return Math.hypot(a[0] + abx * t - x, a[1] + abz * t - z) < width;
    });
  }

  const builder = BUILDERS[eraId] || BUILDERS.greece;
  builder(kit, { burst });

  // --- Ground: one instanced box per tile, plus cliff layers under the rim ---
  const tiles = [];
  for (let x = -island; x < island; x++) {
    for (let z = -island; z < island; z++) {
      const cx = x + 0.5;
      const cz = z + 0.5;
      const wobble = Math.sin(x * 1.7) * 0.6 + Math.cos(z * 1.3) * 0.6;
      if (Math.hypot(cx, cz) > island - 0.5 + wobble) continue;
      tiles.push([cx, cz]);
    }
  }
  const tileGeometry = new THREE.BoxGeometry(1, 1, 1);
  const groundMesh = new THREE.InstancedMesh(tileGeometry, new THREE.MeshLambertMaterial({ flatShading: true }), tiles.length * 4);
  groundMesh.receiveShadow = true;
  const water = [];
  const m4 = new THREE.Matrix4();
  const color = new THREE.Color();
  let n = 0;
  const waterColor = eraId === 'future-city' ? WATER.future : WATER.normal;
  tiles.forEach(([cx, cz]) => {
    const key = `${Math.round(cx - 0.5)},${Math.round(cz - 0.5)}`;
    const isWater = waterCells.has(key) || waterCells.has(`${Math.round(cx)},${Math.round(cz)}`);
    const hash = Math.abs(Math.sin(cx * 12.9898 + cz * 78.233) * 43758.5453) % 1;
    if (isWater) {
      water.push([cx, cz]);
      m4.makeTranslation(cx, -0.75, cz);
      groundMesh.setMatrixAt(n, m4);
      groundMesh.setColorAt(n++, color.set(palette.dirt));
    } else {
      m4.makeTranslation(cx, -0.5 + (hash > 0.93 ? 0.06 : 0), cz);
      groundMesh.setMatrixAt(n, m4);
      const top = onPath(cx, cz) ? palette.path : palette.grass[Math.floor(hash * palette.grass.length)];
      groundMesh.setColorAt(n++, color.set(top));
    }
    // Cliff layers: deeper and narrower towards the bottom, like a floating island.
    const r = Math.hypot(cx, cz);
    const depth = r > island - 3 ? 2 : r > island - 6 ? 1 : 0;
    for (let d = 1; d <= depth; d++) {
      m4.makeTranslation(cx, -0.5 - d, cz);
      groundMesh.setMatrixAt(n, m4);
      groundMesh.setColorAt(n++, color.set(d === 1 ? palette.dirt : palette.rock));
    }
  });
  groundMesh.count = n;
  groundMesh.instanceMatrix.needsUpdate = true;
  groundMesh.instanceColor.needsUpdate = true;
  scene.add(groundMesh);

  // A rock cone under the island so it reads as floating.
  const under = new THREE.Mesh(new THREE.ConeGeometry(island * 0.85, island * 0.9, 7), new THREE.MeshLambertMaterial({ color: palette.rock, flatShading: true }));
  under.rotation.x = Math.PI;
  under.position.y = -2.5 - island * 0.45;
  scene.add(under);

  if (water.length) {
    const waterMaterial = new THREE.MeshLambertMaterial({ color: waterColor, transparent: true, opacity: 0.88, flatShading: true });
    const waterMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.3, 1), waterMaterial, water.length);
    water.forEach(([cx, cz], i) => {
      m4.makeTranslation(cx, -0.3, cz);
      waterMesh.setMatrixAt(i, m4);
      waterMesh.setColorAt(i, color.set((i * 7) % 5 === 0 ? '#7cc0ec' : waterColor));
    });
    waterMesh.instanceMatrix.needsUpdate = true;
    scene.add(waterMesh);
    const base = new THREE.Color(waterColor);
    const shine = new THREE.Color('#9fd6f6');
    kit.animate((dt, t) => {
      water.forEach(([cx, cz], i) => {
        const v = (Math.sin(t * 1.6 + cx * 0.9 + cz * 1.3) + 1) / 2;
        waterMesh.setColorAt(i, color.copy(base).lerp(shine, v > 0.85 ? 0.7 : v * 0.15));
      });
      waterMesh.instanceColor.needsUpdate = true;
    });
  }

  return { groundY };
}

// --- Era builders -------------------------------------------------------------

const BUILDERS = {
  greece(k) {
    k.water(...k.behind('harbor', 3.2), 3.6, 3.6);
    // Home: whitewashed house with a terracotta roof.
    const [hx, hz] = k.behind('home', 2.6);
    k.box(hx, 0, hz, 3, 2, 2.6, '#f1ece0');
    k.gable(hx, 2, hz, 3.3, 1.1, 3, '#c0603a');
    k.box(hx + 0.5, 0, hz - 1.31, 0.7, 1.3, 0.05, '#6b4a2b');
    k.lamp(hx - 0.8, 1.4, hz - 1.4);
    // Agora: market stalls with striped awnings.
    const [ax, az] = k.behind('agora', 2.4);
    [[-1.6, 0], [0, 0.4], [1.6, 0]].forEach(([dx, dz], i) => {
      k.box(ax + dx, 0, az + dz, 1.3, 0.8, 0.9, '#9a6a3c');
      k.box(ax + dx, 1.5, az + dz, 1.5, 0.12, 1.1, ['#d9483b', '#3d6fb0', '#e1b23c'][i]);
      [[-0.6, -0.45], [0.6, -0.45], [-0.6, 0.45], [0.6, 0.45]].forEach(([px, pz]) => k.box(ax + dx + px, 0, az + dz + pz, 0.08, 1.5, 0.08, '#6b4a2b'));
      k.cyl(ax + dx - 0.3, 0.8, az + dz, 0.18, 0.4, '#b5643a', { rTop: 0.1 });
    });
    k.lamp(ax, 2, az - 1.2);
    // Pnyx: a stone speaking platform with steps.
    const [px, pz] = k.behind('assembly', 2.6);
    k.box(px, 0, pz, 4, 0.3, 3.2, '#d8d0c0');
    k.box(px, 0.3, pz + 0.3, 3, 0.3, 2.4, '#cfc6b4');
    k.box(px, 0.6, pz + 0.6, 1.2, 0.9, 0.8, '#bfb5a2');
    // Temple: a little Parthenon.
    const [tx, tz] = k.behind('temple', 3.2);
    k.box(tx, 0, tz, 6, 0.4, 4, '#e7e1d2');
    k.box(tx, 0.4, tz, 5.6, 0.2, 3.6, '#efe9da');
    for (let i = 0; i < 6; i++) {
      [-1.5, 1.5].forEach(dz => k.cyl(tx - 2.4 + i * 0.96, 0.6, tz + dz, 0.22, 2.4, '#f4f0e6', { seg: 8 }));
    }
    k.box(tx, 3, tz, 5.8, 0.4, 3.8, '#e9e3d4');
    k.gable(tx, 3.4, tz, 5.9, 0.9, 4, '#e2dccb');
    k.lamp(tx - 2.9, 1, tz - 2, '#ffb84a');
    k.lamp(tx + 2.9, 1, tz - 2, '#ffb84a');
    // Gymnasium: a sandy court with low walls.
    const [gx, gz] = k.behind('gymnasium', 2.6);
    k.box(gx, 0, gz, 4, 0.05, 3, '#e8d39a', { cast: false });
    k.box(gx, 0, gz - 1.5, 4, 0.6, 0.25, '#d9cfbd');
    k.box(gx - 2, 0, gz, 0.25, 0.6, 3, '#d9cfbd');
    k.cyl(gx + 1, 0, gz + 0.5, 0.25, 1.4, '#c9b48c');
    // Harbour: a boat bobbing on the water.
    const [bx, bz] = k.behind('harbor', 2.8);
    const hull = k.box(bx, -0.2, bz, 2.2, 0.5, 0.9, '#7a4a26');
    const mast = k.box(bx, 0.3, bz, 0.1, 2.2, 0.1, '#5a3a20');
    const sail = k.box(bx + 0.05, 0.9, bz, 0.05, 1.3, 1.1, '#f3ead6');
    k.animate((dt, t) => { const y = Math.sin(t * 1.4) * 0.06; hull.position.y = 0.05 + y; mast.position.y = 1.4 + y; sail.position.y = 1.55 + y; hull.rotation.z = Math.sin(t * 1.1) * 0.05; });
    // Olive grove.
    const [ox, oz] = k.behind('grove', 2.4);
    [[0, 0], [2, 1], [-1.8, 1.2], [0.8, -1.8]].forEach(([dx, dz]) => k.tree(ox + dx, oz + dz, 'olive', { leaf: '#8ea36a', leaf2: '#a0b47a' }));
    k.scatter(14, (x, z, r) => (r() > 0.5 ? k.tree(x, z, 'cypress', { leaf: '#2f6b3a', leaf2: '#3b7c45' }) : k.rock(x, z, 0.6 + r() * 0.5)), { seed: 3 });
  },

  cordoba(k) {
    k.water(...k.behind('river', 3.3), 4.5, 2.6);
    const [hx, hz] = k.behind('home', 2.6);
    k.box(hx, 0, hz, 3.2, 2, 2.8, '#efe3cc');
    k.box(hx, 2, hz, 3.4, 0.2, 3, '#c9763f');
    k.cyl(hx, 0, hz - 2.2, 0.6, 0.4, '#d8c7a6');
    k.cyl(hx, 0.4, hz - 2.2, 0.15, 0.4, '#5aa6d6', { emissive: '#1d4f73' });
    // Souk: awnings in saturated dyes.
    const [sx, sz] = k.behind('souk', 2.4);
    ['#b8322b', '#2f6db0', '#d6a12c', '#3d8a52'].forEach((c, i) => {
      const x = sx - 2.1 + i * 1.4;
      k.box(x, 0, sz, 1.1, 0.8, 0.9, '#8b5a33');
      k.box(x, 1.6, sz, 1.3, 0.1, 1.2, c);
      k.box(x - 0.55, 0, sz - 0.5, 0.08, 1.6, 0.08, '#5e3d22');
      k.box(x + 0.55, 0, sz - 0.5, 0.08, 1.6, 0.08, '#5e3d22');
    });
    k.lamp(sx, 1.9, sz - 1, '#ffb347');
    // Library: a domed hall.
    const [lx, lz] = k.behind('library', 3);
    k.box(lx, 0, lz, 3.6, 2.4, 3, '#e9dcc0');
    k.dome(lx, 2.4, lz, 1.4, '#c9a24a');
    for (let i = 0; i < 3; i++) k.box(lx - 1.1 + i * 1.1, 0.6, lz - 1.52, 0.5, 1.2, 0.05, '#4a3424');
    // Clinic.
    const [cx, cz] = k.behind('clinic', 2.6);
    k.box(cx, 0, cz, 2.8, 1.8, 2.4, '#f2eadb');
    k.box(cx, 1.8, cz, 3, 0.2, 2.6, '#b96c3a');
    k.lamp(cx + 1.2, 1.4, cz - 1.3, '#ffd27a');
    // Great Mosque: striped arches and a minaret.
    const [mx, mz] = k.behind('mosque', 3.2);
    k.box(mx, 0, mz, 6, 0.3, 3.4, '#e6d7b8');
    for (let i = 0; i < 6; i++) {
      const x = mx - 2.5 + i;
      k.box(x, 0.3, mz - 1.2, 0.3, 1.6, 0.3, '#efe4cc');
      k.box(x + 0.5, 1.6, mz - 1.2, 0.7, 0.35, 0.3, i % 2 ? '#c0392b' : '#f3ead6');
    }
    k.box(mx, 2, mz, 6, 0.4, 3.4, '#e6d7b8');
    k.box(mx + 2.4, 0, mz + 1, 1, 4.6, 1, '#e1cfa9');
    k.box(mx + 2.4, 4.6, mz + 1, 1.2, 0.3, 1.2, '#c9a24a');
    k.lamp(mx + 2.4, 5.1, mz + 1, '#ffe08a', { strength: 4 });
    // River: a turning waterwheel.
    const [rx, rz] = k.behind('river', 1.8);
    const wheel = new k.THREE.Mesh(new k.THREE.CylinderGeometry(1, 1, 0.3, 10), new k.THREE.MeshLambertMaterial({ color: '#7a5233', flatShading: true }));
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(rx, 0.7, rz);
    wheel.castShadow = true;
    k.animate((dt) => { wheel.rotation.y += dt * 0.8; });
    k.box(rx, 0, rz + 0.5, 0.25, 1.4, 0.25, '#5e3d22');
    stageAdd(k, wheel);
    k.scatter(12, (x, z, r) => (r() > 0.4 ? k.tree(x, z, 'palm', { leaf: '#3f8a3a', leaf2: '#56a24a' }) : k.tree(x, z, 'round', { leaf: '#3f7a35', leaf2: '#e08a2a' })), { seed: 5 });
  },

  edo(k) {
    k.water(...k.behind('canal', 3.2), 4.2, 2.4);
    const [hx, hz] = k.behind('home', 2.6);
    for (let i = 0; i < 2; i++) {
      k.box(hx - 1 + i * 2, 0, hz, 1.8, 1.6, 2.2, '#c9a77a');
      k.gable(hx - 1 + i * 2, 1.6, hz, 1.9, 0.8, 2.6, '#3b3a44');
    }
    k.lamp(hx, 1.2, hz - 1.2, '#ff9a5a');
    // Market: stalls with indigo noren curtains.
    const [mx, mz] = k.behind('market', 2.4);
    [0, 1, 2].forEach(i => {
      const x = mx - 1.6 + i * 1.6;
      k.box(x, 0, mz, 1.3, 0.8, 0.9, '#8c6a46');
      k.gable(x, 1.4, mz, 1.5, 0.5, 1.3, '#4a4652');
      k.box(x, 0.9, mz - 0.6, 1.2, 0.5, 0.04, i === 1 ? '#c0392b' : '#2e3f7c');
    });
    // Temple: a three-tier pagoda and a torii gate.
    const [tx, tz] = k.behind('temple', 3.4);
    for (let i = 0; i < 3; i++) {
      const s = 2.6 - i * 0.6;
      k.box(tx, i * 1.4, tz, s * 0.7, 1, s * 0.7, '#b8392f');
      k.cone(tx, i * 1.4 + 1, tz, s * 0.85, 0.6, '#2f2c36', { seg: 4 });
    }
    k.box(tx, 4.2, tz, 0.12, 1.2, 0.12, '#d4af37');
    const [gx, gz] = k.pos('temple');
    k.box(gx - 1, 0, gz - 1.6, 0.25, 2.2, 0.25, '#c8372d');
    k.box(gx + 1, 0, gz - 1.6, 0.25, 2.2, 0.25, '#c8372d');
    k.box(gx, 2.1, gz - 1.6, 2.8, 0.25, 0.3, '#2a2a2a');
    k.box(gx, 1.7, gz - 1.6, 2.2, 0.15, 0.2, '#c8372d');
    // Tea-house with red paper lanterns.
    const [hx2, hz2] = k.behind('teahouse', 2.8);
    k.box(hx2, 0, hz2, 3, 1.8, 2.4, '#d8c39a');
    k.gable(hx2, 1.8, hz2, 3.3, 0.9, 2.9, '#3b3a44');
    k.lamp(hx2 - 1, 1.5, hz2 - 1.35, '#ff5a3a', { size: 0.3 });
    k.lamp(hx2 + 1, 1.5, hz2 - 1.35, '#ff5a3a', { size: 0.3 });
    // Fire-watch tower with a bell.
    const [fx, fz] = k.behind('street', 2.6);
    [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]].forEach(([dx, dz]) => k.box(fx + dx, 0, fz + dz, 0.15, 4, 0.15, '#5a3a20'));
    k.box(fx, 4, fz, 1.4, 0.15, 1.4, '#6b4a2b');
    k.gable(fx, 4.6, fz, 1.5, 0.5, 1.5, '#3b3a44');
    k.cyl(fx, 4.15, fz, 0.2, 0.35, '#c9a24a');
    // Canal: an arched bridge and a drifting boat.
    const [cx, cz] = k.behind('canal', 3.2);
    k.box(cx, 0.2, cz, 1.4, 0.2, 5, '#a0703d');
    k.box(cx, 0.4, cz - 2.4, 1.4, 0.15, 0.2, '#c8372d');
    k.box(cx, 0.4, cz + 2.4, 1.4, 0.15, 0.2, '#c8372d');
    const boat = k.box(cx + 2, -0.15, cz, 0.7, 0.3, 1.8, '#6b4a2b');
    k.animate((dt, t) => { boat.position.z = cz + Math.sin(t * 0.3) * 1.6; boat.position.y = Math.sin(t * 1.5) * 0.05; });
    k.scatter(13, (x, z, r) => (r() > 0.45 ? k.tree(x, z, 'round', { leaf: '#f2a7c3', leaf2: '#f7c6d8', trunk: '#5a3a2e' }) : k.tree(x, z, 'pine', { leaf: '#2f5a3a', leaf2: '#3b6c45' })), { seed: 7 });
  },

  neanderthal(k) {
    k.water(...k.behind('river', 3), 5, 2.4);
    const [fx, fz] = k.pos('camp');
    k.fire(fx + 1.2, fz - 1.2);
    // Hide tents around the fire.
    [[-1.4, -2.6], [2.8, 0.4]].forEach(([dx, dz]) => {
      k.cone(fx + dx, 0, fz + dz, 1.1, 1.9, '#9a7048', { seg: 6 });
      k.box(fx + dx, 1.8, fz + dz, 0.08, 0.6, 0.08, '#5a3a20');
    });
    // Cave: a rocky hill with a dark mouth.
    const [cx, cz] = k.behind('cave', 3.2);
    k.box(cx, 0, cz, 5, 2.4, 4, '#7d7870');
    k.box(cx + 0.4, 2.4, cz + 0.4, 3.6, 1.4, 3, '#8a857c');
    k.box(cx - 0.2, 3.8, cz + 0.6, 2, 0.8, 2, '#948f86');
    const [mx, mz] = k.pos('cave');
    const dir = Math.atan2(mx - cx, mz - cz);
    k.box(cx + Math.sin(dir) * 2, 0, cz + Math.cos(dir) * 2, 1.6, 1.6, 0.2, '#18161a', { rotY: dir, cast: false });
    k.lamp(cx + Math.sin(dir) * 2.2, 0.4, cz + Math.cos(dir) * 2.2, '#ff8a3d', { strength: 3 });
    // Forest.
    const [ox, oz] = k.behind('forest', 2.6);
    [[0, 0], [1.8, 0.8], [-1.6, 1], [0.6, 2.2], [-0.4, -1.8]].forEach(([dx, dz]) => k.tree(ox + dx, oz + dz, 'pine', { leaf: '#2e5a35', leaf2: '#3a6b40' }));
    // Hunting grounds: a mammoth grazing.
    const [hx, hz] = k.behind('hunt', 3);
    const body = k.box(hx, 0.9, hz, 2.6, 1.8, 1.6, '#6e4a2c');
    k.box(hx + 1.6, 1.4, hz, 1, 1.2, 1.1, '#5f3f25');
    k.box(hx + 2.1, 0.4, hz, 0.35, 1.2, 0.35, '#5f3f25');
    k.box(hx + 2, 0.9, hz - 0.4, 0.9, 0.12, 0.12, '#f1ead8');
    k.box(hx + 2, 0.9, hz + 0.4, 0.9, 0.12, 0.12, '#f1ead8');
    [[-0.9, -0.5], [0.9, -0.5], [-0.9, 0.5], [0.9, 0.5]].forEach(([dx, dz]) => k.box(hx + dx, 0, hz + dz, 0.45, 0.95, 0.45, '#5f3f25'));
    k.animate((dt, t) => { body.position.y = 1.8 + Math.sin(t * 1.2) * 0.03; });
    k.scatter(16, (x, z, r) => (r() > 0.5 ? k.tree(x, z, 'pine', { leaf: '#2e5a35', leaf2: '#3a6b40' }) : k.rock(x, z, 0.6 + r() * 0.8)), { seed: 9 });
  },

  'future-city'(k) {
    const neon = ['#2de2e6', '#ff3fa4', '#f6e05e', '#7c5cff'];
    // Pod tower.
    const [px, pz] = k.behind('pod', 2.6);
    k.box(px, 0, pz, 2.6, 4, 2.4, '#a3abc9');
    for (let i = 0; i < 4; i++) k.box(px, 0.5 + i, pz - 1.21, 2, 0.5, 0.05, '#1c1f2c', { emissive: neon[i % 2], cast: false });
    // Street level: food stalls under neon signs.
    const [sx, sz] = k.behind('street', 2.4);
    [0, 1, 2].forEach(i => {
      const x = sx - 1.6 + i * 1.6;
      k.box(x, 0, sz, 1.3, 0.9, 0.9, '#4a5070');
      k.box(x, 1.7, sz - 0.2, 1.2, 0.35, 0.1, '#111', { emissive: neon[i], cast: false });
    });
    k.lamp(sx, 2.6, sz - 1, '#ff3fa4', { strength: 5 });
    // Corporate tower: tall, glassy, with window strips.
    const [tx, tz] = k.behind('tower', 3.4);
    k.box(tx, 0, tz, 3.2, 9, 3.2, '#7f95c4');
    for (let i = 0; i < 8; i++) k.box(tx, 0.8 + i * 1.05, tz, 3.25, 0.18, 3.25, '#1d2236', { emissive: '#9fd8ff', cast: false });
    k.box(tx, 9, tz, 1.2, 1.2, 1.2, '#2a2f44');
    k.lamp(tx, 10.4, tz, '#ff3355', { strength: 0, size: 0.3 });
    // Rooftop garden with a hovering drone.
    const [rx, rz] = k.behind('rooftop', 2.8);
    k.box(rx, 0, rz, 3.4, 3, 3, '#a9b1cf');
    k.box(rx, 3, rz, 3.2, 0.3, 2.8, '#4f8a3a');
    k.tree(rx - 0.8, rz, 'round', { leaf: '#3fae5a', leaf2: '#59c46f' });
    const drone = k.box(rx + 1, 4.6, rz - 1, 0.6, 0.15, 0.6, '#d9dde8', { emissive: '#2de2e6' });
    k.animate((dt, t) => { drone.position.set(rx + Math.cos(t * 0.8) * 2.4, 4.6 + Math.sin(t * 2) * 0.3, rz + Math.sin(t * 0.8) * 2.4); drone.rotation.y = t; });
    // Server district: racks of blinking lights.
    const [ux, uz] = k.behind('underground', 2.6);
    const blinkers = [];
    for (let i = 0; i < 4; i++) {
      k.box(ux - 1.5 + i, 0, uz, 0.8, 2.2, 0.8, '#30354a');
      for (let j = 0; j < 4; j++) blinkers.push(k.box(ux - 1.5 + i, 0.3 + j * 0.45, uz - 0.41, 0.5, 0.08, 0.02, '#111', { emissive: neon[(i + j) % 4], cast: false }));
    }
    k.animate((dt, t) => blinkers.forEach((b, i) => { b.visible = Math.sin(t * 3 + i * 1.7) > -0.3; }));
    // Flying cars on a loop around the skyline.
    for (let i = 0; i < 3; i++) {
      const car = k.box(0, 6 + i, 0, 1, 0.35, 0.5, '#e8e8f0', { emissive: neon[i] });
      k.animate((dt, t) => { const a = t * (0.25 + i * 0.07) + i * 2; car.position.set(Math.cos(a) * 13, 6 + i * 1.3, Math.sin(a) * 13); car.rotation.y = -a; });
    }
    k.scatter(10, (x, z, r) => {
      const h = 2 + r() * 5;
      k.box(x, 0, z, 1.6, h, 1.6, ['#8e9ac4', '#9ca7cf', '#8290bd'][Math.floor(r() * 3)]);
      k.box(x, h * 0.6, z - 0.81, 1.2, 0.2, 0.02, '#111', { emissive: neon[Math.floor(r() * 4)], cast: false });
    }, { seed: 11, avoid: 3.6 });
  },

  mars(k, { burst }) {
    const [hx, hz] = k.behind('habitat', 2.4);
    k.dome(hx, 0, hz, 2, '#e8e6e1');
    k.dome(hx + 2.6, 0, hz + 1, 1.3, '#dcdad4');
    k.cyl(hx + 1.4, 0.5, hz + 0.5, 0.45, 0.9, '#c9c6bf', { seg: 8 });
    for (let i = 0; i < 4; i++) k.lamp(hx - 1.6 + i * 1.05, 1, hz - 1.25 + Math.abs(i - 1.5) * 0.2, '#bfe6ff', { strength: i === 0 ? 4 : 0, size: 0.18 });
    // Med bay.
    const [cx, cz] = k.behind('clinic', 2.4);
    k.box(cx, 0, cz, 2.6, 1.6, 2, '#f1f0ec');
    k.box(cx, 0.6, cz - 1.01, 0.6, 0.2, 0.02, '#d13b3b', { cast: false });
    k.box(cx, 0.4, cz - 1.01, 0.2, 0.6, 0.02, '#d13b3b', { cast: false });
    // Life support: tanks and a spinning vent.
    const [lx, lz] = k.behind('lifesupport', 2.6);
    [-1, 0, 1].forEach(i => k.cyl(lx + i * 1.1, 0, lz, 0.45, 2.2, i ? '#d0d4da' : '#8fb7d6', { seg: 10 }));
    const fan = k.box(lx, 2.4, lz + 1.4, 1.2, 0.1, 0.2, '#555b66');
    k.box(lx, 0, lz + 1.4, 0.3, 2.4, 0.3, '#9aa1ab');
    k.animate((dt) => { fan.rotation.y += dt * 6; });
    // Greenhouse: a glowing glass dome.
    const [gx, gz] = k.behind('greenhouse', 2.8);
    const glass = new k.THREE.MeshLambertMaterial({ color: '#bfefff', transparent: true, opacity: 0.45, emissive: '#2a5a3a' });
    const greenhouse = new k.THREE.Mesh(new k.THREE.SphereGeometry(2.2, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), glass);
    greenhouse.position.set(gx, 0, gz);
    stageAdd(k, greenhouse);
    [[-0.8, 0], [0.6, 0.6], [0.2, -0.8]].forEach(([dx, dz]) => k.tree(gx + dx, gz + dz, 'round', { leaf: '#4fbf5a', leaf2: '#6fd879', trunk: '#6b5a40' }));
    k.lamp(gx, 2.4, gz, '#c8ff9a', { strength: 3 });
    // Surface: a rover and solar panels.
    const [sx, sz] = k.behind('surface', 2.8);
    const rover = k.box(sx, 0.4, sz, 1.8, 0.6, 1.1, '#e6e3dc');
    k.box(sx + 0.4, 1, sz, 0.6, 0.4, 0.8, '#3a3f4a');
    [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]].forEach(([dx, dz]) => k.cyl(sx + dx, 0, sz + dz, 0.25, 0.25, '#2a2a2a', { seg: 8 }));
    k.animate((dt, t) => { rover.rotation.y = Math.sin(t * 0.3) * 0.15; });
    for (let i = 0; i < 3; i++) {
      const panel = k.box(sx - 2 + i * 1.4, 0.9, sz - 2.4, 1.2, 0.06, 0.8, '#2b3d6b', { emissive: '#0d1a33' });
      panel.rotation.x = -0.4;
      k.box(sx - 2 + i * 1.4, 0, sz - 2.4, 0.08, 0.9, 0.08, '#9aa1ab');
    }
    // Drifting dust.
    k.every(300, () => burst(new k.THREE.Vector3((Math.random() - 0.5) * 20, 0.3, (Math.random() - 0.5) * 20), { count: 2, colors: ['#e9b38a', '#d89a6e'], up: 0.6, speed: 1.4, life: 2.2, gravity: -0.1, size: 0.1 }));
    k.scatter(18, (x, z, r) => k.rock(x, z, 0.5 + r() * 1.1, ['#8e4228', '#a34d2e', '#7a3a24'][Math.floor(r() * 3)]), { seed: 13 });
  },
};

function stageAdd(k, mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  k.scene.add(mesh);
}
