import { DRAGON_ROOMS, ACTION_NAMES } from "./adventure.js";
import { RetroGame, clamp, rect, text, ball, sprite, MARIO, MARIO_COLORS, TAU } from "./common.js";
import { moveOnTiles, sweptAABB } from "./physics.js";
import { MARIO_COURSES } from "./levels.js";

const GOOMBA = [
  "..BBBB..",
  ".BBBBBB.",
  "BBWBWBBB",
  "BBWBWBBB",
  ".BBBBBB.",
  "..SSSS..",
  ".SS..SS.",
  "SSS..SSS",
];
const SONIC = [
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

export class Mario extends RetroGame {
  initialiser() {
    super.initialiser();
    this.sonic = this.nom.includes("sonic");
    this.coins = 0;
    this.rings = 0;
    this.invulnerable = 0;
    this.jumpBuffer = 0;
    this.timeLeft = 300;
    this.cameraX = 0;
    this.transition = 0;
    this.loadLevel();
  }
  loadLevel() {
    const course = MARIO_COURSES[(this.level - 1) % MARIO_COURSES.length];
    this.course = course;
    this.length = course.length;
    this.courseTime = 0;
    this.tiles = new Map();
    this.items = [];
    this.enemies = [];
    this.projectiles = [];
    for (let x = 0; x < this.length; x++)
      if (!course.holes.some(([start, width]) => x >= start && x < start + width))
        for (let y = 13; y < 15; y++) this.setTile(x, y, 1);
    for (const [x, y] of course.questions) this.setTile(x, y, 3);
    for (const [x, y] of course.bricks) this.setTile(x, y, 2);
    for (const [x, height] of course.pipes)
      for (let dx = 0; dx < 2; dx++)
        for (let y = 13 - height; y < 13; y++) this.setTile(x + dx, y, 4);
    for (const start of [this.length - 25, this.length - 12])
      for (let dx = 0; dx < 5; dx++)
        for (let y = 12 - dx; y < 13; y++) this.setTile(start + dx, y, 5);
    for (const x of course.enemies)
      this.enemies.push({
        x: x * 16,
        y: 192,
        w: 14,
        h: 14,
        vx: -24 - this.level * 2,
        vy: 0,
        alive: true,
      });
    for (const [x, y] of course.coins)
      this.items.push({
        x: x * 16 + 8,
        y: y * 16 + 8,
        w: 8,
        h: 8,
        type: "coin",
        alive: true,
      });
    this.lifts = course.lifts.map((l) => ({
      ...l,
      baseX: l.x,
      baseY: l.y,
      prevX: l.x,
      prevY: l.y,
    }));
    this.p = {
      x: 36,
      y: 183,
      w: 12,
      h: 15,
      vx: 0,
      vy: 0,
      grounded: false,
      big: false,
      facing: 1,
      standingOn: null,
    };
    this.cameraX = 0;
    this.flag = (this.length - 5) * 16;
    this.timeLeft = 300;
    this.invulnerable = 1;
  }
  key(x, y) {
    return `${x},${y}`;
  }
  setTile(x, y, id) {
    this.tiles.set(this.key(x, y), id);
  }
  tile(x, y) {
    return this.tiles.get(this.key(x, y)) ?? 0;
  }
  collision(p) {
    for (let y = Math.floor(p.y / 16); y <= Math.floor((p.y + p.h - 0.01) / 16); y++)
      for (let x = Math.floor(p.x / 16); x <= Math.floor((p.x + p.w - 0.01) / 16); x++)
        if (this.tile(x, y)) return { x, y, id: this.tile(x, y) };
    return null;
  }
  moveBody(body, dt, player = false) {
    const direction = Math.sign(body.vx) || -1;
    moveOnTiles(
      body,
      dt,
      (x, y) => this.tile(x, y),
      (hit, nx, ny) => {
        if (nx && !player) body.vx = -direction * (24 + this.level * 2);
        if (player && ny === 1) this.bump(hit.x, hit.y, hit.id);
      },
    );
  }
  bump(x, y, id) {
    if (id === 3) {
      this.setTile(x, y, 7);
      if (!this.p.big && !this.sonic) {
        this.items.push({
          x: x * 16 + 8,
          y: y * 16 - 14,
          w: 12,
          h: 12,
          vx: 30,
          vy: 0,
          type: "mushroom",
          alive: true,
        });
      } else {
        this.coins++;
        this.score += 200;
        this.eclater(x * 16 + 8, y * 16 - 8, "#ffe153", 6);
      }
    } else if (id === 2 && this.p.big) {
      this.tiles.delete(this.key(x, y));
      this.eclater(x * 16 + 8, y * 16 + 8, "#ba6e3c", 8);
      this.score += 50;
    }
    this.son(500, 0.025);
  }
  appuyer(c) {
    const used = super.appuyer(c);
    if (!used && (c === "Space" || c === "ArrowUp")) this.jumpBuffer = 0.15;
    return used;
  }
  relacher(c) {
    super.relacher(c);
    if (c === "Space" && this.p.vy < -70) this.p.vy *= 0.58;
  }
  direction(dx, dy) {
    if (dy < 0) this.jumpBuffer = 0.15;
    else if (dx) {
      this.touches.delete("ArrowLeft");
      this.touches.delete("ArrowRight");
      this.touches.add(dx > 0 ? "ArrowRight" : "ArrowLeft");
    }
  }
  toucher() {
    this.jumpBuffer = 0.15;
  }
  hurt() {
    if (this.invulnerable > 0) return;
    if (this.sonic && this.rings > 0) {
      const n = Math.min(20, this.rings);
      this.rings = 0;
      for (let i = 0; i < n; i++)
        this.items.push({
          x: this.p.x + 6,
          y: this.p.y,
          vx: Math.cos((i / n) * TAU) * 95,
          vy: -120 - Math.abs(Math.sin((i / n) * TAU)) * 80,
          w: 8,
          h: 8,
          type: "scatter",
          alive: true,
          age: 0,
        });
      this.invulnerable = 2;
      this.p.vy = -100;
      this.son(180, 0.15);
      return;
    }
    if (this.p.big) {
      this.p.big = false;
      this.p.y += 10;
      this.p.h = 15;
      this.invulnerable = 2;
      return;
    }
    this.lives--;
    if (!this.lives) this.terminer();
    else this.loadLevel();
  }
  avancer(dt) {
    if (this.transition > 0) {
      this.transition -= dt;
      if (this.transition <= 0) {
        this.level++;
        if (this.level > 3) this.win();
        else this.loadLevel();
      }
      return;
    }
    const p = this.p;
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.jumpBuffer -= dt;
    this.timeLeft -= dt;
    this.courseTime += dt;
    for (const lift of this.lifts) {
      lift.prevX = lift.x;
      lift.prevY = lift.y;
      lift[lift.axis] =
        lift[lift.axis === "x" ? "baseX" : "baseY"] +
        Math.sin(this.courseTime * lift.speed) * lift.amplitude;
    }
    if (p.standingOn !== null) {
      const lift = this.lifts[p.standingOn];
      if (lift && p.x + p.w > lift.prevX && p.x < lift.prevX + lift.w) {
        p.x += lift.x - lift.prevX;
        p.y += lift.y - lift.prevY;
      }
    }
    const previousPlayer = { ...p };
    if (this.timeLeft <= 0) {
      this.hurt();
      this.timeLeft = 300;
    }
    const dir = +this.toucheActive("ArrowRight", "KeyD") - this.toucheActive("ArrowLeft", "KeyA");
    const max = this.sonic ? 235 : this.toucheActive("KeyX", "ShiftLeft") ? 150 : 98;
    if (dir) {
      p.facing = dir;
      p.vx = clamp(p.vx + dir * (this.sonic ? 190 : 650) * dt, -max, max);
    } else p.vx *= Math.exp(-dt * (this.sonic ? 2.5 : 12));
    if (this.jumpBuffer > 0 && p.grounded) {
      p.vy = this.sonic ? -230 : -205;
      this.jumpBuffer = 0;
      this.son(500, 0.05);
    }
    p.vy = Math.min(380, p.vy + 550 * dt);
    this.moveBody(p, dt, true);
    p.standingOn = null;
    for (let i = 0; i < this.lifts.length; i++) {
      const lift = this.lifts[i];
      if (
        p.vy >= 0 &&
        previousPlayer.y + previousPlayer.h <= lift.prevY + 2 &&
        p.y + p.h >= lift.y &&
        p.x + p.w > lift.x &&
        p.x < lift.x + lift.w
      ) {
        p.y = lift.y - p.h;
        p.vy = 0;
        p.grounded = true;
        p.standingOn = i;
      }
    }
    p.x = clamp(p.x, 0, this.length * 16 - p.w);
    if (p.y > 260) {
      this.invulnerable = 0;
      this.p.big = false;
      this.rings = 0;
      this.hurt();
      return;
    }
    for (const e of this.enemies) {
      if (!e.alive || Math.abs(e.x - p.x) > 450) continue;
      const previousEnemy = { ...e };
      e.vy = Math.min(300, e.vy + 550 * dt);
      this.moveBody(e, dt);
      if (e.y > 250) {
        e.alive = false;
        continue;
      }
      const contact = sweptAABB(
        previousPlayer,
        previousEnemy,
        p.x - previousPlayer.x - e.x + previousEnemy.x,
        p.y - previousPlayer.y - e.y + previousEnemy.y,
      );
      if (contact) {
        if (contact.ny === -1 && p.vy >= 0) {
          e.alive = false;
          p.vy = -130;
          this.score += 100;
          this.son(270, 0.04);
        } else this.hurt();
      }
    }
    for (const item of this.items) {
      if (!item.alive) continue;
      if (item.type === "mushroom" || item.type === "scatter") {
        item.age = (item.age ?? 0) + dt;
        item.vy += 400 * dt;
        this.moveBody(item, dt);
        if (item.type === "scatter" && item.grounded) item.vy = -70;
        if (item.age > 8 || item.y > 250) item.alive = false;
      }
      if (
        Math.abs(item.x - p.x - p.w / 2) < 13 &&
        Math.abs(item.y - p.y - p.h / 2) < p.h / 2 + 8 &&
        (item.type !== "scatter" || item.age > 0.6)
      ) {
        item.alive = false;
        this.score += item.type === "mushroom" ? 1000 : 100;
        if (item.type === "mushroom" && !p.big) {
          p.big = true;
          p.y -= 10;
          p.h = 25;
        } else if (this.sonic) this.rings++;
        else {
          this.coins++;
          if (this.coins % 100 === 0) this.lives++;
        }
        this.son(900, 0.035);
      }
    }
    this.cameraX = clamp(p.x - 110, 0, this.length * 16 - 320);
    if (p.x > this.flag) {
      this.score += Math.ceil(this.timeLeft) * 10;
      this.transition = 1.4;
    }
  }
  dessinerJeu(g) {
    rect(
      g,
      0,
      26,
      320,
      214,
      this.sonic ? "#3475df" : this.course.theme === "cave" ? "#121222" : "#5e93ff",
    );
    const cam = this.cameraX;
    if (this.sonic) {
      for (let i = 0; i < 7; i++) {
        const x = (i * 90 - cam * 0.2) % 420;
        g.fillStyle = "#288c86";
        g.beginPath();
        g.moveTo(x - 40, 208);
        g.lineTo(x + 15, 95);
        g.lineTo(x + 65, 208);
        g.fill();
      }
      rect(g, 0, 185, 320, 30, "#2f75a9");
    } else {
      for (let i = 0; i < 8; i++) {
        const x = i * 90 - ((cam * 0.18) % 90);
        ball(g, x, 63, 10, "#fff");
        ball(g, x + 12, 67, 12, "#fff");
      }
      for (let i = 0; i < 5; i++) {
        const x = i * 105 - ((cam * 0.35) % 105);
        g.fillStyle = "#38a640";
        g.beginPath();
        g.moveTo(x, 208);
        g.lineTo(x + 34, 164);
        g.lineTo(x + 70, 208);
        g.fill();
      }
    }
    for (const [key, id] of this.tiles) {
      const [x, y] = key.split(",").map(Number),
        px = x * 16 - cam,
        py = y * 16;
      if (px < -16 || px > 320) continue;
      if (id === 4) {
        rect(g, px, py, 16, 16, "#31952c");
        rect(g, px + 3, py, 3, 16, "#8be13b");
        rect(g, px + 14, py, 2, 16, "#19561f");
      } else if (id === 6) {
        rect(g, px, py + 8, 16, 8, "#db3143");
        rect(g, px, py + 6, 16, 2, "#fff");
      } else {
        rect(
          g,
          px,
          py,
          16,
          16,
          id === 3
            ? "#eeb33a"
            : id === 7
              ? "#996529"
              : this.sonic
                ? (x + y) % 2
                  ? "#b56c30"
                  : "#df9d4c"
                : this.level === 2
                  ? "#4777c3"
                  : "#b66936",
        );
        if (this.sonic && id === 1 && y === 13) rect(g, px, py, 16, 3, "#65df36");
        if (id === 3) text(g, "?", px + 4, py + 1, 13, "#783e1d");
        else if (id !== 7) {
          rect(g, px, py + 7, 16, 1, "#663419");
          rect(g, px + 7, py, 1, 8, "#663419");
          rect(g, px + 3, py + 8, 1, 8, "#663419");
        }
      }
    }
    for (const i of this.items)
      if (i.alive && i.x - cam > -16 && i.x - cam < 336) {
        if (i.type === "mushroom") {
          ball(g, i.x - cam + 5, i.y + 4, 7, "#ee3d35");
          rect(g, i.x - cam + 2, i.y + 5, 7, 7, "#ffe1ae");
        } else {
          g.strokeStyle = this.sonic ? "#ffe63b" : "#ffe382";
          g.lineWidth = 2;
          g.beginPath();
          g.ellipse(
            i.x - cam,
            i.y,
            Math.max(1, Math.abs(Math.cos(this.temps * 7)) * 4),
            5,
            0,
            0,
            TAU,
          );
          g.stroke();
        }
      }
    for (const e of this.enemies)
      if (e.alive && e.x - cam > -20 && e.x - cam < 340)
        sprite(g, GOOMBA, e.x - cam, e.y, { B: "#9b541d", S: "#321c18", W: "#fff" }, 1.75);
    const p = this.p;
    if (this.invulnerable <= 0 || Math.floor(this.temps * 12) % 2) {
      if (this.sonic && (!p.grounded || this.toucheActive("ArrowDown")))
        ball(g, p.x - cam + 7, p.y + 8, 8, "#1761d5");
      else if (this.sonic)
        sprite(
          g,
          SONIC,
          p.x - cam,
          p.y,
          { B: "#1756ca", W: "#fff", S: "#e9b68b", R: "#e44238" },
          1,
          p.facing < 0,
        );
      else {
        g.save();
        g.translate(p.x - cam, p.y);
        g.scale(1, p.h / 15);
        sprite(g, MARIO, 0, 0, MARIO_COLORS, 1, p.facing < 0);
        g.restore();
      }
    }
    for (const lift of this.lifts) {
      rect(g, lift.x - cam, lift.y, lift.w, lift.h, "#d99a59");
      rect(g, lift.x - cam, lift.y, lift.w, 2, "#ffe2a7");
    }
    const flag = this.flag - cam;
    if (flag < 330) {
      rect(g, flag, 47, 2, 161, "#eee");
      rect(g, flag - 23, 51, 23, 16, this.sonic ? "#4dceeb" : "#e54335");
      ball(g, flag + 1, 44, 4, "#ffe381");
    }
    this.hud(
      g,
      `${this.sonic ? "ANNEAUX" : "PIÈCES"} ${this.sonic ? this.rings : this.coins}   ${this.level}-1   ${Math.ceil(this.timeLeft)}`,
    );
    if (this.transition > 0) text(g, "NIVEAU TERMINÉ !", 160, 90, 17, "#fff", "center");
  }
}

export class DonkeyKong extends RetroGame {
  initialiser() {
    super.initialiser();
    this.barrels = [];
    this.timer = 1;
    this.hammer = 0;
    this.usedHammer = false;
    this.invulnerable = 0;
    this.p = { x: 40, y: 0, floor: 0, vy: 0, jump: 0, climb: null };
    this.p.y = this.ground(0, 40) - 15;
    this.jumpQueued = false;
  }
  ground(f, x) {
    return 211 - f * 37 + (f % 2 ? 1 : -1) * (x - 160) * 0.035;
  }
  appuyer(c) {
    const used = super.appuyer(c);
    if (!used && c === "Space") this.jumpQueued = true;
    return used;
  }
  toucher() {
    this.jumpQueued = true;
  }
  resetPlayer() {
    this.p = {
      x: 40,
      y: this.ground(0, 40) - 15,
      floor: 0,
      vy: 0,
      jump: 0,
      climb: null,
    };
    this.invulnerable = 2;
  }
  avancer(dt) {
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.hammer = Math.max(0, this.hammer - dt);
    const p = this.p;
    if (p.climb !== null) {
      const target = this.ground(p.climb, p.x) - 15;
      p.y += Math.sign(target - p.y) * 43 * dt;
      if (Math.abs(target - p.y) < 2) {
        p.floor = p.climb;
        p.climb = null;
        p.y = target;
      }
    } else {
      p.x = clamp(
        p.x + (+this.toucheActive("ArrowRight") - this.toucheActive("ArrowLeft")) * 68 * dt,
        24,
        296,
      );
      const ladder = p.floor % 2 === 0 ? 260 : 60;
      if (
        p.jump === 0 &&
        this.toucheActive("ArrowUp") &&
        Math.abs(p.x - ladder) < 11 &&
        p.floor < 4
      )
        p.climb = p.floor + 1;
      const down = p.floor % 2 === 0 ? 60 : 260;
      if (
        p.jump === 0 &&
        this.toucheActive("ArrowDown") &&
        Math.abs(p.x - down) < 11 &&
        p.floor > 0
      )
        p.climb = p.floor - 1;
      if (this.jumpQueued && p.jump === 0) {
        p.vy = -160;
        p.jump = -0.01;
        this.son(500, 0.035);
      }
      this.jumpQueued = false;
      if (p.jump !== 0) {
        p.vy += 520 * dt;
        p.jump += p.vy * dt;
        if (p.jump >= 0) {
          p.jump = 0;
          p.vy = 0;
        }
      }
      p.y = this.ground(p.floor, p.x) - 15 + p.jump;
    }
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = Math.max(0.6, 2 - this.level * 0.25);
      this.barrels.push({
        x: 55,
        floor: 4,
        y: this.ground(4, 55) - 5,
        dir: 1,
        fall: false,
        scored: false,
        lastLadder: null,
      });
    }
    for (const b of this.barrels) {
      if (b.fall) {
        b.y += 90 * dt;
        if (b.y >= this.ground(b.floor, b.x) - 5) {
          b.fall = false;
          b.dir *= -1;
        }
      } else {
        b.x += b.dir * (47 + this.level * 8) * dt;
        b.y = this.ground(b.floor, b.x) - 5;
        const ladder = b.floor % 2 === 0 ? 60 : 260;
        if (b.floor > 0 && Math.abs(b.x - ladder) < 2 && b.lastLadder !== b.floor) {
          b.lastLadder = b.floor;
          if (Math.random() < 0.18) {
            b.floor--;
            b.fall = true;
          }
        }
        if (b.x < 25 || b.x > 295) {
          if (b.floor > 0) {
            b.floor--;
            b.fall = true;
            b.x = clamp(b.x, 25, 295);
          } else b.dead = true;
        }
      }
      if (Math.hypot(b.x - p.x, b.y - p.y - 8) < 12) {
        if (this.hammer > 0) {
          b.dead = true;
          this.score += 300;
          this.eclater(b.x, b.y, "#e8aa55", 6);
        } else if (this.invulnerable <= 0) {
          this.lives--;
          if (!this.lives) this.terminer();
          else this.resetPlayer();
        }
      }
      if (!b.scored && b.floor === p.floor && Math.abs(b.x - p.x) < 9 && p.jump < -13) {
        b.scored = true;
        this.score += 100;
      }
    }
    this.barrels = this.barrels.filter((b) => !b.dead);
    if (p.floor === 1 && Math.abs(p.x - 165) < 9 && this.hammer === 0 && !this.usedHammer) {
      this.usedHammer = true;
      this.hammer = 8;
    }
    if (p.floor === 4 && p.x > 270) {
      this.score += 1000;
      this.level++;
      if (this.level > 3) this.win();
      else {
        const level = this.level,
          lives = this.lives,
          score = this.score;
        this.initialiser();
        this.level = level;
        this.lives = lives;
        this.score = score;
        this.usedHammer = false;
      }
    }
  }
  dessinerJeu(g) {
    for (let f = 0; f < 5; f++) {
      g.strokeStyle = "#df426f";
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(22, this.ground(f, 22));
      g.lineTo(298, this.ground(f, 298));
      g.stroke();
      for (let x = 24; x < 296; x += 13) {
        g.strokeStyle = "#802949";
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(x, this.ground(f, x) - 2);
        g.lineTo(x + 7, this.ground(f, x) + 2);
        g.stroke();
      }
      if (f < 4) {
        const x = f % 2 === 0 ? 260 : 60,
          y1 = this.ground(f + 1, x),
          y2 = this.ground(f, x);
        rect(g, x - 5, y1, 1, y2 - y1, "#61d8eb");
        rect(g, x + 5, y1, 1, y2 - y1, "#61d8eb");
        for (let y = y1 + 4; y < y2; y += 5) rect(g, x - 5, y, 10, 1, "#61d8eb");
      }
    }
    for (const b of this.barrels) {
      ball(g, b.x, b.y, 5, "#b9762b");
      g.strokeStyle = "#f7ca62";
      g.strokeRect(b.x - 4, b.y - 4, 8, 8);
    }
    rect(g, 29, 30, 28, 22, "#a55a30");
    rect(g, 32, 27, 10, 8, "#a55a30");
    rect(g, 47, 27, 10, 8, "#a55a30");
    rect(g, 36, 36, 15, 6, "#f0c085");
    ball(g, 275, 28, 4, "#f3b6a5");
    rect(g, 270, 32, 10, 12, "#ec8ad3");
    const p = this.p;
    if (this.invulnerable <= 0 || Math.floor(this.temps * 12) % 2)
      sprite(g, MARIO, p.x - 6, p.y, MARIO_COLORS);
    if (this.hammer > 0) {
      const sign = Math.sin(this.temps * 13) > 0 ? 1 : -1;
      rect(g, p.x + sign * 10, p.y - 6, 3, 15, "#b98f56");
      rect(g, p.x + sign * 10 - 4, p.y - 8, 11, 7, "#ddd");
    } else if (!this.usedHammer) {
      rect(g, 161, this.ground(1, 165) - 12, 3, 10, "#ac754b");
      rect(g, 157, this.ground(1, 165) - 15, 11, 5, "#ddd");
    }
    this.hud(g, `ÉTAGE ${p.floor + 1}   NIVEAU ${this.level}`);
  }
}

