import * as THREE from "../lib/three.module.min.js";
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
class SpatialGame {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.nom = options.nom;
    this.title = options.title;
    this.touches = new Set();
    this.etat = "titre";
    this.score = 0;
    this.time = 0;
    this.message = "";
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: "low-power",
    });
    this.renderer.setSize(640, 480, false);
    this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    canvas.dataset.spatial = "";
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(52, 4 / 3, 0.05, 90);
    this.hud = document.createElement("div");
    Object.assign(this.hud.style, {
      position: "absolute",
      top: "20px",
      left: "50%",
      transform: "translateX(-50%)",
      color: "white",
      textShadow: "0 2px 3px black",
      textAlign: "center",
      pointerEvents: "none",
      font: "bold 14px monospace",
      width: "85%",
      maxWidth: "620px",
    });
    canvas.parentElement.style.position = "relative";
    canvas.parentElement.append(this.hud);
    this.initialiser();
  }
  box(x, y, z, w, h, d, color) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshLambertMaterial({ color }),
    );
    m.position.set(x, y, z);
    this.scene.add(m);
    return m;
  }
  sphere(x, y, z, r, color) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(r, 8, 6),
      new THREE.MeshLambertMaterial({ color }),
    );
    m.position.set(x, y, z);
    this.scene.add(m);
    return m;
  }
  clear() {
    const gs = new Set(),
      ms = new Set();
    this.scene.traverse((o) => {
      if (o.geometry) gs.add(o.geometry);
      if (o.material) ms.add(o.material);
    });
    for (const g of gs) g.dispose();
    for (const m of ms) m.dispose();
    this.scene.clear();
  }
  actor(color = "#e33e2f") {
    const g = new THREE.Group();
    const part = (x, y, z, w, h, d, c) => {
      const m = this.box(x, y, z, w, h, d, c);
      this.scene.remove(m);
      g.add(m);
      return m;
    };
    part(0, 1.15, 0, 0.44, 0.42, 0.4, 0xf0bd8d);
    part(0, 1.4, 0, 0.5, 0.15, 0.5, color);
    part(0, 0.69, 0, 0.48, 0.48, 0.32, color);
    part(0, 0.51, 0.08, 0.44, 0.28, 0.2, 0x285db2);
    const legs = [
      part(-0.14, 0.19, 0, 0.19, 0.38, 0.24, 0x2251a3),
      part(0.14, 0.19, 0, 0.19, 0.38, 0.24, 0x2251a3),
    ];
    part(-0.34, 0.7, 0, 0.18, 0.4, 0.2, 0xf0bd8d);
    part(0.34, 0.7, 0, 0.18, 0.4, 0.2, 0xf0bd8d);
    this.scene.add(g);
    return { g, legs };
  }
  initialiser() {}
  lancer() {
    this.score = 0;
    this.time = 0;
    this.initialiser();
    this.etat = "jeu";
  }
  appuyer(code) {
    this.touches.add(code);
    if ((this.etat === "titre" || this.etat === "fin") && ["Space", "Enter"].includes(code)) {
      this.lancer();
      return true;
    }
    if (code === "KeyP" || code === "Enter") {
      this.basculerPause();
      return true;
    }
    if (this.etat === "pause" && code === "Space") {
      this.etat = "jeu";
      return true;
    }
    return this.etat !== "jeu";
  }
  relacher(code) {
    this.touches.delete(code);
  }
  basculerPause() {
    if (this.etat === "jeu") this.etat = "pause";
    else if (this.etat === "pause") this.etat = "jeu";
  }
  terminer(won = false) {
    this.etat = "fin";
    this.won = won;
    try {
      const key = "continue-record-" + this.nom,
        old = Number(localStorage.getItem(key)) || 0;
      if (this.score > old) localStorage.setItem(key, this.score);
    } catch {}
  }
  has(...codes) {
    return codes.some((c) => this.touches.has(c));
  }
  etape(dt) {
    this.time += dt;
    if (this.etat === "jeu") this.avancer(dt);
    this.renderer.render(this.scene, this.camera);
    this.hud.textContent =
      this.etat === "titre"
        ? `${this.title} — Cliquez sur Jouer`
        : this.etat === "pause"
          ? "PAUSE — P pour reprendre"
          : this.etat === "fin"
            ? `${this.won ? "PARCOURS RÉUSSI" : "PARTIE TERMINÉE"} · SCORE ${this.score} · Espace pour rejouer`
            : this.status();
  }
  status() {
    return this.message;
  }
  dispose() {
    this.clear();
    this.hud.remove();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}

