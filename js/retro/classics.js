import { RetroGame, W, H, TAU, clamp, rect, text, ball, sprite, distance } from "./common.js";

export class Pong extends RetroGame {
  initialiser() {
    super.initialiser();
    this.left = { y: 105, points: 0 };
    this.right = { y: 105, points: 0 };
    this.serve(1);
  }
  serve(d) {
    this.b = { x: 160, y: 125, vx: d * 125, vy: (Math.random() - 0.5) * 100 };
    this.wait = 0.7;
  }
  pointeur(x, y) {
    this.left.y = clamp(y - 18, 30, 195);
  }
  avancer(dt) {
    const a = this.left,
      b = this.right;
    this.wait -= dt;
    if (this.toucheActive("ArrowUp", "KeyW")) a.y -= 175 * dt;
    if (this.toucheActive("ArrowDown", "KeyS")) a.y += 175 * dt;
    a.y = clamp(a.y, 29, 195);
    b.y += clamp(this.b.y - 18 - b.y, -115 * dt, 115 * dt);
    b.y = clamp(b.y, 29, 195);
    if (this.wait > 0) return;
    const p = this.b;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.y < 30 || p.y > 229) {
      p.y = clamp(p.y, 30, 229);
      p.vy *= -1;
      this.son(320, 0.03);
    }
    for (const [pad, x, dir] of [
      [a, 18, 1],
      [b, 296, -1],
    ])
      if (p.vx * dir < 0 && Math.abs(p.x - x) < 6 && p.y > pad.y - 3 && p.y < pad.y + 39) {
        p.x = x + dir * 7;
        const speed = Math.min(260, Math.hypot(p.vx, p.vy) + 8),
          angle = (p.y - pad.y - 18) / 21;
        p.vx = dir * speed * Math.cos(angle);
        p.vy = speed * Math.sin(angle);
        this.son(600, 0.03);
      }
    if (p.x < 0 || p.x > 320) {
      const scorer = p.x < 0 ? b : a;
      scorer.points++;
      this.score = a.points * 100;
      if (scorer.points >= 11) {
        if (scorer === a) this.win();
        else this.terminer();
      } else this.serve(p.x < 0 ? 1 : -1);
    }
  }
  dessinerJeu(g) {
    rect(g, 0, 26, 320, 214, "#000");
    for (let y = 28; y < 232; y += 10) rect(g, 159, y, 2, 6, "#aaa");
    text(g, this.left.points, 125, 35, 28);
    text(g, this.right.points, 180, 35, 28);
    rect(g, 15, this.left.y, 6, 36, "#fff");
    rect(g, 293, this.right.y, 6, 36, "#fff");
    rect(g, this.b.x - 3, this.b.y - 3, 6, 6, "#fff");
  }
}
export class Odyssey extends Pong {
  initialiser() {
    super.initialiser();
    this.px = 55;
    this.py = 125;
  }
  avancer(dt) {
    if (this.toucheActive("ArrowLeft")) this.px -= 95 * dt;
    if (this.toucheActive("ArrowRight")) this.px += 95 * dt;
    if (this.toucheActive("ArrowUp")) this.py -= 115 * dt;
    if (this.toucheActive("ArrowDown")) this.py += 115 * dt;
    this.px = clamp(this.px, 14, 140);
    this.py = clamp(this.py, 35, 222);
    this.left.y = this.py - 18;
    super.avancer(dt);
    if (this.b.vx < 0 && Math.abs(this.b.x - this.px) < 7 && Math.abs(this.b.y - this.py) < 11) {
      this.b.vx = Math.abs(this.b.vx);
      this.b.vy = (this.b.y - this.py) * 9;
    }
  }
  pointeur(x, y) {
    this.px = clamp(x, 14, 140);
    this.py = clamp(y, 35, 222);
  }
  dessinerJeu(g) {
    rect(g, 0, 26, 160, 214, "#173f35");
    rect(g, 160, 26, 160, 214, "#45304a");
    rect(g, 159, 30, 2, 200, "#ddd");
    rect(g, this.px - 5, this.py - 5, 10, 10, "#fff");
    rect(g, 279, this.right.y + 12, 10, 10, "#fff");
    rect(g, this.b.x - 3, this.b.y - 3, 6, 6, "#fff");
    text(g, "CALQUE TABLE TENNIS", 160, 215, 9, "#b9b8b0", "center");
  }
}
export class Tennis extends RetroGame {
  initialiser() {
    super.initialiser();
    this.angle = 0.8;
    this.points = [0, 0];
    this.cooldown = 0;
    this.serve();
  }
  serve() {
    this.b = { x: 48, y: 176, vx: 0, vy: 0, bounces: 0, side: 0 };
    this.wait = true;
  }
  hit(side) {
    const b = this.b;
    if (this.cooldown > 0) return;
    if (this.wait && side === 0) this.wait = false;
    else if (
      this.wait ||
      (side === 0 && (b.x > 158 || b.vx > 0)) ||
      (side === 1 && (b.x < 162 || b.vx < 0))
    )
      return;
    const a = side ? Math.max(0.55, Math.min(1.1, Math.atan2(b.y - 110, 100))) : this.angle;
    b.vx = (side ? -1 : 1) * 160 * Math.cos(a);
    b.vy = -160 * Math.sin(a);
    b.bounces = 0;
    this.cooldown = 0.15;
    this.son(620, 0.03);
  }
  appuyer(code) {
    const used = super.appuyer(code);
    if (!used && code === "Space") this.hit(0);
    return used;
  }
  toucher() {
    this.hit(0);
  }
  avancer(dt) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.toucheActive("ArrowLeft")) this.angle = clamp(this.angle - dt, 0.3, 1.3);
    if (this.toucheActive("ArrowRight")) this.angle = clamp(this.angle + dt, 0.3, 1.3);
    if (this.wait) return;
    const b = this.b,
      old = b.x;
    b.vy += 115 * dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    const side = b.x < 160 ? 0 : 1;
    if (side !== b.side) {
      b.side = side;
      b.bounces = 0;
    }
    if (b.x > 240 && b.vx > 0 && b.y > 120) this.hit(1);
    if (old < 160 !== b.x < 160 && b.y > 171) {
      b.vx *= -0.55;
      b.x = old;
    }
    if (b.y > 200) {
      b.y = 200;
      b.vy = -Math.abs(b.vy) * 0.73;
      b.bounces++;
      if (b.bounces > 1) this.point(side === 0 ? 1 : 0);
    }
    if (b.x < 18 || b.x > 302) this.point(b.x < 18 ? 1 : 0);
  }
  point(side) {
    this.points[side]++;
    this.score = this.points[0] * 100;
    this.son(200, 0.12);
    if (Math.max(...this.points) >= 7) {
      if (this.points[0] >= 7) this.win();
      else this.terminer();
    }
    this.serve();
  }
  dessinerJeu(g) {
    rect(g, 0, 26, 320, 214, "#00150e");
    g.strokeStyle = "#23a16d";
    g.lineWidth = 2;
    g.beginPath();
    g.ellipse(160, 130, 145, 99, 0, 0, TAU);
    g.stroke();
    rect(g, 30, 203, 260, 2, "#68ffc1");
    rect(g, 159, 171, 2, 33, "#68ffc1");
    ball(g, this.b.x, this.b.y, 2, "#c5ffe1");
    text(g, `${this.points[0]} : ${this.points[1]}`, 160, 45, 19, "#83ffd1", "center");
    text(g, `ANGLE ${Math.round((this.angle * 180) / Math.PI)}°`, 40, 215, 9, "#68ffc1");
    if (this.wait) text(g, "ESPACE : SERVICE", 160, 120, 12, "#c5ffe1", "center");
  }
}
export class Spacewar extends RetroGame {
  initialiser() {
    super.initialiser();
    this.ships = [
      { x: 65, y: 130, a: 0, vx: 0, vy: -12, color: "#b8ffdd", ammo: 32 },
      { x: 255, y: 130, a: Math.PI, vx: 0, vy: 12, color: "#c7dcff", ammo: 32 },
    ];
    this.shots = [];
    this.cool = [0, 0];
    this.roundTime = 75;
    this.protect = 2;
  }
  appuyer(code) {
    const used = super.appuyer(code);
    if (!used && code === "KeyX" && (this.hyperspace ?? 0) <= 0) {
      const s = this.ships[0];
      s.x = 20 + Math.random() * 280;
      s.y = 40 + Math.random() * 175;
      s.vx = s.vy = 0;
      this.hyperspace = 5;
      if (Math.random() < 0.08) this.crash(0);
    }
    return used;
  }
  fire(i) {
    const s = this.ships[i];
    if (this.cool[i] > 0 || !s.ammo) return;
    s.ammo--;
    this.cool[i] = 0.24;
    this.shots.push({
      x: s.x + Math.cos(s.a) * 9,
      y: s.y + Math.sin(s.a) * 9,
      vx: s.vx + Math.cos(s.a) * 190,
      vy: s.vy + Math.sin(s.a) * 190,
      life: 1.8,
      owner: i,
    });
    this.son(440, 0.035);
  }
  crash(i) {
    if (this.protect > 0) return;
    this.eclater(this.ships[i].x, this.ships[i].y, "#fff", 18);
    if (i === 0) {
      this.lives--;
      if (!this.lives) {
        this.terminer();
        return;
      }
    } else this.score += 1000;
    this.protect = 1.5;
    const s = this.ships[i];
    s.x = i ? 265 : 55;
    s.y = 80 + Math.random() * 100;
    s.vx = s.vy = 0;
    s.ammo = 32;
    if (this.score >= 3000) this.win();
  }
  avancer(dt) {
    this.roundTime -= dt;
    this.protect -= dt;
    this.hyperspace = Math.max(0, (this.hyperspace ?? 0) - dt);
    if (this.roundTime <= 0) {
      this.terminer();
      return;
    }
    for (let i = 0; i < 2; i++) {
      const s = this.ships[i],
        target = this.ships[1 - i];
      this.cool[i] -= dt;
      let thrust = false;
      if (i === 0) {
        s.a += (+this.toucheActive("ArrowRight") - this.toucheActive("ArrowLeft")) * 3.5 * dt;
        thrust = this.toucheActive("ArrowUp");
        if (this.toucheActive("Space")) this.fire(i);
      } else {
        const aim = Math.atan2(target.y - s.y, target.x - s.x),
          da = Math.atan2(Math.sin(aim - s.a), Math.cos(aim - s.a));
        s.a += clamp(da, -2.4 * dt, 2.4 * dt);
        thrust = distance(s, target) > 90;
        if (Math.abs(da) < 0.25) this.fire(i);
      }
      const dx = 160 - s.x,
        dy = 130 - s.y,
        r = Math.hypot(dx, dy);
      if (r < 13) this.crash(i);
      const gravity = 150000 / Math.max(300, r * r);
      s.vx += ((dx / Math.max(r, 1)) * gravity + (thrust ? Math.cos(s.a) * 85 : 0)) * dt;
      s.vy += ((dy / Math.max(r, 1)) * gravity + (thrust ? Math.sin(s.a) * 85 : 0)) * dt;
      const speed = Math.hypot(s.vx, s.vy);
      if (speed > 145) {
        s.vx *= 145 / speed;
        s.vy *= 145 / speed;
      }
      s.x = (s.x + s.vx * dt + 320) % 320;
      s.y = 28 + ((s.y - 28 + s.vy * dt + 200) % 200);
      s.thrust = thrust;
    }
    for (const p of this.shots) {
      p.x = (p.x + p.vx * dt + 320) % 320;
      p.y = 28 + ((p.y - 28 + p.vy * dt + 200) % 200);
      p.life -= dt;
      if (distance(p, this.ships[1 - p.owner]) < 10) {
        p.life = 0;
        this.crash(1 - p.owner);
      }
    }
    this.shots = this.shots.filter((p) => p.life > 0);
  }
  dessinerJeu(g) {
    for (let i = 0; i < 55; i++)
      rect(g, (i * 79 + 11) % 320, 30 + ((i * 43) % 190), 1, 1, i % 5 ? "#53645d" : "#cde4d5");
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU + this.temps;
      g.strokeStyle = "#ffefa7";
      g.beginPath();
      g.moveTo(160 + Math.cos(a) * 8, 130 + Math.sin(a) * 8);
      g.lineTo(160 + Math.cos(a) * 14, 130 + Math.sin(a) * 14);
      g.stroke();
    }
    for (const s of this.ships) {
      g.save();
      g.translate(s.x, s.y);
      g.rotate(s.a);
      g.strokeStyle = s.color;
      g.beginPath();
      g.moveTo(10, 0);
      g.lineTo(-7, -6);
      g.lineTo(-3, 0);
      g.lineTo(-7, 6);
      g.closePath();
      g.stroke();
      if (s.thrust) {
        g.strokeStyle = "#ffb848";
        g.beginPath();
        g.moveTo(-5, 0);
        g.lineTo(-12, 0);
        g.stroke();
      }
      g.restore();
    }
    for (const p of this.shots) ball(g, p.x, p.y, 1, "#fff");
    this.hud(g, `TORPILLES ${this.ships[0].ammo}   ${Math.ceil(this.roundTime)}s`);
  }
}
export class Breakout extends RetroGame {
  initialiser() {
    super.initialiser();
    this.paddle = { x: 134, w: 52 };
    this.capsules = [];
    this.lasers = [];
    this.power = 0;
    this.laserTime = 0;
    this.laserCooldown = 0;
    this.ark = this.nom.includes("arkanoid");
    this.board();
  }
  board() {
    this.bricks = [];
    const cols = this.ark ? 11 : 14,
      rows = this.ark ? 7 : 8,
      w = 294 / cols;
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        if (this.ark && this.level % 2 === 0 && Math.abs(x - 5) < Math.max(0, 3 - y)) continue;
        const silver = this.ark && y === 1;
        this.bricks.push({
          x: 13 + x * w,
          y: 48 + y * 10,
          w: w - 1,
          h: 8,
          hp: silver ? 2 : 1,
          color: silver
            ? "#bcc8d5"
            : ["#ed3045", "#f37131", "#f8d23a", "#48bd6d", "#349aef", "#b56fdd"][
                Math.floor(y / (this.ark ? 1 : 2)) % 6
              ],
        });
      }
    this.serve();
  }
  serve() {
    this.balls = [
      {
        x: this.paddle.x + this.paddle.w / 2,
        y: 207,
        vx: 80,
        vy: -145,
        stuck: true,
      },
    ];
  }
  launch() {
    for (const b of this.balls) b.stuck = false;
    if (this.laserTime > 0 && this.laserCooldown <= 0) {
      this.lasers.push(
        { x: this.paddle.x + 3, y: 207 },
        { x: this.paddle.x + this.paddle.w - 3, y: 207 },
      );
      this.laserCooldown = 0.25;
      this.son(850, 0.03);
    }
  }
  appuyer(code) {
    const used = super.appuyer(code);
    if (!used && code === "Space") this.launch();
    return used;
  }
  toucher() {
    this.launch();
  }
  pointeur(x) {
    this.paddle.x = clamp(x - this.paddle.w / 2, 10, 310 - this.paddle.w);
  }
  damage(brick) {
    brick.hp--;
    if (brick.hp <= 0) {
      this.score += this.ark ? 50 : 10;
      if (this.ark && Math.random() < 0.2)
        this.capsules.push({
          x: brick.x + brick.w / 2,
          y: brick.y,
          power: Math.floor(Math.random() * 3),
        });
    }
    this.son(380 + brick.y * 2, 0.025);
  }
  avancer(dt) {
    const p = this.paddle;
    this.power -= dt;
    this.laserTime -= dt;
    this.laserCooldown -= dt;
    if (this.power <= 0 && p.w !== 52) {
      p.w = 52;
      p.x = clamp(p.x, 10, 258);
    }
    p.x = clamp(
      p.x +
        (+this.toucheActive("ArrowRight", "KeyD") - this.toucheActive("ArrowLeft", "KeyA")) *
          225 *
          dt,
      10,
      310 - p.w,
    );
    if (this.toucheActive("Space")) this.launch();
    for (const b of this.balls) {
      if (b.stuck) {
        b.x = p.x + p.w / 2;
        b.y = 207;
        continue;
      }
      const steps = Math.max(1, Math.ceil((Math.hypot(b.vx, b.vy) * dt) / 3));
      for (let s = 0; s < steps; s++) {
        const oldY = b.y;
        b.x += (b.vx * dt) / steps;
        b.y += (b.vy * dt) / steps;
        if (b.x < 12 || b.x > 308) {
          b.vx *= -1;
          b.x = clamp(b.x, 12, 308);
        }
        if (b.y < 30) {
          b.vy = Math.abs(b.vy);
          b.y = 30;
        }
        if (b.vy > 0 && b.y >= 208 && b.y <= 216 && b.x > p.x - 2 && b.x < p.x + p.w + 2) {
          b.y = 207;
          const a = ((b.x - p.x - p.w / 2) / (p.w / 2)) * 1.1,
            speed = Math.min(265, Math.hypot(b.vx, b.vy) + 4);
          b.vx = Math.sin(a) * speed;
          b.vy = -Math.cos(a) * speed;
        }
        const hit = this.bricks.find(
          (r) =>
            r.hp > 0 &&
            b.x > r.x - 2 &&
            b.x < r.x + r.w + 2 &&
            b.y > r.y - 2 &&
            b.y < r.y + r.h + 2,
        );
        if (hit) {
          this.damage(hit);
          if (oldY < hit.y || oldY > hit.y + hit.h) b.vy *= -1;
          else b.vx *= -1;
          break;
        }
      }
    }
    this.balls = this.balls.filter((b) => b.y < 244);
    if (!this.balls.length) {
      this.lives--;
      if (!this.lives) this.terminer();
      else this.serve();
    }
    for (const c of this.capsules) {
      c.y += 65 * dt;
      if (c.y > 204 && c.y < 220 && c.x > p.x && c.x < p.x + p.w) {
        c.y = 300;
        if (c.power === 0) {
          p.w = 80;
          this.power = 15;
        }
        if (c.power === 1) {
          this.laserTime = 15;
        }
        if (c.power === 2) {
          for (const b of [...this.balls])
            if (!b.stuck && this.balls.length < 4) {
              this.balls.push({ ...b, vx: b.vx + 70 }, { ...b, vx: b.vx - 70 });
            }
        }
        this.score += 100;
      }
    }
    this.capsules = this.capsules.filter((c) => c.y < 240);
    for (const shot of this.lasers) {
      shot.y -= 250 * dt;
      const hit = this.bricks.find(
        (r) => r.hp > 0 && shot.x > r.x && shot.x < r.x + r.w && shot.y > r.y && shot.y < r.y + 8,
      );
      if (hit) {
        this.damage(hit);
        shot.y = -1;
      }
    }
    this.lasers = this.lasers.filter((s) => s.y > 28);
    if (this.bricks.every((b) => b.hp <= 0)) {
      this.level++;
      if (this.level > 4) this.win();
      else this.board();
    }
  }
  dessinerJeu(g) {
    rect(g, 8, 27, 304, 196, this.ark ? "#0c1730" : "#000");
    rect(g, 7, 27, 3, 196, "#888");
    rect(g, 310, 27, 3, 196, "#888");
    for (const b of this.bricks)
      if (b.hp) {
        rect(g, b.x, b.y, b.w, b.h, b.color);
        if (this.ark) rect(g, b.x + 1, b.y + 1, b.w - 2, 1, "#ffffff77");
      }
    rect(g, this.paddle.x, 211, this.paddle.w, 5, this.laserTime > 0 ? "#e66688" : "#e5f0f5");
    for (const b of this.balls) rect(g, b.x - 2, b.y - 2, 4, 4, "#fff");
    for (const c of this.capsules) {
      rect(g, c.x - 5, c.y, 11, 6, ["#38b855", "#ed3971", "#6cd8ff"][c.power]);
      text(g, ["E", "L", "D"][c.power], c.x, c.y - 1, 8, "#fff", "center");
    }
    for (const p of this.lasers) rect(g, p.x, p.y, 1, 5, "#ff6677");
    this.hud(g, `ROUND ${this.level}`);
  }
}
export class Arkanoid extends Breakout {}

