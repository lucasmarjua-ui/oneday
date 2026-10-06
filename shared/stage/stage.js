// The 3D stage: a pixel-art diorama of the era with a sprite character who
// walks to wherever each card happens and acts out the choice. The rules never
// wait on it; it only plays back what direction.js says.
//
// Rendering is built to look like hand-placed pixel art rather than a 3D game
// scaled down:
// - one sprite texel is exactly one render pixel (16 pixels per world unit),
//   and the render is upscaled by a whole number of device pixels, so every
//   pixel on screen is the same size;
// - the camera snaps to the pixel grid, so nothing shimmers as it moves;
// - a post pass draws dark outlines on silhouettes and light rims on convex
//   edges from the depth and normal buffers, then grades the colour;
// - text (damage-style numbers, NPC names) is drawn by the browser over the
//   canvas, so it stays sharp at any size.
import * as THREE from '../../vendor/three/three.module.min.js';
import { buildFrame, FRAME_ORDER, SPRITE_W, SPRITE_H, playerPalette, npcPalette, SKIN_TONES } from './sprites.js';
import { skyAt, isSpaceEvent } from './direction.js';
import { getPlaces, getScenes, showcaseScene, npcPresent } from './places.js';
import { buildWorld } from './worlds.js';

const PPU = 16; // render pixels per world unit: one sprite texel per pixel
// Desired half-height of the view, in world units: rooms are framed closer.
const VIEW = { play: { island: 7.4, room: 6.6 }, showcase: { island: 13.5, room: 9 } };

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// --- Pixel textures ----------------------------------------------------------

function gridToCanvas(rows, palette) {
  const canvas = document.createElement('canvas');
  canvas.width = rows[0].length;
  canvas.height = rows.length;
  const ctx = canvas.getContext('2d');
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const color = palette[ch];
      if (ch === '.' || !color) return;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    });
  });
  return canvas;
}

