// The 3D stage: a pixel-art diorama of the era, rendered at low resolution and
// scaled up with hard edges, with a sprite character who walks to wherever
// each card happens and acts out the choice. The rules never wait on it; it
// only plays back what direction.js says.
import * as THREE from '../../vendor/three/three.module.min.js';
import { buildFrame, FRAME_ORDER, SPRITE_W, SPRITE_H, playerPalette, npcPalette } from './sprites.js';
import { skyAt } from './direction.js';
import { getPlaces } from './places.js';
import { buildWorld } from './worlds.js';

const ISLAND = 12; // half-size of the island in world units
const TARGET_PIXEL_ROWS = 300; // internal render height before upscaling

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// --- Pixel textures ----------------------------------------------------------

function gridToCanvas(rows, palette, scale = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = rows[0].length * scale;
  canvas.height = rows.length * scale;
  const ctx = canvas.getContext('2d');
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const color = palette[ch];
      if (ch === '.' || !color) return;
      ctx.fillStyle = color;
      ctx.fillRect(x * scale, y * scale, scale, scale);
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
  heart: { rows: ['.rr.rr.', 'rRRrRRr', 'rRRRRRr', '.rRRRr.', '..rRr..', '...r...'], pal: { r: '#7a1730', R: '#ff4d6d' } },
  question: { rows: ['.kkkk.', 'kyyyyk', '...kyk', '..kyk.', '..kk..', '......', '..kk..', '..yy..'], pal: { k: '#2a2230', y: '#ffd84a' } },
  bang: { rows: ['.kk.', 'kyyk', 'kyyk', 'kyyk', '.kk.', '....', '.kk.', 'kyyk', '.kk.'], pal: { k: '#2a2230', y: '#7dff9b' } },
  zzz: { rows: ['kkkk', '..k.', '.k..', 'kkkk'], pal: { k: '#cfe3ff' } },
  dots: { rows: ['k.k.k'], pal: { k: '#ffffff' } },
  spark: { rows: ['.y.', 'yYy', '.y.'], pal: { y: '#ffb52e', Y: '#fff6c2' } },
  cloud: { rows: ['.ggg.', 'ggggg', '.ggg.'], pal: { g: '#9a948c' } },
};

function iconTexture(name) {
  const icon = ICONS[name];
  return pixelTexture(gridToCanvas(icon.rows, icon.pal));
}

function textTexture(text, color) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const font = '8px Silkscreen, "Press Start 2P", monospace';
  ctx.font = font;
  const width = Math.ceil(ctx.measureText(text).width) + 4;
  canvas.width = width;
  canvas.height = 12;
  ctx.font = font;
  ctx.textBaseline = 'top';
  // A one-pixel dark outline keeps labels readable over any background.
  ctx.fillStyle = '#16121c';
  [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dx, dy]) => ctx.fillText(text, 2 + dx, 2 + dy));
  ctx.fillStyle = color;
  ctx.fillText(text, 2, 2);
  return { texture: pixelTexture(canvas), width, height: 12 };
}

// --- Sprite actors -------------------------------------------------------------

class Actor {
  constructor(stage, palette, { scale = 1 } = {}) {
    this.stage = stage;
    this.frames = makeFrames(palette);
    this.material = new THREE.SpriteMaterial({ map: this.frames.stand, transparent: true, alphaTest: 0.5 });
    this.sprite = new THREE.Sprite(this.material);
    this.height = (SPRITE_H / 16) * scale;
    this.width = (SPRITE_W / 16) * scale;
    this.sprite.center.set(0.5, 0);
    this.sprite.scale.set(this.width, this.height, 1);
    this.group = new THREE.Group();
    this.group.add(this.sprite);
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.42 * scale, 10),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    this.group.add(shadow);
    this.facing = 1;
    this.pose = 'stand';
    this.lift = 0;
    this.time = Math.random() * 10;
    this.walking = false;
    this.override = null; // { frames: [...], fps, until }
    stage.scene.add(this.group);
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