export class DragonsLair extends RetroGame {
  initialiser() {
    super.initialiser();
    this.room = 0;
    this.checkpoint = 0;
    this.step = 0;
    this.sceneTime = 0;
    this.failed = 0;
    this.success = 0;
    this.beatFlash = 0;
    this.cueAt = 1.05;
    this.visited = new Set([0]);
    this.lastAction = null;
  }
  appuyer(code) {
    const used = super.appuyer(code);
    if (!used && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(code))
      this.choose(code);
    return used;
  }
  choose(code) {
    if (this.failed > 0 || this.success > 0 || this.sceneTime < this.cueAt || this.beatFlash > 0)
      return;
    const room = DRAGON_ROOMS[this.room],
      expected = room.sequence[this.step];
    if ((Array.isArray(expected) ? expected : [expected]).includes(code)) {
      this.lastAction = code;
      this.score += 250;
      this.step++;
      this.son(650 + this.step * 60, 0.06);
      if (this.step >= room.sequence.length) this.success = 0.65;
      else {
        this.beatFlash = 0.18;
        this.sceneTime = 0;
        this.cueAt = Math.max(0.45, room.delay - this.step * 0.12);
      }
    } else this.fail();
  }
  fail() {
    if (this.failed > 0) return;
    this.lives--;
    this.failed = 1.1;
    this.son(100, 0.25);
    if (!this.lives) this.terminer();
  }
  toucher(x, y) {
    this.choose(
      x < 100
        ? "ArrowLeft"
        : x > 220
          ? "ArrowRight"
          : y < 90
            ? "ArrowUp"
            : y > 178
              ? "ArrowDown"
              : "Space",
    );
  }
  direction(dx, dy) {
    this.choose(
      Math.abs(dx) > Math.abs(dy)
        ? dx < 0
          ? "ArrowLeft"
          : "ArrowRight"
        : dy < 0
          ? "ArrowUp"
          : "ArrowDown",
    );
  }
  avancer(dt) {
    this.beatFlash = Math.max(0, this.beatFlash - dt);
    if (this.failed > 0) {
      this.failed -= dt;
      if (this.failed <= 0) {
        this.room = this.checkpoint;
        this.step = 0;
        this.sceneTime = 0;
        this.cueAt = DRAGON_ROOMS[this.room].delay;
      }
      return;
    }
    if (this.success > 0) {
      this.success -= dt;
      if (this.success <= 0) {
        const room = DRAGON_ROOMS[this.room];
        if (room.next === null) {
          this.win();
          return;
        }
        this.room = room.nextByKey?.[this.lastAction] ?? room.next ?? this.room + 1;
        this.visited.add(this.room);
        if (DRAGON_ROOMS[this.room].checkpoint) this.checkpoint = this.room;
        this.step = 0;
        this.sceneTime = 0;
        this.cueAt = DRAGON_ROOMS[this.room].delay;
        this.score += 500;
      }
      return;
    }
    this.sceneTime += dt;
    if (this.sceneTime > this.cueAt + DRAGON_ROOMS[this.room].window) this.fail();
  }
  dessinerJeu(g) {
    rect(g, 0, 26, 320, 214, "#151526");
    for (let i = 0; i < 5; i++) {
      rect(g, i * 64, 28, 62, 145, i % 2 ? "#313949" : "#282e3d");
      for (let j = 0; j < 5; j++) rect(g, i * 64 + 2, 35 + j * 28, 58, 1, "#566072");
    }
    rect(g, 0, 176, 320, 48, "#4b3d31");
    const room = DRAGON_ROOMS[this.room];
    const r = room.theme;
    if (r === 0 || r === 3) {
      rect(g, 40, 178, 240, 47, "#052c37");
      rect(g, 40, 177, 240, 5, "#835a34");
      for (let x = 45; x < 280; x += 20) rect(g, x, 175, 17, 9, "#b38a51");
    }
    if (r === 1 || r === 4)
      for (let x = 12; x < 310; x += 28) {
        g.fillStyle = r === 1 ? "#c4d6d9" : "#f16528";
        g.beginPath();
        g.moveTo(x, 204);
        g.lineTo(x + 10, 154 + Math.sin(this.temps * 6 + x) * 8);
        g.lineTo(x + 20, 204);
        g.fill();
      }
    if (r === 2 || r === 5) {
      rect(g, 226, 100, 29, 70, "#899ba5");
      ball(g, 240, 92, 15, "#a5b8bd");
      rect(g, 212, 115, 60, 5, "#c4d0d4");
    }
    if (r === 6) {
      rect(g, 180, 68, 9, 120, "#9b7c4b");
      for (let y = 70; y < 185; y += 12) rect(g, 176, y, 18, 3, "#c3a35c");
    }
    if (r === 7) {
      ball(g, 238, 127, 43, "#589851");
      ball(g, 221, 94, 24, "#6ca75e");
      rect(g, 189, 104, 40, 15, "#6ca75e");
      ball(g, 211, 88, 4, "#fcdf5d");
      rect(g, 166, 114, 42 + Math.sin(this.temps * 9) * 15, 10, "#f29a2c");
    }
    const dead = this.failed > 0;
    g.save();
    g.translate(
      128 + Math.sin(this.sceneTime * 2) * 8 + this.step * 7,
      159 + (r === 0 ? Math.sin(this.sceneTime * 5) * 3 : 0),
    );
    if (dead) g.rotate(-Math.PI / 2);
    ball(g, 0, -30, 9, "#edd0a4");
    ball(g, -1, -35, 9, "#cfba6d");
    rect(g, -10, -23, 20, 23, "#a4503a");
    rect(g, -8, 0, 5, 19, "#eed9ae");
    rect(g, 4, 0, 5, 19, "#eed9ae");
    rect(g, 12, -24, 3, 27, "#d9e3e8");
    g.restore();
    text(g, room.name, 160, 39, 15, "#ffda8c", "center");
    if (this.sceneTime >= this.cueAt && this.failed <= 0 && this.success <= 0) {
      rect(g, 90, 61, 140, 27, "#10101c");
      const action = room.sequence[this.step];
      text(
        g,
        (Array.isArray(action) ? action : [action]).map((c) => ACTION_NAMES[c]).join(" / "),
        160,
        67,
        15,
        "#ffeb6a",
        "center",
      );
      rect(
        g,
        95,
        91,
        130 * Math.max(0, 1 - (this.sceneTime - this.cueAt) / room.window),
        3,
        "#ffdb76",
      );
    }
    if (this.failed > 0) text(g, "UNE VIE PERDUE", 160, 201, 12, "#ff716d", "center");
    if (this.success > 0) text(g, "PASSAGE RÉUSSI", 160, 201, 12, "#9afa9b", "center");
    this.hud(
      g,
      `SALLE ${this.room + 1}/24 · ACTION ${Math.min(room.sequence.length, this.step + 1)}/${room.sequence.length}`,
    );
  }
}