function pixelTexture(canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeFrames(palette) {
  const frames = {};
  FRAME_ORDER.forEach(name => { frames[name] = pixelTexture(gridToCanvas(buildFrame(name), palette)); });
  return frames;
}

const ICONS = {
  heart: { rows: ['.kk.kk.', 'kRRkRRk', 'kRrRRRk', 'kRRRRRk', '.kRRRk.', '..kRk..', '...k...'], pal: { k: '#3a0f1c', R: '#ff4d6d', r: '#ffd0da' } },
  question: { rows: ['.kkkk.', 'kyyyyk', 'kykkyk', '..kyyk', '..kyk.', '..kk..', '..kk..', '..kyk.', '..kk..'], pal: { k: '#2a2230', y: '#ffd84a' } },
  bang: { rows: ['.kk.', 'kggk', 'kggk', 'kggk', 'kggk', '.kk.', '.kk.', 'kggk', '.kk.'], pal: { k: '#0e2a16', g: '#7dff9b' } },
  zzz: { rows: ['kkkkk', 'wwwwk', '..wk.', '.wk..', 'wkkkk', 'wwwww'], pal: { k: '#1b2a4a', w: '#d6e6ff' } },
  dots: { rows: ['kkkkkkkkk', 'kwkwkwkwk', 'kkkkkkkkk'], pal: { k: '#1b1620', w: '#ffffff' } },
  cloud: { rows: ['..kkk..', '.kgggk.', 'kgggggk', 'kgggggk', '.kkkkk.'], pal: { k: '#4b4640', g: '#b9b3aa' } },
};

function iconTexture(name) {
  const icon = ICONS[name];
  return pixelTexture(gridToCanvas(icon.rows, icon.pal));
}

// --- Post-processing: outlines and colour grade -------------------------------

const POST_VERTEX = `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const POST_FRAGMENT = `
  uniform sampler2D tColor;
  uniform sampler2D tDepth;
  uniform sampler2D tNormal;
  uniform vec2 resolution;
  uniform float depthRange;
  uniform float night;
  varying vec2 vUv;

  float depthAt(vec2 uv) { return texture2D(tDepth, uv).r * depthRange; }
  vec3 toSRGB(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
  vec3 normalAt(vec2 uv) { return texture2D(tNormal, uv).rgb * 2.0 - 1.0; }

  void main() {
    vec4 color = texture2D(tColor, vUv);
    vec2 px = 1.0 / resolution;
    float d = depthAt(vUv);
    vec3 n = normalAt(vUv);
    vec2 offsets[4];
    offsets[0] = vec2(px.x, 0.0);
    offsets[1] = vec2(-px.x, 0.0);
    offsets[2] = vec2(0.0, px.y);
    offsets[3] = vec2(0.0, -px.y);

    float depthEdge = 0.0;
    float normalEdge = 0.0;
    for (int i = 0; i < 4; i++) {
      vec2 uv = vUv + offsets[i];
      float dn = depthAt(uv);
      // A neighbour well behind this pixel: this pixel is on a silhouette.
      depthEdge += clamp((dn - d - 0.35) * 2.0, 0.0, 1.0);
      // A neighbour at the same depth facing another way: a convex crease.
      vec3 nn = normalAt(uv);
      float sameSurface = 1.0 - clamp(abs(dn - d) * 4.0, 0.0, 1.0);
      float bias = step(0.0, dot(n - nn, vec3(1.0, 1.0, 1.0)));
      normalEdge += (1.0 - clamp(dot(n, nn), 0.0, 1.0)) * sameSurface * bias;
    }
    depthEdge = clamp(depthEdge, 0.0, 1.0);
    normalEdge = step(0.25, normalEdge) * (1.0 - depthEdge);

    // The scene is rendered linear; grade in display space.
    vec3 c = toSRGB(color.rgb);
    c = mix(c, c * 0.42, depthEdge * color.a);
    c = mix(c, c * 1.28 + 0.03, normalEdge * 0.75 * (1.0 - night * 0.6));

    // Grade: a touch more saturation and contrast, warm highlights, cool shadows.
    float lum = dot(c, vec3(0.299, 0.587, 0.114));
    c = mix(vec3(lum), c, 1.14);
    c = (c - 0.5) * 1.06 + 0.5;
    c += vec3(0.018, 0.008, -0.012) * smoothstep(0.4, 1.0, lum);
    c += vec3(-0.01, 0.0, 0.025) * (1.0 - smoothstep(0.0, 0.4, lum));
    gl_FragColor = vec4(clamp(c, 0.0, 1.0), color.a);
  }
`;

// --- Sprite actors -------------------------------------------------------------

class Actor {
  constructor(stage, palette, { label = null, parent = stage.scene } = {}) {
    this.stage = stage;
    this.frames = makeFrames(palette);
    this.material = new THREE.SpriteMaterial({ map: this.frames.stand, transparent: true, alphaTest: 0.5 });
    this.sprite = new THREE.Sprite(this.material);
    this.sprite.userData.isSprite = true;
    this.height = SPRITE_H / PPU;
    this.width = SPRITE_W / PPU;
    this.sprite.center.set(0.5, 0);
    this.sprite.scale.set(this.width, this.height, 1);
    this.group = new THREE.Group();
    this.group.add(this.sprite);
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.4, 12),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    shadow.userData.isSprite = true;
    this.group.add(shadow);
    this.facing = 1;
    this.lift = 0;
    this.time = Math.random() * 10;
    this.walking = false;
    this.override = null;
    this.stepPhase = 0;
    this.label = label;
    this.parent = parent;
    parent.add(this.group);
  }

  /** Change clothes (a helmet on the Moon, a kilt in Egypt) without a new actor. */
  setPalette(palette) {
    const old = this.frames;
    this.frames = makeFrames(palette);
    const current = Object.keys(old).find(name => old[name] === this.material.map) || 'stand';
    this.material.map = this.frames[current];
    this.material.needsUpdate = true;
    Object.values(old).forEach(texture => texture.dispose());
  }

  get position() {
    return this.group.position;
  }

  setPose(name) {
    if (this.frames[name] && this.material.map !== this.frames[name]) {
      this.material.map = this.frames[name];
      this.material.needsUpdate = true;
    }
  }

  face(dx) {
    if (Math.abs(dx) > 0.01) this.facing = dx > 0 ? 1 : -1;
  }

  /** Turn towards a point, in screen terms (the camera's right is +x, -z). */
  lookAt(point) {
    const me = this.group.position;
    this.face((point.x - point.z) - (me.x - me.z));
  }

  /** Walk in a straight line; `y` is reached in step with the walk (a ramp). */
  walkTo(x, z, speed = 3.4, y = this.group.position.y) {
    const pos = this.group.position;
    this.target?.resolve();
    return new Promise(resolve => {
      this.target = { x, z, y, fromY: pos.y, total: Math.hypot(x - pos.x, z - pos.z), speed, resolve };
      this.walking = true;
    });
  }

  play(frames, fps, duration) {
    this.override = { frames, fps, until: this.time + duration };
  }

  update(dt) {
    this.time += dt;
    const pos = this.group.position;
    if (this.walking && this.target) {
      const dx = this.target.x - pos.x;
      const dz = this.target.z - pos.z;
      const dist = Math.hypot(dx, dz);
      const step = this.target.speed * dt;
      this.face(dx - dz);
      if (dist <= step) {
        pos.x = this.target.x;
        pos.z = this.target.z;
        pos.y = this.target.y;
        this.walking = false;
        const done = this.target.resolve;
        this.target = null;
        done();
      } else {
        pos.x += (dx / dist) * step;
        pos.z += (dz / dist) * step;
        const done = this.target.total ? 1 - (dist - step) / this.target.total : 1;
        pos.y = this.target.fromY + (this.target.y - this.target.fromY) * done;
      }
    }
    let frame = 'stand';
    let bob = 0;
    if (this.override && this.time < this.override.until) {
      const { frames, fps } = this.override;
      frame = frames[Math.floor(this.time * fps) % frames.length];
    } else if (this.walking) {
      this.override = null;
      const cycle = ['walkA', 'stand', 'walkB', 'stand'];
      const i = Math.floor(this.time * 8) % 4;
      frame = cycle[i];
      bob = i % 2 === 1 ? 1 / PPU : 0;
      if (i !== this.stepPhase) {
        this.stepPhase = i;
        if (i === 0 || i === 2) this.onStep?.(this);
      }
    } else {
      this.override = null;
      bob = Math.floor(this.time * 2) % 2 === 0 ? 0 : 1 / PPU;
    }
    this.setPose(frame);
    // Keep the sprite on whole pixels vertically, so its texels never split.
    this.sprite.position.y = Math.round((this.lift + bob) * PPU) / PPU;
    this.sprite.scale.x = this.width * this.facing;
  }

  dispose() {
    this.parent.remove(this.group);
    Object.values(this.frames).forEach(texture => texture.dispose());
    this.material.dispose();
    this.labelEl?.remove();
  }
}

// --- Stage -------------------------------------------------------------------

/**
 * Create the stage for an event. It is told across several scenes (a cabin, a
 * harbour, the Moon...); the stage builds one at a time and walks the
 * character from scene to scene behind a quick fade.
 * `npcs` are the event's characters: { id, color, name }.
 */
export async function createStage(container, { eraId, mode = 'play', onStep, npcs = [] } = {}) {
  const canvas = document.createElement('canvas');
  canvas.className = 'stage-canvas';
  container.appendChild(canvas);
  const labels = document.createElement('div');
  labels.className = 'stage-labels';
  container.appendChild(labels);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance', premultipliedAlpha: false });
  renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.BasicShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, -60, 120);
  const cameraOffset = new THREE.Vector3(18, 17, 18);
  const focus = new THREE.Vector3(0, 0, 0);
  const focusTarget = new THREE.Vector3(0, 0, 0);
  let orbit = mode === 'play' ? 0 : -0.35;
  let orbitSpeed = mode === 'play' ? 0 : 0.05;

  const hemi = new THREE.HemisphereLight(0xdfefff, 0x6b5a48, 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1d6, 1.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 90 });
  sun.shadow.bias = -0.0008;
  sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);
  const moonFill = new THREE.AmbientLight(0x4a5c9a, 0);
  scene.add(moonFill);

  // Everything that belongs to the current scene hangs off `root`, so a scene
  // change is: dispose the root's children, build the next scene into it.
  const root = new THREE.Group();
  scene.add(root);
  const stage = { scene, root, eraId, animators: [], lamps: [], alarms: [], timers: [], night: 0 };
  const scenes = getScenes(eraId);
  const allPlaces = getPlaces(eraId);
  const space = isSpaceEvent(eraId);

  // --- Particles ---
  const particles = [];
  function burst(origin, { count = 8, colors = ['#ffffff'], speed = 2, up = 2.5, life = 0.8, size = 0.125, gravity = 6 } = {}) {
    if (reducedMotion()) return;
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(size, size, size),
        new THREE.MeshBasicMaterial({ color: colors[i % colors.length], transparent: true }),
      );
      mesh.position.copy(origin);
      mesh.userData.isSprite = true;
      const angle = Math.random() * Math.PI * 2;
      const v = new THREE.Vector3(Math.cos(angle) * speed * Math.random(), up * (0.6 + Math.random() * 0.6), Math.sin(angle) * speed * Math.random());
      scene.add(mesh);
      particles.push({ mesh, v, life, age: 0, gravity });
    }
  }

  function floatSprite(texture, origin, { width, height, rise = 1.2, life = 1.4, delay = 0 }) {
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(material);
    sprite.center.set(0.5, 0);
    sprite.scale.set(width, height, 1);
    sprite.position.copy(origin);
    sprite.renderOrder = 10;
    sprite.visible = delay <= 0;
    sprite.userData.isSprite = true;
    scene.add(sprite);
    particles.push({ mesh: sprite, v: new THREE.Vector3(0, rise / life, 0), life, age: -delay, gravity: 0, sprite: true });
  }

  // --- Clouds ---
  // Over the island, clouds are invisible and only cast shadows, so soft
  // patches of shade sweep across the ground without ever hiding the action.
  // Visible clouds drift around the island, at the edge of the view.
  const cloudMaterial = new THREE.MeshLambertMaterial({ color: '#ffffff', transparent: true, opacity: 0.95, flatShading: true, depthWrite: false });
  const shadowOnly = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
  let clouds = [];
  function makeCloud(i, material) {
    const cloud = new THREE.Group();
    const parts = 3 + (i % 3);
    for (let j = 0; j < parts; j++) {
      const w = 1.8 + ((i * 7 + j * 3) % 5) * 0.45;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.8 + (j % 2) * 0.4, w * 0.8), material);
      mesh.position.set(j * 1.2 - parts * 0.55, (j % 2) * 0.35, ((j * 5) % 3) * 0.55 - 0.55);
      mesh.castShadow = true;
      // Clouds stay out of the outline pass: their soft shapes look better without ink.
      mesh.userData.isSprite = true;
      cloud.add(mesh);
    }
    return cloud;
  }
  function addClouds() {
    clouds = [];
    for (let i = 0; i < 4; i++) {
      const cloud = makeCloud(i, shadowOnly);
      cloud.userData = { isSprite: true, angle: (i / 4) * Math.PI * 2, radius: 3 + (i % 2) * 5, height: 16, speed: 0.02 + (i % 3) * 0.006 };
      root.add(cloud);
      clouds.push(cloud);
    }
    for (let i = 0; i < 7; i++) {
      const cloud = makeCloud(i + 4, cloudMaterial);
      cloud.userData = { isSprite: true, angle: (i / 7) * Math.PI * 2, radius: 19 + (i % 3) * 3, height: -1 + (i % 4) * 2.2, speed: 0.01 + (i % 3) * 0.003 };
      root.add(cloud);
      clouds.push(cloud);
    }
  }

  // --- Actors ---
  const player = new Actor(stage, playerPalette(eraId));
  const dustColor = space ? '#b9b9b4' : '#cbbf9f';
  player.onStep = actor => {
    onStep?.();
    burst(actor.position.clone().add(new THREE.Vector3(0, 0.06, 0)), { count: 2, colors: [dustColor], up: space ? 0.9 : 0.6, speed: 0.5, life: space ? 0.9 : 0.45, gravity: space ? 0.4 : 1, size: 0.09 });
  };
  const actors = [player];
  let crowd = [];
  let cast = new Map();
  let npc = null;
  let npcTag = null;
  let currentScene = null;
  let sceneConfig = null;
  let scenePlaces = [];
  let alarmOn = false;

  const npcById = id => npcs.find(entry => entry.id === id);
  const crowdColors = ['#e9e1cc', '#b5835a', '#7b8f6a', '#c06c5a', '#5f86a8', '#d8c9a4'];

  function removeActor(actor) {
    actor.dispose();
    const index = actors.indexOf(actor);
    if (index >= 0) actors.splice(index, 1);
  }

  function clearScene() {
    clearNpc();
    crowd.forEach(removeActor);
    crowd = [];
    cast.forEach(removeActor);
    cast = new Map();
    stage.timers.forEach(clearInterval);
    stage.timers = [];
    stage.animators = [];
    stage.lamps = [];
    stage.alarms = [];
    clouds = [];
    [...root.children].forEach(child => {
      child.traverse(obj => {
        obj.geometry?.dispose?.();
        if (obj.material && obj.material !== cloudMaterial && obj.material !== shadowOnly) [].concat(obj.material).forEach(m => m.dispose?.());
      });
      root.remove(child);
    });
  }

  /** Build one scene of the event and put the character at its entrance. */
  function loadScene(sceneId, startPos) {
    clearScene();
    currentScene = sceneId;
    sceneConfig = scenes[sceneId] || { kind: 'island', size: 10, entrance: [0, 0] };
    scenePlaces = allPlaces.filter(place => place.scene === sceneId);
    buildWorld(THREE, stage, { eraId, sceneId, scene: sceneConfig, places: scenePlaces, burst });
    const room = sceneConfig.kind === 'room';
    if (!room && !space) addClouds();
    container.classList.toggle('stage-interior', room);
    container.classList.toggle('stage-space', space && !room);

    player.setPalette(playerPalette(eraId, sceneConfig.outfit));
    const [sx, sz] = startPos || sceneConfig.entrance || [0, 0];
    player.target?.resolve();
    player.target = null;
    player.walking = false;
    player.position.set(sx, 0, sz);

    // The people who are always here: crewmates in the cabin.
    (sceneConfig.cast || []).forEach((id, i) => {
      const data = npcById(id);
      if (!data) return;
      const actor = new Actor(stage, npcPalette(data.color, eraId, sceneConfig.outfit), { parent: root });
      const anchor = scenePlaces[0]?.pos || [0, 0];
      actor.position.set(anchor[0] + 1.4 + i * 1.1, 0, anchor[1] - 0.9 + i * 0.5);
      actor.facing = -1;
      cast.set(id, actor);
      actors.push(actor);
    });

    // A town is never empty: a few people go about their day.
    if (!reducedMotion()) {
      const spots = [sceneConfig.entrance || [0, 0], ...scenePlaces.map(place => place.pos)];
      for (let i = 0; i < (sceneConfig.crowd || 0); i++) {
        const palette = { ...npcPalette(crowdColors[i % crowdColors.length], eraId), ...SKIN_TONES[(i + 1) % SKIN_TONES.length] };
        const walker = new Actor(stage, palette, { parent: root });
        const [x, z] = spots[i % spots.length];
        walker.position.set(x + 1.6 - (i % 2) * 3, 0, z + 1.2);
        walker.wanderAt = Math.random() * 3;
        walker.spots = spots;
        crowd.push(walker);
        actors.push(walker);
      }
    }

    viewHalf = (VIEW[mode] || VIEW.play)[room ? 'room' : 'island'];
    resize();
    if (room) focus.set(0, 0, 0);
    else focus.set(player.position.x, player.position.y, player.position.z);
    applySky(dayFraction);
  }

  // --- Day cycle ---
  let dayFraction = mode === 'play' ? 0 : 0.33;
  let dayTarget = dayFraction;
  function applySky(fraction) {
    const sky = skyAt(eraId, fraction);
    container.style.setProperty('--sky-top', sky.top);
    container.style.setProperty('--sky-horizon', sky.horizon);
    sun.intensity = 0.25 + sky.sun * 1.55;
    sun.color.set(sky.sun < 0.5 ? 0xffb38a : 0xfff1d6);
    hemi.intensity = 0.35 + sky.sun * 0.65;
    hemi.color.set(space ? '#c9d3e6' : sky.top);
    moonFill.intensity = sky.night * 0.9;
    const r = 34;
    // On the Moon the Sun hangs low in the east all day, as it did for Apollo 11.
    const angle = space ? 0.45 : sky.sunAngle;
    sun.position.set(Math.cos(angle) * r, 14 + Math.sin(angle) * 24, -8 + Math.sin(angle) * 6);
    stage.night = sky.night;
    post.uniforms.night.value = sky.night;
  }

  // --- Render targets and the post pass ---
  const depthTexture = new THREE.DepthTexture(1, 1);
  const colorTarget = new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthTexture });
  const normalTarget = new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  const normalMaterial = new THREE.MeshNormalMaterial();
  const post = new THREE.ShaderMaterial({
    vertexShader: POST_VERTEX,
    fragmentShader: POST_FRAGMENT,
    uniforms: {
      tColor: { value: colorTarget.texture },
      tDepth: { value: depthTexture },
      tNormal: { value: normalTarget.texture },
      resolution: { value: new THREE.Vector2(1, 1) },
      depthRange: { value: camera.far - camera.near },
      night: { value: 0 },
    },
    transparent: true,
  });
  const postScene = new THREE.Scene();
  const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post));

  // --- Sizing: whole-number upscaling in device pixels ---
  // The canvas always covers the whole stage and is centred on it. The size is
  // re-checked every frame as well as on resize events, so a missed event (a
  // zoom, a window moved to another screen, a late layout) can never leave the
  // world drawn in a corner.
  let viewHalf = VIEW.play.island;
  let renderW = 1;
  let renderH = 1;
  let upscale = 1;
  let measured = '';
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const cssW = Math.max(1, rect.width || window.innerWidth);
    const cssH = Math.max(1, rect.height || window.innerHeight);
    measured = `${cssW}x${cssH}@${dpr}`;
    const devW = Math.round(cssW * dpr);
    const devH = Math.round(cssH * dpr);
    const aspect = cssW / cssH;
    // Portrait screens see a taller slice of the world so it is not cramped.
    const wanted = aspect < 1 ? viewHalf * Math.min(1.5, 0.85 / aspect) : viewHalf;
    upscale = Math.max(1, Math.round(devH / (wanted * 2 * PPU)));
    renderW = Math.ceil(devW / upscale);
    renderH = Math.ceil(devH / upscale);
    renderer.setSize(renderW, renderH, false);
    renderer.setViewport(0, 0, renderW, renderH);
    colorTarget.setSize(renderW, renderH);
    normalTarget.setSize(renderW, renderH);
    post.uniforms.resolution.value.set(renderW, renderH);
    // The canvas is shown at exactly `upscale` device pixels per render pixel.
    canvas.style.width = `${(renderW * upscale) / dpr}px`;
    canvas.style.height = `${(renderH * upscale) / dpr}px`;
    stage.aspect = aspect;
    updateCamera(true);
  }
  function checkSize() {
    const rect = container.getBoundingClientRect();
    if (`${Math.max(1, rect.width || window.innerWidth)}x${Math.max(1, rect.height || window.innerHeight)}@${window.devicePixelRatio || 1}` !== measured) resize();
  }

  const right = new THREE.Vector3();
  const up = new THREE.Vector3();
  function updateCamera(snapNow = false) {
    const halfH = renderH / (2 * PPU);
    const halfW = renderW / (2 * PPU);
    camera.left = -halfW;
    camera.right = halfW;
    camera.top = halfH;
    camera.bottom = -halfH;
    camera.updateProjectionMatrix();
    const offset = cameraOffset.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), orbit);
    camera.position.copy(focus).add(offset);
    camera.lookAt(focus);
    // Snap the camera to the pixel grid so the world never crawls as it moves.
    if (orbitSpeed === 0 || snapNow) {
      right.set(1, 0, 0).applyQuaternion(camera.quaternion);
      up.set(0, 1, 0).applyQuaternion(camera.quaternion);
      const px = 1 / PPU;
      const r = camera.position.dot(right);
      const u = camera.position.dot(up);
      camera.position.addScaledVector(right, Math.round(r / px) * px - r).addScaledVector(up, Math.round(u / px) * px - u);
    }
  }

  const observer = new ResizeObserver(resize);
  observer.observe(container);
  window.visualViewport?.addEventListener('resize', resize);
  document.fonts?.ready?.then(resize);

  // --- Screen-space labels (crisp browser text anchored to the world) ---
  const labelItems = [];
  const projected = new THREE.Vector3();
  function toScreen(point) {
    projected.copy(point).project(camera);
    const rect = canvas.getBoundingClientRect();
    const hostRect = container.getBoundingClientRect();
    return {
      x: rect.left - hostRect.left + ((projected.x + 1) / 2) * rect.width,
      y: rect.top - hostRect.top + ((1 - projected.y) / 2) * rect.height,
    };
  }

  function addLabel(text, anchor, { className = '', life = 0, rise = 0, delay = 0, follow = null } = {}) {
    const el = document.createElement('div');
    el.className = `stage-label ${className}`;
    el.textContent = text;
    el.style.opacity = '0';
    labels.appendChild(el);
    const item = { el, anchor: anchor.clone(), age: -delay, life, rise, follow };
    labelItems.push(item);
    return item;
  }

  function removeLabel(item) {
    if (!item) return;
    item.el.remove();
    const index = labelItems.indexOf(item);
    if (index >= 0) labelItems.splice(index, 1);
  }

  function updateLabels(dt) {
    for (let i = labelItems.length - 1; i >= 0; i--) {
      const item = labelItems[i];
      item.age += dt;
      if (item.follow) item.anchor.copy(item.follow.position).add(new THREE.Vector3(0, item.follow.height + 0.35, 0));
      const lift = item.life ? Math.min(item.age, item.life) * item.rise : 0;
      const { x, y } = toScreen(item.anchor.clone().add(new THREE.Vector3(0, lift, 0)));
      item.el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, -100%)`;
      if (item.age < 0) continue;
      const fade = item.life ? Math.min(1, (item.life - item.age) / 0.4) : 1;
      item.el.style.opacity = String(Math.max(0, Math.min(1, item.age * 8, fade)));
      if (item.life && item.age >= item.life) {
        item.el.remove();
        labelItems.splice(i, 1);
      }
    }
  }

  // --- Loop ---
  let last = performance.now();
  let raf = 0;
  let running = true;
  const hidden = [];
  function render() {
    // Normals for the outline pass: world geometry only, sprites hidden.
    scene.traverse(obj => { if (obj.userData.isSprite && obj.visible) { obj.visible = false; hidden.push(obj); } });
    scene.overrideMaterial = normalMaterial;
    renderer.setRenderTarget(normalTarget);
    renderer.setClearColor(0x8080ff, 1);
    renderer.clear();
    renderer.render(scene, camera);
    scene.overrideMaterial = null;
    hidden.forEach(obj => { obj.visible = true; });
    hidden.length = 0;

    renderer.setRenderTarget(colorTarget);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(scene, camera);

    renderer.setRenderTarget(null);
    renderer.setViewport(0, 0, renderW, renderH);
    renderer.clear();
    renderer.render(postScene, postCamera);
  }

  function tick(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;
    checkSize();

    if (Math.abs(dayTarget - dayFraction) > 0.0005) {
      dayFraction += (dayTarget - dayFraction) * Math.min(1, dt * 1.5);
      applySky(dayFraction);
    }

    actors.forEach(actor => actor.update(dt));
    crowd.forEach(walker => {
      if (walker.walking) return;
      walker.wanderAt -= dt;
      if (walker.wanderAt <= 0) {
        const [x, z] = walker.spots[Math.floor(Math.random() * walker.spots.length)];
        walker.walkTo(x + (Math.random() - 0.5) * 4, z + 1 + Math.random() * 2, 1.6, 0).then(() => { walker.wanderAt = 2 + Math.random() * 5; });
      }
    });

    clouds.forEach(cloud => {
      const c = cloud.userData;
      c.angle += c.speed * dt * (reducedMotion() ? 0 : 1);
      cloud.position.set(Math.cos(c.angle) * c.radius, c.height, Math.sin(c.angle) * c.radius);
    });

    stage.animators.forEach(fn => fn(dt, t));
    stage.lamps.forEach(lamp => lamp.set(stage.night));
    const alarmLevel = alarmOn ? (Math.sin(t * 9) > 0 ? 1 : 0.15) : 0;
    stage.alarms.forEach(alarm => alarm.set(alarmLevel));

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.age += dt;
      if (p.age < 0) continue;
      p.mesh.visible = true;
      p.v.y -= p.gravity * dt;
      p.mesh.position.addScaledVector(p.v, dt);
      const fade = 1 - p.age / p.life;
      p.mesh.material.opacity = Math.max(0, Math.min(1, fade * 1.6));
      if (p.age >= p.life) {
        scene.remove(p.mesh);
        if (!p.sprite) p.mesh.geometry.dispose();
        p.mesh.material.map?.dispose();
        p.mesh.material.dispose();
        particles.splice(i, 1);
      }
    }

    // The dialog covers the bottom of the screen, so in play the character is
    // kept in the upper half; the title screen frames the scene above the menu.
    // A room is small enough to stay still and show whole; outside, the camera
    // follows the character, up ramps too.
    const portrait = (stage.aspect || 1) < 1;
    const room = sceneConfig?.kind === 'room';
    const drop = (portrait ? 2.6 : 1.4) * (viewHalf / VIEW.play.island);
    if (mode !== 'play') focusTarget.set(0, portrait ? -4.5 : -2.6, 0).multiplyScalar(room ? 0.4 : 1);
    else if (room) focusTarget.set(0, 0.6 - drop, 0);
    else focusTarget.set(player.position.x, player.position.y - drop, player.position.z);
    focus.lerp(focusTarget, Math.min(1, dt * 2.5));
    orbit += orbitSpeed * dt;
    updateCamera();
    updateLabels(dt);

    render();
    raf = requestAnimationFrame(tick);
  }

  const onVisibility = () => {
    if (document.hidden) { running = false; cancelAnimationFrame(raf); }
    else if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(tick); }
  };
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('resize', resize);

  const wait = ms => new Promise(resolve => setTimeout(resolve, reducedMotion() ? 0 : ms));
  const headOf = actor => actor.position.clone().add(new THREE.Vector3(0, actor.height + 0.25, 0));

  function bubble(name, actor = player, opts = {}) {
    const rows = ICONS[name].rows;
    floatSprite(iconTexture(name), headOf(actor), { width: rows[0].length / PPU, height: rows.length / PPU, rise: 0.5, life: 1.3, ...opts });
  }

  function clearNpc() {
    removeLabel(npcTag);
    npcTag = null;
    if (!npc) return;
    if (!cast.has(npc.id)) removeActor(npc.actor);
    npc = null;
  }

  async function fadeTo(sceneId, startPos) {
    container.classList.add('stage-fade');
    await wait(240);
    loadScene(sceneId, startPos);
    container.classList.remove('stage-fade');
    await wait(160);
  }

  const startScene = mode === 'play' ? (allPlaces[0]?.scene || Object.keys(scenes)[0]) : showcaseScene(eraId);
  const startPlace = mode === 'play' ? allPlaces[0] : allPlaces.find(place => place.scene === startScene);
  loadScene(startScene, startPlace?.pos);
  if (startPlace?.y) player.position.y = startPlace.y;
  focus.copy(focusTarget);
  raf = requestAnimationFrame(tick);

  // --- Public API ----------------------------------------------------------
  return {
    /**
     * Walk to where a card happens, changing scene if need be, and meet its
     * NPC there: in person if they are in this scene, otherwise as a voice
     * (Houston on the radio, a shout from the ramp).
     */
    async goTo(place, npcData) {
      clearNpc();
      if (place.scene && place.scene !== currentScene) await fadeTo(place.scene);
      const [px, pz] = place.pos;
      const py = place.y || 0;
      if (npcData) {
        const present = npcPresent(eraId, npcData.id, currentScene);
        if (present && cast.has(npcData.id)) {
          npc = { id: npcData.id, actor: cast.get(npcData.id) };
        } else if (present) {
          const actor = new Actor(stage, npcPalette(npcData.color, eraId, sceneConfig.outfit), { parent: root });
          actor.position.set(px + 1.3, py, pz - 1.3);
          actors.push(actor);
          burst(actor.position.clone().add(new THREE.Vector3(0, 0.3, 0)), { count: 8, colors: ['#ffffff', npcData.color], up: 1.5 });
          npc = { id: npcData.id, actor };
        }
        if (npc && npcData.name) npcTag = addLabel(npcData.name, headOf(npc.actor), { className: 'npc-tag', follow: npc.actor });
        else if (npcData.name) npcTag = addLabel(`(( ${npcData.name} ))`, headOf(player), { className: 'npc-tag voice', follow: player });
      }
      if (reducedMotion()) {
        player.position.set(px, py, pz);
      } else {
        // Ramps: walk to their foot first, then climb (or the other way down).
        if (place.via && Math.abs(player.position.y - py) > 0.01) await player.walkTo(place.via[0], place.via[1], 3.4, 0);
        else if (!place.via && player.position.y > 0.01) {
          const from = scenePlaces.find(entry => entry.via && entry.y);
          if (from) await player.walkTo(from.via[0], from.via[1], 3.4, 0);
        }
        await player.walkTo(px, pz, 3.4, py);
      }
      if (npc) {
        player.lookAt(npc.actor.position);
        npc.actor.lookAt(player.position);
      }
    },

    /** Act out a choice: the body language of the option's trait. */
    async act(action) {
      const pos = player.position.clone();
      switch (action) {
        case 'dash': {
          player.play(['walkA', 'walkB'], 14, 0.7);
          const start = player.position.clone();
          const dir = player.facing;
          await player.walkTo(start.x + dir * 1.2, start.z - dir * 1.2, 7);
          burst(pos.clone().add(new THREE.Vector3(0, 0.1, 0)), { count: 10, colors: [dustColor, '#ffffff'], up: 1.2, speed: 1.5 });
          await player.walkTo(start.x, start.z, 5);
          break;
        }
        case 'rest':
          player.play(['sit'], 1, 1.4);
          bubble('zzz');
          await wait(1300);
          break;
        case 'give':
          player.play(['reach'], 1, 1.1);
          bubble('heart', npc?.actor || player, { delay: 0.2 });
          bubble('heart', player, { delay: 0.5 });
          await wait(1100);
          break;
        case 'sneak':
          player.play(['crouch'], 1, 1.3);
          player.material.opacity = 0.55;
          await wait(1200);
          player.material.opacity = 1;
          break;
        case 'work':
          player.play(['raise', 'reach'], 6, 1.4);
          for (let i = 0; i < 4; i++) {
            setTimeout(() => burst(headOf(player).add(new THREE.Vector3(player.facing * 0.5, -0.9, 0)), { count: 5, colors: ['#ffb52e', '#fff3b0'], up: 2, speed: 1.2, life: 0.5 }), i * 320);
          }
          await wait(1400);
          break;
        case 'inspect':
          player.play(['reach', 'stand'], 2, 1.2);
          bubble('question');
          await wait(1200);
          break;
        default:
          bubble('dots');
          await wait(800);
      }
    },

    /** React to how it went, and float the resource changes above the head. */
    async react(reaction, popups = []) {
      if (reaction === 'cheer') {
        player.play(['raise'], 1, 1.2);
        bubble('bang');
        burst(headOf(player), { count: 16, colors: ['#7dff9b', '#ffd84a', '#ffffff'], up: 3.2, speed: 2.2, life: 1 });
        if (!reducedMotion()) {
          const base = player.position.y;
          const jump = async () => { for (let i = 0; i <= 10; i++) { player.lift = Math.sin((i / 10) * Math.PI) * (space ? 0.9 : 0.5); await wait(space ? 45 : 28); } player.lift = 0; };
          await jump();
          await jump();
          player.position.y = base;
        }
      } else if (reaction === 'stumble') {
        player.play(['crouch'], 1, 1.2);
        burst(player.position.clone().add(new THREE.Vector3(0, 0.4, 0)), { count: 12, colors: ['#8a8580', '#b9b3aa'], up: 1, speed: 1.6, life: 0.9, gravity: 0 });
        bubble('cloud');
        await wait(700);
      } else {
        player.lift = 1 / PPU * 2;
        await wait(160);
        player.lift = 0;
      }
      popups.forEach((popup, i) => {
        // Stacked one line apart, so several changes never overlap.
        const lineHeight = 26 / (PPU * upscale / (window.devicePixelRatio || 1));
        addLabel(popup.text, headOf(player).add(new THREE.Vector3(0, 0.3 + i * lineHeight, 0)), { className: popup.good ? 'pop good' : 'pop bad', life: 2, rise: 0.6, delay: i * 0.18 });
      });
      await wait(450);
    },

    /** An alarm clock, a master alarm: every warning light in the scene flashes. */
    setAlarm(on) {
      alarmOn = !!on;
      container.classList.toggle('stage-alarm', alarmOn);
    },

    get sceneId() {
      return currentScene;
    },

    setDayFraction(fraction) {
      dayTarget = fraction;
    },

    /** Low vitals: the world loses colour. */
    setCritical(on) {
      container.classList.toggle('stage-critical', !!on);
    },

    /** The end of the day: the camera slowly circles the character. */
    finale(good) {
      clearNpc();
      alarmOn = false;
      orbitSpeed = reducedMotion() ? 0 : 0.1;
      player.play(good ? ['raise', 'stand'] : ['sit'], good ? 2 : 1, 999);
      if (good) burst(headOf(player), { count: 28, colors: ['#ffd84a', '#7dff9b', '#ff8ad8', '#ffffff'], up: 4, speed: 3, life: 1.4 });
    },

    reset() {
      orbitSpeed = 0;
      orbit = 0;
      alarmOn = false;
      player.override = null;
      dayTarget = 0;
      const home = allPlaces[0];
      loadScene(home.scene, home.pos);
    },

    dispose() {
      running = false;
      cancelAnimationFrame(raf);
      clearScene();
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', resize);
      window.visualViewport?.removeEventListener('resize', resize);
      actors.forEach(actor => actor.dispose());
      colorTarget.dispose();
      normalTarget.dispose();
      depthTexture.dispose();
      renderer.dispose();
      scene.traverse(obj => {
        obj.geometry?.dispose?.();
        if (obj.material) [].concat(obj.material).forEach(m => { m.map?.dispose?.(); m.dispose?.(); });
      });
      canvas.remove();
      labels.remove();
    },
  };
}