const INVADER_SPRITES = [
  [
    "..X.....X..",
    "...X...X...",
    "..XXXXXXX..",
    ".XX.XXX.XX.",
    "XXXXXXXXXXX",
    "X.XXXXXXX.X",
    "X.X.....X.X",
    "...XX.XX...",
  ],
  ["...XX...", "..XXXX..", ".XXXXXX.", "XX.XX.XX", "XXXXXXXX", "..X..X..", ".X.XX.X.", "X.X..X.X"],
  [
    "....XXXX....",
    ".XXXXXXXXXX.",
    "XXXXXXXXXXXX",
    "XXX..XX..XXX",
    "XXXXXXXXXXXX",
    "...XX..XX...",
    "..XX.XX.XX..",
    "XX........XX",
  ],
];
export class Invaders extends RetroGame {
  initialiser() {
    super.initialiser();
    this.x = 160;
    this.invaders = [];
    this.bullets = [];
    this.enemyShots = [];
    this.offset = 0;
    this.down = 0;
    this.dir = 1;
    this.stepTimer = 0;
    this.fireTimer = 0.8;
    this.cooldown = 0;
    this.ufo = null;
    this.ufoTimer = 15;
    this.invulnerable = 0;
    this.newWave();
  }
  newWave() {
    this.invaders = Array.from({ length: 55 }, (_, i) => ({
      x: 40 + (i % 11) * 22,
      y: 44 + Math.floor(i / 11) * 19,
      row: Math.floor(i / 11),
      alive: true,
    }));
    this.offset = 0;
    this.down = 0;
    this.dir = 1;
    this.shields = [];
    for (let n = 0; n < 4; n++)
      for (let y = 0; y < 6; y++)
        for (let x = 0; x < 9; x++)
          if (!(y === 0 && (x < 2 || x > 6)) && !(y > 3 && x > 2 && x < 6))
            this.shields.push({
              x: 43 + n * 68 + x * 3,
              y: 179 + y * 3,
              alive: true,
            });
  }
  fire() {
    if (this.cooldown > 0 || this.bullets.length) return;
    this.bullets.push({ x: this.x, y: 207 });
    this.cooldown = 0.2;
    this.son(700, 0.03);
  }
  appuyer(c) {
    const used = super.appuyer(c);
    if (!used && c === "Space") this.fire();
    return used;
  }
  toucher() {
    this.fire();
  }
  pointeur(x, y, pressed) {
    this.x = clamp(x, 14, 306);
    if (pressed) this.fire();
  }
  erode(p) {
    const hit = this.shields.find(
      (s) => s.alive && Math.abs(s.x + 1 - p.x) < 3 && Math.abs(s.y + 1 - p.y) < 4,
    );
    if (!hit) return false;
    for (const s of this.shields) if (Math.hypot(s.x - hit.x, s.y - hit.y) < 5) s.alive = false;
    return true;
  }
  avancer(dt) {
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.cooldown -= dt;
    this.x = clamp(
      this.x +
        (+this.toucheActive("ArrowRight", "KeyD") - this.toucheActive("ArrowLeft", "KeyA")) *
          130 *
          dt,
      14,
      306,
    );
    if (this.toucheActive("Space")) this.fire();
    const alive = this.invaders.filter((i) => i.alive);
    if (!alive.length) {
      this.level++;
      if (this.level > 5) this.win();
      else this.newWave();
      return;
    }
    this.stepTimer -= dt;
    if (this.stepTimer <= 0) {
      this.stepTimer = 0.04 + (alive.length * 0.011) / Math.min(2, this.level);
      let offset = this.offset + this.dir * 4;
      if (alive.some((a) => a.x + offset < 15 || a.x + offset > 290)) {
        this.dir *= -1;
        this.down += 9;
      } else this.offset = offset;
      this.son(60 + alive.length, 0.02, "square", 0.01);
    }
    if (alive.some((a) => a.y + this.down > 198)) {
      this.terminer();
      return;
    }
    for (const a of alive)
      for (const s of this.shields)
        if (
          s.alive &&
          Math.abs(s.x - a.x - this.offset) < 11 &&
          Math.abs(s.y - a.y - this.down) < 8
        )
          s.alive = false;
    this.fireTimer -= dt;
    if (this.fireTimer <= 0) {
      this.fireTimer = Math.max(0.25, 1.2 - this.level * 0.12);
      const columns = [...new Set(alive.map((a) => a.x))],
        col = columns[Math.floor(Math.random() * columns.length)],
        shooter = alive.filter((a) => a.x === col).at(-1);
      this.enemyShots.push({
        x: shooter.x + this.offset + 5,
        y: shooter.y + this.down + 8,
      });
    }
    this.ufoTimer -= dt;
    if (this.ufoTimer < 0 && !this.ufo) {
      this.ufo = { x: -20, y: 30 };
      this.ufoTimer = 15;
    }
    if (this.ufo) {
      this.ufo.x += 38 * dt;
      if (this.ufo.x > 340) this.ufo = null;
    }
    for (const p of this.bullets) {
      p.y -= 210 * dt;
      if (this.erode(p)) {
        p.y = -1;
        continue;
      }
      const hit = alive.find(
        (a) => Math.abs(a.x + this.offset + 5 - p.x) < 7 && Math.abs(a.y + this.down + 4 - p.y) < 6,
      );
      if (hit) {
        hit.alive = false;
        p.y = -1;
        this.score += [30, 20, 20, 10, 10][hit.row];
        this.eclater(hit.x + this.offset, hit.y + this.down, "#fff", 4);
      }
      if (this.ufo && Math.abs(this.ufo.x - p.x) < 12 && Math.abs(this.ufo.y - p.y) < 7) {
        this.score += 100;
        this.ufo = null;
        p.y = -1;
      }
    }
    for (const p of this.enemyShots) {
      p.y += (90 + this.level * 8) * dt;
      if (this.erode(p)) {
        p.y = 250;
        continue;
      }
      if (Math.abs(p.x - this.x) < 9 && p.y > 206 && p.y < 218) {
        this.lose();
        p.y = 250;
      }
    }
    this.bullets = this.bullets.filter((p) => p.y > 26);
    this.enemyShots = this.enemyShots.filter((p) => p.y < 230);
  }
  dessinerJeu(g) {
    for (const a of this.invaders)
      if (a.alive)
        sprite(
          g,
          INVADER_SPRITES[a.row === 0 ? 1 : a.row < 3 ? 0 : 2],
          a.x + this.offset,
          a.y + this.down,
          { X: "#e0e8e0" },
        );
    for (const s of this.shields) if (s.alive) rect(g, s.x, s.y, 3, 3, "#53db52");
    if (this.invulnerable <= 0 || Math.floor(this.temps * 12) % 2) {
      rect(g, this.x - 8, 210, 16, 6, "#62ee57");
      rect(g, this.x - 2, 205, 4, 6, "#62ee57");
    }
    for (const p of this.bullets) rect(g, p.x, p.y, 1, 6, "#fff");
    for (const p of this.enemyShots) rect(g, p.x, p.y, 2, 5, "#fff");
    if (this.ufo) {
      ball(g, this.ufo.x, this.ufo.y, 7, "#ef5261");
      rect(g, this.ufo.x - 11, this.ufo.y, 22, 3, "#ef5261");
    }
    rect(g, 8, 222, 304, 1, "#60e05a");
    this.hud(g, `VAGUE ${this.level}`);
  }
}
