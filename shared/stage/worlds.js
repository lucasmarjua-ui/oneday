// The dioramas. Every event is told across several scenes, and each scene is
// built here from boxes, cylinders and cones: rooms are cut-away interiors
// with two back walls, islands are floating voxel ground. Landmarks sit behind
// the spots in places.js where the character stands. Lamps glow, alarms
// flash, water shimmers and a few things move, so each scene feels alive.

const GROUND = {
  moon: { top: ['#a3a39e', '#989893', '#adada8'], path: '#b9b9b4', dirt: '#6c6c69', rock: '#55554f' },
  sand: { top: ['#e2c48d', '#d9b981', '#e8cc98'], path: '#cfae74', dirt: '#b98c55', rock: '#9c7348' },
  limestone: { top: ['#e6dcc4', '#ddd2b8', '#ece3cd'], path: '#d3c6a8', dirt: '#b8a882', rock: '#9c8d6c' },
  plaza: { top: ['#d9cdb4', '#cfc3a8', '#e2d7bf'], path: '#bfae8a', dirt: '#8a7a5c', rock: '#6e6250' },
  beach: { top: ['#d8c9a0', '#d0c095', '#ddd0ab'], path: '#c4b386', dirt: '#a89670', rock: '#7d7468' },
  grass: { top: ['#6f8f45', '#678740', '#78984c'], path: '#a8946a', dirt: '#6e5236', rock: '#57524a' },
  // Berlin: cobbles and asphalt, granite kerbs, pavement slabs along the way.
  street: { top: ['#6f7175', '#77797d', '#686a6e'], path: '#a29e94', dirt: '#55524c', rock: '#45423d' },
};

const ROOMS = {
  columbia: { floor: ['#4f545f', '#4a4f5a'], wall: '#8b909b', trim: '#5c616c' },
  eagle: { floor: ['#44474f', '#3f424a'], wall: '#757a85', trim: '#55596a' },
  house: { floor: ['#b99467', '#b08b5f'], wall: '#d3b384', trim: '#a8824f' },
  chamber: { floor: ['#c9b48e', '#c0aa84'], wall: '#efe6d2', trim: '#a8423a' },
  palace: { floor: ['#d4c3a0', '#cbb994'], wall: '#efe4cc', trim: '#9e3a2e' },
  hold: { floor: ['#6b7078', '#646971'], wall: '#8e939b', trim: '#55595f' },
};

import { createNavGrid, setRect, blockShape } from './nav.js';

// Anything whose base is below this and whose top is above it blocks walking.
const KNEE = 0.3;

