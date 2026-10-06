// The 3D stage: a pixel-art diorama of each scene of the event, with a
// character modelled and animated in Blender (assets/models) who walks around
// obstacles to wherever each card happens and acts out the choice. The rules
// never wait on it; it only plays back what direction.js says.
//
// Rendering is built to look like hand-placed pixel art rather than a 3D game
// scaled down:
// - the world is drawn at a fixed number of pixels per unit and upscaled by a
//   whole number of device pixels, so every pixel on screen is the same size;
// - the camera snaps to the pixel grid, so nothing shimmers as it moves;
// - a post pass draws dark outlines on silhouettes and light rims on convex
//   edges from the depth and normal buffers, then grades the colour;
// - text (damage-style numbers, NPC names) is drawn by the browser over the
//   canvas, so it stays sharp at any size.
import * as THREE from '../../vendor/three/three.module.min.js';
import { GLTFLoader } from '../../vendor/three/addons/loaders/GLTFLoader.js';
import { skyAt, isSpaceEvent } from './direction.js';
import { getPlaces, getScenes, showcaseScene, npcPresent } from './places.js';
import { buildWorld } from './worlds.js';
import { playerLook, npcLook } from './looks.js';
import { findPath, nearestFree, isFree, lineClear } from './nav.js';

const PPU = 24; // render pixels per world unit
const ICON_PPU = 16; // speech-bubble icons keep their own, chunkier pixel size
// Desired half-height of the view, in world units: rooms are framed closer.
const VIEW = { play: { island: 6, room: 5.4 }, showcase: { island: 12, room: 8 } };
const WALK_SPEED = 2.2;

// Events with their own set of Blender models (assets/models/<event>.glb).
const EVENT_MODELS = new Set(['apollo-11']);

// The Blender models, loaded once per page and event.
const modelCache = new Map();
function loadModels(eraId) {
  const key = EVENT_MODELS.has(eraId) ? eraId : '';
  if (!modelCache.has(key)) {
    const loader = new GLTFLoader();
    const base = new URL('../../assets/models/', import.meta.url).href;
    const files = ['character', 'props', ...(key ? [key] : [])].map(name => loader.loadAsync(`${base}${name}.glb`));
    modelCache.set(key, Promise.all(files).then(([character, ...packs]) => ({
      character,
      props: new Map(packs.flatMap(pack => pack.scene.children.map(child => [child.name, child]))),
    })));
  }
  return modelCache.get(key);
}

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

// --- 3D actors ------------------------------------------------------------------

// What each action looks like: the clip, how long it plays, what is in the
// character's hands, and whether they move while doing it.
const ACTION_SPECS = {
  run: { clip: 'run', move: 'dash' },
  sit: { clip: 'sit', time: 1.8 },
  sleep: { clip: 'sleep', time: 2, bubble: 'zzz' },
  crouch: { clip: 'crouch', time: 1.6 },
  give: { clip: 'give', time: 1.5, bubble: 'heart' },
  pickup: { clip: 'pickup', time: 1.5 },
  work: { clip: 'work', time: 1.8, props: ['prop_hammer', 'prop_hammer_head'], sparks: true },
  pull: { clip: 'pull', time: 1.8, props: ['prop_rope'], move: 'back' },
  push: { clip: 'push', time: 1.8, move: 'forward' },
  inspect: { clip: 'inspect', time: 1.6, bubble: 'question' },
  point: { clip: 'point', time: 1.3 },
  talk: { clip: 'talk', time: 1.6, bubble: 'dots' },
  cheer: { clip: 'cheer', time: 1.3 },
  wave: { clip: 'wave', time: 1.4 },
  drink: { clip: 'drink', time: 1.7, props: ['prop_cup'] },
  write: { clip: 'write', time: 1.8, props: ['prop_tablet'] },
  treat: { clip: 'treat', time: 2, props: ['prop_bandage'], bubble: 'heart' },
  carry: { clip: 'carry', time: 1.8, move: 'forward' },
  climb: { clip: 'climb', time: 1.8 },
  swim: { clip: 'swim', time: 2 },
  pray: { clip: 'pray', time: 2 },
  bow: { clip: 'bow', time: 1.5 },
  think: { clip: 'think', time: 1.7, bubble: 'question' },
  salute: { clip: 'salute', time: 1.3 },
  look: { clip: 'look', time: 1.8 },
  dig: { clip: 'dig', time: 1.8, dust: true },
  nod: { clip: 'nod', time: 0.8 },
};
const ONE_SHOTS = new Set(['give', 'pickup', 'point', 'cheer', 'stumble', 'drink', 'bow', 'salute', 'nod']);
const ACCESSORY = /^acc_/;
const PROP = /^prop_/;