export class Mario64 extends SpatialGame {
  initialiser() {
    this.clear();
    this.scene.background = new THREE.Color(0x80bcf1);
    this.scene.fog = new THREE.Fog(0x80bcf1, 28, 65);
    this.scene.add(new THREE.HemisphereLight(0xdaf3ff, 0x688e45, 2));
    const sun = new THREE.DirectionalLight(0xffffff, 1.3);
    sun.position.set(8, 12, 5);
    this.scene.add(sun);
    this.box(0, -0.4, 0, 22, 0.8, 22, 0x69b845);
    this.box(0, -1.4, 0, 80, 0.2, 80, 0x4e9ed1);
    this.platforms = [];
    const platform = (x, z, top, w = 2, d = 2) => {
      this.platforms.push({ x, z, top, w, d });
      this.box(x, top / 2, z, w, top, d, 0xb7955a);
      this.box(x, top + 0.025, z, w, 0.05, d, 0x89ca56);
    };
    for (let i = 0; i < 6; i++) platform(1 + i * 1.35, -4, 0.6 + i * 0.6, 2, 2.2);
    platform(-5, 3, 0.7, 3, 3);
    platform(-6, 5, 1.4, 2, 2);
    platform(-8, 0, 0.65, 2, 2);
    this.box(0, 0.5, 0, 3, 1, 3, 0x8baac0);
    this.box(0, 1.05, 0, 2, 0.1, 2, 0x62bcda);
    for (const [x, z] of [
      [-9, -8],
      [-8, 8],
      [9, 7],
      [4, 8],
      [-5, -8],
    ]) {
      this.box(x, 1, z, 0.35, 2, 0.35, 0x8b5937);
      this.sphere(x, 2.5, z, 1.1, 0x3d922f);
    }
    for (let i = 0; i < 8; i++) this.box(-10 + i * 3, 2, -10, 2.6, 4, 1, 0xe1c695);
    this.box(0, 4, -10, 5, 2, 1, 0xe9d6b2);
    this.p = { x: 0, y: 0, z: 5, vy: 0, grounded: true };
    this.avatar = this.actor();
    this.cameraYaw = 0;
    this.health = 3;
    this.invulnerable = 0;
    this.stars = 0;
    this.coins = 0;
    this.jumpQueued = false;
    this.starObjects = [
      [-7, 1, -6],
      [7.75, 4.6, -4],
      [-6, 2.4, 5],
      [0, 1, 8],
      [-8, 1.65, 0],
    ].map(([x, y, z]) => {
      const m = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.45, 0),
        new THREE.MeshLambertMaterial({ color: 0xffd53c }),
      );
      m.position.set(x, y, z);
      this.scene.add(m);
      return m;
    });
    this.coinObjects = Array.from({ length: 20 }, (_, i) => {
      const a = (i / 20) * Math.PI * 2,
        m = new THREE.Mesh(
          new THREE.CylinderGeometry(0.15, 0.15, 0.05, 8),
          new THREE.MeshLambertMaterial({ color: 0xffda41 }),
        );
      m.rotation.z = Math.PI / 2;
      m.position.set(Math.cos(a) * 5, 0.7, Math.sin(a) * 5);
      this.scene.add(m);
      return m;
    });
    this.enemies = [
      [-4, -4],
      [5, 3],
      [-7, 1],
    ].map(([x, z], i) => {
      const m = this.sphere(x, 0.4, z, 0.43, 0x9b6134);
      this.box(x, 0.7, z, 0.65, 0.3, 0.65, 0x9b6134);
      return { m, x, z, baseX: x, baseZ: z, t: i * 2, alive: true };
    });
    this.updateCamera(true);
  }
  block(x, z, y) {
    return this.platforms.some(
      (b) =>
        Math.abs(x - b.x) < b.w / 2 + 0.22 &&
        Math.abs(z - b.z) < b.d / 2 + 0.22 &&
        y < b.top - 0.05,
    );
  }
  appuyer(c) {
    const used = super.appuyer(c);
    if (!used && c === "Space") this.jumpQueued = true;
    return used;
  }
  toucher() {
    this.jumpQueued = true;
  }
  direction(dx, dy) {
    this.touches.clear();
    this.touches.add(
      Math.abs(dx) > Math.abs(dy)
        ? dx > 0
          ? "ArrowRight"
          : "ArrowLeft"
        : dy > 0
          ? "ArrowDown"
          : "ArrowUp",
    );
  }
  updateCamera(now = false) {
    const p = this.p,
      target = new THREE.Vector3(
        p.x + Math.sin(this.cameraYaw) * 7,
        p.y + 4.7,
        p.z + Math.cos(this.cameraYaw) * 7,
      );
    if (now) this.camera.position.copy(target);
    else this.camera.position.lerp(target, 0.12);
    this.camera.lookAt(p.x, p.y + 0.8, p.z);
  }
  reset() {
    this.health--;
    if (this.health <= 0) {
      this.terminer();
      return;
    }
    Object.assign(this.p, { x: 0, y: 0, z: 5, vy: 0, grounded: true });
    this.invulnerable = 2;
  }
  avancer(dt) {
    const p = this.p;
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.cameraYaw += (+this.has("KeyE") - this.has("KeyQ")) * dt * 1.7;
    let x = +this.has("ArrowRight", "KeyD") - this.has("ArrowLeft", "KeyA"),
      z = +this.has("ArrowDown", "KeyS") - this.has("ArrowUp", "KeyW"),
      len = Math.hypot(x, z);
    if (len > 1) {
      x /= len;
      z /= len;
    }
    const vx = (x * Math.cos(this.cameraYaw) + z * Math.sin(this.cameraYaw)) * 4.2,
      vz = (z * Math.cos(this.cameraYaw) - x * Math.sin(this.cameraYaw)) * 4.2;
    if (!this.block(p.x + vx * dt, p.z, p.y)) p.x += vx * dt;
    if (!this.block(p.x, p.z + vz * dt, p.y)) p.z += vz * dt;
    if (this.jumpQueued && p.grounded) {
      p.vy = 7.5;
      p.grounded = false;
    }
    this.jumpQueued = false;
    const oldY = p.y;
    p.vy -= 18 * dt;
    p.y += p.vy * dt;
    p.grounded = false;
    let floor = Math.abs(p.x) < 11 && Math.abs(p.z) < 11 ? 0 : -10;
    for (const b of this.platforms)
      if (
        Math.abs(p.x - b.x) < b.w / 2 + 0.2 &&
        Math.abs(p.z - b.z) < b.d / 2 + 0.2 &&
        oldY >= b.top - 0.08
      )
        floor = Math.max(floor, b.top);
    if (p.y <= floor && p.vy <= 0) {
      p.y = floor;
      p.vy = 0;
      p.grounded = true;
    }
    if (p.y < -4) this.reset();
    for (const star of this.starObjects)
      if (star.visible) {
        star.rotation.y += dt * 2;
        if (star.position.distanceTo(new THREE.Vector3(p.x, p.y + 1, p.z)) < 0.9) {
          star.visible = false;
          this.stars++;
          this.score += 1000;
          if (this.stars >= 5) this.terminer(true);
        }
      }
    for (const coin of this.coinObjects)
      if (coin.visible) {
        coin.rotation.y += dt * 3;
        if (coin.position.distanceTo(new THREE.Vector3(p.x, p.y + 0.7, p.z)) < 0.7) {
          coin.visible = false;
          this.coins++;
          this.score += 10;
          if (this.coins % 8 === 0) this.health = Math.min(3, this.health + 1);
        }
      }
    for (const e of this.enemies)
      if (e.alive) {
        e.t += dt;
        e.m.position.x = e.baseX + Math.sin(e.t) * 1.5;
        if (Math.hypot(e.m.position.x - p.x, e.m.position.z - p.z) < 0.65) {
          if (p.vy < 0 && p.y > 0.5) {
            e.m.visible = false;
            e.alive = false;
            p.vy = 5;
            this.score += 100;
          } else if (p.y < 0.8 && this.invulnerable <= 0) {
            this.health--;
            this.invulnerable = 2;
            if (!this.health) this.terminer();
          }
        }
      }
    this.avatar.g.position.set(p.x, p.y, p.z);
    if (len) this.avatar.g.rotation.y = Math.atan2(vx, vz);
    this.avatar.legs.forEach(
      (m, i) => (m.rotation.x = len ? Math.sin(this.time * 12 + i * Math.PI) * 0.6 : 0),
    );
    this.avatar.g.visible = this.invulnerable <= 0 || Math.floor(this.time * 10) % 2 === 0;
    this.updateCamera();
  }
  status() {
    return `ÉTOILES ${this.stars}/5   PIÈCES ${this.coins}   ÉNERGIE ${"♥".repeat(Math.max(0, this.health))}`;
  }
}

