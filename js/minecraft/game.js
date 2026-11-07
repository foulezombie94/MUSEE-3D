import * as THREE from "../lib/three.module.min.js";
import { VoxelWorld, SIZE, HEIGHT, SEA, B, BLOCKS, solid, hash, key } from "./terrain.js";
import {
  createAtlas,
  skinTexture,
  texturedBox,
  ATLAS_WIDTH,
  ATLAS_HEIGHT,
  ASSET,
} from "./vanilla-textures.js";
import { buildChunkData } from "./mesh-data.js";
import { applyChunkMesh } from "./mesh-renderer.js";
import { GRAPHICS, readGraphics, saveGraphics, renderRatio } from "./graphics.js";
import { createMobModel } from "./animals.js";
import {
  initMob,
  tickMob,
  damageMob,
  rayMob,
  mobBounds,
  mobCollides,
  standHeight,
  moveMob,
} from "./mob-ai.js";

import { ITEMS, miningSpec, advanceMining, blockLoot, animalLoot, deathRoll } from "./lifecycle.js";
import { WorldEffects } from "./world-effects.js";
import { InventoryUI } from "./inventory-ui.js";
import { HandAnimation } from "./hand-animation.js";

const SAVE_KEY = "continue-minecraft-world-v1";
const DEFAULT_BAR = [B.GRASS, B.DIRT, B.STONE, B.LOG, B.PLANK, B.SAND, B.GLASS, B.BRICK, B.LAMP];
function readSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (s?.version === 1 && Array.isArray(s.edits) && Number.isInteger(s.seed)) return s;
  } catch {}
  return null;
}
const finitePos = (p) =>
  p &&
  [p.x, p.y, p.z].every(Number.isFinite) &&
  Math.abs(p.x) < 1e6 &&
  Math.abs(p.z) < 1e6 &&
  p.y > -5 &&
  p.y < 150;

export function ouvrirMinecraft(options = {}) {
  return new MinecraftGame(options);
}