export function buildWorld(THREE, stage, { eraId, sceneId, scene: config, places, burst, models = new Map() }) {
  const root = stage.root;
  const materials = new Map();
  const waterCells = new Set();
  const colliders = [];
  const walkways = [];
  const lambert = new Map();

  // Solid things are remembered as footprints for the navigation grid.
  function solid(shape, base, top, opts) {
    if (opts.solid === false || base > KNEE || top < KNEE) return;
    colliders.push(shape);
  }

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
      solid({ type: 'rect', x, z, w, d, rot: opts.rotY || 0 }, y, y + h, opts);
      return place(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), opts.material || mat(color, opts.emissive)), x, y + h / 2, z, opts);
    },
    cyl(x, y, z, r, h, color, opts = {}) {
      solid({ type: 'circle', x, z, r: Math.max(r, opts.rTop ?? r) }, y, y + h, opts);
      return place(new THREE.Mesh(new THREE.CylinderGeometry(opts.rTop ?? r, r, h, opts.seg || 8), mat(color, opts.emissive)), x, y + h / 2, z, opts);
    },
    cone(x, y, z, r, h, color, opts = {}) {
      solid({ type: 'circle', x, z, r }, y, y + h, opts);
      return place(new THREE.Mesh(new THREE.ConeGeometry(r, h, opts.seg || 4), mat(color, opts.emissive)), x, y + h / 2, z, { rotY: Math.PI / 4, ...opts });
    },
    sphere(x, y, z, r, color, opts = {}) {
      solid({ type: 'circle', x, z, r }, y - r, y + r, opts);
      return place(new THREE.Mesh(new THREE.SphereGeometry(r, opts.seg || 12, opts.seg ? opts.seg / 2 : 8), mat(color, opts.emissive)), x, y, z, opts);
    },
    /**
     * A prop modelled in Blender (assets/models/props.glb), placed with its
     * base at y. Its collision footprint is its bounding box.
     */
    model(name, x, y, z, opts = {}) {
      const template = models.get(name);
      if (!template) return null;
      const obj = template.clone(true);
      const scale = opts.scale || 1;
      obj.scale.setScalar(scale);
      obj.traverse(child => {
        if (!child.isMesh) return;
        child.castShadow = opts.cast !== false;
        child.receiveShadow = true;
        // Blender's materials become the stage's flat-shaded Lambert ones,
        // so models and primitives are lit and inked the same way.
        const source = child.material;
        const key = source.color.getHexString();
        if (!lambert.has(key)) lambert.set(key, new THREE.MeshLambertMaterial({ color: source.color.clone(), flatShading: true }));
        child.material = lambert.get(key);
      });
      obj.position.set(x, y, z);
      obj.rotation.y = opts.rotY || 0;
      root.add(obj);
      const box = new THREE.Box3().setFromObject(template);
      const size = box.getSize(new THREE.Vector3()).multiplyScalar(scale);
      const center = box.getCenter(new THREE.Vector3()).multiplyScalar(scale);
      const cos = Math.cos(obj.rotation.y);
      const sin = Math.sin(obj.rotation.y);
      const footprint = opts.footprint || 1;
      solid({ type: 'rect', x: x + center.x * cos + center.z * sin, z: z - center.x * sin + center.z * cos, w: size.x * footprint, d: size.z * footprint, rot: obj.rotation.y }, y + box.min.y * scale, y + box.max.y * scale, opts);
      return obj;
    },
    /** Open a rectangle for walking even over water (a deck, a jetty). */
    walkway(x, z, w, d) {
      walkways.push([x, z, w, d]);
    },
    /** Block a footprint without drawing anything (an invisible fence). */
    blocker(shape) {
      colliders.push(shape);
    },
    tree(x, z, style = 'palm', colors = {}) {
      const model = kit.model(style === 'palm' ? 'palm' : 'round_tree', x, 0, z, { rotY: (x * 7 + z * 3) % 6, scale: style === 'palm' ? 1 : 1.1, solid: false });
      if (model) {
        colliders.push({ type: 'circle', x, z, r: 0.22 });
        return;
      }
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
    /** Flood every cell for which `wet(x, z)` holds. */
    waterWhere(wet) {
      const r = (config.size || 12) + 2;
      for (let x = -r; x <= r; x++) for (let z = -r; z <= r; z++) if (wet(x + 0.5, z + 0.5)) waterCells.add(`${x},${z}`);
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

  const groundTiles = [];
  if (config.kind === 'room' && builder?.set) {
    // A room modelled whole in Blender: the builder places it and says where the floor is.
    (builder.floor || [[0, 0, config.size[0] - 0.3, config.size[1] - 0.3]]).forEach(rect => groundTiles.push(rect));
  } else if (config.kind === 'room') {
    const [w, d] = config.size;
    groundTiles.push([0, 0, w - 0.3, d - 0.3]);
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
      if (!isWater) groundTiles.push([cx, cz, 1, 1]);
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
    const detail = { sand: ['#b9a26a', '#9c8a55'], moon: ['#7b7b77', '#6a6a66'], limestone: ['#c2b592', '#b0a27d'], plaza: ['#b8a888', '#a8977a'], beach: ['#8f8a7c', '#a59c86'], grass: ['#8fb35a', '#4f6e30', '#d9d26a'], street: ['#5c5e62', '#8a8780', '#4f5054'] }[groundKind];
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

  // The navigation grid: ground and walkways open, solid things closed.
  const extent = config.kind === 'room' ? Math.max(...config.size) / 2 + 1 : config.size + 1;
  const nav = createNavGrid({ minX: -extent, maxX: extent, minZ: -extent, maxZ: extent });
  groundTiles.forEach(([x, z, w, d]) => setRect(nav, x, z, w, d, 1));
  walkways.forEach(([x, z, w, d]) => setRect(nav, x, z, w, d, 1));
  colliders.forEach(shape => blockShape(nav, shape));
  return { groundY: 0, nav };
}

// --- Scenes -----------------------------------------------------------------------

const SCENES = {
  'apollo-11': {
    columbia: {
      // Columbia's cabin, cut away: modelled in Blender (tools/blender/apollo.py).
      set: true,
      floor: [[0, 0, 4.2, 4.2], [0, 0, 5.4, 2.2], [0, 0, 2.2, 5.4]],
      build(k) {
        k.model('cm_interior', 0, 0, 0, { solid: false });
        // The console and the cabin wall, and the three couches.
        for (let a = 100; a <= 170; a += 10) {
          const r = (a * Math.PI) / 180;
          k.blocker({ type: 'circle', x: Math.cos(r) * 2.35, z: -Math.sin(r) * 2.35, r: 0.3 });
        }
        for (let a = 40; a <= 230; a += 12) {
          const r = (a * Math.PI) / 180;
          k.blocker({ type: 'circle', x: Math.cos(r) * 2.75, z: -Math.sin(r) * 2.75, r: 0.3 });
        }
        [[0.15, 0.15], [-0.63, 0.93], [0.93, -0.63]].forEach(([x, z]) => k.blocker({ type: 'rect', x, z, w: 0.8, d: 1.6, rot: Math.PI / 4 }));
        // What glows: the DSKY, the caution-and-warning lights, the Moon in the windows.
        const diag = { rotY: Math.PI / 4, cast: false, solid: false };
        k.box(-1.5, 1.3, -1.5, 0.3, 0.12, 0.04, '#7dff9b', { ...diag, emissive: '#3fbf5b' });
        k.box(-1.42, 2.1, -1.42, 0.5, 0.25, 0.04, '#ffcf70', { ...diag, emissive: '#8a6a20' });
        [[0.62, -2.32, 0.26], [-2.32, 0.62, -1.31]].forEach(([x, z, r]) => k.box(x, 2.0, z, 0.3, 0.3, 0.04, '#d8d8d2', { rotY: r, cast: false, solid: false, emissive: '#9a9a96' }));
        // A pen floating in zero gravity, the cabin floodlight, the master alarm.
        const pen = k.box(1, 1.8, 0.8, 0.5, 0.06, 0.06, '#d33b2c', { cast: false, solid: false });
        k.animate((dt, t) => { pen.position.y = 1.8 + Math.sin(t * 0.8) * 0.2; pen.rotation.y = t * 0.3; pen.rotation.z = t * 0.2; });
        k.lamp(0, 2.9, 0, '#e8f1ff', { always: true, strength: 5, range: 9 });
        k.alarm(-1.55, 2.45, -1.25, '#ff3b3b');
      },
    },
    eagle: {
      // Eagle's cockpit: modelled in Blender, crew stations, breakers and all.
      set: true,
      build(k) {
        k.model('lm_interior', 0, 0, 0, { solid: false });
        k.blocker({ type: 'rect', x: 0, z: -2.0, w: 1.1, d: 0.8 });
        k.blocker({ type: 'circle', x: 1.2, z: -0.6, r: 0.65 });
        [[2.3, 1.3], [2.3, 0.5]].forEach(([x, z]) => k.blocker({ type: 'rect', x, z, w: 0.75, d: 0.5 }));
        // The DSKY's display, the windows full of grey Moon, the program alarm.
        k.box(0.12, 1.3, -1.66, 0.3, 0.14, 0.04, '#7dff9b', { cast: false, solid: false, emissive: '#3fbf5b' });
        [-1.05, 1.05].forEach(x => k.box(x, 2.0, -2.24, 0.45, 0.3, 0.03, '#bdbdb8', { cast: false, solid: false, emissive: '#6a6a66' }));
        k.alarm(-0.3, 1.45, -1.7, '#ffcc33');
        k.lamp(0, 2.8, 0.5, '#fff1d6', { always: true, strength: 4 });
      },
    },
    surface: {
      ground: 'moon',
      build(k) {
        // Eagle, modelled in Blender, its ladder turned towards Tranquility Base.
        const [lx, lz] = [-2.5, -1.5];
        const [ladx, ladz] = k.pos('ladder');
        k.model('lunar_module', lx, 0, lz, { rotY: Math.atan2(ladx - lx, ladz - lz) + Math.PI / 4, footprint: 0.75 });
        // The flag.
        const [fx, fz] = k.pos('flag');
        k.model('us_flag', fx - 1.4, 0, fz - 1.4, { rotY: -0.3, solid: false });
        k.blocker({ type: 'circle', x: fx - 1.4, z: fz - 1.4, r: 0.15 });
        // The experiments Apollo 11 left: the passive seismometer and the
        // laser retroreflector, still used today to measure the Moon's distance.
        const [ex, ez] = k.pos('experiments');
        k.model('psep', ex - 1.2, 0, ez - 1.2, { rotY: 0.4 });
        k.model('lrrr', ex + 0.9, 0, ez - 1.4, { rotY: -0.3 });
        k.model('swc', lx + 2.3, 0, lz - 0.6, { rotY: 0.8 });
        k.model('tv_camera', 4, 0, 4.5, { rotY: 2.3 });
        // Craters, boulders and boot prints between the lander and the work sites.
        [[-6, 4, 'crater_large', 1.1], [5.5, -5, 'crater_large', 0.8], [-5, -6, 'crater_small', 1.2], [6, 2, 'crater_small', 1], [1.5, 6.5, 'crater_small', 0.7]]
          .forEach(([cx, cz, name, scale]) => k.model(name, cx, 0, cz, { scale, solid: false }));
        [[3, 6], [-7, -1], [7, -2], [1, -6], [-3, 6.5], [-8, 1.5]].forEach(([x, z], i) => k.model('moon_boulder', x, 0, z, { scale: 0.5 + (i % 3) * 0.3, rotY: i * 1.3 }));
        const prints = [[ladx, ladz, fx, fz], [ladx, ladz, ex, ez], [fx, fz, ex, ez]];
        prints.forEach(([ax, az, bx, bz]) => {
          const n = Math.floor(Math.hypot(bx - ax, bz - az) / 0.5);
          for (let i = 1; i < n; i++) {
            const t = i / n;
            const side = i % 2 ? 0.08 : -0.08;
            k.box(ax + (bx - ax) * t + side, -0.02, az + (bz - az) * t - side, 0.1, 0.03, 0.16, '#8a8a85', { rotY: Math.atan2(bx - ax, bz - az), cast: false, solid: false });
          }
        });
        // The Earth, hanging in the black sky.
        const earth = k.model('earth', -16, 15, -22, { scale: 2.4, rotY: 0.6, solid: false, cast: false });
        earth?.traverse(obj => { obj.userData.isSprite = true; });
        k.animate(dt => { if (earth) earth.rotation.y += dt * 0.02; });
      },
    },
  },
  giza: {
    house: {
      // A worker's house in the town south of the pyramids, modelled in
      // Blender (tools/blender/giza.py): mud brick, palm-log beams, a bench.
      set: true,
      build(k) {
        k.model('house_interior', 0, 0, 0, { solid: false });
        k.blocker({ type: 'rect', x: 0.6, z: -2.35, w: 3.6, d: 0.9 });
        k.blocker({ type: 'circle', x: -1.6, z: -0.3, r: 0.45 });
        k.blocker({ type: 'rect', x: -2.6, z: 1.4, w: 0.7, d: 0.4 });
        k.blocker({ type: 'circle', x: -2.0, z: 2.2, r: 0.32 });
        k.blocker({ type: 'rect', x: 2.9, z: -1.2, w: 0.5, d: 1.7 });
        // Embers in the hearth, the oil lamp in its niche, dawn in the window,
        // and the ram's horn that wakes the town.
        k.fire(-1.6, -0.3, { y: 0.05, scale: 0.45 });
        k.lamp(-3.15, 1.55, -1.2, '#ffb347', { always: true, strength: 3 });
        k.box(0.6, 2.1, -2.84, 0.8, 0.38, 0.04, '#ffb36b', { emissive: '#ff9a4a', cast: false, solid: false });
        k.alarm(0.6, 2.6, -2.7, '#ffcf70');
      },
    },
    village: {
      build(k) {
        // Mud-brick houses with palm-log roofs, a granary, and the great
        // limestone Wall of the Crow closing the town to the north.
        [[-5, -3, 0], [-3, -5.2, 0.1], [-6.2, 0.2, -0.1], [4, -5, 0.05], [6, -2.6, -0.1]].forEach(([x, z, r]) => k.model('mud_house', x, 0, z, { rotY: r }));
        k.model('granary', -1.2, 0, -6.4, { rotY: 0.1 });
        k.model('wall_crow', 1.5, 0, -8.2, { solid: false });
        k.blocker({ type: 'rect', x: 1.5, z: -8.2, w: 8, d: 1.2 });
        // The bakery: bread baking in bell-shaped moulds over embers.
        const [bx, bz] = k.pos('bakery');
        k.model('bakery', bx + 0.3, 0, bz - 2.1);
        k.fire(bx - 0.1, bz - 2.5, { scale: 0.5 });
        k.fire(bx + 1.3, bz - 2.7, { y: 0.2, scale: 0.4 });
        [[bx - 1.8, bz + 0.6], [bx - 1.4, bz + 1.1]].forEach(([x, z]) => k.model('water_jar', x, 0, z, { scale: 0.9 }));
        // Tia's courtyard: mats under an awning, herbs drying.
        const [hx, hz] = k.pos('healer');
        k.box(hx - 1, 0, hz - 1, 2.4, 0.08, 1.6, '#c8a45c');
        [[-2.2, -2], [0.2, -2]].forEach(([dx, dz]) => k.box(hx + dx, 0, hz + dz, 0.12, 1.8, 0.12, '#7a5a38'));
        k.box(hx - 1, 1.8, hz - 2, 2.6, 0.08, 1, '#efe2c2');
        for (let i = 0; i < 5; i++) k.box(hx - 2 + i * 0.45, 1.5, hz - 2, 0.08, 0.3, 0.08, i % 2 ? '#7aa84a' : '#9c8a55', { solid: false });
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
        // Stone quay, the cargo barge with the granite beam from Aswan,
        // sailing boats, papyrus along the water's edge.
        k.box(-1, 0, -0.4, 6, 0.3, 1.2, '#b8a07a');
        const barge = k.model('cargo_barge', 2.2, -0.3, -2.6, { scale: 0.8 });
        const boats = [[5.5, -5.2, 0.3], [1, -6.4, -0.2]].map(([x, z, r]) => k.model('nile_boat', x, -0.25, z, { rotY: r, scale: 0.75 }));
        k.animate((dt, t) => {
          if (barge) barge.position.y = -0.3 + Math.sin(t * 1.2) * 0.04;
          boats.forEach((boat, i) => { if (boat) boat.position.y = -0.25 + Math.sin(t * 1.4 + i) * 0.06; });
        });
        [[-3, -2.6], [-2.2, -3.1], [-0.4, -3.4], [6.5, -0.8], [7.6, -2.5]].forEach(([x, z], i) => k.model('papyrus', x, -0.1, z, { rotY: i, scale: 0.9 + (i % 2) * 0.3, solid: false }));
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
        // Terraces cut into the rock, blocks being freed by trenches, and
        // the tools: copper chisels, a mallet, dolerite pounders, a basket.
        k.model('quarry_face', -0.5, 0, -2.2);
        k.model('quarry_tools', -3, 0, 1.5, { rotY: 0.4, solid: false });
        k.box(2.6, 0, 1.6, 1.2, 0.9, 1, '#e6dcc4');
        k.box(2.6, 0.9, 1.6, 1, 0.9, 0.9, '#ddd2b8');
        k.model('sledge', 4.2, 0, -0.2, { rotY: 0.3, scale: 0.8 });
        k.lamp(3.6, 1.6, -1, '#ffcf70');
      },
    },
    pyramid: {
      build(k) {
        // The pyramid, modelled in Blender: five courses of its core, casing
        // stones being laid, the granite beams of the King's Chamber on top.
        const summit = k.place('summit');
        const [cx, cz] = summit.pos;
        const top = summit.y || 5.5;
        k.model('pyramid_unfinished', cx, 0, cz);
        // A straight ramp of mud brick from its foot to the summit: the path
        // the character climbs, so its height matches the walk exactly.
        const [vx, vz] = summit.via || k.pos('ramp-foot');
        const steps = 12;
        for (let i = 0; i < steps; i++) {
          const t = (i + 0.5) / steps;
          k.box(vx + (cx - vx) * t, 0, vz + (cz - vz) * t, 1.6, Math.max(0.1, top * t), 1.6, i % 2 ? '#c9a77a' : '#bf9c6e');
          if (i % 3 === 1) k.box(vx + (cx - vx) * t, Math.max(0.1, top * t), vz + (cz - vz) * t, 1.7, 0.06, 0.14, '#7a5a38', { rotY: Math.atan2(cx - vx, cz - vz), solid: false, cast: false });
        }
        const [fx, fz] = k.pos('ramp-foot');
        // The sledge with its beam, ropes, water jars; palms and the harbour canal.
        k.model('sledge', fx - 1.6, 0, fz - 0.6);
        for (let i = 0; i < 3; i++) k.model('water_jar', fx + 1.2, 0, fz + 1 + i * 0.5, { scale: 0.8, rotY: i });
        k.model('quarry_tools', fx + 2.2, 0, fz + 0.4, { rotY: 1.2, solid: false });
        k.tree(-8, -2, 'palm');
        k.tree(-6, 8, 'palm');
        k.tree(8, 7, 'palm');
        k.lamp(fx + 1.8, 1.4, fz - 1, '#ffb347');
        k.lamp(cx - 1.5, 6, cz + 1.5, '#ffb347');
      },
    },
  },
};

SCENES.tenochtitlan = {
  chamber: {
    // A room in Cuitlahuac's palace at Iztapalapa, modelled in Blender
    // (tools/blender/tenochtitlan.py): stucco, a painted frieze, an icpalli.
    set: true,
    build(k) {
      k.model('chamber_interior', 0, 0, 0, { solid: false });
      k.blocker({ type: 'rect', x: 1.6, z: -2.4, w: 1.2, d: 0.6 });
      k.blocker({ type: 'rect', x: -2.4, z: -2.2, w: 0.75, d: 0.7 });
      k.blocker({ type: 'circle', x: 2.9, z: -1.2, r: 0.22 });
      k.blocker({ type: 'circle', x: 2.6, z: 1.4, r: 0.35 });
      k.fire(2.6, 1.4, { y: 0.58, scale: 0.5 });
      k.box(0.6, 1.7, -2.76, 1.2, 0.55, 0.03, '#ffb36b', { emissive: '#ff9a4a', cast: false, solid: false });
      // The conch trumpet and the drums of the temple, glimpsed through the window.
      k.alarm(0.6, 2.45, -2.6, '#ffcf70');
      k.lamp(-0.5, 2.7, 0, '#ffcf70', { always: true, strength: 3 });
    },
  },
  causeway: {
    ground: 'plaza',
    before(k) {
      // A straight stone causeway across the lake, widening at Xoloc.
      k.waterWhere((x, z) => Math.abs(0.846 * x + z - 0.077) / 1.309 > 1.7 && Math.hypot(x - 3.5, z + 3) > 2.6);
    },
    build(k) {
      // Chinampas: fields built on the lake, edged with tall ahuejote willows.
      [[-6, -4, 0.7], [-4, -6.5, 0.7], [-7.5, -1.5, 0.4], [5, 4, 0.7], [2, 6.5, 0.6], [7, 1.5, 0.3]].forEach(([x, z, r], i) => {
        k.model('chinampa', x, -0.15, z, { rotY: r, solid: false });
        if (i % 2) k.model('ahuejote', x + 1.1, -0.15, z - 0.6, { scale: 1.1, solid: false });
        else k.model('ahuejote', x - 1.2, -0.15, z + 0.4, { solid: false });
      });
      [[-2, 4.6], [6.4, -0.6], [-6.5, 2.2], [0.5, -6.3]].forEach(([x, z], i) => k.model('tule', x, -0.2, z, { rotY: i, solid: false }));
      // Canoes full of onlookers, bobbing.
      const canoes = [[-3, -3.5], [1, 4.5], [-5.5, 1], [4.5, 1.5], [0, -5.5]].map(([x, z], i) => {
        const hull = k.model('canoe', x, -0.2, z, { rotY: 0.7 + i * 0.3, scale: 0.9 });
        const rider = k.box(x, 0.05, z, 0.25, 0.5, 0.25, ['#efe8d8', '#c0392b', '#2f9e7a'][i % 3], { rotY: 0.7 });
        return [hull, rider, i];
      });
      k.animate((dt, t) => canoes.forEach(([hull, rider, i]) => {
        const y = Math.sin(t * 1.3 + i) * 0.05;
        if (hull) hull.position.y = -0.2 + y;
        rider.position.y = 0.3 + y;
      }));
      // One of the removable wooden bridges that spanned gaps in the causeway.
      k.model('causeway_bridge', -3.6, 0, 3.12, { rotY: 0.7, solid: false });
      // Xoloc: the fort with two towers where the causeways meet, and
      // Moctezuma's litter under its canopy of green feathers.
      const [mx, mz] = k.pos('xoloc');
      k.model('xoloc_fort', mx + 1.0, 0, mz - 2.9, { rotY: 0.7 });
      k.model('litter', mx + 1.6, 0, mz - 0.6, { rotY: 0.6, scale: 1.1 });
      // The island city on the horizon, and the volcano beyond the lake.
      [[8, -7, 0.1], [6.2, -8.6, -0.2], [9.6, -4.8, 0.3]].forEach(([x, z, r]) => k.model('mexica_house', x, 0, z, { rotY: r, scale: 0.9 }));
      const volcano = k.cone(-22, -6, -28, 9, 12, '#7d8796', { seg: 8 });
      const snow = k.cone(-22, 3, -28, 3.2, 3.2, '#f4f6ff', { seg: 8 });
      volcano.userData.isSprite = true;
      snow.userData.isSprite = true;
    },
  },
  city: {
    ground: 'plaza',
    before(k) {
      // A canal crosses the city.
      k.waterWhere((x, z) => Math.abs(x - z - 5) < 1.1);
    },
    build(k) {
      // The Great Temple, with Tlaloc's and Huitzilopochtli's shrines on top.
      const [cx, cz] = [-2, -3.8];
      k.model('templo_mayor', cx, 0, cz, { rotY: Math.PI / 4 });
      k.fire(cx + 0.7, cz + 0.7, { y: 3.4, scale: 0.5 });
      [[cx + 2.6, cz + 2.0], [cx - 0.4, cz + 3.2]].forEach(([x, z]) => {
        k.model('brazier', x, 0, z);
        k.fire(x, z, { y: 0.7, scale: 0.45 });
      });
      // Plastered houses with gardens on their roofs.
      [[4, -3, 0], [5, 0.5, 0.1], [-5, 1, -0.1], [2, -6, 0], [-5.5, -2.5, 0.05]].forEach(([x, z, r]) => k.model('mexica_house', x, 0, z, { rotY: r }));
      // The aqueduct from Chapultepec, with its two channels.
      k.model('aqueduct', -4, 0, 4.6);
      k.model('aqueduct', 0, 0, 4.6);
      // Market stalls: maize, chillies, cacao beans, greens.
      [[1.8, 2.6, 0.3], [-1.6, 1.8, -0.4]].forEach(([x, z, r]) => k.model('market_stall', x, 0, z, { rotY: r }));
      // A canoe on the canal.
      const canoe = k.model('canoe', 5.5, -0.15, -0.5, { rotY: Math.PI / 4 });
      k.animate((dt, t) => { if (canoe) canoe.position.y = -0.15 + Math.sin(t * 1.4) * 0.04; });
      k.tree(3, 3.5, 'round', { leaf: '#3f6e3a', leaf2: '#4f8a3a' });
      k.tree(-3.5, 3, 'round', { leaf: '#3f6e3a', leaf2: '#4f8a3a' });
      k.lamp(1.5, 1.2, 0, '#ffb347');
      k.lamp(-1, 1.2, 2.5, '#ffb347');
    },
  },
  palace: {
    // The palace of Axayacatl, modelled in Blender: red columns, murals,
    // a dais with a jaguar pelt, and the walled-up door of the treasure.
    set: true,
    build(k) {
      k.model('palace_hall', 0, 0, 0, { solid: false });
      [-2.5, 0, 2.5].forEach(x => k.blocker({ type: 'circle', x, z: -1.8, r: 0.28 }));
      k.blocker({ type: 'rect', x: 0.4, z: -2.7, w: 3.4, d: 1.2 });
      k.blocker({ type: 'rect', x: 3.4, z: -0.33, w: 0.5, d: 2.2 });
      [[2.9, 1.4], [-2.4, 0.2]].forEach(([x, z]) => {
        k.blocker({ type: 'circle', x, z, r: 0.35 });
        k.fire(x, z, { y: 0.58, scale: 0.5 });
      });
      k.lamp(0, 3.0, 0, '#ffcf70', { always: true, strength: 4 });
    },
  },
};

SCENES['d-day'] = {
  hold: {
    // A troopship's hold, modelled in Blender (tools/blender/dday.py): bunks
    // five high, kit bags, rifles, the ladder to the hatch.
    set: true,
    build(k) {
      k.model('hold_interior', 0, 0, 0, { solid: false });
      [-2.4, -0.9, 0.6].forEach(x => k.blocker({ type: 'rect', x, z: -2.25, w: 1.45, d: 1.0 }));
      k.blocker({ type: 'rect', x: 2.65, z: -0.87, w: 1.0, d: 1.7 });
      k.blocker({ type: 'rect', x: 2.45, z: -2.65, w: 0.7, d: 0.4 });
      k.lamp(-0.5, 2.6, 0.5, '#ffd7a0', { strength: 3 });
      k.alarm(1.6, 2.6, -2.62, '#ff3b3b');
    },
  },
  boat: {
    ground: 'beach',
    before(k) {
      k.waterWhere(() => true);
    },
    build(k, { burst }) {
      // The landing craft (a Higgins boat modelled in Blender), pitching in
      // the swell; its deck is the only place to stand.
      const craft = k.model('lcvp', 0, -0.12, 0.2, { solid: false });
      k.walkway(0, 0.1, 2.1, 3.8);
      // Other boats in the wave, a destroyer on the horizon, the coast ahead.
      const others = [[-4.5, -4.5, 0.2], [5, 4.5, -0.3], [-5.5, 3, 0.1], [5.5, -3.5, 0.4]].map(([x, z, r]) => k.model('lcvp', x, -0.2, z, { rotY: Math.PI / 4 + r, scale: 0.8, solid: false }));
      k.animate((dt, t) => {
        if (craft) { craft.position.y = -0.12 + Math.sin(t * 1.6) * 0.06; craft.rotation.x = Math.sin(t * 1.6 + 0.6) * 0.03; }
        others.forEach((boat, i) => { if (boat) boat.position.y = -0.2 + Math.sin(t * 1.6 + i * 1.3) * 0.1; });
      });
      const ship = k.model('destroyer', -9, -0.3, -9, { rotY: Math.PI / 4, scale: 1.5, solid: false });
      ship?.traverse(obj => { obj.userData.isSprite = true; });
      const coast = k.box(14, -0.5, -10, 6, 3, 30, '#6f8f45');
      coast.userData.isSprite = true;
      k.every(900, () => burst(new k.THREE.Vector3(Math.random() * 2 - 1, 0.4, -2.3), { count: 4, colors: ['#ffffff', '#d6e6f0'], up: 1.6, speed: 0.8, life: 0.7, size: 0.1 }));
    },
  },
  beach: {
    ground: 'beach',
    before(k) {
      // The Channel in front, the tide coming in.
      k.waterWhere((x, z) => x + z > 6.5);
    },
    build(k) {
      // Bluffs behind: earth slopes rising in steps, grass on top, a concrete bunker.
      for (let x = -11; x <= 6; x++) {
        for (let z = -11; z <= 6; z++) {
          const d = x + z;
          if (d > -4 || Math.hypot(x + 0.5, z + 0.5) > 10.5) continue;
          const h = Math.min(3.6, 0.6 + (-4 - d) * 0.75);
          k.box(x + 0.5, 0, z + 0.5, 1, h, 1, '#8a7a5c', { cast: d > -6 });
          k.box(x + 0.5, h, z + 0.5, 1, 0.2, 1, (x * 7 + z * 3) % 3 ? '#6f8f45' : '#78984c', { cast: false });
        }
      }
      k.model('bunker', -4.6, 3.8, -4.6, { rotY: Math.PI / 4, scale: 0.8 });
      // The seawall and the shingle bank in front of it, wire beyond: the
      // only cover on the beach.
      [-5.2, -2.4, 0.4, 3.2].forEach(t => {
        k.model('seawall', t, 0, -2.7 - t, { rotY: Math.PI / 4 });
        k.model('shingle_bank', t - 0.55, 0, -1.55 - t - 0.55, { rotY: Math.PI / 4, solid: false });
        k.model('barbed_wire', t - 0.6, 0, -3.6 - t - 0.6, { rotY: Math.PI / 4, solid: false });
      });
      // Rommel's obstacles: Belgian gates, steel hedgehogs, log stakes with mines.
      [[1, 4.5], [4, 1.2], [3.2, -0.3], [-0.5, 5.2], [0.8, 2.2]].forEach(([x, z], i) => k.model('hedgehog', x, 0, z, { rotY: i * 0.9, scale: 0.85, footprint: 0.7 }));
      [[5.5, -1.8, 0.8], [-1.8, 6.8, 0.8]].forEach(([x, z, r]) => k.model('belgian_gate', x, 0, z, { rotY: r, scale: 0.8 }));
      [[2.2, 4.8], [4.8, 2.6], [-1.6, 6.4], [6.4, -0.6], [2.8, 6.0]].forEach(([x, z], i) => k.model('stake_mine', x, 0, z, { rotY: Math.PI / 4 + (i % 2) * 0.3, footprint: 0.6 }));
      // Barrage balloons over the beach, against low-flying aircraft.
      [[-7, 6, 1.5], [1.5, 6.5, -7], [8, 7, -4]].forEach(([x, y, z], i) => {
        const balloon = k.model('barrage_balloon', x, y, z, { rotY: 0.8 + i * 0.2, solid: false, cast: false });
        k.animate((dt, t) => { if (balloon) balloon.position.y = y + Math.sin(t * 0.5 + i) * 0.15; });
      });
      // A burning landing craft at the waterline, a wrecked tank, a destroyer offshore.
      k.model('lcvp', 5.6, -0.35, 2.6, { rotY: 2.2, scale: 0.85 });
      k.fire(5.5, 2.5, { y: 0.5, scale: 0.9 });
      k.model('sherman', -2.5, 0, 3, { rotY: 0.9, scale: 0.8 });
      k.model('destroyer', 8.2, -0.35, 6.2, { rotY: -Math.PI / 4, solid: false });
      k.lamp(-1, 0.8, -1.6, '#ffb347');
    },
  },
  bluff: {
    ground: 'grass',
    build(k) {
      // Hedgerows: banks of earth crowned with bushes and trees.
      [[-6, -2, 0], [-1, -6, Math.PI / 2], [5, -3, 0.2], [4, 5, Math.PI / 2]].forEach(([x, z, r]) => k.model('hedgerow', x, 0, z, { rotY: r }));
      // A wrecked German bunker.
      k.model('bunker', 3.5, 0, 0.5, { rotY: -0.3 });
      k.model('rock', 2.2, 0, 2.2, { scale: 0.8 });
      // The battalion aid station: a tent with red crosses, stretchers, a jeep ambulance.
      const [ax, az] = k.pos('aid');
      k.model('aid_tent', ax - 0.4, 0, az - 1.4);
      [0, 1].forEach(i => k.model('stretcher', ax + 1.2 + i * 0.8, 0, az + 0.6, { solid: false }));
      k.model('jeep_ambulance', ax + 2.6, 0, az - 1.4, { rotY: 0.5 });
      // Vierville: a Norman stone house and the church steeple.
      k.model('norman_house', -5, 0, 4.5, { rotY: 0.2 });
      k.model('church_steeple', -7, 0, 0.5, { rotY: 0.4, scale: 0.9 });
      // Shell craters, foxholes, the Channel full of ships below.
      [[1.5, -3], [-2, 2.5]].forEach(([x, z]) => k.box(x, -0.04, z, 1.2, 0.06, 1.2, '#6e5236', { cast: false }));
      k.tree(6, 2, 'round', { leaf: '#4f6e30', leaf2: '#5f8a3a' });
      k.lamp(ax + 0.6, 1.2, az - 0.6, '#ffd7a0');
    },
  },
};

SCENES['berlin-wall'] = {
  flat: {
    // A room in a Prenzlauer Berg tenement, modelled in Blender
    // (tools/blender/berlin.py): the tiled stove, the TV, the sofa.
    set: true,
    build(k) {
      k.model('flat_interior', 0, 0, 0, { solid: false });
      k.blocker({ type: 'rect', x: -2.85, z: -2.35, w: 1.0, d: 0.9 });
      k.blocker({ type: 'circle', x: -2.15, z: -2.0, r: 0.2 });
      k.blocker({ type: 'rect', x: -2.95, z: 0.9, w: 0.9, d: 2.1 });
      k.blocker({ type: 'rect', x: 1.4, z: -2.5, w: 2.2, d: 0.6 });
      k.blocker({ type: 'rect', x: -1.3, z: -2.62, w: 1.3, d: 0.35 });
      k.blocker({ type: 'circle', x: -0.6, z: 1.6, r: 0.5 });
      [-1.32, 0.12].forEach(x => k.blocker({ type: 'rect', x, z: 1.6, w: 0.45, d: 0.45 }));
      k.lamp(0.5, 2.4, -0.2, '#ffd7a0', { strength: 3 });
      k.alarm(-2.0, 1.0, 2.2, '#ffcf5a');
    },
  },
  street: {
    ground: 'street',
    build(k) {
      // Tenements round a crossroads: the Kaufhalle, the corner pub; the
      // agency's prefab block; the Gethsemane Church with its candles.
      k.model('tenement_shop', -2.8, 0, -6, { footprint: 0.95 });
      k.model('tenement', 1.8, 0, -7.2);
      k.model('plattenbau', 4.2, 0, -5.4, { rotY: -0.25 });
      k.model('tenement_pub', -7, 0, -1.5, { rotY: Math.PI / 2 });
      k.model('gethsemane', -6.6, 0, 3.6, { rotY: Math.PI / 2 });
      // Cars at the kerb: a new Trabant, a cream one, the grey Wartburg.
      k.model('trabant', 0.6, 0, -3.6, { rotY: Math.PI / 2, scale: 0.9 });
      k.model('trabant_cream', 5.2, 0, 0.8, { scale: 0.9 });
      k.model('wartburg', -2.6, 0, 5.2, { rotY: Math.PI / 2, scale: 0.9 });
      k.model('kiosk', 2.4, 0, -0.8, { rotY: Math.PI / 4 });
      k.model('traffic_light', 0.9, 0, 1.8, { rotY: Math.PI / 4 });
      [[-1.2, -3.4], [3.6, 2.6], [-4.2, 1.2]].forEach(([x, z]) => {
        k.model('street_lamp', x, 0, z, { rotY: Math.PI / 4, footprint: 0.3 });
        k.lamp(x + 0.4, 3.2, z + 0.4, '#ffd08a', { strength: 3 });
      });
      // The TV Tower over the rooftops.
      const tower = k.model('tv_tower', -14, -2, -16, { solid: false, scale: 1.3 });
      tower?.traverse(obj => { obj.userData.isSprite = true; });
      k.tree(4.8, 4.2, 'round', { leaf: '#6a7a3a', leaf2: '#8a7a3a' });
      k.tree(-3.2, -0.6, 'round', { leaf: '#7a6a3a', leaf2: '#8a8a3a' });
    },
  },
  press: {
    // The hall of the International Press Centre on Mohrenstraße.
    set: true,
    build(k) {
      k.model('press_room', 0, 0, 0, { solid: false });
      k.blocker({ type: 'rect', x: 0.4, z: -2.55, w: 6.0, d: 1.6 });
      [-0.6, 0.25, 1.1, 1.95].forEach(z => {
        k.blocker({ type: 'rect', x: -1.95, z, w: 1.8, d: 0.5 });
        k.blocker({ type: 'rect', x: 1.78, z, w: 2.45, d: 0.5 });
      });
      [[-3.1, -1.2], [3.3, 1.8], [-2.8, 2.6]].forEach(([x, z]) => k.blocker({ type: 'circle', x, z, r: 0.4 }));
      k.lamp(0.4, 2.8, -1.2, '#fff2d0', { always: true, strength: 4 });
    },
  },
  checkpoint: {
    ground: 'street',
    build(k) {
      // The Wall across the street, a gap for the road, the striped barrier.
      [-8.3, -4.9, 6.2, 9.6].forEach(x => k.model('wall_run', x, 0, -3.4));
      k.model('boom_barrier', 0, 0, -1.2, { footprint: 0.1 });
      k.model('control_booth', -1.9, 0, 0.2, { rotY: Math.PI / 2 });
      k.model('watchtower', -6, 0, -5.6);
      // Floodlights over the crossing, glaring white all night.
      [[-2.6, -2.4], [4.8, -2.4], [-3.4, 3.2]].forEach(([x, z]) => {
        k.model('floodlight', x, 0, z, { rotY: Math.PI / 4, footprint: 0.3 });
        k.lamp(x + 0.3, 4.2, z + 0.3, '#f4f0ff', { strength: 12, range: 12 });
      });
      // The Bösebrücke over the railway, leading north into Wedding.
      k.model('bose_bridge', 1.6, -0.32, -8.2, { solid: false });
      [-1, 1].forEach(side => k.blocker({ type: 'rect', x: 1.6 + side * 1.45, z: -8.2, w: 0.2, d: 9 }));
      // The queue of cars waiting to cross.
      k.model('trabant', 1.6, 0, 3.6, { rotY: Math.PI, scale: 0.9 });
      k.model('trabant_cream', 1.6, 0, 6.4, { rotY: Math.PI, scale: 0.9 });
      k.model('wartburg', 4.4, 0, 4.4, { rotY: Math.PI, scale: 0.9 });
      k.model('street_lamp', 4.6, 0, 1.4, { rotY: Math.PI / 4, footprint: 0.3 });
      k.lamp(5, 3.2, 1.8, '#ffd08a', { strength: 3 });
      k.tree(-7.5, 2.5, 'round', { leaf: '#5a6a3a', leaf2: '#6a6a3a' });
    },
  },
  west: {
    ground: 'street',
    build(k) {
      // The Brandenburg Gate behind the thick wall that people danced on.
      k.model('brandenburg_gate', -2.4, 0, -3.7, { scale: 0.75 });
      k.model('wall_flat', -2.5, 0, -1.6);
      k.model('wall_flat', -7.6, 0, -1.6, { rotY: Math.PI });
      // The painted western face of the Wall, running towards the camera.
      [-1.2, 2.2].forEach(z => k.model('wall_painted', -7.4, 0, z, { rotY: Math.PI / 2 }));
      // Lamps, a kiosk, and sparklers fizzing on top of the Wall.
      [[3.6, -1.4], [-4.6, 3.6]].forEach(([x, z]) => {
        k.model('street_lamp', x, 0, z, { rotY: Math.PI / 4, footprint: 0.3 });
        k.lamp(x + 0.4, 3.2, z + 0.4, '#ffd08a', { strength: 3 });
      });
      k.model('kiosk', 4.6, 0, 2.2, { rotY: Math.PI / 4 });
      k.model('trabant', 5.6, 0, -2.4, { rotY: 0.6, scale: 0.9 });
      [[-4, -1.6], [-1.4, -1.6], [-3, -1.3]].forEach(([x, z], i) => k.fire(x, z, { y: 1.6, scale: 0.25 + i * 0.03 }));
      // The Gate floodlit, as it was every night.
      k.lamp(-2.4, 1.75, -1.6, '#ffe2a0', { strength: 12, range: 10 });
      k.lamp(-6, 3, -2.2, '#ffe2a0', { strength: 6, range: 8 });
      k.tree(5.4, 5, 'round', { leaf: '#6a7a3a', leaf2: '#8a7a3a' });
    },
  },
};

export function sceneGround(eraId, sceneId) {
  return SCENES[eraId]?.[sceneId]?.ground || 'sand';
}
