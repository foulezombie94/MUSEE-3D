import * as THREE from "../lib/three.module.min.js";
import { BLOCKS } from "./terrain.js";
import { ASSET, ATLAS_WIDTH, ATLAS_HEIGHT } from "./vanilla-textures.js";
import { ITEMS, stepDrop, dropCollides } from "./lifecycle.js";
export class WorldEffects {
  constructor(scene, world, atlas, camera, onPickup) {
    Object.assign(this, { scene, world, atlas, camera, onPickup });
    this.drops = [];
    this.particles = [];
    this.textures = [];
    this.clock = 0;
    this.loader = new THREE.TextureLoader();
    this.items = new Map();
    this.blockMaterial = new THREE.MeshLambertMaterial({ map: atlas.texture, alphaTest: 0.4 });
    this.fragmentMaterial = new THREE.MeshLambertMaterial({
      map: atlas.texture,
      alphaTest: 0.4,
      side: THREE.DoubleSide,
    });
    this.smoke = Array.from({ length: 8 }, (_, i) => this.load(`particle/generic_${i}.png`));
    this.orbMaterial = new THREE.MeshBasicMaterial({ color: 0x85eb18 });
  }
  load(path) {
    const texture = this.loader.load(ASSET + path);
    texture.magFilter = texture.minFilter = THREE.NearestFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
    this.textures.push(texture);
    return texture;
  }
  geometry(id, size = 0.25) {
    const g = new THREE.BoxGeometry(size, size, size),
      uv = g.attributes.uv,
      b = BLOCKS[id];
    for (let f = 0; f < 6; f++) {
      const t = f === 2 ? b.tile : f === 3 ? (b.bottom ?? b.tile) : (b.side ?? b.tile);
      for (let i = 0; i < 4; i++) {
        const p = [
          [0, 0],
          [1, 0],
          [0, 1],
          [1, 1],
        ][i];
        uv.setXY(
          f * 4 + i,
          ((t % 8) * 16 + 0.05 + p[0] * 15.9) / ATLAS_WIDTH,
          1 - (Math.floor(t / 8) * 16 + 0.05 + p[1] * 15.9) / ATLAS_HEIGHT,
        );
      }
    }
    return g;
  }
  spawn(id, count, x, y, z, saved = null) {
    if (!Number.isFinite(count) || count < 1 || (!BLOCKS[id] && !ITEMS[id] && id !== "xp")) return;
    let geometry, material;
    if (BLOCKS[id]) {
      geometry = this.geometry(id);
      material = this.blockMaterial;
    } else if (id === "xp") {
      geometry = new THREE.OctahedronGeometry(0.08);
      material = this.orbMaterial;
    } else {
      geometry = new THREE.PlaneGeometry(0.3, 0.3);
      if (!this.items.has(id))
        this.items.set(
          id,
          new THREE.MeshLambertMaterial({
            map: this.load(`item/${ITEMS[id].texture}.png`),
            transparent: true,
            alphaTest: 0.4,
            side: THREE.DoubleSide,
          }),
        );
      material = this.items.get(id);
    }
    const mesh = new THREE.Mesh(geometry, material),
      d = {
        id,
        count: Math.min(64, Math.floor(count)),
        x,
        y,
        z,
        vx: (Math.random() - 0.5) * 1.5,
        vy: 2.4,
        vz: (Math.random() - 0.5) * 1.5,
        age: 0,
        phase: Math.random() * Math.PI * 2,
        mesh,
      };
    if (saved)
      for (const k of ["vx", "vy", "vz", "age", "phase"])
        if (Number.isFinite(saved[k])) d[k] = saved[k];
    for (let i = 0; i < 12 && dropCollides(this.world, d); i++) d.y += 0.125;
    if (dropCollides(this.world, d)) {
      geometry.dispose();
      return;
    }
    this.scene.add(mesh);
    this.drops.push(d);
    mesh.position.set(d.x, d.y, d.z);
  }
  remove(d) {
    this.scene.remove(d.mesh);
    d.mesh.geometry.dispose();
    this.drops.splice(this.drops.indexOf(d), 1);
  }
  restore(data) {
    if (!Array.isArray(data)) return;
    for (const d of data.slice(0, 512))
      if (
        d &&
        [d.x, d.y, d.z, d.count, d.age].every(Number.isFinite) &&
        Math.abs(d.x) < 1e6 &&
        Math.abs(d.z) < 1e6 &&
        d.y > 0 &&
        d.y < 100 &&
        d.age < 300
      )
        this.spawn(d.id, d.count, d.x, d.y, d.z, d);
  }
  serialize() {
    return this.drops.map(({ id, count, x, y, z, vx, vy, vz, age, phase }) => ({
      id,
      count,
      x,
      y,
      z,
      vx,
      vy,
      vz,
      age,
      phase,
    }));
  }
  fragment(hit, amount = 48) {
    const b = BLOCKS[hit.id],
      tile = b.side ?? b.tile;
    for (let i = 0; i < amount; i++) {
      const g = new THREE.PlaneGeometry(1, 1),
        uv = g.attributes.uv,
        sx = Math.floor(Math.random() * 12),
        sy = Math.floor(Math.random() * 12);
      for (let j = 0; j < 4; j++) {
        const p = [
          [0, 0],
          [1, 0],
          [0, 1],
          [1, 1],
        ][j];
        uv.setXY(
          j,
          ((tile % 8) * 16 + sx + p[0] * 4) / ATLAS_WIDTH,
          1 - (Math.floor(tile / 8) * 16 + sy + p[1] * 4) / ATLAS_HEIGHT,
        );
      }
      const mesh = new THREE.Mesh(g, this.fragmentMaterial),
        size = 0.08 + Math.random() * 0.11;
      mesh.scale.setScalar(size);
      mesh.position.set(hit.x + Math.random(), hit.y + Math.random(), hit.z + Math.random());
      this.scene.add(mesh);
      this.particles.push({
        mesh,
        v: new THREE.Vector3(
          (mesh.position.x - hit.x - 0.5) * 3,
          Math.random() * 3,
          (mesh.position.z - hit.z - 0.5) * 3,
        ),
        life: 0.45 + Math.random() * 0.5,
        total: 1,
        smoke: false,
      });
    }
    this.limit();
  }
  poof(pos) {
    for (let i = 0; i < 18; i++) {
      const material = new THREE.SpriteMaterial({
          map: this.smoke[7],
          transparent: true,
          depthWrite: false,
          color: 0xf1f1ed,
        }),
        mesh = new THREE.Sprite(material);
      mesh.position.set(
        pos.x + (Math.random() - 0.5),
        pos.y + 0.35 + Math.random() * 0.7,
        pos.z + (Math.random() - 0.5),
      );
      mesh.scale.setScalar(0.35 + Math.random() * 0.2);
      this.scene.add(mesh);
      this.particles.push({
        mesh,
        v: new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          0.4 + Math.random() * 0.3,
          (Math.random() - 0.5) * 0.5,
        ),
        life: 0.65 + Math.random() * 0.2,
        total: 0.85,
        smoke: true,
      });
    }
    this.limit();
  }
  disposeParticle(p) {
    this.scene.remove(p.mesh);
    if (p.smoke) p.mesh.material.dispose();
    else p.mesh.geometry.dispose();
  }
  limit() {
    while (this.particles.length > (this.maxParticles ?? 384))
      this.disposeParticle(this.particles.shift());
  }
  update(dt, player) {
    this.clock += dt;
    for (const d of [...this.drops]) {
      stepDrop(this.world, d, dt);
      if (d.age > 300 || d.y < -3) {
        this.remove(d);
        continue;
      }
      d.mesh.position.set(d.x, d.y + 0.07 + Math.sin(this.clock * 2.2 + d.phase) * 0.045, d.z);
      d.mesh.rotation.y = this.clock * 1.5 + d.phase;
      const dx = player.x - d.x,
        dz = player.z - d.z,
        dy = THREE.MathUtils.clamp(d.y - player.y, 0, 1.8) - (d.y - player.y),
        distance = Math.hypot(dx, dy, dz);
      if (d.age > 0.5 && distance < 1.35) {
        const from = new THREE.Vector3(d.x, d.y, d.z),
          to = new THREE.Vector3(player.x, player.y + 0.8, player.z).sub(from),
          length = to.length();
        if (!this.world.raycast(from, to.normalize(), length)) {
          const accepted = this.onPickup(d.id, d.count);
          d.count -= Number.isFinite(accepted)
            ? Math.max(0, Math.min(d.count, accepted))
            : accepted === false
              ? 0
              : d.count;
          if (d.count <= 0) {
            this.remove(d);
            continue;
          }
        }
      }
    }
    // Fusion des piles proches sans remettre à zéro le délai de ramassage ni la durée de vie.
    this.mergeTimer = (this.mergeTimer ?? 0) + dt;
    if (this.mergeTimer > 0.5) {
      this.mergeTimer = 0;
      for (let i = 0; i < this.drops.length; i++)
        for (let j = this.drops.length - 1; j > i; j--) {
          const a = this.drops[i],
            b = this.drops[j];
          if (
            a.id === b.id &&
            a.count + b.count <= 64 &&
            Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) < 0.6
          ) {
            a.count += b.count;
            a.age = Math.max(a.age, b.age);
            this.remove(b);
          }
        }
    }
    for (const p of [...this.particles]) {
      p.life -= dt;
      if (p.life <= 0) {
        this.disposeParticle(p);
        this.particles.splice(this.particles.indexOf(p), 1);
        continue;
      }
      p.mesh.position.addScaledVector(p.v, dt);
      if (p.smoke) {
        p.mesh.material.map = this.smoke[Math.min(7, Math.floor((p.life / p.total) * 8))];
        p.mesh.material.opacity = Math.min(1, p.life * 4);
      } else {
        p.v.y -= 9 * dt;
        p.mesh.quaternion.copy(this.camera.quaternion);
      }
    }
  }
  dispose() {
    for (const d of [...this.drops]) this.remove(d);
    for (const p of this.particles) this.disposeParticle(p);
    this.particles = [];
    this.blockMaterial.dispose();
    this.fragmentMaterial.dispose();
    this.orbMaterial.dispose();
    for (const m of this.items.values()) m.dispose();
    for (const t of this.textures) t.dispose();
  }
}