class Actor {
  constructor(stage, models, look, { parent = stage.scene } = {}) {
    this.stage = stage;
    this.parent = parent;
    this.group = new THREE.Group();
    this.model = models.character.scene.clone(true);
    this.group.add(this.model);
    this.clips = new Map(models.character.animations.map(clip => [clip.name, clip]));
    this.mixer = new THREE.AnimationMixer(this.model);
    this.actions = new Map();
    this.materials = new Map();
    this.model.traverse(obj => {
      if (!obj.isMesh) return;
      obj.castShadow = true;
      obj.receiveShadow = true;
      const name = obj.material.name;
      if (!this.materials.has(name)) this.materials.set(name, new THREE.MeshLambertMaterial({ color: obj.material.color.clone(), flatShading: true, transparent: true }));
      obj.material = this.materials.get(name);
    });
    this.height = 1.6;
    this.heading = 0;
    this.targetHeading = 0;
    this.path = [];
    this.walking = false;
    this.busy = false;
    this.stepClock = 0;
    this.setLook(look);
    this.loop('idle');
    parent.add(this.group);
  }

  get position() {
    return this.group.position;
  }

  /** Dress the character: recolour its materials, show its accessories. */
  setLook({ colors = {}, accessories = [] }) {
    this.materials.forEach((material, name) => {
      const key = name.replace(/^pal_/, '');
      if (colors[key]) material.color.set(colors[key]);
    });
    this.model.traverse(obj => {
      if (ACCESSORY.test(obj.name)) obj.visible = accessories.some(acc => obj.name === acc || obj.name.startsWith(`${acc}_`));
      else if (PROP.test(obj.name)) obj.visible = false;
    });
  }

  showProps(props = []) {
    this.model.traverse(obj => { if (PROP.test(obj.name)) obj.visible = props.includes(obj.name); });
  }

  action(name) {
    if (!this.actions.has(name)) {
      const clip = this.clips.get(name) || this.clips.get('idle');
      this.actions.set(name, this.mixer.clipAction(clip));
    }
    return this.actions.get(name);
  }

  /** Cross-fade into a clip; one-shots hold their last pose. */
  loop(name, { timeScale = 1, fade = 0.2 } = {}) {
    const next = this.action(name);
    if (this.current === next) { next.timeScale = timeScale; return next; }
    next.reset();
    next.enabled = true;
    next.timeScale = timeScale;
    if (ONE_SHOTS.has(name)) { next.setLoop(THREE.LoopOnce, 1); next.clampWhenFinished = true; }
    else next.setLoop(THREE.LoopRepeat, Infinity);
    next.play();
    if (this.current) this.current.crossFadeTo(next, fade, false);
    this.current = next;
    this.currentName = name;
    return next;
  }

  /** Turn towards a direction on the ground. */
  face(dx, dz) {
    if (Math.hypot(dx, dz) > 0.001) this.targetHeading = Math.atan2(dx, dz);
  }

  lookAt(point) {
    this.face(point.x - this.position.x, point.z - this.position.z);
  }

