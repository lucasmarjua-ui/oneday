// The dioramas. Every event is told across several scenes, and each scene is
// built here from boxes, cylinders and cones: rooms are cut-away interiors
// with two back walls, islands are floating voxel ground. Landmarks sit behind
// the spots in places.js where the character stands. Lamps glow, alarms
// flash, water shimmers and a few things move, so each scene feels alive.

const GROUND = {
  moon: { top: ['#a3a39e', '#989893', '#adada8'], path: '#b9b9b4', dirt: '#6c6c69', rock: '#55554f' },
  sand: { top: ['#e2c48d', '#d9b981', '#e8cc98'], path: '#cfae74', dirt: '#b98c55', rock: '#9c7348' },
  limestone: { top: ['#e6dcc4', '#ddd2b8', '#ece3cd'], path: '#d3c6a8', dirt: '#b8a882', rock: '#9c8d6c' },
};

const ROOMS = {
  columbia: { floor: ['#4f545f', '#4a4f5a'], wall: '#8b909b', trim: '#5c616c' },
  eagle: { floor: ['#44474f', '#3f424a'], wall: '#757a85', trim: '#55596a' },
  house: { floor: ['#b99467', '#b08b5f'], wall: '#d3b384', trim: '#a8824f' },
};

export function buildWorld(THREE, stage, { eraId, sceneId, scene: config, places, burst }) {
  const root = stage.root;
  const materials = new Map();
  const waterCells = new Set();

  function mat(color, emissive) {
    const key = `${color}|${emissive || ''}`;
    if (!materials.has(key)) materials.set(key, new THREE.MeshLambertMaterial({ color, flatShading: true, emissive: emissive || '#000000' }));
    return materials.get(key);
  }

  function place(mesh, x, y, z, { cast = true, receive = true, rotY = 0 } = {}) {
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotY;
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    root.add(mesh);
    return mesh;
  }

  // Every kit call takes the footprint's centre (x, z) and the height of its base (y).
  const kit = {
    THREE,
    every(ms, fn) {
      stage.timers.push(setInterval(() => { if (!document.hidden) fn(); }, ms));
    },
    box(x, y, z, w, h, d, color, opts = {}) {
      return place(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), opts.material || mat(color, opts.emissive)), x, y + h / 2, z, opts);
    },
    cyl(x, y, z, r, h, color, opts = {}) {
      return place(new THREE.Mesh(new THREE.CylinderGeometry(opts.rTop ?? r, r, h, opts.seg || 8), mat(color, opts.emissive)), x, y + h / 2, z, opts);
    },
    cone(x, y, z, r, h, color, opts = {}) {
      return place(new THREE.Mesh(new THREE.ConeGeometry(r, h, opts.seg || 4), mat(color, opts.emissive)), x, y + h / 2, z, { rotY: Math.PI / 4, ...opts });
    },
    sphere(x, y, z, r, color, opts = {}) {
      return place(new THREE.Mesh(new THREE.SphereGeometry(r, opts.seg || 12, opts.seg ? opts.seg / 2 : 8), mat(color, opts.emissive)), x, y, z, opts);
    },
    tree(x, z, style = 'palm', colors = {}) {
      const trunk = colors.trunk || '#8a6a45';
      const leaf = colors.leaf || '#4f8a3a';
      const leaf2 = colors.leaf2 || '#62a04a';
      if (style === 'palm') {
        for (let i = 0; i < 6; i++) kit.box(x + i * 0.06, i * 0.5, z, 0.3, 0.5, 0.3, i % 2 ? trunk : '#9b7a52');
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const frond = kit.box(x + 0.36 + Math.cos(a) * 0.7, 3, z + Math.sin(a) * 0.7, 1.4, 0.12, 0.4, i % 2 ? leaf : leaf2, { rotY: -a });
          frond.rotation.z = -0.25;
        }
      } else {
        kit.box(x, 0, z, 0.35, 1.1, 0.35, trunk);
        kit.box(x, 1, z, 1.5, 1.1, 1.5, leaf);
        kit.box(x, 1.9, z, 1, 0.7, 1, leaf2);
      }
    },
    rock(x, z, size = 1, color = '#8c7a6a', y = 0) {
      kit.box(x, y, z, size, size * 0.6, size * 0.8, color, { rotY: (x + z) % 3 });
      kit.box(x + size * 0.2, y + size * 0.5, z, size * 0.6, size * 0.35, size * 0.5, color, { rotY: (x * z) % 2 });
    },
    lamp(x, y, z, color = '#ffcf70', { strength = 6, range = 7, size = 0.22, always = false } = {}) {
      const bulbMaterial = new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0 });
      const bulb = place(new THREE.Mesh(new THREE.BoxGeometry(size, size * 1.3, size), bulbMaterial), x, y, z, { cast: false });
      let light = null;
      if (stage.lamps.length < 8) {
        light = new THREE.PointLight(color, 0, range, 1.6);
        light.position.set(x, y, z);
        root.add(light);
      }
      stage.lamps.push({ set(night) { const on = always ? 1 : night; bulbMaterial.emissiveIntensity = 0.15 + on * 1.6; if (light) light.intensity = on * strength; } });
      return bulb;
    },
    /** A warning light that flashes while the stage's alarm is on. */
    alarm(x, y, z, color = '#ff3b3b') {
      const bulbMaterial = new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0.1 });
      place(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), bulbMaterial), x, y, z, { cast: false });
      const light = new THREE.PointLight(color, 0, 9, 1.4);
      light.position.set(x, y, z);
      root.add(light);
      stage.alarms.push({ set(level) { bulbMaterial.emissiveIntensity = 0.1 + level * 2.2; light.intensity = level * 7; } });
    },
    /** A glowing screen or window: an emissive flat panel. */
    screen(x, y, z, w, h, color, { facing = 'z', depth = 0.06 } = {}) {
      const [sw, sd] = facing === 'z' ? [w, depth] : [depth, w];
      return kit.box(x, y, z, sw, h, sd, color, { emissive: color, cast: false });
    },
    fire(x, z, { y = 0, scale = 1 } = {}) {
      const flames = [0, 1, 2].map(i => kit.box(x, y + 0.1, z, (0.4 - i * 0.1) * scale, 0.4 * scale, (0.4 - i * 0.1) * scale, ['#ff7a1a', '#ffb52e', '#fff1a8'][i], { emissive: ['#ff5a00', '#ff9a00', '#ffe28a'][i], cast: false }));
      const light = new THREE.PointLight('#ff8a3d', 3, 7, 1.5);
      light.position.set(x, y + 1, z);
      root.add(light);
      stage.animators.push((dt, t) => {
        flames.forEach((f, i) => {
          f.scale.y = 1 + Math.sin(t * (9 + i * 3)) * 0.35;
          f.position.y = y + (0.25 + i * 0.2) * scale + Math.sin(t * 7 + i) * 0.04;
          f.rotation.y = t * (1 + i);
        });
        light.intensity = 2.2 + stage.night * 3 + Math.sin(t * 13) * 0.6;
      });
      kit.every(450, () => burst(new THREE.Vector3(x, y + 1, z), { count: 1, colors: ['#ffb52e'], up: 1.5, speed: 0.3, life: 0.9, gravity: -0.5, size: 0.08 }));
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
    pos(placeId) {
      return kit.place(placeId).pos;
    },
    place(placeId) {
      return places.find(entry => entry.id === placeId) || { pos: [0, 0] };
    },
  };

  // --- Ground ---------------------------------------------------------------------
  const m4 = new THREE.Matrix4();
  const color = new THREE.Color();
  const builder = SCENES[eraId]?.[sceneId];
  const groundKind = builder?.ground || 'sand';
  const spots = [config.entrance || [0, 0], ...places.map(p => p.pos)];
  function onPath(x, z, width = 0.7) {
    const [hx, hz] = spots[0];
    return spots.slice(1).some(([bx, bz]) => {
      const abx = bx - hx;
      const abz = bz - hz;
      const len = abx * abx + abz * abz || 1;
      const t = Math.max(0, Math.min(1, ((x - hx) * abx + (z - hz) * abz) / len));
      return Math.hypot(hx + abx * t - x, hz + abz * t - z) < width;
    });
  }

  if (builder?.before) builder.before(kit);

  if (config.kind === 'room') {
    const [w, d] = config.size;
    const room = ROOMS[sceneId] || ROOMS.house;
    const floor = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.4, 1), new THREE.MeshLambertMaterial({ flatShading: true }), w * d);
    let n = 0;
    for (let x = 0; x < w; x++) {
      for (let z = 0; z < d; z++) {
        m4.makeTranslation(x - w / 2 + 0.5, -0.2, z - d / 2 + 0.5);
        floor.setMatrixAt(n, m4);
        floor.setColorAt(n++, color.set(room.floor[(x + z) % room.floor.length]));
      }
    }
    floor.receiveShadow = true;
    root.add(floor);
    // A cut-away room: two back walls, a plinth underneath.
    kit.box(-w / 2 - 0.2, -0.4, 0, 0.4, 3.6, d + 0.4, room.wall, { cast: true });
    kit.box(0, -0.4, -d / 2 - 0.2, w, 3.6, 0.4, room.wall, { cast: true });
    kit.box(0, -1.2, 0, w + 0.4, 0.8, d + 0.4, room.trim, { cast: false });
    kit.box(-w / 2 - 0.2, 3.2, 0, 0.5, 0.2, d + 0.5, room.trim);
    kit.box(0, 3.2, -d / 2 - 0.2, w + 0.5, 0.2, 0.5, room.trim);
  } else {
    const palette = GROUND[groundKind] || GROUND.sand;
    const half = config.size;
    const tiles = [];
    for (let x = -half; x < half; x++) {
      for (let z = -half; z < half; z++) {
        const cx = x + 0.5;
        const cz = z + 0.5;
        const wobble = Math.sin(x * 1.7) * 0.6 + Math.cos(z * 1.3) * 0.6;
        if (Math.hypot(cx, cz) > half - 0.5 + wobble) continue;
        tiles.push([cx, cz]);
      }
    }
    const ground = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ flatShading: true }), tiles.length * 4);
    ground.receiveShadow = true;
    const water = [];
    let n = 0;
    tiles.forEach(([cx, cz]) => {
      const key = `${Math.round(cx - 0.5)},${Math.round(cz - 0.5)}`;
      const isWater = waterCells.has(key);
      const hash = Math.abs(Math.sin(cx * 12.9898 + cz * 78.233) * 43758.5453) % 1;
      if (isWater) {
        water.push([cx, cz]);
        m4.makeTranslation(cx, -0.75, cz);
        ground.setMatrixAt(n, m4);
        ground.setColorAt(n++, color.set(palette.dirt));
      } else {
        m4.makeTranslation(cx, -0.5 + (hash > 0.93 ? 0.06 : 0), cz);
        ground.setMatrixAt(n, m4);
        ground.setColorAt(n++, color.set(onPath(cx, cz) ? palette.path : palette.top[Math.floor(hash * palette.top.length)]));
      }
      const r = Math.hypot(cx, cz);
      const depth = r > half - 3 ? 2 : r > half - 5 ? 1 : 0;
      for (let k = 1; k <= depth; k++) {
        m4.makeTranslation(cx, -0.5 - k, cz);
        ground.setMatrixAt(n, m4);
        ground.setColorAt(n++, color.set(k === 1 ? palette.dirt : palette.rock));
      }
    });
    ground.count = n;
    ground.instanceMatrix.needsUpdate = true;
    ground.instanceColor.needsUpdate = true;
    root.add(ground);

    const under = new THREE.Mesh(new THREE.ConeGeometry(half * 0.85, half * 0.9, 7), new THREE.MeshLambertMaterial({ color: palette.rock, flatShading: true }));
    under.rotation.x = Math.PI;
    under.position.y = -2.5 - half * 0.45;
    root.add(under);

    if (water.length) {
      const waterColor = '#2f86c4';
      const waterMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.3, 1), new THREE.MeshLambertMaterial({ color: waterColor, transparent: true, opacity: 0.9, flatShading: true }), water.length);
      water.forEach(([cx, cz], i) => {
        m4.makeTranslation(cx, -0.3, cz);
        waterMesh.setMatrixAt(i, m4);
        waterMesh.setColorAt(i, color.set(waterColor));
      });
      waterMesh.instanceMatrix.needsUpdate = true;
      root.add(waterMesh);
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

    // Ground detail on open tiles: grass and reeds in Egypt, pebbles on the Moon.
    const detail = { sand: ['#b9a26a', '#9c8a55'], moon: ['#7b7b77', '#6a6a66'], limestone: ['#c2b592', '#b0a27d'] }[groundKind];
    const tufts = [];
    tiles.forEach(([cx, cz]) => {
      if (waterCells.has(`${Math.round(cx - 0.5)},${Math.round(cz - 0.5)}`) || onPath(cx, cz, 0.9)) return;
      const h = Math.abs(Math.sin(cx * 91.7 + cz * 47.3) * 9301.17) % 1;
      if (h < 0.3) tufts.push([cx + (h - 0.15) * 1.4, cz + (((h * 7) % 1) - 0.5) * 0.7, h]);
    });
    const tuftMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.125, 0.0625, 0.125), new THREE.MeshLambertMaterial({ flatShading: true }), tufts.length);
    tufts.forEach(([x, z, h], i) => {
      m4.makeTranslation(x, 0.03, z);
      tuftMesh.setMatrixAt(i, m4);
      tuftMesh.setColorAt(i, color.set(detail[Math.floor(h * 10) % detail.length]));
    });
    tuftMesh.userData.isSprite = true;
    tuftMesh.receiveShadow = true;
    if (tufts.length) root.add(tuftMesh);
  }

  builder?.build(kit, { burst, config });
  return { groundY: 0 };
}