  walkTo(x, z, speed = 3.4) {
    return new Promise(resolve => {
      this.target = { x, z, speed, resolve };
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
      // Screen-space facing: the camera looks from +x+z, so screen right is (+x, -z).
      this.face(dx - dz);
      if (dist <= step) {
        pos.x = this.target.x;
        pos.z = this.target.z;
        this.walking = false;
        const done = this.target.resolve;
        this.target = null;
        done();
      } else {
        pos.x += (dx / dist) * step;
        pos.z += (dz / dist) * step;
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
      bob = i % 2 === 1 ? 0.06 : 0;
    } else {
      this.override = null;
      frame = 'stand';
      bob = Math.floor(this.time * 2) % 2 === 0 ? 0 : 0.0625;
    }
    this.setPose(frame);
    this.sprite.position.y = this.lift + bob;
    this.sprite.scale.x = this.width * this.facing;
  }

  dispose() {
    this.stage.scene.remove(this.group);
    Object.values(this.frames).forEach(texture => texture.dispose());
    this.material.dispose();
  }
}

// --- Stage -------------------------------------------------------------------

export async function createStage(container, { eraId, mode = 'play' }) {
  const canvas = document.createElement('canvas');
  canvas.className = 'stage-canvas';
  container.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.BasicShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, -100, 200);
  const cameraOffset = new THREE.Vector3(18, 17, 18);
  const focus = new THREE.Vector3(0, 0, 0);
  const focusTarget = new THREE.Vector3(0, 0, 0);
  let zoom = mode === 'play' ? 7.2 : 12.5;
  let zoomTarget = zoom;
  let orbit = 0;
  let orbitSpeed = mode === 'play' ? 0 : 0.06;

  const hemi = new THREE.HemisphereLight(0xdfefff, 0x6b5a48, 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1d6, 1.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 80 });
  sun.shadow.bias = -0.0015;
  scene.add(sun, sun.target);
  const moonFill = new THREE.AmbientLight(0x4a5c9a, 0);
  scene.add(moonFill);

  const stage = { scene, eraId, animators: [], lamps: [], timers: [], night: 0 };

