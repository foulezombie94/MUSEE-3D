import { RetroGame, clamp, rect, text, ball, sprite, TAU } from "./common.js";
import { sweptAABB, overlaps, moveOnTiles } from "./physics.js";

export const SONIC_COURSES = [
  {
    name: "GREEN HILL",
    length: 3600,
    theme: "green",
    hills: [
      [360, 1050, 30, 150],
      [2100, 2550, 22, 110],
    ],
    pits: [[2710, 2790]],
    loops: [{ x: 1580, y: 160, r: 42 }],
    springs: [1080, 2520],
    spikes: [2280],
    enemies: [650, 930, 1220, 1930, 2400, 3000],
    blocks: [],
  },
  {
    name: "MARBLE GARDEN",
    length: 3000,
    theme: "marble",
    hills: [
      [350, 850, 18, 90],
      [1900, 2400, 35, 135],
    ],
    pits: [
      [1000, 1080],
      [1470, 1550],
      [2520, 2600],
    ],
    loops: [],
    springs: [900, 1380, 2450],
    spikes: [550, 1270, 2110],
    enemies: [440, 740, 1200, 1800, 2280, 2740],
    blocks: [
      [45, 10],
      [46, 10],
      [47, 10],
      [75, 9],
      [76, 9],
      [77, 9],
      [113, 9],
      [114, 9],
      [115, 9],
    ],
  },
  {
    name: "STARLIGHT RUN",
    length: 4200,
    theme: "night",
    hills: [
      [320, 1050, 32, 170],
      [2600, 3200, 28, 160],
    ],
    pits: [
      [2240, 2350],
      [3450, 3550],
    ],
    loops: [
      { x: 1500, y: 160, r: 42 },
      { x: 1900, y: 160, r: 42 },
    ],
    springs: [2150, 3310],
    spikes: [2850, 3120],
    enemies: [700, 1150, 2100, 2500, 3020, 3700],
    blocks: [
      [152, 10],
      [153, 10],
      [154, 10],
      [205, 9],
      [206, 9],
      [207, 9],
    ],
  },
];
const ART = [
  "...BBBB.....",
  "..BBBBBB....",
  "BBBBBBSSB...",
  ".BBBBWWSBB..",
  "BBBBBWWSBB..",
  ".BBBSSSSS...",
  "..BBBSS.....",
  "...BBBB.....",
  "..WBBBBW....",
  "..WBBBBW....",
  "...BBB......",
  "..BB.BB.....",
  "..RR.RR.....",
  ".WRR.WRR....",
];
const PALETTE = { B: "#1954ce", W: "#fff", S: "#e8b48c", R: "#ed413e" };
export class Sonic extends RetroGame {
  initialiser() {
    super.initialiser();
    this.rings = 0;
    this.invulnerable = 0;
    this.charge = 0;
    this.speed = 0;
    this.cameraX = 0;
    this.jumpQueued = false;
    this.setupCourse();
  }
  setupCourse() {
    this.course = SONIC_COURSES[(this.level - 1) % 3];
    this.p = {
      x: 36,
      y: 188,
      w: 12,
      h: 14,
      vx: 0,
      vy: 0,
      grounded: false,
      facing: 1,
    };
    this.speed = 0;
    this.rolling = false;
    this.loop = null;
    this.charge = 0;
    this.invulnerable = 1;
    this.cameraX = 0;
    this.timeLeft = 240;
    this.rings = 0;
    this.springCooldown = 0;
    this.ringObjects = [];
    this.scatter = [];
    this.blocks = new Map(this.course.blocks.map(([x, y]) => [`${x},${y}`, 1]));
    for (let x = 180; x < this.course.length - 100; x += 60) {
      const y = this.surface(x);
      if (Number.isFinite(y)) this.ringObjects.push({ x, y: y - 28, collected: false });
    }
    for (const loop of this.course.loops)
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU;
        this.ringObjects.push({
          x: loop.x + Math.cos(a) * (loop.r - 10),
          y: loop.y + Math.sin(a) * (loop.r - 10),
          collected: false,
        });
      }
    this.enemies = this.course.enemies.map((x) => ({
      x,
      y: this.surface(x) - 14,
      w: 18,
      h: 14,
      origin: x,
      alive: true,
      phase: Math.random() * TAU,
    }));
  }
  surface(x) {
    if (x < 0 || x > this.course.length || this.course.pits.some(([a, b]) => x >= a && x < b))
      return Infinity;
    let y = 202;
    for (const [a, b, height, period] of this.course.hills)
      if (x >= a && x <= b) {
        const edge = Math.min(1, (x - a) / 45, (b - x) / 45);
        y += Math.sin((x - a) / period) * height * Math.max(0, edge);
      }
    return y;
  }
  slope(x) {
    const a = this.surface(x - 2),
      b = this.surface(x + 2);
    return Number.isFinite(a) && Number.isFinite(b) ? Math.atan2(b - a, 4) : 0;
  }
  appuyer(code) {
    const used = super.appuyer(code);
    if (!used && code === "Space") {
      if (this.p.grounded && this.toucheActive("ArrowDown")) {
        this.charge = Math.min(360, this.charge + 70);
        this.rolling = true;
        this.son(250 + this.charge, 0.04);
      } else this.jumpQueued = true;
    }
    return used;
  }
  relacher(code) {
    super.relacher(code);
    if (code === "ArrowDown" && this.charge > 0) {
      this.speed = this.p.facing * (200 + this.charge);
      this.charge = 0;
      this.rolling = true;
    }
    if (code === "Space" && this.p.vy < -100) this.p.vy *= 0.65;
  }
  toucher() {
    this.jumpQueued = true;
  }
  direction(dx, dy) {
    if (dy < 0) this.jumpQueued = true;
    else if (dx) {
      this.touches.delete("ArrowLeft");
      this.touches.delete("ArrowRight");
      this.touches.add(dx < 0 ? "ArrowLeft" : "ArrowRight");
    }
  }
  hurt() {
    if (this.invulnerable > 0) return;
    if (this.rings > 0) {
      for (let i = 0; i < Math.min(24, this.rings); i++) {
        const a = (i / 12) * Math.PI;
        this.scatter.push({
          x: this.p.x + 6,
          y: this.p.y,
          vx: Math.cos(a) * 100,
          vy: -100 - Math.abs(Math.sin(a)) * 120,
          age: 0,
        });
      }
      this.rings = 0;
      this.invulnerable = 2;
      this.p.vy = -150;
      this.speed = -this.p.facing * 80;
    } else {
      this.lives--;
      if (!this.lives) this.terminer();
      else this.setupCourse();
    }
    this.son(150, 0.12);
  }
  loopStep(dt) {
    const t = this.loop,
      p = this.p;
    t.speed += -t.direction * 500 * Math.cos(t.angle) * dt;
    t.angle -= ((t.direction * t.speed) / t.track.r) * dt;
    t.travel += (t.speed / t.track.r) * dt;
    p.x = t.track.x + Math.cos(t.angle) * t.track.r - p.w / 2;
    p.y = t.track.y + Math.sin(t.angle) * t.track.r - p.h;
    p.vx = t.direction * t.speed * Math.sin(t.angle);
    p.vy = -t.direction * t.speed * Math.cos(t.angle);
    const fallingOff =
      Math.sin(t.angle) < -0.2 && (t.speed * t.speed) / t.track.r < 500 * -Math.sin(t.angle);
    if (this.jumpQueued || fallingOff || t.speed < 30) {
      if (this.jumpQueued) p.vy -= 150;
      this.speed = p.vx;
      this.jumpQueued = false;
      this.loop = null;
      p.grounded = false;
      return;
    }
    if (t.travel >= TAU) {
      p.x = t.track.x + t.direction * 12;
      p.y = this.surface(p.x) - p.h;
      p.grounded = true;
      this.speed = t.direction * t.speed;
      this.loop = null;
      this.loopCooldown = 0.5;
    }
  }
  avancer(dt) {
    this.timeLeft -= dt;
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.springCooldown = Math.max(0, this.springCooldown - dt);
    this.loopCooldown = Math.max(0, (this.loopCooldown ?? 0) - dt);
    const p = this.p,
      previous = { ...p };
    if (this.loop) this.loopStep(dt);
    else {
      const input =
          +this.toucheActive("ArrowRight", "KeyD") - this.toucheActive("ArrowLeft", "KeyA"),
        wasGrounded = p.grounded;
      if (input) {
        p.facing = input;
        if (Math.sign(this.speed) !== input && Math.abs(this.speed) > 20)
          this.speed += input * 470 * dt;
        else this.speed += input * (wasGrounded ? (this.rolling ? 45 : 180) : 85) * dt;
      } else if (wasGrounded && this.charge === 0) {
        const friction = this.rolling ? 17 : 80;
        this.speed = Math.sign(this.speed) * Math.max(0, Math.abs(this.speed) - friction * dt);
      }
      if (wasGrounded) this.speed += 500 * Math.sin(this.slope(p.x + p.w / 2)) * dt;
      this.speed = clamp(this.speed, -560, 560);
      if (this.toucheActive("ArrowDown") && wasGrounded && Math.abs(this.speed) > 40)
        this.rolling = true;
      if (wasGrounded && Math.abs(this.speed) < 25 && this.charge === 0) this.rolling = false;
      if (this.charge > 0) {
        this.speed = 0;
        this.charge = Math.max(25, this.charge - dt * 9);
      }
      if (this.jumpQueued && wasGrounded) {
        p.vy = -240 - Math.abs(this.speed) * 0.08;
        p.grounded = false;
        this.rolling = true;
        this.son(600, 0.05);
      }
      this.jumpQueued = false;
      p.vx = this.speed;
      p.vy = Math.min(460, p.vy + 500 * dt);
      moveOnTiles(
        p,
        dt,
        (x, y) => this.blocks.get(`${x},${y}`) ?? 0,
        (hit, nx) => {
          if (nx) this.speed = 0;
        },
      );
      const floor = this.surface(p.x + p.w / 2),
        oldFloor = this.surface(previous.x + previous.w / 2);
      if (
        Number.isFinite(floor) &&
        p.vy >= 0 &&
        (previous.y + previous.h <= floor + 16 ||
          (wasGrounded && Math.abs(floor - oldFloor) < 22)) &&
        p.y + p.h >= floor
      ) {
        p.y = floor - p.h;
        p.vy = 0;
        p.grounded = true;
      }
      if (
        wasGrounded &&
        Number.isFinite(floor) &&
        p.vy >= 0 &&
        Math.abs(floor - oldFloor) < 18 &&
        p.y + p.h < floor &&
        floor - p.y - p.h < 16
      ) {
        p.y = floor - p.h;
        p.grounded = true;
      }
      if (!this.loopCooldown && p.grounded && Math.abs(this.speed) > 295) {
        const track = this.course.loops.find((l) => Math.abs(p.x + p.w / 2 - l.x) < 12);
        if (track) {
          this.loop = {
            track,
            angle: Math.PI / 2,
            direction: Math.sign(this.speed),
            speed: Math.abs(this.speed),
            travel: 0,
          };
          this.rolling = true;
        }
      }
      if (
        p.grounded &&
        this.springCooldown === 0 &&
        this.course.springs.some((x) => Math.abs(p.x - x) < 15)
      ) {
        p.vy = -345;
        p.grounded = false;
        this.springCooldown = 0.3;
        this.son(900, 0.06);
      }
    }
    p.x = clamp(p.x, 0, this.course.length);
    if (p.y > 330 || this.timeLeft <= 0) {
      this.rings = 0;
      this.invulnerable = 0;
      this.hurt();
      return;
    }
    if (p.grounded && this.course.spikes.some((x) => Math.abs(p.x - x) < 15)) this.hurt();
    for (const ring of this.ringObjects)
      if (!ring.collected && Math.hypot(ring.x - p.x - 6, ring.y - p.y - 7) < 16) {
        ring.collected = true;
        this.rings++;
        this.score += 100;
        this.son(1000, 0.025);
      }
    for (const ring of this.scatter) {
      ring.age += dt;
      ring.vy += 400 * dt;
      ring.x += ring.vx * dt;
      ring.y += ring.vy * dt;
      const floor = this.surface(ring.x);
      if (ring.y > floor - 4) {
        ring.y = floor - 4;
        ring.vy = -Math.abs(ring.vy) * 0.6;
      }
      if (ring.age > 0.65 && Math.hypot(ring.x - p.x - 6, ring.y - p.y - 7) < 14) {
        ring.age = 9;
        this.rings++;
      }
    }
    this.scatter = this.scatter.filter((r) => r.age < 8);
    for (const enemy of this.enemies)
      if (enemy.alive) {
        const old = { ...enemy };
        enemy.phase += dt;
        enemy.x = enemy.origin + Math.sin(enemy.phase) * 24;
        enemy.y = this.surface(enemy.x) - 14;
        const hit = sweptAABB(
          previous,
          old,
          p.x - previous.x - enemy.x + old.x,
          p.y - previous.y - enemy.y + old.y,
        );
        if (hit) {
          if (this.rolling || (p.vy > 0 && hit.ny === -1)) {
            enemy.alive = false;
            this.score += 100;
            if (!p.grounded) p.vy = -150;
            this.eclater(enemy.x, enemy.y, "#eee", 7);
          } else this.hurt();
        }
      }
    this.cameraX = clamp(p.x - 110 + this.speed * 0.1, 0, this.course.length - 320);
    if (p.x > this.course.length - 60) {
      this.score += this.rings * 100 + Math.ceil(this.timeLeft) * 10;
      this.level++;
      if (this.level > 3) this.win();
      else this.setupCourse();
    }
  }
  dessinerJeu(g) {
    const cam = this.cameraX,
      night = this.course.theme === "night";
    rect(
      g,
      0,
      26,
      320,
      214,
      night ? "#111b48" : this.course.theme === "marble" ? "#52506f" : "#347fe5",
    );
    for (let i = 0; i < 7; i++) {
      const x = i * 100 - ((cam * 0.17) % 100);
      g.fillStyle = night ? "#303867" : "#317e7b";
      g.beginPath();
      g.moveTo(x - 40, 220);
      g.lineTo(x + 15, 95);
      g.lineTo(x + 65, 220);
      g.fill();
    }
    for (let x = 0; x < 320; x += 4) {
      const world = x + cam,
        y = this.surface(world);
      if (!Number.isFinite(y)) continue;
      rect(g, x, y, 4, 240 - y, this.course.theme === "marble" ? "#8c7d98" : "#b57a3d");
      rect(g, x, y, 4, 5, night ? "#bfde6c" : "#55d33d");
      for (let row = Math.ceil((y + 5) / 12) * 12; row < 240; row += 12)
        if ((Math.floor(world / 12) + row / 12) % 2) rect(g, x, row, 4, 11, "#ffffff20");
    }
    for (const track of this.course.loops) {
      const x = track.x - cam;
      g.strokeStyle = "#ac783d";
      g.lineWidth = 10;
      g.beginPath();
      g.arc(x, track.y, track.r, 0, TAU);
      g.stroke();
      g.strokeStyle = "#61d83d";
      g.lineWidth = 3;
      g.stroke();
    }
    for (const [key] of this.blocks) {
      const [x, y] = key.split(",").map(Number);
      rect(g, x * 16 - cam, y * 16, 16, 16, "#a5a0b4");
      rect(g, x * 16 - cam, y * 16, 16, 3, "#dfd7e5");
    }
    for (const x of this.course.springs) {
      const y = this.surface(x);
      rect(g, x - cam - 9, y - 8, 18, 5, "#e8494d");
      rect(g, x - cam - 5, y - 3, 10, 3, "#dedde9");
    }
    for (const x of this.course.spikes) {
      const y = this.surface(x);
      for (let i = -1; i <= 1; i++) {
        g.fillStyle = "#e6ecf3";
        g.beginPath();
        g.moveTo(x - cam + i * 8 - 4, y);
        g.lineTo(x - cam + i * 8, y - 13);
        g.lineTo(x - cam + i * 8 + 4, y);
        g.fill();
      }
    }
    for (const ring of [...this.ringObjects.filter((r) => !r.collected), ...this.scatter])
      if (ring.x - cam > -8 && ring.x - cam < 328) {
        g.strokeStyle = "#ffdc28";
        g.lineWidth = 2;
        g.beginPath();
        g.ellipse(
          ring.x - cam,
          ring.y,
          Math.max(1, Math.abs(Math.cos(this.temps * 8)) * 4),
          5,
          0,
          0,
          TAU,
        );
        g.stroke();
      }
    for (const e of this.enemies)
      if (e.alive && e.x - cam > -25 && e.x - cam < 345) {
        ball(g, e.x - cam + 9, e.y + 7, 8, "#cf3b48");
        rect(g, e.x - cam, e.y + 10, 18, 3, "#ddd");
        ball(g, e.x - cam + 7, e.y + 3, 2, "#eee");
      }
    const p = this.p;
    if (this.invulnerable === 0 || Math.floor(this.temps * 12) % 2) {
      if (this.rolling) {
        ball(g, p.x - cam + 6, p.y + 7, 8, "#1852c7");
        g.strokeStyle = "#75a6ff";
        g.beginPath();
        g.arc(p.x - cam + 6, p.y + 7, 5, this.temps * 25, this.temps * 25 + Math.PI);
        g.stroke();
      } else sprite(g, ART, p.x - cam, p.y, PALETTE, 1, p.facing < 0);
    }
    rect(g, this.course.length - 48 - cam, 150, 3, 52, "#ddd");
    rect(g, this.course.length - 58 - cam, 142, 26, 24, "#eecc51");
    text(g, `RINGS ${this.rings}  ${this.course.name}`, 8, 29, 9, "#ffe550");
    this.hud(g, `VITESSE ${Math.abs(Math.round(this.speed))}   ${Math.ceil(this.timeLeft)}s`);
    if (this.charge) text(g, `SPIN DASH ${Math.round(this.charge)}`, 160, 54, 10, "#fff", "center");
  }
}