// --- Scenes -----------------------------------------------------------------------

const SCENES = {
  'apollo-11': {
    columbia: {
      build(k) {
        // Main display console along the back wall.
        k.box(0, 0.6, -2.7, 4.6, 1.6, 0.5, '#3b3f48');
        for (let i = 0; i < 9; i++) for (let j = 0; j < 3; j++) k.screen(-2 + i * 0.5, 1 + j * 0.4, -2.44, 0.2, 0.12, ['#7dff9b', '#ffd84a', '#ffffff'][(i + j) % 3]);
        k.screen(-0.5, 1.2, -2.44, 0.7, 0.5, '#13361e');
        // Three couches.
        [-1.5, 0, 1.5].forEach(x => {
          k.box(x, 0, -1.1, 1, 0.5, 1.4, '#d8d5cc');
          k.box(x, 0.5, -1.7, 1, 0.9, 0.3, '#c9c6bd');
        });
        // Window with the Moon outside.
        k.box(-3.3, 1.2, 0.6, 0.25, 1.2, 1.2, '#0b0c14');
        k.screen(-3.18, 1.45, 0.6, 0.6, 0.6, '#cfcfc9', { facing: 'x' });
        // Sleeping bag, food lockers, a floating pen.
        k.box(-3.25, 0.6, -1.8, 0.2, 1.8, 0.7, '#6fa2d6');
        k.box(2.6, 0, 1.6, 1, 0.9, 1, '#9da1aa');
        const pen = k.box(1, 1.8, 0.8, 0.5, 0.06, 0.06, '#d33b2c', { cast: false });
        k.animate((dt, t) => { pen.position.y = 1.8 + Math.sin(t * 0.8) * 0.2; pen.rotation.y = t * 0.3; pen.rotation.z = t * 0.2; });
        k.lamp(1.5, 2.8, -2.2, '#e8f1ff', { always: true, strength: 4 });
        k.alarm(-1.8, 2.3, -2.4, '#ff3b3b');
      },
    },
    eagle: {
      build(k) {
        // Two triangular windows looking down at the Moon.
        [[-1.2, '#bdbdb8'], [1.2, '#b1b1ac']].forEach(([x, c]) => {
          const frame = k.box(x, 1.4, -2.3, 1, 1, 0.3, '#2b2d33');
          frame.rotation.z = Math.PI / 4;
          k.screen(x, 1.55, -2.13, 0.6, 0.6, c);
        });
        // Instrument panels and the guidance computer (DSKY).
        k.box(0, 0, -1.9, 1.4, 1.2, 0.6, '#4a4e58');
        k.box(-2.6, 0.4, -0.6, 0.6, 2, 2.4, '#4a4e58');
        for (let i = 0; i < 6; i++) k.screen(-2.28, 0.9 + (i % 3) * 0.4, -1.2 + Math.floor(i / 3) * 0.9, 0.3, 0.12, i % 2 ? '#ffd84a' : '#ffffff', { facing: 'x' });
        k.screen(0, 1.25, -1.58, 0.8, 0.5, '#1c5a2c');
        k.screen(0.15, 1.3, -1.55, 0.4, 0.12, '#7dff9b');
        k.alarm(-0.35, 1.25, -1.55, '#ffcc33');
        // Floor hatch and backpacks.
        k.box(1.2, 0, 1.2, 1.2, 0.12, 1.2, '#2b2d33');
        k.box(2.2, 0, -1.2, 0.8, 1.2, 0.5, '#e8e8e2');
        k.box(2.2, 0, -0.4, 0.8, 1.2, 0.5, '#e8e8e2');
        k.lamp(0, 2.8, 0.5, '#fff1d6', { always: true, strength: 4 });
      },
    },
    surface: {
      ground: 'moon',
      build(k) {
        // Eagle: gold-foil descent stage on four legs, grey ascent stage on top.
        const [lx, lz] = [-2.5, -1.5];
        k.box(lx, 0.8, lz, 2.4, 1.2, 2.4, '#d4a73a', { emissive: '#3a2a06' });
        [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]].forEach(([dx, dz]) => {
          k.box(lx + dx * 0.85, 0.2, lz + dz * 0.85, 0.12, 1.1, 0.12, '#bfbfbf');
          k.cyl(lx + dx, 0, lz + dz, 0.35, 0.12, '#cfcfcf');
        });
        k.box(lx + 1.25, 0.1, lz + 1.25, 0.12, 1.9, 0.6, '#9a9aa0', { rotY: Math.PI / 4 });
        k.box(lx, 2, lz, 1.8, 1.4, 1.7, '#cfd2d6');
        k.box(lx + 0.6, 2.6, lz + 0.86, 0.4, 0.4, 0.05, '#18191e');
        k.box(lx - 0.6, 2.6, lz + 0.86, 0.4, 0.4, 0.05, '#18191e');
        k.cyl(lx - 0.7, 3.4, lz - 0.3, 0.05, 0.6, '#bbbbbb');
        k.cone(lx - 0.7, 4, lz - 0.3, 0.35, 0.2, '#e8e8e8', { seg: 8 });
        // The flag.
        const [fx, fz] = k.pos('flag');
        const flagPos = [fx - 1.4, fz - 1.4];
        k.box(flagPos[0], 0, flagPos[1], 0.06, 2.1, 0.06, '#dddddd');
        for (let i = 0; i < 7; i++) k.box(flagPos[0] + 0.6, 1.25 + i * 0.12, flagPos[1], 1.1, 0.12, 0.04, i % 2 ? '#f4f4f4' : '#c8302c', { cast: false });
        k.box(flagPos[0] + 0.3, 1.73, flagPos[1] + 0.01, 0.5, 0.36, 0.04, '#2b3f8c', { cast: false });
        // Experiments: the seismometer with solar wings and the laser reflector.
        const [ex, ez] = k.pos('experiments');
        k.box(ex - 1, 0, ez - 1.2, 0.6, 0.5, 0.6, '#d4a73a');
        k.box(ex - 1.8, 0.4, ez - 1.2, 1, 0.04, 0.6, '#2b3f8c');
        k.box(ex - 0.2, 0.4, ez - 1.2, 1, 0.04, 0.6, '#2b3f8c');
        const reflector = k.box(ex + 0.8, 0.2, ez - 1.4, 0.9, 0.08, 0.7, '#3b3f48');
        reflector.rotation.x = -0.5;
        // The TV camera on its tripod, craters, rocks and boot prints.
        k.box(4, 0, 4.5, 0.06, 1.2, 0.06, '#aaaaaa');
        k.box(4, 1.2, 4.5, 0.4, 0.3, 0.5, '#555a66');
        [[-6, 4, 2.2], [5.5, -5, 1.6], [-5, -6, 1.4], [6, 2, 1.1]].forEach(([cx, cz, r]) => {
          for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2;
            k.box(cx + Math.cos(a) * r, 0, cz + Math.sin(a) * r, 0.7, 0.3, 0.7, '#8b8b86', { rotY: a });
          }
          k.box(cx, -0.05, cz, r * 1.2, 0.06, r * 1.2, '#7a7a75', { cast: false });
        });
        [[3, 6], [-7, -1], [7, -2], [1, -6], [-3, 6]].forEach(([x, z], i) => k.rock(x, z, 0.5 + (i % 3) * 0.3, '#73736e'));
        // The Earth, hanging in the black sky.
        const earth = k.sphere(-16, 15, -22, 2.2, '#3f7fd8', { emissive: '#163a77', cast: false, seg: 16 });
        const cloud = k.sphere(-15.6, 15.3, -21.4, 1.6, '#f4f4f4', { emissive: '#8a8a8a', cast: false, seg: 10 });
        earth.userData.isSprite = true;
        cloud.userData.isSprite = true;
      },
    },
  },
  giza: {
    house: {
      build(k) {
        // Reed mats, a sleeping gang-mate, jars, a niche with an oil lamp.
        k.box(-1.6, 0, -1.4, 2.2, 0.12, 1.2, '#c8a45c');
        k.box(1.4, 0, -1.8, 2.2, 0.12, 1.2, '#bf9a52');
        k.box(1.4, 0.12, -1.8, 1.6, 0.25, 0.6, '#efe7d2');
        [[2.6, 1.6], [2.9, 0.9], [2.3, 1]].forEach(([x, z], i) => k.cyl(x, 0, z, 0.3 - i * 0.04, 0.8 - i * 0.1, i % 2 ? '#b5643a' : '#c27a48', { rTop: 0.18 }));
        k.box(-3.3, 1.4, 1.2, 0.3, 0.6, 0.8, '#a8824f');
        k.lamp(-3.1, 1.75, 1.2, '#ffb347', { always: true, strength: 3 });
        // A window full of dawn, and the horn that wakes the town.
        k.screen(0.6, 1.6, -2.95, 1.2, 0.8, '#ffb36b');
        k.box(-1.2, 2.1, -2.85, 0.9, 0.2, 0.2, '#e9dcc0', { rotY: 0.2 });
        k.alarm(0.6, 2.3, -2.7, '#ffcf70');
        k.box(-2.6, 0, 1.8, 0.8, 0.5, 0.8, '#8a6a45');
      },
    },
    village: {
      build(k) {
        // Rows of mud-brick houses with flat roofs.
        [[-5, -3], [-3, -5], [-6, 0], [4, -5], [6, -3]].forEach(([x, z], i) => {
          k.box(x, 0, z, 2.2, 1.6 + (i % 2) * 0.3, 2, '#cfa77a');
          k.box(x, 1.6 + (i % 2) * 0.3, z, 2.4, 0.15, 2.2, '#a8824f');
          k.box(x + 0.6, 0, z + 1.01, 0.5, 1, 0.05, '#4a3424');
        });
        // The bakery: domed ovens, bell-shaped moulds, beer jars.
        const [bx, bz] = k.pos('bakery');
        k.box(bx + 0.5, 0, bz - 2.2, 3, 1.4, 1.6, '#c99a66');
        [0, 1].forEach(i => { k.cone(bx - 0.3 + i * 1.6, 1.4, bz - 2.2, 0.6, 0.8, '#9c6b3e', { seg: 8 }); k.fire(bx - 0.3 + i * 1.6, bz - 1.2, { scale: 0.7 }); });
        for (let i = 0; i < 5; i++) k.cone(bx + 2 + (i % 3) * 0.4, 0, bz - 0.6 + Math.floor(i / 3) * 0.4, 0.18, 0.4, '#b5643a', { seg: 6 });
        for (let i = 0; i < 4; i++) k.cyl(bx - 1.8, 0, bz - 1 + i * 0.5, 0.2, 0.7, '#d9a36b', { rTop: 0.12 });
        // Tia's courtyard: mats under an awning, herbs drying.
        const [hx, hz] = k.pos('healer');
        k.box(hx - 1, 0, hz - 1, 2.4, 0.08, 1.6, '#c8a45c');
        [[-2.2, -2], [0.2, -2]].forEach(([dx, dz]) => k.box(hx + dx, 0, hz + dz, 0.12, 1.8, 0.12, '#7a5a38'));
        k.box(hx - 1, 1.8, hz - 2, 2.6, 0.08, 1, '#efe2c2');
        k.tree(hx + 2.5, hz + 2, 'palm');
        k.tree(5, 4, 'palm');
        k.tree(-6, 5, 'palm');
        // The pyramid on the horizon.
        k.cone(8, 0, -8, 3.4, 4.6, '#e3cf9e', { seg: 4 });
      },
    },
    harbour: {
      before(k) { k.water(3.5, -3, 6, 4); },
      build(k, { burst }) {
        // Stone quay, a barge with the granite beam, sailing boats, reeds.
        k.box(-1, 0, -0.4, 6, 0.3, 1.2, '#b8a07a');
        const barge = k.box(2, -0.2, -2.4, 4.2, 0.5, 1.4, '#7a4a26');
        const beam = k.box(2, 0.3, -2.4, 3.4, 0.6, 0.7, '#b48e8c');
        const boats = [];
        [[5.5, -5, 0], [1, -6, 1]].forEach(([x, z, i]) => {
          boats.push([k.box(x, -0.2, z, 2.6, 0.4, 0.9, '#8a5a2b'), k.box(x, 0.2, z, 0.1, 2.4, 0.1, '#5a3a20'), k.box(x + 0.05, 0.9, z, 0.05, 1.5, 1.2, '#f3ead6'), i]);
        });
        k.animate((dt, t) => {
          barge.position.y = 0.05 + Math.sin(t * 1.2) * 0.04;
          beam.position.y = 0.6 + Math.sin(t * 1.2) * 0.04;
          boats.forEach(([hull, mast, sail, i]) => {
            const y = Math.sin(t * 1.4 + i) * 0.06;
            hull.position.y = y;
            mast.position.y = 1.4 + y;
            sail.position.y = 1.65 + y;
          });
        });
        for (let i = 0; i < 10; i++) k.box(-3 + (i % 5) * 0.4, 0, -2.6 + Math.floor(i / 5) * 0.5, 0.08, 0.9 + (i % 3) * 0.2, 0.08, '#6f8f3a');
        // Limestone blocks waiting on the quay.
        [[-3.5, 1.5], [-2.3, 1.5], [-3, 2.6]].forEach(([x, z]) => k.box(x, 0, z, 1, 0.8, 0.8, '#efe7d2'));
        k.tree(-6, -1, 'palm');
        k.tree(-5, 5, 'palm');
        k.cone(-7, 0, 6.5, 2.2, 3, '#e3cf9e', { seg: 4 });
        k.every(2600, () => burst(new k.THREE.Vector3(2 + Math.random() * 4, 0.1, -3 - Math.random() * 3), { count: 3, colors: ['#ffffff', '#cfe9ff'], up: 0.6, speed: 0.6, life: 0.8, size: 0.08 }));
      },
    },
    quarry: {
      ground: 'limestone',
      build(k) {
        // Stepped terraces cut into the rock, blocks half-freed, tools.
        for (let i = 0; i < 3; i++) k.box(-1 - i * 0.2, 0, -3.5 - i * 1.2, 7 - i * 1.5, 1 + i, 1.4, '#ddd2b8');
        [[-2, -1.6], [-0.6, -1.6], [0.8, -1.6]].forEach(([x, z], i) => k.box(x, 0, z, 1.1, 0.9, 0.9, i === 1 ? '#e6dcc4' : '#d6c9ab'));
        k.box(2.6, 0, 1.6, 1.2, 0.9, 1, '#e6dcc4');
        k.box(2.6, 0.9, 1.6, 1, 0.9, 0.9, '#ddd2b8');
        for (let i = 0; i < 3; i++) k.box(-3 + i * 0.4, 0, 2, 0.1, 0.1, 0.7, '#b87333');
        k.box(-4, 0, 0.5, 1.2, 0.08, 0.6, '#8a6a45');
        k.lamp(3.6, 1.6, -1, '#ffcf70');
      },
    },
    pyramid: {
      build(k) {
        // The pyramid, five courses high and unfinished, with the granite
        // beams of the King's Chamber on its flat top.
        const summit = k.place('summit');
        const [cx, cz] = summit.pos;
        const top = summit.y || 5.5;
        for (let i = 0; i < 5; i++) {
          const s = 9 - i * 1.5;
          k.box(cx, i * (top / 5), cz, s, top / 5, s, i % 2 ? '#e3cf9e' : '#d9c28c');
        }
        [-1.25, -0.8].forEach(dz => k.box(cx, top, cz + dz, 2.6, 0.3, 0.4, '#b48e8c'));
        // A straight ramp of mud brick from its foot to the summit: the path
        // the character climbs, so its height matches the walk exactly.
        const [vx, vz] = summit.via || k.pos('ramp-foot');
        const steps = 12;
        for (let i = 0; i < steps; i++) {
          const t = (i + 0.5) / steps;
          k.box(vx + (cx - vx) * t, 0, vz + (cz - vz) * t, 1.6, Math.max(0.1, top * t), 1.6, i % 2 ? '#c9a77a' : '#bf9c6e');
        }
        const [fx, fz] = k.pos('ramp-foot');
        // The sledge with its beam, ropes, water jars; palms and the harbour canal.
        k.box(fx - 1.6, 0, fz - 0.6, 1.4, 0.2, 3, '#8a6a45');
        k.box(fx - 1.6, 0.2, fz - 0.6, 0.8, 0.6, 2.6, '#b48e8c');
        for (let i = 0; i < 3; i++) k.cyl(fx + 1.2, 0, fz + 1 + i * 0.5, 0.2, 0.6, '#c27a48', { rTop: 0.12 });
        k.tree(-8, -2, 'palm');
        k.tree(-6, 8, 'palm');
        k.tree(8, 7, 'palm');
        k.lamp(fx + 1.8, 1.4, fz - 1, '#ffb347');
        k.lamp(cx - 1.5, 6, cz + 1.5, '#ffb347');
      },
    },
  },
};

export function sceneGround(eraId, sceneId) {
  return SCENES[eraId]?.[sceneId]?.ground || 'sand';
}