  /** Walk a list of [x, z] waypoints; y is reached in step with the last leg (a ramp). */
  walkPath(points, speed = WALK_SPEED, finalY = this.position.y) {
    this.finish?.();
    if (!points?.length) return Promise.resolve();
    return new Promise(resolve => {
      this.path = points.map(([x, z]) => ({ x, z }));
      this.path[this.path.length - 1].y = finalY;
      this.speed = speed;
      this.walking = true;
      this.legFrom = this.position.clone();
      this.finish = () => { this.finish = null; this.walking = false; this.path = []; resolve(); };
      this.loop(speed > 3.2 ? 'run' : 'walk', { timeScale: speed > 3.2 ? speed / 3 : speed / 1.4 });
    });
  }

  walkTo(x, z, speed = WALK_SPEED, y = this.position.y) {
    return this.walkPath([[x, z]], speed, y);
  }

  update(dt) {
    const pos = this.position;
    if (this.walking && this.path.length) {
      const target = this.path[0];
      const dx = target.x - pos.x;
      const dz = target.z - pos.z;
      const dist = Math.hypot(dx, dz);
      const step = this.speed * dt;
      this.face(dx, dz);
      const isLast = this.path.length === 1 && target.y !== undefined;
      if (dist <= step) {
        pos.x = target.x;
        pos.z = target.z;
        if (isLast) pos.y = target.y;
        this.path.shift();
        this.legFrom = pos.clone();
        if (!this.path.length) {
          this.finish?.();
          if (!this.busy) this.loop('idle');
        }
      } else {
        pos.x += (dx / dist) * step;
        pos.z += (dz / dist) * step;
        if (isLast && target.y !== pos.y) {
          const total = Math.hypot(target.x - this.legFrom.x, target.z - this.legFrom.z) || 1;
          pos.y = this.legFrom.y + (target.y - this.legFrom.y) * (1 - (dist - step) / total);
        }
      }
      this.stepClock += dt * this.speed;
      if (this.stepClock > 0.55) { this.stepClock = 0; this.onStep?.(this); }
    }
    // Turn smoothly, the short way round.
    let delta = this.targetHeading - this.heading;
    delta = Math.atan2(Math.sin(delta), Math.cos(delta));
    this.heading += delta * Math.min(1, dt * 12);
    this.group.rotation.y = this.heading;
    this.mixer.update(dt);
  }

  setOpacity(value) {
    this.materials.forEach(material => { material.opacity = value; });
  }