export class Alone extends SpatialGame {
  initialiser() {
    this.room = 0;
    this.health = 5;
    this.ammo = 0;
    this.keys = 0;
    this.seals = 0;
    this.puzzle = 0;
    this.angle = 0;
    this.invulnerable = 0;
    this.makeRoom();
  }
  makeRoom() {
    this.clear();
    this.scene.background = new THREE.Color(0x151224);
    this.scene.add(new THREE.HemisphereLight(0x9991b4, 0x382a1c, 1));
    const lamp = new THREE.PointLight(0xffd39c, 35, 16, 1);
    lamp.position.set(0, 4, 0);
    this.scene.add(lamp);
    this.box(0, -0.1, 0, 9, 0.2, 9, 0x6a4530);
    for (let i = -4; i <= 4; i++) this.box(i, 0, 0, 0.025, 0.02, 9, 0x291d1b);
    for (const [x, z, w, d] of [
      [0, -4.5, 9, 0.2],
      [-4.5, 0, 0.2, 9],
      [4.5, 0, 0.2, 9],
      [0, 4.5, 9, 0.2],
    ])
      this.box(x, 1.5, z, w, 3, d, 0x403746);
    this.box(0, 1, -4.35, 1.5, 2, 0.15, 0x81633f);
    this.box(0.5, 1, -4.22, 0.08, 0.08, 0.08, 0xffd889);
    this.furniture = [
      { x: -2, z: 0, w: 1.6, d: 1.2 },
      { x: 2, z: 1, w: 1.4, d: 2 },
    ];
    for (const b of this.furniture) this.box(b.x, 0.55, b.z, b.w, 1.1, b.d, 0x4e3029);
    this.avatar = this.actor(0x8b694b);
    this.p = { x: 0, z: 3 };
    this.angle = Math.PI;
    this.objects = [];
    this.monsters = [];
    this.candles = [];
    if (this.room === 0) {
      this.addItem("key", -2, -2, 0xeec85b);
      this.addItem("gun", 2, 3, 0xadb5b8);
      this.message = "Clé près du mur. Revolver à droite.";
    }
    if (this.room === 1) {
      for (let i = 0; i < 3; i++) {
        const m = this.box(-2 + i * 2, 0.5, -2, 0.2, 1, 0.2, [0xd44a43, 0x4aa74c, 0x5c79d8][i]);
        this.candles.push(m);
      }
      this.message = "Le carnet indique : BLEU, ROUGE, VERT.";
      this.addMonster(2, -1);
    }
    if (this.room === 2) {
      this.addItem("seal", -2, -2, 0x94dfdc);
      this.addMonster(2, -2);
      this.addMonster(-2, 1);
      this.message = "Prenez le talisman puis trouvez la sortie.";
    }
    const views = [
      [8, 7, 9],
      [-8, 7, 8],
      [8, 8, -8],
    ];
    this.camera.position.set(...views[this.room]);
    this.camera.lookAt(0, 0.5, 0);
    this.invulnerable = 1;
  }
  addItem(type, x, z, color) {
    const m = this.box(x, 0.2, z, 0.5, 0.4, 0.5, color);
    this.objects.push({ type, x, z, m });
  }
  addMonster(x, z) {
    const a = this.actor(0x376b47);
    a.g.position.set(x, 0, z);
    this.monsters.push({ g: a.g, x, z, hp: 2 });
  }
  interact() {
    const p = this.p;
    if (p.z < -3 && Math.abs(p.x) < 1) {
      if (this.room === 0 && this.keys) {
        this.room = 1;
        this.makeRoom();
        return;
      }
      if (this.room === 1 && this.puzzle >= 3) {
        this.room = 2;
        this.makeRoom();
        return;
      }
      if (this.room === 2 && this.seals) {
        this.score += 1500;
        this.terminer(true);
        return;
      }
      this.message =
        this.room === 0
          ? "La porte est fermée : trouvez la clé."
          : this.room === 1
            ? "Allumez les bougies dans le bon ordre."
            : "Il manque le talisman.";
      return;
    }
    const item = this.objects.find((o) => o.m.visible && Math.hypot(p.x - o.x, p.z - o.z) < 1.5);
    if (item) {
      item.m.visible = false;
      this.score += 100;
      if (item.type === "key") {
        this.keys++;
        this.message = "Clé récupérée. Porte au fond.";
      }
      if (item.type === "gun") {
        this.ammo += 8;
        this.message = "Revolver : X pour tirer (8 balles).";
      }
      if (item.type === "seal") {
        this.seals++;
        this.message = "Talisman récupéré. Sortez par la porte.";
      }
      return;
    }
    if (this.room === 1) {
      const i = this.candles.findIndex(
        (m) => Math.hypot(p.x - m.position.x, p.z - m.position.z) < 1.2,
      );
      if (i >= 0) {
        if (i === [2, 0, 1][this.puzzle]) {
          this.puzzle++;
          this.candles[i].material.emissive.set(0xffaa33);
          this.message =
            this.puzzle === 3 ? "Le verrou de la porte s’ouvre." : "Une bougie s’allume.";
          this.score += 150;
        } else {
          this.puzzle = 0;
          for (const m of this.candles) m.material.emissive.set(0);
          this.message = "Mauvais ordre : BLEU, ROUGE, VERT.";
        }
        return;
      }
    }
    this.message = "Approchez un objet ou la porte, puis Espace.";
  }
  fire() {
    if (!this.ammo) {
      this.message = "Plus de munitions. Évitez les créatures.";
      return;
    }
    this.ammo--;
    const target = this.monsters
      .filter((m) => m.hp > 0 && Math.hypot(m.x - this.p.x, m.z - this.p.z) < 5)
      .sort(
        (a, b) =>
          Math.hypot(a.x - this.p.x, a.z - this.p.z) - Math.hypot(b.x - this.p.x, b.z - this.p.z),
      )[0];
    if (target) {
      target.hp--;
      if (!target.hp) {
        target.g.visible = false;
        this.score += 250;
      }
    }
  }
  appuyer(c) {
    const used = super.appuyer(c);
    if (!used) {
      if (c === "Space" || c === "KeyE") this.interact();
      if (c === "KeyX") this.fire();
    }
    return used;
  }
  toucher() {
    this.interact();
  }
  avancer(dt) {
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.angle += (+this.has("ArrowRight", "KeyD") - this.has("ArrowLeft", "KeyA")) * 2.2 * dt;
    const move = +this.has("ArrowUp", "KeyW") - this.has("ArrowDown", "KeyS");
    const nx = clamp(this.p.x + Math.sin(this.angle) * move * 2.2 * dt, -4.1, 4.1),
      nz = clamp(this.p.z + Math.cos(this.angle) * move * 2.2 * dt, -4.1, 4.1);
    if (
      !this.furniture.some(
        (b) => Math.abs(nx - b.x) < b.w / 2 + 0.25 && Math.abs(nz - b.z) < b.d / 2 + 0.25,
      )
    ) {
      this.p.x = nx;
      this.p.z = nz;
    }
    this.avatar.g.position.set(this.p.x, 0, this.p.z);
    this.avatar.g.rotation.y = this.angle;
    this.avatar.legs.forEach(
      (m, i) => (m.rotation.x = move ? Math.sin(this.time * 9 + i * Math.PI) * 0.5 : 0),
    );
    for (const m of this.monsters)
      if (m.hp > 0) {
        const dx = this.p.x - m.x,
          dz = this.p.z - m.z,
          d = Math.hypot(dx, dz);
        if (d > 0.6) {
          m.x += (dx / d) * 0.6 * dt;
          m.z += (dz / d) * 0.6 * dt;
        } else if (this.invulnerable <= 0) {
          this.health--;
          this.invulnerable = 1.5;
          this.message = "Une créature vous touche !";
          if (this.health <= 0) this.terminer();
        }
        m.g.position.set(m.x, 0, m.z);
        m.g.rotation.y = Math.atan2(dx, dz);
      }
  }
  status() {
    return `VIE ${this.health} · CLÉS ${this.keys} · BALLES ${this.ammo} · PIÈCE ${this.room + 1}/3\n${this.message}`;
  }
}