export class MinecraftGame {
  constructor({ onClose = () => {} } = {}) {
    this.onClose = onClose;
    this.abort = new AbortController();
    this.state = "menu";
    this.dead = false;
    this.closed = false;
    this.keys = new Set();
    this.time = 0;
    this.lastSave = 0;
    this.lastStream = -1;
    this.uiClock = 0;
    this.lastAttack = 0;
    this.mineTime = 0;
    this.mining = false;
    this.target = null;
    this.selected = 0;
    this.grounded = false;
    this.flying = false;
    this.jumpStamp = 0;
    this.swing = 0;
    this.attackCooldown = 0;
    this.damageCooldown = 0;
    this.saveWarning = false;
    const save = readSave();
    this.hadSave = !!save;
    this.savedDrops = save?.drops ?? [];
    if (Number.isInteger(save?.selected) && save.selected >= 0 && save.selected < 9)
      this.selected = save.selected;
    this.mode = save?.mode === "survival" ? "survival" : "creative";
    this.xp = Number.isFinite(save?.xp) ? Math.max(0, save.xp) : 0;
    this.sensitivity = 0.0026;
    this.muted = false;
    this.category = "all";
    this.world = new VoxelWorld(save?.seed ?? 41723, save?.edits ?? []);
    this.pos = new THREE.Vector3().copy(finitePos(save?.pos) ? save.pos : this.world.spawn());
    if (this.world.collides(this.pos)) this.pos.copy(this.world.spawn());
    this.yaw = Number.isFinite(save?.yaw) ? save.yaw : Math.PI * 0.05;
    this.pitch = Number.isFinite(save?.pitch) ? THREE.MathUtils.clamp(save.pitch, -1.5, 1.5) : -0.1;
    this.velocity = new THREE.Vector3();
    this.health = Number.isFinite(save?.health) ? Math.max(1, Math.min(20, save.health)) : 20;
    this.hunger = Number.isFinite(save?.hunger) ? Math.max(0, Math.min(20, save.hunger)) : 20;
    this.day = Number.isFinite(save?.day) ? save.day : 0.25;
    this.tool = [0, 1, 2].includes(save?.tool) ? save.tool : 0;
    this.inventory = { ...Object.fromEntries(Object.keys(ITEMS).map((id) => [id, 0])), apples: 3 };
    for (const id of Object.keys(BLOCKS)) this.inventory[id] = 0;
    if (save?.inventory)
      for (const id of Object.keys(this.inventory))
        if (Number.isFinite(save.inventory[id]))
          this.inventory[id] = Math.max(0, Math.min(99999, Math.floor(save.inventory[id])));
    this.bar =
      Array.isArray(save?.bar) &&
      save.bar.length === 9 &&
      save.bar.every((id) => BLOCKS[id] && id !== B.WATER && id !== B.BEDROCK)
        ? save.bar
        : [...DEFAULT_BAR];
    this.inventoryUI = new InventoryUI(this, save?.inventoryState, this.bar, this.tool);
    this.mobile = matchMedia("(pointer: coarse)").matches;
    this.reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.graphics = readGraphics();
    this.config = GRAPHICS[this.graphics];
    this.resolutionScale = 1;
    this.workerToken = 0;
    this.frameLoad = 0;
    this.adaptClock = 0;
    this.previousFocus = document.activeElement;
    this.oldOverflow = document.body.style.overflow;
    this.mount();
    try {
      this.setupScene();
      this.bind();
      this.refreshHUD();
      this.showMenu();
      this.queueChunks(true);
      this.resize();
      this.lastFrame = performance.now();
      this.frame = requestAnimationFrame((t) => this.animate(t));
    } catch (e) {
      this.root.remove();
      document.body.style.overflow = this.oldOverflow;
      this.renderer?.dispose();
      throw e;
    }
  }
  mount() {
    this.root = document.createElement("section");
    this.root.className = "mc-root" + (this.mobile ? " mc-is-touch" : "");
    this.root.setAttribute("aria-label", "Monde Minecraft du musée");
    this.root.innerHTML = `
      <canvas class="mc-view" tabindex="0" aria-label="Monde de blocs en 3D : explorer, miner et construire"></canvas>
      <div class="mc-top"><div class="mc-brand"><b>MINECRAFT</b>LE MONDE DU MUSÉE<div class="mc-coords"></div></div><div class="mc-top-actions"><button class="mc-small" data-action="inventory" aria-label="Ouvrir l’inventaire">Inventaire <kbd>E</kbd></button><button class="mc-small" data-action="pause">Pause</button><button class="mc-small" data-action="quit">← Musée</button></div></div>
      <div class="mc-cross"></div><div class="mc-target" hidden></div><div class="mc-mine" hidden><i></i></div><div class="mc-debug" hidden></div>
      <aside class="mc-hint"><button data-action="hide-hint" aria-label="Masquer les astuces">×</button><strong>À VOUS DE CONSTRUIRE</strong><span></span></aside>
      <div class="mc-toast" role="status" aria-live="polite"></div>
      <div class="mc-bottom"><div class="mc-vitals"><span class="mc-hearts"></span><span class="mc-food"></span></div><div class="mc-experience"><i></i><span></span></div><div class="mc-item-name"></div><div class="mc-hotbar" role="group" aria-label="Barre rapide : touches 1 à 9"></div><div class="mc-controls"></div></div>
      <div class="mc-touch"><div class="mc-pad"><button class="up" data-key="KeyW" aria-label="Avancer">▲</button><button class="left" data-key="KeyA" aria-label="Gauche">◀</button><button class="down" data-key="KeyS" aria-label="Reculer">▼</button><button class="right" data-key="KeyD" aria-label="Droite">▶</button></div><div class="mc-touch-actions"><button data-action="mine-touch">Casser</button><button data-action="place">Poser</button><button class="jump" data-key="Space">Sauter / nager</button></div></div>
      <div class="mc-damage"></div><div class="mc-overlay" role="dialog" aria-modal="true"></div>`;
    document.body.append(this.root);
    document.body.style.overflow = "hidden";
    this.canvas = this.root.querySelector("canvas");
    this.overlay = this.el(".mc-overlay");
  }
  el(selector) {
    return this.root.querySelector(selector);
  }
  listen(target, event, fn, options = {}) {
    target.addEventListener(event, fn, { ...options, signal: this.abort.signal });
  }
  setupScene() {
    this.atlas = createAtlas();
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(
      renderRatio(this.config, innerWidth, innerHeight, devicePixelRatio),
    );
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x78a7ff);
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x86b9ed);
    this.scene.fog = new THREE.Fog(0xabcdec, 24, this.config.radius * 16 + 14);
    this.skyDay = new THREE.Color(0x8ab9e8);
    this.skyNight = new THREE.Color(0x101a32);
    this.fogDay = new THREE.Color(0xb2cfe6);
    this.fogNight = new THREE.Color(0x14233a);
    this.camera = new THREE.PerspectiveCamera(75, 1, 0.045, 180);
    this.camera.rotation.order = "YXZ";
    this.scene.add(this.camera);
    this.sunLight = new THREE.DirectionalLight(0xfff4dc, 1.1);
    this.sunLight.position.set(40, 80, 20);
    this.scene.add(this.sunLight);
    this.ambient = new THREE.HemisphereLight(0xcce4ff, 0x7d8052, 1.5);
    this.scene.add(this.ambient);
    this.material = new THREE.MeshLambertMaterial({
      map: this.atlas.texture,
      vertexColors: true,
      alphaTest: 0.5,
    });
    this.waterMaterial = new THREE.MeshLambertMaterial({
      map: this.atlas.texture,
      vertexColors: true,
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.outline = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1.006, 1.006, 1.006)),
      new THREE.LineBasicMaterial({ color: 0x172217, transparent: true, opacity: 0.9 }),
    );
    this.outline.visible = false;
    this.scene.add(this.outline);
    const loader = new THREE.TextureLoader();
    this.crackTextures = Array.from({ length: 10 }, (_, i) => {
      const t = loader.load(ASSET + `block/destroy_stage_${i}.png`);
      t.magFilter = t.minFilter = THREE.NearestFilter;
      return t;
    });
    this.cracks = new THREE.Mesh(
      new THREE.BoxGeometry(1.009, 1.009, 1.009),
      new THREE.MeshBasicMaterial({
        map: this.crackTextures[0],
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      }),
    );
    this.cracks.visible = false;
    this.scene.add(this.cracks);
    // Soleil et lune carrés, nuages cubiques très légers à dessiner.
    const sunTex = loader.load(ASSET + "environment/sun.png");
    sunTex.magFilter = THREE.NearestFilter;
    const moonTex = loader.load(ASSET + "environment/moon_phases.png");
    moonTex.magFilter = THREE.NearestFilter;
    moonTex.repeat.set(0.25, 0.5);
    moonTex.offset.y = 0.5;
    this.environmentTextures = [sunTex, moonTex];
    this.sun = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 18),
      new THREE.MeshBasicMaterial({
        map: sunTex,
        transparent: true,
        fog: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.moon = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 12),
      new THREE.MeshBasicMaterial({
        map: moonTex,
        transparent: true,
        fog: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.scene.add(this.sun, this.moon);
    this.clouds = new THREE.Group();
    const cloudMat = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.89,
    });
    const cloudGeo = new THREE.BoxGeometry(1, 1, 1);
    for (let i = 0; i < 35; i++) {
      const m = new THREE.Mesh(cloudGeo, cloudMat);
      m.position.set((hash(i, 71) - 0.5) * 230, 48 + hash(i, 72) * 8, (hash(i, 73) - 0.5) * 230);
      m.scale.set(8 + hash(i, 75) * 14, 1.5 + hash(i, 76) * 2, 5 + hash(i, 77) * 8);
      this.clouds.add(m);
    }
    this.scene.add(this.clouds);
    // A tiny foreground pass keeps the arm out of world geometry, even at a wall.
    this.handScene = new THREE.Scene();
    this.handCamera = new THREE.PerspectiveCamera(70, 1, 0.01, 10);
    this.handLight = new THREE.HemisphereLight(0xffffff, 0x858585, 1.5);
    this.handScene.add(this.handLight);
    const handSun = new THREE.DirectionalLight(0xffffff, 1);
    handSun.position.set(-1, 3, 2);
    this.handScene.add(handSun);
    this.handAnimation = new HandAnimation();
    this.hand = new THREE.Group();
    this.hand.matrixAutoUpdate = false;
    this.handScene.add(this.hand);
    this.playerSkin = skinTexture("steve");
    this.arm = texturedBox(
      4,
      12,
      4,
      40,
      16,
      new THREE.MeshLambertMaterial({ map: this.playerSkin }),
    );
    this.arm.position.set(-6 / 16, 6 / 16, 0);
    this.arm.scale.y = -1;
    this.hand.add(this.arm);
    this.held = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.4, 0.4),
      new THREE.MeshLambertMaterial({ map: this.atlas.texture, alphaTest: 0.5 }),
    );
    this.held.rotation.y = Math.PI / 4;
    this.hand.add(this.held);
    this.pickaxe = new THREE.Group();
    const handle = new THREE.Mesh(
      new THREE.BoxGeometry(0.045, 0.38, 0.045),
      new THREE.MeshLambertMaterial({ color: 0x84572e }),
    );
    this.pickHead = new THREE.Mesh(
      new THREE.BoxGeometry(0.29, 0.055, 0.065),
      new THREE.MeshLambertMaterial({ color: 0xa3a8a4 }),
    );
    this.pickHead.position.set(-0.04, 0.19, 0);
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.12, 0.065), this.pickHead.material);
    tooth.position.set(-0.16, 0.14, 0);
    this.pickaxe.add(handle, this.pickHead, tooth);
    this.pickaxe.rotation.z = -0.6;
    this.pickaxe.position.set(-0.03, 0.12, -0.03);
    this.hand.add(this.pickaxe);
    this.mobs = [];
    this.mobTextures = [
      skinTexture("sheep"),
      skinTexture("pig"),
      skinTexture("zombie"),
      skinTexture("fur"),
    ];
    this.spawnAnimals();
    this.particles = [];
    this.effects = new WorldEffects(
      this.scene,
      this.world,
      this.atlas,
      this.camera,
      (id, count) => {
        let accepted = count;
        if (id === "xp") this.xp += count;
        else {
          accepted = count - this.inventoryUI.model.add(id, count);
          this.inventoryUI.commit();
        }
        if (accepted) {
          this.sound("pickup");
          this.refreshHUD();
        }
        return accepted;
      },
    );
    this.effects.maxParticles = this.config.particles;
    this.effects.restore(this.savedDrops);
    this.savedDrops = null;
    this.setupMeshing();
    this.applyVisualProfile();
  }
  spawnAnimals() {
    const remaining = Math.max(0, 10 - this.mobs.filter((m) => m.kind !== "zombie").length);
    for (let i = 0; i < remaining; i++) {
      const seed = Math.floor(this.time * 37) + i,
        x = this.pos.x + (hash(seed, 222) - 0.5) * 45,
        z = this.pos.z + (hash(seed, 223) - 0.5) * 45,
        y = this.world.height(Math.floor(x), Math.floor(z)) + 1;
      if (y > SEA + 1) this.createMob(i % 3 === 0 ? "pig" : "sheep", x, y, z, seed);
    }
  }
  createMob(kind, x, y, z, seed) {
    const state = initMob(kind, { x, y, z }, seed),
      floor = standHeight(this.world, state, x, z, y);
    if (floor === null) return;
    state.pos.y = floor;
    if (this.mobs.some((m) => Math.hypot(m.pos.x - x, m.pos.z - z) < 1.2)) return;
    const { group, legs } = createMobModel(kind, this.mobTextures);
    group.position.set(x, floor, z);
    state.pos = group.position;
    state.group = group;
    state.legs = legs;
    this.scene.add(group);
    this.mobs.push(state);
  }
  bind() {
    this.inventoryUI.bind();
    this.listen(this.root, "input", (e) => {
      const setting = e.target.dataset.setting;
      if (setting === "fov") {
        this.camera.fov = Number(e.target.value);
        this.camera.updateProjectionMatrix();
        e.target.previousElementSibling.textContent = e.target.value;
      }
      if (setting === "sensitivity") {
        this.sensitivity = Number(e.target.value) / 20000;
        e.target.previousElementSibling.textContent = e.target.value + " %";
      }
    });
    this.listen(this.root, "click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.slot !== undefined) {
        this.select(Number(b.dataset.slot));
        if (this.state === "inventory") this.inventoryPanel();
        return;
      }
      if (b.dataset.recipe !== undefined) {
        this.inventoryUI.fill(Number(b.dataset.recipe));
        return;
      }
      if (b.dataset.category) {
        this.category = b.dataset.category;
        this.inventoryPanel();
        return;
      }
      if (b.dataset.mode) {
        this.mode = b.dataset.mode;
        this.showMenu();
        return;
      }
      const a = b.dataset.action;
      if (a === "start" || a === "resume") this.resume();
      if (a === "quit") this.close();
      if (a === "pause") this.pause();
      if (a === "inventory") this.openInventory();
      if (a === "close-inventory") this.resume();
      if (a === "hide-hint") this.el(".mc-hint").hidden = true;
      if (a === "graphics") {
        const keys = Object.keys(GRAPHICS);
        this.setGraphics(keys[(keys.indexOf(this.graphics) + 1) % keys.length]);
        this.optionsPanel();
      }
      if (a === "options") this.optionsPanel();
      if (a === "back-pause") {
        this.state = "playing";
        this.pause();
      }
      if (a === "mute") {
        this.muted = !this.muted;
        this.optionsPanel();
      }
      if (a === "recipes") {
        this.recipeBook = !this.recipeBook;
        this.inventoryPanel();
      }
      if (a === "craft-output") this.craftFromGrid();
      if (a === "place") this.place();
      if (a === "eat") {
        this.eat();
        this.inventoryPanel();
      }
      if (a === "respawn") {
        this.health = 20;
        this.hunger = 20;
        this.dead = false;
        this.pos.copy(this.world.spawn());
        this.velocity.set(0, 0, 0);
        this.resume();
      }
    });
    this.listen(
      window,
      "keydown",
      (e) => {
        if (e.target.tagName === "INPUT") return;
        e.stopImmediatePropagation();
        if (
          ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Tab", "Escape"].includes(
            e.code,
          )
        )
          e.preventDefault();
        if (e.code === "Tab") {
          const scope = this.overlay.hidden ? this.root : this.overlay;
          const items = [...scope.querySelectorAll("button:not([hidden]):not(:disabled)")].filter(
            (b) => b.getClientRects().length,
          );
          const i = items.indexOf(document.activeElement);
          items[(i + (e.shiftKey ? -1 : 1) + items.length) % items.length]?.focus();
          return;
        }
        if (e.repeat) return;
        if (e.code === "Escape") {
          if (this.state === "playing") this.pause();
          else if (this.state === "inventory" || this.state === "pause") this.resume();
          else if (this.state === "options") {
            this.state = "playing";
            this.pause();
          }
          return;
        }
        if ((e.code === "KeyE" || e.code === "KeyC") && this.state === "inventory") {
          this.resume();
          return;
        }
        if (e.code === "Enter" && this.state === "menu" && !e.target.closest("button")) {
          this.resume();
          return;
        }
        if (this.state === "inventory" && /^Digit[1-9]$/.test(e.code)) {
          this.select(Number(e.code.slice(-1)) - 1);
          return;
        }
        if (this.state !== "playing") return;
        if (e.code === "F1") {
          this.root.classList.toggle("mc-hide-hud");
          this.hand.visible = !this.root.classList.contains("mc-hide-hud");
          return;
        }
        if (e.code === "F3") {
          e.preventDefault();
          this.el(".mc-debug").hidden = !this.el(".mc-debug").hidden;
          return;
        }
        if (e.code === "KeyE" || e.code === "KeyC") {
          this.openInventory();
          return;
        }
        if (e.code === "KeyP") {
          this.pause();
          return;
        }
        if (e.code === "KeyF") {
          this.eat();
          return;
        }
        if (e.code === "Space") {
          const t = performance.now();
          this.jumpUntil = t + 150;
          if (this.mode === "creative" && this.jumpStamp > 0 && t - this.jumpStamp < 300) {
            this.flying = !this.flying;
            this.velocity.y = 0;
            this.jumpStamp = 0;
            this.toast(
              this.flying ? "Vol activé · Espace monter · Maj descendre" : "Vol désactivé",
            );
          } else this.jumpStamp = t;
        }
        if (/^Digit[1-9]$/.test(e.code)) {
          this.select(Number(e.code.slice(-1)) - 1);
          return;
        }
        this.keys.add(e.code);
      },
      { capture: true },
    );
    this.listen(
      window,
      "keyup",
      (e) => {
        this.keys.delete(e.code);
        e.stopImmediatePropagation();
      },
      { capture: true },
    );
    this.listen(document, "mousemove", (e) => {
      if (this.state === "playing" && document.pointerLockElement === this.canvas)
        this.look(e.movementX, e.movementY);
    });
    this.listen(document, "pointerlockchange", () => {
      if (!document.pointerLockElement && this.state === "playing" && this.wasLocked) this.pause();
      this.wasLocked = document.pointerLockElement === this.canvas;
    });
    let drag = null;
    this.listen(this.canvas, "pointerdown", (e) => {
      if (this.state !== "playing") return;
      e.preventDefault();
      this.canvas.focus({ preventScroll: true });
      if (e.pointerType === "touch" || document.pointerLockElement !== this.canvas) {
        drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
        try {
          this.canvas.setPointerCapture(e.pointerId);
        } catch {}
      }
      if (e.pointerType !== "touch") {
        if (e.button === 0) {
          this.mining = true;
          this.handAnimation.strike();
          this.attackMob();
        }
        if (e.button === 2) this.place();
        if (e.button === 1) this.pickBlock();
      }
    });
    this.listen(this.canvas, "pointermove", (e) => {
      if (
        this.state !== "playing" ||
        document.pointerLockElement === this.canvas ||
        !drag ||
        drag.id !== e.pointerId
      )
        return;
      this.look(e.clientX - drag.x, e.clientY - drag.y);
      drag.x = e.clientX;
      drag.y = e.clientY;
    });
    this.listen(window, "pointerup", (e) => {
      if (e.button === 0) this.mining = false;
      if (drag?.id === e.pointerId) drag = null;
    });
    this.listen(window, "pointercancel", () => {
      this.mining = false;
      this.keys.clear();
      drag = null;
    });
    this.listen(this.canvas, "contextmenu", (e) => e.preventDefault());
    this.listen(
      this.canvas,
      "wheel",
      (e) => {
        if (this.state !== "playing") return;
        e.preventDefault();
        this.select((this.selected + Math.sign(e.deltaY) + 9) % 9);
      },
      { passive: false },
    );
    this.listen(window, "blur", () => {
      this.keys.clear();
      this.mining = false;
      if (this.state === "playing") this.pause();
    });
    this.listen(document, "visibilitychange", () => {
      if (document.hidden && this.state === "playing") this.pause();
    });
    this.listen(window, "resize", () => this.resize());
    this.listen(window, "pagehide", () => this.save());
    for (const b of this.root.querySelectorAll('[data-key], [data-action="mine-touch"]')) {
      this.listen(b, "pointerdown", (e) => {
        if (this.state !== "playing") return;
        e.preventDefault();
        try {
          b.setPointerCapture(e.pointerId);
        } catch {}
        if (b.dataset.key) this.keys.add(b.dataset.key);
        else {
          this.mining = true;
          this.handAnimation.strike();
          this.attackMob();
        }
      });
      for (const ev of ["pointerup", "pointercancel", "lostpointercapture"])
        this.listen(b, ev, () => {
          this.keys.delete(b.dataset.key);
          if (!b.dataset.key) this.mining = false;
        });
    }
  }
  look(dx, dy) {
    if (Math.abs(dx) > 350 || Math.abs(dy) > 350) return;
    this.yaw -= dx * this.sensitivity;
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy * this.sensitivity, -1.54, 1.54);
  }
  resize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.handCamera.aspect = this.camera.aspect;
    this.handCamera.updateProjectionMatrix();
    const ratio =
      renderRatio(this.config, innerWidth, innerHeight, devicePixelRatio) * this.resolutionScale;
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(innerWidth, innerHeight, false);
  }
  applyVisualProfile() {
    this.clouds.children.forEach((m, i) => (m.visible = i < this.config.clouds));
    this.effects.maxParticles = this.config.particles;
    this.scene.fog.far = this.config.radius * 16 - 2;
    this.scene.fog.near = this.scene.fog.far * 0.6;
  }
  setGraphics(value) {
    if (!GRAPHICS[value]) return;
    this.graphics = value;
    this.config = GRAPHICS[value];
    saveGraphics(value);
    this.resolutionScale = 1;
    this.applyVisualProfile();
    this.resize();
    this.queueChunks();
  }
  setupMeshing() {
    this.world.onChange = (x, y, z, id) => {
      const cx = Math.floor(x / SIZE),
        cz = Math.floor(z / SIZE);
      for (const c of this.world.chunks.values())
        if (Math.abs(c.cx - cx) <= 1 && Math.abs(c.cz - cz) <= 1) {
          c.revision = (c.revision ?? 0) + 1;
          c.dirty = true;
        }
      this.meshWorker?.postMessage({ type: "edit", x, y, z, id });
    };
    try {
      this.meshWorker = new Worker(new URL("./mesh-worker.js", import.meta.url), {
        type: "module",
      });
      this.workerFailed = false;
      this.meshWorker.postMessage({
        type: "init",
        seed: this.world.seed,
        edits: [...this.world.edits],
      });
      this.meshWorker.onmessage = ({ data }) => {
        if (this.closed) return;
        if (data.type === "error") {
          this.meshFallback();
          return;
        }
        const job = this.meshJob;
        if (!job || data.token !== job.token) return;
        this.meshJob = null;
        const c = job.chunk;
        if (this.world.chunks.get(key(c.cx, c.cz)) !== c) return;
        if ((c.revision ?? 0) !== job.revision) {
          c.dirty = true;
          this.buildQueue.unshift(c);
          return;
        }
        applyChunkMesh(c, data, this.scene, this.material, this.waterMaterial);
        this.chunkVisibility(c);
      };
      this.meshWorker.onerror = () => this.meshFallback();
    } catch {
      this.meshFallback();
    }
  }
  meshFallback() {
    this.meshWorker?.terminate();
    this.meshWorker = null;
    this.meshJob = null;
    this.workerFailed = true;
    if (!this.closed) this.queueChunks();
  }
  showMenu() {
    this.state = "menu";
    this.overlay.hidden = false;
    this.overlay.setAttribute("aria-label", "Choisir son mode de jeu");
    this.overlay.innerHTML = `<div class="mc-card"><div class="mc-title-wrap"><img class="mc-title-image" src="${ASSET}gui/minecraft.png" alt="Minecraft"><img class="mc-edition" src="${ASSET}gui/edition.png" alt="Java Edition"><span class="mc-splash">Bienvenue au musée !</span></div><div class="mc-modes"><button class="mc-mode" data-mode="creative" aria-pressed="${this.mode === "creative"}">Mode Créatif<span>Ressources illimitées · vol</span></button><button class="mc-mode" data-mode="survival" aria-pressed="${this.mode === "survival"}">Mode Survie<span>Récolte · fabrication · survie</span></button></div><button class="mc-main-button" data-action="start">${this.hadSave ? "Reprendre la partie" : "Jouer en solo"}</button><button class="mc-main-button" data-action="quit">Retour au musée</button><p class="mc-note">Monde sauvegardé dans ce navigateur.<br>Recréation indépendante pour l’exposition du musée.<br>Non officiel. Sans affiliation à Mojang ou Microsoft.</p></div>`;
    this.refreshHUD();
    queueMicrotask(() => this.el('[data-action="start"]')?.focus({ preventScroll: true }));
  }
  resume() {
    if (this.dead) return;
    this.inventoryUI.returnInputs();
    this.state = "playing";
    this.overlay.hidden = true;
    this.keys.clear();
    this.mining = false;
    this.canvas.focus({ preventScroll: true });
    this.refreshHUD();
    if (!this.mobile)
      try {
        const p = this.canvas.requestPointerLock();
        p?.catch(() => this.toast("Glissez la souris pour regarder · le jeu reste jouable"));
      } catch {}
    if (!this.started) {
      this.started = true;
      this.toast(
        this.mode === "creative"
          ? "Bienvenue ! Clic : casser · clic droit : poser"
          : "Commencez par récolter le bois d’un arbre.",
      );
    }
  }
  unlock() {
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
    this.keys.clear();
    this.jumpUntil = 0;
    this.mining = false;
    this.mineTime = 0;
  }
  pause() {
    if (this.state !== "playing") return;
    this.state = "pause";
    this.unlock();
    this.save();
    this.overlay.hidden = false;
    this.overlay.setAttribute("aria-label", "Jeu en pause");
    this.overlay.innerHTML = `<div class="mc-card"><h2>Menu du jeu</h2><button class="mc-main-button" data-action="resume">Reprendre la partie</button><div class="mc-pause-grid"><button class="mc-main-button" data-action="inventory">Inventaire</button><button class="mc-main-button" data-action="options">Options...</button></div><button class="mc-main-button" data-action="quit">Sauvegarder et quitter</button><p class="mc-note">${this.mode === "creative" ? "Mode Créatif" : "Mode Survie"} · E : inventaire · F3 : informations<br>ZQSD / WASD : marcher · Espace : sauter<br>Clic : miner · clic droit : poser / utiliser</p></div>`;
    this.el('[data-action="resume"]').focus({ preventScroll: true });
  }
  optionsPanel() {
    this.state = "options";
    this.overlay.hidden = false;
    this.overlay.setAttribute("aria-label", "Options de jeu");
    this.overlay.innerHTML = `<div class="mc-card"><h2>Options</h2><label class="mc-options-label">Champ de vision : <output>${Math.round(this.camera.fov)}</output><input type="range" data-setting="fov" min="50" max="110" value="${this.camera.fov}" aria-label="Champ de vision"></label><label class="mc-options-label">Sensibilité : <output>${Math.round(this.sensitivity * 20000)} %</output><input type="range" data-setting="sensitivity" min="10" max="100" value="${this.sensitivity * 20000}" aria-label="Sensibilité de la souris"></label><button class="mc-main-button" data-action="graphics">Graphismes : ${this.config.name}</button><button class="mc-main-button" data-action="mute">Son : ${this.muted ? "DÉSACTIVÉ" : "ACTIVÉ"}</button><button class="mc-main-button" data-action="back-pause">Terminé</button></div>`;
    this.el('[data-action="back-pause"]').focus({ preventScroll: true });
  }
  openInventory(bench = false) {
    if (!this.dead) this.inventoryUI.open(bench);
  }
  inventoryPanel() {
    this.inventoryUI.render();
  }
  craftResult() {
    return this.inventoryUI.result();
  }
  craftFromGrid(shift = false) {
    return this.inventoryUI.craft(shift);
  }
  eat() {
    if (this.mode !== "survival" || this.hunger >= 20) return;
    const id = Object.keys(ITEMS).find((id) => ITEMS[id].food && this.inventory[id] > 0);
    if (!id) return;
    this.inventory[id]--;
    this.hunger = Math.min(20, this.hunger + ITEMS[id].food);
    this.sound("eat");
    this.toast(ITEMS[id].name + " · faim restaurée");
    this.refreshHUD();
  }
  select(i) {
    this.selected = i;
    this.mineTime = 0;
    this.refreshHUD();
    const el = this.el(".mc-item-name");
    el.classList.add("visible");
    clearTimeout(this.itemTimer);
    this.itemTimer = setTimeout(() => el.classList.remove("visible"), 2000);
  }
  refreshHUD() {
    if (!this.atlas) return;
    const creative = this.mode === "creative";
    this.inventoryUI.syncExternal();
    this.inventoryUI.hotbar();
    this.el(".mc-vitals").hidden = creative;
    this.el(".mc-experience").hidden = creative;
    const icons = (amount, kind) =>
      Array.from(
        { length: 10 },
        (_, i) =>
          `<span class="${kind} ${amount >= i * 2 + 2 ? "full" : amount > i * 2 ? "half" : ""}"><i></i></span>`,
      ).join("");
    this.el(".mc-hearts").innerHTML = icons(this.health, "mc-heart");
    this.el(".mc-food").innerHTML = icons(Math.ceil(this.hunger), "mc-drumstick");
    this.el(".mc-hearts").setAttribute("aria-label", `Vie : ${this.health} sur 20`);
    this.el(".mc-food").setAttribute("aria-label", `Faim : ${Math.ceil(this.hunger)} sur 20`);
    this.el(".mc-experience i").style.width = ((this.xp % 7) / 7) * 100 + "%";
    this.el(".mc-experience span").textContent = this.xp >= 7 ? Math.floor(this.xp / 7) : "";
    this.updateHeld();
  }
  updateHeld() {
    this.inventoryUI.held();
  }
  queueChunks(immediate = false) {
    const cx = Math.floor(this.pos.x / SIZE),
      cz = Math.floor(this.pos.z / SIZE),
      radius = this.config.radius,
      list = [];
    for (let x = -radius; x <= radius; x++)
      for (let z = -radius; z <= radius; z++) list.push([cx + x, cz + z, x * x + z * z]);
    list.sort((a, b) => a[2] - b[2]);
    this.buildQueue = list.map(([x, z]) => this.world.generate(x, z));
    if (immediate) this.build(this.buildQueue.shift());
    // Éviter la croissance de la mémoire quand le joueur explore loin.
    for (const [k, c] of this.world.chunks) {
      this.chunkVisibility(c);
      if (Math.abs(c.cx - cx) > radius + 1 || Math.abs(c.cz - cz) > radius + 1) {
        for (const m of [c.mesh, c.water])
          if (m) {
            this.scene.remove(m);
            m.geometry.dispose();
          }
        this.world.chunks.delete(k);
      }
    }
  }
  chunkVisibility(c) {
    const visible =
      Math.abs(c.cx - Math.floor(this.pos.x / SIZE)) <= this.config.radius &&
      Math.abs(c.cz - Math.floor(this.pos.z / SIZE)) <= this.config.radius;
    for (const m of [c.mesh, c.water]) if (m) m.visible = visible;
  }
  build(c) {
    if (!c?.dirty || this.meshJob) return;
    if (this.meshWorker) {
      const token = ++this.workerToken;
      this.meshJob = { token, chunk: c, revision: c.revision ?? 0 };
      this.meshWorker.postMessage({ type: "mesh", cx: c.cx, cz: c.cz, token });
    } else {
      applyChunkMesh(
        c,
        buildChunkData(this.world, c),
        this.scene,
        this.material,
        this.waterMaterial,
      );
      this.chunkVisibility(c);
    }
  }
  updateChunks() {
    if (this.meshJob) return;
    const center = key(Math.floor(this.pos.x / SIZE), Math.floor(this.pos.z / SIZE));
    if (center !== this.chunkCenter) {
      this.chunkCenter = center;
      this.queueChunks();
    }
    for (const c of this.world.chunks.values())
      if (
        c.dirty &&
        c.mesh &&
        Math.abs(c.cx - Math.floor(this.pos.x / SIZE)) <= 1 &&
        Math.abs(c.cz - Math.floor(this.pos.z / SIZE)) <= 1
      ) {
        this.build(c);
        return;
      }
    while (this.buildQueue?.length) {
      const c = this.buildQueue.shift();
      if (c.dirty) {
        this.build(c);
        break;
      }
    }
  }
  move(dt) {
    let forward =
      (this.keys.has("KeyW") || this.keys.has("KeyZ") || this.keys.has("ArrowUp") ? 1 : 0) -
      (this.keys.has("KeyS") || this.keys.has("ArrowDown") ? 1 : 0);
    let side =
      (this.keys.has("KeyD") || this.keys.has("ArrowRight") ? 1 : 0) -
      (this.keys.has("KeyA") || this.keys.has("KeyQ") || this.keys.has("ArrowLeft") ? 1 : 0);
    const len = Math.hypot(forward, side);
    if (len > 1) {
      forward /= len;
      side /= len;
    }
    const swimming = this.world.get(this.pos.x, this.pos.y + 0.8, this.pos.z) === B.WATER;
    const sprint =
      this.keys.has("ControlLeft") ||
      this.keys.has("ControlRight") ||
      (this.keys.has("ShiftLeft") && !this.flying);
    const speed = this.flying ? 10 : swimming ? 2.8 : sprint && this.hunger > 3 ? 6.6 : 4.3;
    const vx = (-Math.sin(this.yaw) * forward + Math.cos(this.yaw) * side) * speed,
      vz = (-Math.cos(this.yaw) * forward - Math.sin(this.yaw) * side) * speed;
    const blend = 1 - Math.exp(-dt * (this.grounded ? 16 : 8));
    this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, vx, blend);
    this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, vz, blend);
    if (this.flying) {
      this.velocity.y =
        ((this.keys.has("Space") ? 1 : 0) -
          (this.keys.has("ShiftLeft") || this.keys.has("ShiftRight") ? 1 : 0)) *
        7;
    } else if (swimming) {
      this.velocity.y = Math.max(-2.5, this.velocity.y - 6 * dt);
      if (this.keys.has("Space")) this.velocity.y = 3.6;
    } else {
      this.velocity.y = Math.max(-34, this.velocity.y - 24 * dt);
      if (this.grounded && (this.keys.has("Space") || performance.now() < (this.jumpUntil ?? 0))) {
        this.velocity.y = 8.2;
        this.grounded = false;
        this.jumpUntil = 0;
        this.sound("jump");
      }
    }
    const steps = Math.max(1, Math.ceil(dt / 0.012));
    // Keep a floor collision for the whole frame: later substeps can have dy=0.
    this.grounded = false;
    for (let s = 0; s < steps; s++) {
      const h = dt / steps;
      for (const axis of ["x", "z", "y"]) {
        const old = this.pos[axis],
          delta = this.velocity[axis] * h;
        this.pos[axis] += delta;
        if (this.world.collides(this.pos)) {
          this.pos[axis] = old;
          if (axis === "y" && delta < 0) {
            this.grounded = true;
            if (this.velocity.y < -13 && !swimming && !this.flying)
              this.hurt(Math.max(1, Math.floor((-this.velocity.y - 11) / 2)));
          }
          this.velocity[axis] = 0;
        }
      }
    }
    if (this.pos.y < -3) {
      this.hurt(20);
      if (this.mode === "creative") this.pos.copy(this.world.spawn());
    }
    if (this.pos.y > HEIGHT + 30) {
      this.pos.y = HEIGHT + 30;
      this.velocity.y = 0;
    }
    if (this.mode === "survival") {
      this.hunger = Math.max(0, this.hunger - dt * (len ? (sprint ? 0.025 : 0.012) : 0.003));
      this.vitalTimer = (this.vitalTimer ?? 0) + dt;
      if (this.vitalTimer > 5) {
        this.vitalTimer = 0;
        if (this.hunger > 15 && this.health < 20) {
          this.health++;
          this.hunger = Math.max(0, this.hunger - 0.5);
        } else if (this.hunger <= 0) this.hurt(1);
        this.refreshHUD();
      }
    }
    this.walkBob =
      len && this.grounded && !this.reducedMotion ? Math.sin(this.time * 10) * 0.025 : 0;
  }
  updateTarget(dt) {
    const miningDt = Math.max(0, dt - (this.blockCooldown ?? 0));
    this.blockCooldown = Math.max(0, (this.blockCooldown ?? 0) - dt);
    this.cracks.visible = false;
    this.camera.getWorldDirection((this.direction ??= new THREE.Vector3()));
    const hit = this.world.raycast(
      this.camera.position,
      this.direction,
      this.mode === "creative" ? 7 : 5,
    );
    const previous = this.target;
    this.target = hit;
    if (!hit) {
      this.outline.visible = false;
      this.el(".mc-target").hidden = true;
      this.mineTime = 0;
    } else {
      this.outline.visible = true;
      this.outline.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
      this.el(".mc-target").hidden = false;
      this.el(".mc-target").textContent = BLOCKS[hit.id].name;
      if (!previous || previous.x !== hit.x || previous.y !== hit.y || previous.z !== hit.z)
        this.mineTime = 0;
    }
    this.el(".mc-mine").hidden = !hit || !this.mining || this.mode === "creative";
    if (this.mining && hit && this.blockCooldown <= 1e-9) {
      if (hit.id === B.BEDROCK) {
        this.mineTime = 0;
        return;
      }
      if (this.mineTool !== this.tool) {
        this.mineTool = this.tool;
        this.mineTime = 0;
      }
      const spec = miningSpec(hit.id, this.tool, this.mode, {
        underwater: this.world.get(this.pos.x, this.pos.y + 1.6, this.pos.z) === B.WATER,
        grounded: this.grounded,
        heldItem: this.bar[this.selected],
      });
      const complete = advanceMining(this, spec, miningDt),
        progress = this.mineProgress;
      if (this.mode === "survival" && progress > 0) {
        this.cracks.visible = true;
        this.cracks.position.copy(this.outline.position);
        this.cracks.material.map = this.crackTextures[Math.min(9, Math.floor(progress * 10))];
      }
      if (this.mode === "survival" && this.time - (this.mineSound ?? -1) > 0.25) {
        this.mineSound = this.time;
        this.sound("dig");
        this.effects.fragment(hit, 1);
      }
      this.el(".mc-mine i").style.width = progress * 100 + "%";
      this.outline.material.color.set(0x111111);
      if (complete) {
        this.breakBlock(hit);
        this.mineTime = 0;
        this.blockCooldown = this.mode === "creative" ? 0.25 : spec.seconds === 0 ? 0 : 0.3;
      }
    } else {
      this.mineTime = 0;
      this.outline.material.color.set(0x172217);
    }
  }
  breakBlock(hit) {
    if (!hit || hit.id === B.BEDROCK || !this.world.set(hit.x, hit.y, hit.z, B.AIR)) return;
    const harvest = miningSpec(hit.id, this.tool, this.mode, {
      heldItem: this.bar[this.selected],
    }).harvest;
    for (const [id, count] of blockLoot(hit.id, harvest))
      this.effects.spawn(id, count, hit.x + 0.5, hit.y + 0.4, hit.z + 0.5);
    if (harvest && [B.COAL, 47, 49, 50].includes(hit.id))
      this.effects.spawn("xp", 1, hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
    this.debris(hit);
    this.sound("break", hit.id);
    this.cracks.visible = false;
    this.target = null;
    this.outline.visible = false;
  }
  place() {
    if (this.state !== "playing" || !this.target) return;
    if (this.target.id === B.WORKBENCH) {
      this.openInventory(true);
      return;
    }
    const t = this.target,
      id = this.bar[this.selected];
    if (!BLOCKS[id]) return;
    const x = t.x + t.normal.x,
      y = t.y + t.normal.y,
      z = t.z + t.normal.z;
    if (this.mode === "survival" && this.inventory[id] <= 0) {
      this.toast("Ce bloc manque dans votre inventaire. Récoltez-le d’abord.");
      return;
    }
    if (y <= 0 || y >= HEIGHT || solid(this.world.get(x, y, z))) return;
    if (
      this.pos.x + 0.3 > x &&
      this.pos.x - 0.3 < x + 1 &&
      this.pos.z + 0.3 > z &&
      this.pos.z - 0.3 < z + 1 &&
      this.pos.y + 1.8 > y &&
      this.pos.y < y + 1
    )
      return;
    if (
      this.mobs.some((m) => {
        const b = mobBounds(m);
        return (
          b.maxX > x &&
          b.minX < x + 1 &&
          b.maxY > y &&
          b.minY < y + 1 &&
          b.maxZ > z &&
          b.minZ < z + 1
        );
      })
    )
      return;
    if (this.world.set(x, y, z, id)) {
      if (this.mode === "survival") this.inventory[id]--;
      this.sound("place");
      this.handAnimation.strike();
      this.refreshHUD();
    }
  }
  pickBlock() {
    if (!this.target || this.mode !== "creative" || this.target.id === B.BEDROCK) return;
    const model = this.inventoryUI.model,
      id = this.target.id,
      index = model.slots.slice(0, 9).findIndex((s) => s?.id === id);
    if (index >= 0) this.selected = index;
    else model.slots[this.selected] = { id, count: 64 };
    this.inventoryUI.commit();
    this.refreshHUD();
  }
  debris(hit) {
    this.effects.fragment(hit, this.config.fragments);
  }
  aimedMob() {
    this.camera.getWorldDirection((this.direction ??= new THREE.Vector3()));
    const origin = this.camera.position;
    const wall = this.world.raycast(origin, this.direction, 3.1);
    let nearest = null,
      dist = wall?.distance ?? 3.1;
    for (const m of this.mobs) {
      if (m.hp <= 0) continue;
      const hit = rayMob(origin, this.direction, m, dist);
      if (hit !== null && hit < dist) {
        nearest = m;
        dist = hit;
      }
    }
    return nearest;
  }
  attackMob() {
    if (this.state !== "playing" || this.attackCooldown > 0) return false;
    const m = this.aimedMob();
    if (!m) return false;
    this.handAnimation.strike();
    this.attackCooldown = 0.5;
    if (!damageMob(m, this.pos, ITEMS[this.bar[this.selected]]?.attack ?? 1)) return true;
    this.sound("mob_hurt", m.kind);
    m.group.traverse((o) => {
      if (o.isMesh) o.material.color.setRGB(1, 0.35, 0.35);
    });
    if (m.hp <= 0) {
      m.deathTime = 0;
      m.deathBaseY = m.pos.y;
      m.route = [];
      m.idle = 0;
      for (const [id, count] of animalLoot(m.kind))
        this.effects.spawn(id, count, m.pos.x, m.pos.y + 0.6, m.pos.z);
      this.effects.spawn("xp", 1 + Math.floor(Math.random() * 3), m.pos.x, m.pos.y + 0.5, m.pos.z);
      this.sound("death", m.kind);
    }
    return true;
  }
  removeMob(m) {
    const i = this.mobs.indexOf(m);
    if (i < 0) return;
    this.scene.remove(m.group);
    const materials = new Set();
    m.group.traverse((o) => {
      if (o.isMesh) {
        o.geometry.dispose();
        materials.add(o.material);
      }
    });
    for (const material of materials) material.dispose();
    this.mobs.splice(i, 1);
  }
  hurt(amount) {
    if (this.mode !== "survival" || this.damageCooldown > 0 || this.dead) return;
    this.damageCooldown = 1;
    this.health = Math.max(0, this.health - amount);
    this.sound("hit");
    this.el(".mc-damage").classList.add("active");
    clearTimeout(this.damageTimer);
    this.damageTimer = setTimeout(() => this.el(".mc-damage")?.classList.remove("active"), 350);
    this.refreshHUD();
    if (this.health <= 0) {
      this.dead = true;
      this.state = "dead";
      this.unlock();
      this.overlay.hidden = false;
      this.overlay.setAttribute("aria-label", "Vous êtes mort");
      this.overlay.innerHTML =
        '<div class="mc-card"><h2>Vous êtes mort !</h2><p>Votre monde et vos constructions sont conservés.</p><button class="mc-main-button" data-action="respawn">Réapparaître</button><button class="mc-main-button mc-secondary" data-action="quit">Revenir au musée</button></div>';
      this.el('[data-action="respawn"]').focus({ preventScroll: true });
    }
  }
  updateMobs(dt, daylight) {
    for (const m of [...this.mobs]) {
      const p = m.pos,
        d = p.distanceTo(this.pos),
        zombie = m.kind === "zombie";
      if (m.deathTime !== undefined) {
        m.deathTime += dt;
        p.y = m.deathBaseY;
        moveMob(this.world, m, dt);
        m.deathBaseY = p.y;
        const roll = deathRoll(m.deathTime);
        m.group.rotation.z = roll;
        p.y += Math.sin(roll) * 0.43;
        if (m.deathTime >= 1) {
          this.effects.poof(new THREE.Vector3(p.x, m.deathBaseY, p.z));
          this.removeMob(m);
        }
        continue;
      }
      if (d > 90 || p.y < -5 || (zombie && (daylight > 0.45 || this.mode === "creative"))) {
        this.removeMob(m);
        continue;
      }
      const result = tickMob(this.world, m, this.pos, dt);
      m.group.rotation.y = m.angle;
      m.group.traverse((o) => {
        if (o.isMesh)
          o.material.color.setRGB(1, m.hurtTime > 0 ? 0.35 : 1, m.hurtTime > 0 ? 0.35 : 1);
      });
      if (zombie && result.distance < 1.45 && Math.abs(this.pos.y - p.y) < 1.5 && m.attack <= 0) {
        const from = p.clone().add(new THREE.Vector3(0, 1, 0)),
          to = this.pos
            .clone()
            .add(new THREE.Vector3(0, 1, 0))
            .sub(from),
          length = to.length();
        if (!this.world.raycast(from, to.normalize(), length)) {
          this.hurt(2);
          m.attack = 1.5;
        }
      }
      m.legs.forEach((l, i) => {
        const target = result.moving
          ? Math.sin(m.walk + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.55
          : 0;
        l.rotation.x = THREE.MathUtils.lerp(l.rotation.x, target, Math.min(1, dt * 14));
      });
      const head = m.group.getObjectByName("head"),
        wool = m.group.getObjectByName("wool_head");
      if (head) {
        const angle = Math.atan2(-(this.pos.x - p.x), -(this.pos.z - p.z)) - m.angle;
        head.rotation.y =
          !result.moving && d < 7
            ? THREE.MathUtils.clamp(Math.atan2(Math.sin(angle), Math.cos(angle)), -0.65, 0.65)
            : 0;
        head.rotation.x = !zombie && m.idle > 0 && d > 3 ? 0.3 : 0;
        if (wool) wool.rotation.copy(head.rotation);
      }
    }
    this.mobTimer = (this.mobTimer ?? 0) + dt;
    if (this.mobTimer > 12) {
      this.mobTimer = 0;
      if (
        this.mode === "survival" &&
        daylight < 0.25 &&
        this.mobs.filter((m) => m.kind === "zombie").length < 5
      ) {
        const a = this.time * 1.7,
          x = this.pos.x + Math.sin(a) * 22,
          z = this.pos.z + Math.cos(a) * 22,
          y = this.world.height(Math.floor(x), Math.floor(z)) + 1;
        if (y > SEA) this.createMob("zombie", x, y, z, Math.floor(this.time));
      } else if (this.mobs.filter((m) => m.kind !== "zombie").length < 6) this.spawnAnimals();
    }
  }
  lighting(dt) {
    if (this.state === "playing") this.day = (this.day + dt / 720) % 1;
    const angle = this.day * Math.PI * 2,
      daylight = THREE.MathUtils.clamp(Math.sin(angle) * 1.7 + 0.15, 0.07, 1);
    this.scene.background.copy(this.skyNight).lerp(this.skyDay, daylight);
    this.scene.fog.color.copy(this.fogNight).lerp(this.fogDay, daylight);
    this.ambient.intensity = 0.28 + daylight * 1.1;
    this.sunLight.intensity = daylight * 1.05;
    this.sun.position.set(
      this.pos.x + Math.cos(angle) * 90,
      this.pos.y + Math.sin(angle) * 90,
      this.pos.z - 40,
    );
    this.sun.lookAt(this.camera.position);
    this.moon.position.set(
      this.pos.x - Math.cos(angle) * 90,
      this.pos.y - Math.sin(angle) * 90,
      this.pos.z - 40,
    );
    this.moon.lookAt(this.camera.position);
    this.clouds.position.x = Math.floor(this.pos.x / 100) * 100 + Math.sin(this.time * 0.005) * 15;
    this.clouds.position.z = Math.floor(this.pos.z / 100) * 100;
    this.clouds.visible = daylight > 0.15;
    this.waterMaterial.opacity = 0.64 + Math.sin(this.time * 0.8) * 0.035;
    return daylight;
  }
  toast(message) {
    const el = this.el(".mc-toast");
    el.textContent = message;
    el.classList.add("visible");
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => el.classList.remove("visible"), 3500);
  }
  sound(type, id = null) {
    if (this.muted) return;
    let sample = null;
    if (["break", "dig", "place"].includes(type)) {
      const block = id ?? this.target?.id ?? this.bar[this.selected];
      sample =
        block === 9
          ? "glass"
          : [1, 2, 5].includes(block)
            ? "grass"
            : [4, 7, 14, 21, 44, 45, 53].includes(block)
              ? "wood"
              : block === 6
                ? "sand"
                : block === 24
                  ? "gravel"
                  : block >= 28 && block <= 43
                    ? "cloth"
                    : "stone";
    } else if (type === "pickup") sample = "pickup";
    else if (type === "death")
      sample = id === "pig" ? "pig_death" : id === "sheep" ? "sheep_hurt" : null;
    else if (type === "mob_hurt")
      sample = id === "pig" ? "pig_hurt" : id === "sheep" ? "sheep_hurt" : null;
    if (sample) {
      this.samplePlayers ??= new Set();
      if (this.samplePlayers.size > 12) return;
      const player = new Audio(ASSET + "sounds/" + sample + ".ogg");
      player.volume = type === "dig" ? 0.12 : type === "pickup" ? 0.2 : 0.4;
      player.playbackRate = type === "dig" ? 0.7 : type === "death" ? 0.9 : 1;
      this.samplePlayers.add(player);
      const done = () => this.samplePlayers.delete(player);
      player.onended = done;
      player.onerror = done;
      player.play().catch(done);
      return;
    }
    try {
      this.audio ??= new (window.AudioContext || window.webkitAudioContext)();
      if (this.audio.state === "suspended") this.audio.resume();
      const a = this.audio,
        o = a.createOscillator(),
        g = a.createGain(),
        t = a.currentTime;
      o.type = type === "break" ? "triangle" : "square";
      const f =
        {
          break: 95,
          dig: 85,
          place: 140,
          craft: 620,
          jump: 230,
          eat: 370,
          hit: 70,
          death: 55,
          pickup: 950,
        }[type] ?? 200;
      o.frequency.setValueAtTime(f, t);
      o.frequency.exponentialRampToValueAtTime(f * 0.55, t + 0.12);
      g.gain.setValueAtTime(0.035, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
      o.connect(g).connect(a.destination);
      o.start(t);
      o.stop(t + 0.14);
    } catch {}
  }
  save() {
    this.inventoryUI.syncExternal();
    try {
      localStorage.setItem(
        SAVE_KEY,
        JSON.stringify({
          version: 1,
          seed: this.world.seed,
          edits: [...this.world.edits],
          pos: { x: this.pos.x, y: this.pos.y, z: this.pos.z },
          yaw: this.yaw,
          pitch: this.pitch,
          mode: this.mode,
          inventory: this.inventory,
          inventoryState: this.inventoryUI.model.serialize(),
          bar: this.bar,
          selected: this.selected,
          health: this.dead ? 20 : this.health,
          hunger: this.dead ? 20 : this.hunger,
          day: this.day,
          tool: this.tool,
          xp: this.xp,
          drops: this.effects?.serialize() ?? [],
        }),
      );
      return true;
    } catch {
      if (!this.saveWarning) {
        this.saveWarning = true;
        this.toast("Sauvegarde indisponible : le stockage du navigateur est plein ou bloqué.");
      }
      return false;
    }
  }
  animate(now) {
    if (this.closed) return;
    const elapsed = (now - this.lastFrame) / 1000,
      target = this.state === "playing" ? 60 : 15;
    if (document.hidden || elapsed < 1 / target - 0.001) {
      if (document.hidden) this.lastFrame = now;
      this.frame = requestAnimationFrame((t) => this.animate(t));
      return;
    }
    const dt = Math.min(0.05, Math.max(0, elapsed));
    this.lastFrame = now;
    this.time += dt;
    if (this.state === "playing") {
      this.frameLoad = this.frameLoad * 0.96 + elapsed * 0.04;
      this.adaptClock += elapsed;
      if (this.adaptClock > 2) {
        this.adaptClock = 0;
        if (this.frameLoad > 0.026 && this.resolutionScale > 0.55) {
          this.resolutionScale = Math.max(0.55, this.resolutionScale - 0.1);
          this.resize();
        } else if (this.frameLoad < 0.018 && this.resolutionScale < 1) {
          this.resolutionScale = Math.min(1, this.resolutionScale + 0.05);
          this.resize();
        }
      }
    }

    this.updateChunks();
    const daylight = this.lighting(dt);
    if (this.state === "playing") {
      this.attackCooldown = Math.max(0, this.attackCooldown - dt);
      this.damageCooldown = Math.max(0, this.damageCooldown - dt);
      this.move(dt);
      this.camera.position.set(this.pos.x, this.pos.y + 1.62 + (this.walkBob ?? 0), this.pos.z);
      this.camera.rotation.set(this.pitch, this.yaw, 0);
      this.camera.updateMatrixWorld();
      if (this.mining && this.aimedMob()) {
        this.attackMob();
        this.mineTime = 0;
        this.cracks.visible = false;
        this.outline.visible = false;
        this.target = null;
        this.el(".mc-target").hidden = true;
      } else this.updateTarget(Math.min(1, elapsed));
      this.updateMobs(dt, daylight);
      this.effects.update(dt, this.pos);
      this.handAnimation.update(dt, this.mining && !!this.target);
      this.updateHandPose();
      if (this.time - this.lastSave > 12) {
        this.lastSave = this.time;
        this.save();
      }
    } else {
      this.camera.position.set(this.pos.x, this.pos.y + 1.62, this.pos.z);
      this.camera.rotation.set(this.pitch, this.yaw, 0);
      this.outline.visible = false;
      this.cracks.visible = false;
    }
    this.uiClock += dt;
    if (this.uiClock > 0.25) {
      this.uiClock = 0;
      this.el(".mc-coords").textContent =
        `${this.mode === "creative" ? "CRÉATIF" : "SURVIE"} · XYZ ${Math.floor(this.pos.x)} / ${Math.floor(this.pos.y)} / ${Math.floor(this.pos.z)} · ${daylight < 0.3 ? "NUIT" : "JOUR"}`;
    }
    this.render();
    this.frame = requestAnimationFrame((t) => this.animate(t));
  }
  updateHandPose() {
    this.handAnimation.pose(this.hand, this.arm.visible, (this.walkBob ?? 0) * 1.4);
  }
  render() {
    this.renderer.render(this.scene, this.camera);
    if (this.hand.visible) {
      this.renderer.autoClear = false;
      this.renderer.clearDepth();
      this.handLight.intensity = this.ambient.intensity;
      this.renderer.render(this.handScene, this.handCamera);
      this.renderer.autoClear = true;
    }
  }
  close() {
    if (this.closed) return;
    this.state = "closed";
    const saved = this.save();
    this.closed = true;
    this.unlock();
    cancelAnimationFrame(this.frame);
    this.abort.abort();
    clearTimeout(this.toastTimer);
    clearTimeout(this.damageTimer);
    this.meshWorker?.terminate();
    this.meshWorker = null;
    this.world.onChange = null;
    this.inventoryUI.dispose();
    this.effects.dispose();
    for (const player of this.samplePlayers ?? []) player.pause();
    this.samplePlayers?.clear();
    const geos = new Set(),
      mats = new Set();
    for (const scene of [this.scene, this.handScene])
      scene.traverse((o) => {
        if (o.geometry) geos.add(o.geometry);
        if (o.material)
          for (const m of Array.isArray(o.material) ? o.material : [o.material]) mats.add(m);
      });
    for (const g of geos) g.dispose();
    for (const m of mats) m.dispose();
    for (const t of this.mobTextures) t.dispose();
    this.atlas.texture.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.audio?.close().catch(() => {});
    clearTimeout(this.itemTimer);
    this.playerSkin.dispose();
    for (const t of this.crackTextures) t.dispose();
    for (const t of this.environmentTextures) t.dispose();
    this.root.remove();
    document.body.style.overflow = this.oldOverflow;
    this.previousFocus?.focus({ preventScroll: true });
    this.onClose({ saved });
  }
}