  dispose() {
    this.finish?.();
    this.mixer.stopAllAction();
    this.parent.remove(this.group);
    this.materials.forEach(material => material.dispose());
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
  const models = await loadModels(eraId);
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
  const player = new Actor(stage, models, playerLook(eraId));
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
  let nav = null;

  /** The nearest spot nobody would clip into. */
  function freeSpot([x, z]) {
    return (nav && nearestFree(nav, x, z)) || [x, z];
  }

  /** A path around obstacles, or a straight line if there is no grid. */
  function route(from, to) {
    if (!nav) return [to];
    return findPath(nav, [from.x, from.z], to) || [freeSpot(to)];
  }

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
    const world = buildWorld(THREE, stage, { eraId, sceneId, scene: sceneConfig, places: scenePlaces, burst, models: models.props });
    nav = world.nav;
    const room = sceneConfig.kind === 'room';
    if (!room && !space) addClouds();
    container.classList.toggle('stage-interior', room);
    container.classList.toggle('stage-space', space && !room);

    player.setLook(playerLook(eraId, sceneConfig.outfit));
    const [sx, sz] = freeSpot(startPos || sceneConfig.entrance || [0, 0]);
    player.finish?.();
    player.loop('idle');
    player.position.set(sx, 0, sz);

    // The people who are always here: crewmates in the cabin.
    (sceneConfig.cast || []).forEach((id, i) => {
      const data = npcById(id);
      if (!data) return;
      const actor = new Actor(stage, models, npcLook(eraId, { id, color: data.color, variant: sceneConfig.outfit }), { parent: root });
      const anchor = scenePlaces[0]?.pos || [0, 0];
      const [cx, cz] = freeSpot([anchor[0] + 1.4 + i * 1.1, anchor[1] - 0.9 + i * 0.5]);
      actor.position.set(cx, 0, cz);
      actor.face(1, 1);
      cast.set(id, actor);
      actors.push(actor);
    });

    // A town is never empty: a few people go about their day.
    if (!reducedMotion()) {
      const spots = [sceneConfig.entrance || [0, 0], ...scenePlaces.map(place => place.pos)];
      for (let i = 0; i < (sceneConfig.crowd || 0); i++) {
        const colors = sceneConfig.crowdColors || crowdColors;
        const walker = new Actor(stage, models, npcLook(eraId, { color: colors[i % colors.length], variant: sceneConfig.outfit, skin: i + 1 }), { parent: root });
        const [x, z] = freeSpot([spots[i % spots.length][0] + 1.6 - (i % 2) * 3, spots[i % spots.length][1] + 1.2]);
        walker.position.set(x, 0, z);
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
    const angle = space ? 0.12 : sky.sunAngle;
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
        walker.wanderAt = 2 + Math.random() * 5;
        walker.walkPath(route(walker.position, [x + (Math.random() - 0.5) * 4, z + 1 + Math.random() * 2]), 1.3, 0);
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
    floatSprite(iconTexture(name), headOf(actor), { width: rows[0].length / ICON_PPU, height: rows.length / ICON_PPU, rise: 0.5, life: 1.3, ...opts });
  }

  function clearNpc() {
    removeLabel(npcTag);
    npcTag = null;
    if (!npc) return;
    if (cast.has(npc.id)) npc.actor.loop('idle');
    else removeActor(npc.actor);
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
          const actor = new Actor(stage, models, npcLook(eraId, { id: npcData.id, color: npcData.color, variant: sceneConfig.outfit }), { parent: root });
          const [nx, nz] = py ? [px + 1, pz - 1] : freeSpot([px + 1.3, pz - 1.3]);
          actor.position.set(nx, py, nz);
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
        // Ramps: walk around things to their foot, then climb straight up
        // (or come straight down, then walk on).
        const ramp = place.via ? place : (player.position.y > 0.01 ? scenePlaces.find(entry => entry.via && entry.y) : null);
        if (ramp && player.position.y > 0.01 && !place.via) {
          await player.walkTo(ramp.via[0], ramp.via[1], WALK_SPEED, 0);
        } else if (ramp && Math.abs(player.position.y - py) > 0.01) {
          await player.walkPath(route(player.position, ramp.via), WALK_SPEED, 0);
        }
        if (py > 0.01 || place.via) await player.walkTo(px, pz, WALK_SPEED, py);
        else await player.walkPath(route(player.position, [px, pz]), WALK_SPEED, 0);
      }
      if (npc) {
        player.lookAt(npc.actor.position);
        npc.actor.lookAt(player.position);
        npc.actor.loop('talk');
      } else {
        // Face the camera, so the action reads.
        player.face(1, 1);
      }
    },

    /** Act out a choice: the action the option describes. */
    async act(action) {
      const spec = ACTION_SPECS[action] || ACTION_SPECS.nod;
      npc?.actor.loop('idle');
      player.busy = true;
      player.showProps(spec.props);
      const start = player.position.clone();
      const forward = new THREE.Vector3(Math.sin(player.heading), 0, Math.cos(player.heading));
      const clear = to => !nav || (isFree(nav, to.x, to.z) && lineClear(nav, [start.x, start.z], [to.x, to.z]));
      if (spec.move === 'dash' && !reducedMotion()) {
        // A sprint there and back, along whichever direction is free.
        const dirs = [forward, forward.clone().negate(), new THREE.Vector3(forward.z, 0, -forward.x), new THREE.Vector3(-forward.z, 0, forward.x)];
        const dir = dirs.find(d => clear(start.clone().addScaledVector(d, 1.6)));
        if (dir) {
          const to = start.clone().addScaledVector(dir, 1.6);
          await player.walkTo(to.x, to.z, 4.5, start.y);
          burst(to.clone().add(new THREE.Vector3(0, 0.1, 0)), { count: 10, colors: [dustColor, '#ffffff'], up: 1.2, speed: 1.5 });
          await player.walkTo(start.x, start.z, 4.5, start.y);
        }
        player.loop('cheer');
        await wait(500);
      } else {
        if ((spec.move === 'forward' || spec.move === 'back') && !reducedMotion()) {
          const to = start.clone().addScaledVector(forward, spec.move === 'back' ? -0.5 : 0.5);
          if (clear(to)) player.walkTo(to.x, to.z, 0.5, start.y).then(() => player.face(forward.x, forward.z));
        }
        player.loop(spec.clip);
        if (spec.move === 'forward' || spec.move === 'back') player.walking = true;
        if (spec.bubble) bubble(spec.bubble, player, { delay: 0.3 });
        if (action === 'give' && npc) bubble('heart', npc.actor, { delay: 0.6 });
        if (spec.sparks) {
          for (let i = 0; i < 4; i++) setTimeout(() => burst(player.position.clone().add(forward.clone().multiplyScalar(0.45)).add(new THREE.Vector3(0, 0.55, 0)), { count: 5, colors: ['#ffb52e', '#fff3b0'], up: 2, speed: 1.2, life: 0.5 }), 250 + i * 400);
        }
        if (spec.dust) {
          for (let i = 0; i < 3; i++) setTimeout(() => burst(player.position.clone().add(forward.clone().multiplyScalar(0.5)), { count: 6, colors: [dustColor, '#ffffff'], up: 1.6, speed: 0.8, life: 0.6 }), 300 + i * 450);
        }
        if (action === 'crouch') player.setOpacity(0.6);
        await wait((spec.time || 1.5) * 1000);
        player.setOpacity(1);
        if (player.walking && !player.path.length) player.walking = false;
        if (Math.hypot(player.position.x - start.x, player.position.z - start.z) > 0.05) await player.walkTo(start.x, start.z, 1.5, start.y);
      }
      player.showProps([]);
      player.busy = false;
    },

    /** React to how it went, and float the resource changes above the head. */
    async react(reaction, popups = []) {
      player.face(1, 1);
      if (reaction === 'cheer') {
        player.loop('cheer');
        bubble('bang');
        burst(headOf(player), { count: 16, colors: ['#7dff9b', '#ffd84a', '#ffffff'], up: 3.2, speed: 2.2, life: 1 });
        await wait(1300);
      } else if (reaction === 'stumble') {
        player.loop('stumble');
        burst(player.position.clone().add(new THREE.Vector3(0, 0.4, 0)), { count: 12, colors: ['#8a8580', '#b9b3aa'], up: 1, speed: 1.6, life: 0.9, gravity: 0 });
        bubble('cloud');
        await wait(1500);
      } else {
        player.loop('nod');
        await wait(700);
      }
      popups.forEach((popup, i) => {
        // Stacked one line apart, so several changes never overlap.
        const lineHeight = 26 / (PPU * upscale / (window.devicePixelRatio || 1));
        addLabel(popup.text, headOf(player).add(new THREE.Vector3(0, 0.3 + i * lineHeight, 0)), { className: popup.good ? 'pop good' : 'pop bad', life: 2, rise: 0.6, delay: i * 0.18 });
      });
      player.loop('idle', { fade: 0.4 });
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
      player.loop(good ? 'cheer' : 'sit');
      if (good) burst(headOf(player), { count: 28, colors: ['#ffd84a', '#7dff9b', '#ff8ad8', '#ffffff'], up: 4, speed: 3, life: 1.4 });
    },

    reset() {
      orbitSpeed = 0;
      orbit = 0;
      alarmOn = false;
      player.loop('idle');
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
