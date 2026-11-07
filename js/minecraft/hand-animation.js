// First-person right-hand pose, in camera space. Six game ticks per swing.
// The sqrt/sine curves keep the forward strike quick and the return slower.
import * as THREE from "../lib/three.module.min.js";

export class HandAnimation {
  constructor() {
    this.elapsed = 0;
    this.active = false;
    this.progress = 0;
    this.equip = 0;
    this.itemKey = undefined;
    this.scratch = new THREE.Matrix4();
  }
  strike() {
    if (!this.active) {
      this.elapsed = 0;
      this.progress = 0;
      this.active = true;
    }
  }
  reset() {
    this.elapsed = 0;
    this.progress = 0;
    this.active = false;
  }
  update(dt, repeat = false) {
    if (this.active) {
      this.elapsed += dt;
      if (this.elapsed >= 0.3) {
        if (repeat) this.elapsed %= 0.3;
        else this.reset();
      }
    } else if (repeat) this.strike();
    this.progress = this.active ? this.elapsed / 0.3 : 0;
    this.equip = Math.max(0, this.equip - dt * 4);
  }
  select(key) {
    if (this.itemKey !== undefined && key !== this.itemKey) this.equip = 1;
    this.itemKey = key;
  }
  pose(group, empty, bob = 0) {
    const p = this.progress,
      root = Math.sqrt(p),
      arc = Math.sin(root * Math.PI),
      lift = Math.sin(root * Math.PI * 2),
      reach = Math.sin(p * Math.PI),
      twist = Math.sin(p * p * Math.PI);
    const m = group.matrix;
    m.identity();
    const t = (x, y, z) => m.multiply(this.scratch.makeTranslation(x, y, z));
    const x = (a) => m.multiply(this.scratch.makeRotationX((a * Math.PI) / 180));
    const y = (a) => m.multiply(this.scratch.makeRotationY((a * Math.PI) / 180));
    const z = (a) => m.multiply(this.scratch.makeRotationZ((a * Math.PI) / 180));
    t(0, bob, 0);
    if (empty) {
      t(0.64 - 0.3 * arc, -0.6 + 0.4 * lift - 0.6 * this.equip, -0.72 - 0.4 * reach);
      y(45);
      y(70 * arc);
      z(-20 * twist);
      t(-1, 3.6, 3.5);
      z(120);
      x(200);
      y(-135);
      t(5.6, 0, 0);
    } else {
      t(0.56 - 0.4 * arc, -0.52 + 0.2 * lift - 0.6 * this.equip, -0.72 - 0.2 * reach);
      y(45 - 20 * twist);
      z(-20 * arc);
      x(-80 * arc);
      y(-45);
    }
    group.matrixWorldNeedsUpdate = true;
  }
}