export class Racing extends RetroGame {
  initialiser() {
    super.initialiser();
    this.position = 0;
    this.speed = 0;
    this.x = 0;
    this.timeLeft = 65;
    this.checkpoint = 1500;
    this.carTimer = 0;
    this.cars = Array.from({ length: 12 }, (_, i) => ({
      z: 350 + i * 480,
      x: ((i % 3) - 1) * 0.65,
      speed: 80 + (i % 4) * 16,
      color: ["#e44b45", "#e9c848", "#51b5db"][i % 3],
    }));
    this.hit = 0;
  }
  curve(z) {
    return Math.sin(z / 900) * 0.5 + Math.sin(z / 380) * 0.16;
  }
  avancer(dt) {
    this.timeLeft -= dt;
    this.hit = Math.max(0, this.hit - dt);
    const gas = this.toucheActive("ArrowUp", "KeyW"),
      brake = this.toucheActive("ArrowDown", "KeyS");
    this.speed = clamp(this.speed + (gas ? 75 : brake ? -150 : -35) * dt, 0, 240);
    const dir = +this.toucheActive("ArrowRight", "KeyD") - this.toucheActive("ArrowLeft", "KeyA");
    this.x +=
      dir * dt * (0.5 + this.speed / 160) - ((this.curve(this.position) * this.speed) / 220) * dt;
    if (Math.abs(this.x) > 1) this.speed = Math.max(60, this.speed - 180 * dt);
    this.x = clamp(this.x, -1.5, 1.5);
    this.position += this.speed * dt;
    this.score = Math.floor(this.position / 5);
    if (this.position >= this.checkpoint) {
      this.checkpoint += 1500;
      this.timeLeft += 18;
      this.son(750, 0.1);
    }
    for (const c of this.cars) {
      c.z += c.speed * dt;
      if (c.z < this.position - 200) c.z = this.position + 3500;
      if (Math.abs(c.z - this.position) < 35 && Math.abs(c.x - this.x) < 0.22 && this.hit <= 0) {
        this.speed *= 0.45;
        this.hit = 1;
        this.son(110, 0.1);
      }
    }
    if (this.timeLeft <= 0) this.terminer();
    if (this.position >= 9000) this.win();
  }
  dessinerJeu(g) {
    rect(g, 0, 26, 320, 210, "#70b6e6");
    g.fillStyle = "#637fa4";
    g.beginPath();
    g.moveTo(0, 110);
    for (let i = 0; i < 9; i++) g.lineTo(i * 45, 70 + (i % 2) * 25);
    g.lineTo(320, 110);
    g.fill();
    for (let y = 90; y < 226; y += 2) {
      const t = (y - 88) / 138,
        half = 12 + t * 150,
        z = this.position + (1 - t) * 1800,
        center = 160 + (this.curve(z) - this.curve(this.position)) * 70 * (1 - t) - this.x * t * 80;
      rect(g, 0, y, 320, 2, Math.floor(z / 80) % 2 ? "#489b46" : "#418e3c");
      rect(g, center - half - 5, y, half * 2 + 10, 2, Math.floor(z / 60) % 2 ? "#fff" : "#dc4545");
      rect(g, center - half, y, half * 2, 2, "#64666b");
      if (Math.floor(z / 80) % 2 === 0)
        for (const side of [-1, 1])
          rect(g, center + side * half * 0.33 - 1, y, 2 + t * 2, 2, "#ddd");
    }
    for (const c of [...this.cars].sort((a, b) => b.z - a.z)) {
      const dz = c.z - this.position;
      if (dz < 20 || dz > 1800) continue;
      const t = 1 - dz / 1800,
        s = 0.15 + t * 0.8,
        x =
          160 +
          (this.curve(c.z) - this.curve(this.position)) * 70 * (1 - t) +
          (c.x - this.x) * t * 90,
        y = 90 + t * 132;
      rect(g, x - 13 * s, y - 18 * s, 26 * s, 18 * s, c.color);
      rect(g, x - 9 * s, y - 14 * s, 18 * s, 7 * s, "#1c334e");
      rect(g, x - 15 * s, y - 5 * s, 5 * s, 8 * s, "#202027");
      rect(g, x + 10 * s, y - 5 * s, 5 * s, 8 * s, "#202027");
    }
    if (this.hit <= 0 || Math.floor(this.temps * 12) % 2) {
      rect(g, 138, 193, 44, 26, "#df3e45");
      rect(g, 146, 185, 28, 18, "#ec5858");
      rect(g, 149, 188, 22, 10, "#72c8e7");
      rect(g, 135, 207, 6, 14, "#222");
      rect(g, 179, 207, 6, 14, "#222");
    }
    text(g, `${Math.round(this.speed)} KM/H`, 8, 31, 12);
    text(g, `TEMPS ${Math.ceil(this.timeLeft)}`, 312, 31, 12, "#ffe49b", "right");
    text(
      g,
      `TOUR ${Math.min(3, 1 + Math.floor(this.position / 3000))}/3`,
      160,
      227,
      10,
      "#fff",
      "center",
    );
    if (this.speed < 1) text(g, "↑ POUR ACCÉLÉRER", 160, 122, 14, "#fff", "center");
  }
}