  // Particles: tiny boxes and sprites with a velocity and a lifetime.
  const particles = [];
  function burst(origin, { count = 8, colors = ['#ffffff'], speed = 2, up = 2.5, life = 0.8, size = 0.12, gravity = 6 } = {}) {
    if (reducedMotion()) return;
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(size, size, size),
        new THREE.MeshBasicMaterial({ color: colors[i % colors.length], transparent: true }),
      );
      mesh.position.copy(origin);
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
    scene.add(sprite);
    particles.push({ mesh: sprite, v: new THREE.Vector3(0, rise / life, 0), life, age: -delay, gravity: 0, sprite: true });
  }

  const world = buildWorld(THREE, stage, { eraId, island: ISLAND, places: getPlaces(eraId), burst });

  // The player and the people who share the day with them.
  const player = new Actor(stage, playerPalette(eraId));
  const home = getPlaces(eraId)[0];
  player.position.set(home.pos[0], world.groundY, home.pos[1]);
  const actors = [player];

  const villagerColors = ['#b5835a', '#7b8f6a', '#8a6f9e', '#c06c5a', '#5f86a8'];
  const villagers = [];
  const places = getPlaces(eraId);
  if (!reducedMotion()) {
    for (let i = 0; i < 4; i++) {
      const v = new Actor(stage, npcPalette(villagerColors[i % villagerColors.length], eraId), { scale: 0.92 });
      const p = places[(i + 1) % places.length];
      v.position.set(p.pos[0] + 1.5, world.groundY, p.pos[1] + 1);
      v.wanderAt = Math.random() * 3;
      villagers.push(v);
      actors.push(v);
    }
  }

  let npc = null;

  // --- Day cycle ---
  let dayFraction = mode === 'play' ? 0 : 0.35;
  let dayTarget = dayFraction;
  function applySky(fraction) {
    const sky = skyAt(eraId, fraction);
    container.style.setProperty('--sky-top', sky.top);
    container.style.setProperty('--sky-horizon', sky.horizon);
    sun.intensity = 0.25 + sky.sun * 1.55;
    sun.color.set(sky.sun < 0.5 ? 0xffb38a : 0xfff1d6);
    hemi.intensity = 0.35 + sky.sun * 0.65;
    hemi.color.set(sky.top);
    moonFill.intensity = sky.night * 0.9;
    const r = 30;
    sun.position.set(Math.cos(sky.sunAngle) * r, 12 + Math.sin(sky.sunAngle) * 22, -8 + Math.sin(sky.sunAngle) * 6);
    stage.night = sky.night;
    if (scene.fog) scene.fog.color.set(sky.horizon);
  }
  scene.fog = new THREE.Fog(0xffffff, 40, 90);
  applySky(dayFraction);

  // --- Sizing ---
  function resize() {
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    const scale = Math.max(2, Math.round(h / TARGET_PIXEL_ROWS));
    renderer.setSize(Math.ceil(w / scale), Math.ceil(h / scale), false);
    stage.aspect = w / h;
    updateCamera();
  }

  function updateCamera() {
    const aspect = stage.aspect || 1;
    // Portrait screens get a wider view so the scene doesn't feel cramped.
    const halfH = aspect < 1 ? zoom * Math.min(1.5, 0.85 / aspect) : zoom;
    camera.left = -halfH * aspect;
    camera.right = halfH * aspect;
    camera.top = halfH;
    camera.bottom = -halfH;
    camera.updateProjectionMatrix();
    const offset = cameraOffset.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), orbit);
    camera.position.copy(focus).add(offset);
    camera.lookAt(focus);
  }

  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  // --- Loop ---
  let last = performance.now();
  let raf = 0;
  let running = true;
  function tick(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    if (Math.abs(dayTarget - dayFraction) > 0.0005) {
      dayFraction += (dayTarget - dayFraction) * Math.min(1, dt * 1.5);
      applySky(dayFraction);
    }

    actors.forEach(actor => actor.update(dt));
    villagers.forEach(v => {
      if (v.walking) return;
      v.wanderAt -= dt;
      if (v.wanderAt <= 0) {
        const p = places[Math.floor(Math.random() * places.length)];
        v.walkTo(p.pos[0] + (Math.random() - 0.5) * 4, p.pos[1] + (Math.random() - 0.5) * 4, 1.6).then(() => { v.wanderAt = 2 + Math.random() * 5; });
      }
    });

    stage.animators.forEach(fn => fn(dt, now / 1000));
    stage.lamps.forEach(lamp => lamp.set(stage.night));

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

    // In play the camera follows the character; on the title screen it frames
    // the island a little high, above the menu panel.
    // The dialog covers the bottom of the screen, so the character is kept in
    // the upper half (more so on tall phone screens).
    if (mode === 'play') focusTarget.set(player.position.x, (stage.aspect || 1) < 1 ? -2.6 : -1.2, player.position.z);
    else focusTarget.set(0, -3.2, 0);
    focus.lerp(focusTarget, Math.min(1, dt * 2.5));
    zoom += (zoomTarget - zoom) * Math.min(1, dt * 2);
    orbit += orbitSpeed * dt;
    updateCamera();

    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);

  const onVisibility = () => {
    if (document.hidden) { running = false; cancelAnimationFrame(raf); }
    else if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(tick); }
  };
  document.addEventListener('visibilitychange', onVisibility);

  const wait = ms => new Promise(resolve => setTimeout(resolve, reducedMotion() ? 0 : ms));
  const headOf = actor => actor.position.clone().add(new THREE.Vector3(0, actor.height + 0.25, 0));

  function bubble(name, actor = player, opts = {}) {
    const rows = ICONS[name].rows;
    floatSprite(iconTexture(name), headOf(actor), { width: rows[0].length / 16, height: rows.length / 16, rise: 0.5, life: 1.3, ...opts });
  }

  // --- Public API ----------------------------------------------------------
  return {
    /** Walk to where a card happens and meet its NPC there, if it has one. */
    async goTo(place, npcData) {
      if (npc) { npc.dispose(); actors.splice(actors.indexOf(npc), 1); npc = null; }
      const [px, pz] = place.pos;
      if (npcData) {
        npc = new Actor(stage, npcPalette(npcData.color, eraId));
        npc.position.set(px + 1.3, world.groundY, pz - 1.3);
        actors.push(npc);
        burst(npc.position.clone().add(new THREE.Vector3(0, 0.3, 0)), { count: 6, colors: ['#ffffff', npcData.color], up: 1.5 });
      }
      zoomTarget = 6.4;
      if (reducedMotion()) {
        player.position.set(px, world.groundY, pz);
      } else {
        await player.walkTo(px, pz);
      }
      if (npc) {
        player.lookAt(npc.position);
        npc.lookAt(player.position);
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
          burst(pos.clone().add(new THREE.Vector3(0, 0.1, 0)), { count: 8, colors: ['#d8c9a8', '#b8a888'], up: 1.2, speed: 1.5 });
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
          bubble('heart', npc || player, { delay: 0.2 });
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
            setTimeout(() => burst(headOf(player).add(new THREE.Vector3(player.facing * 0.5, -0.9, 0)), { count: 4, colors: ['#ffb52e', '#fff3b0'], up: 2, speed: 1.2, life: 0.5 }), i * 320);
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
        burst(headOf(player), { count: 14, colors: ['#7dff9b', '#ffd84a', '#ffffff'], up: 3.2, speed: 2.2, life: 1 });
        if (!reducedMotion()) {
          const jump = async () => { for (let i = 0; i <= 10; i++) { player.lift = Math.sin((i / 10) * Math.PI) * 0.5; await wait(28); } player.lift = 0; };
          await jump();
          await jump();
        }
      } else if (reaction === 'stumble') {
        player.play(['crouch'], 1, 1.2);
        burst(player.position.clone().add(new THREE.Vector3(0, 0.4, 0)), { count: 10, colors: ['#8a8580', '#b9b3aa'], up: 1, speed: 1.6, life: 0.9, gravity: 0 });
        bubble('cloud');
        await wait(700);
      } else {
        player.lift = 0.12;
        await wait(160);
        player.lift = 0;
      }
      popups.forEach((popup, i) => {
        const { texture, width, height } = textTexture(popup.text, popup.good ? '#8dffb0' : '#ff8d8d');
        floatSprite(texture, headOf(player).add(new THREE.Vector3(0, 0.2 + i * 0.85, 0)), { width: width / 16, height: height / 16, rise: 1.1, life: 2, delay: i * 0.2 });
      });
      await wait(400);
    },

    setDayFraction(fraction) {
      dayTarget = fraction;
    },

    /** Low vitals: the character slumps and the world desaturates a little. */
    setCritical(on) {
      container.classList.toggle('stage-critical', !!on);
    },

    /** The end of the day: camera pulls back and slowly circles the character. */
    finale(good) {
      if (npc) { npc.dispose(); actors.splice(actors.indexOf(npc), 1); npc = null; }
      zoomTarget = 8.5;
      orbitSpeed = reducedMotion() ? 0 : 0.12;
      player.play(good ? ['raise', 'stand'] : ['sit'], good ? 2 : 1, 999);
      if (good) burst(headOf(player), { count: 24, colors: ['#ffd84a', '#7dff9b', '#ff8ad8', '#ffffff'], up: 4, speed: 3, life: 1.4 });
    },

    reset() {
      orbitSpeed = 0;
      orbit = 0;
      zoomTarget = 7.2;
      player.override = null;
      player.position.set(home.pos[0], world.groundY, home.pos[1]);
      dayTarget = 0;
    },

    dispose() {
      running = false;
      cancelAnimationFrame(raf);
      stage.timers.forEach(clearInterval);
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      actors.forEach(actor => actor.dispose());
      renderer.dispose();
      scene.traverse(obj => {
        obj.geometry?.dispose?.();
        if (obj.material) [].concat(obj.material).forEach(m => { m.map?.dispose?.(); m.dispose?.(); });
      });
      canvas.remove();
    },
  };
}
