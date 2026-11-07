import { RetroGame, clamp, rect, text, ball, TAU } from "./common.js";

const SHAPES = [
  [[1, 1, 1, 1]],
  [
    [1, 1],
    [1, 1],
  ],
  [
    [0, 1, 0],
    [1, 1, 1],
  ],
  [
    [0, 1, 1],
    [1, 1, 0],
  ],
  [
    [1, 1, 0],
    [0, 1, 1],
  ],
  [
    [1, 0, 0],
    [1, 1, 1],
  ],
  [
    [0, 0, 1],
    [1, 1, 1],
  ],
];
const COLORS = ["#43d4e4", "#ffdc45", "#b978e3", "#63cf6c", "#ed5961", "#5788ef", "#e99b41"];
export class Tetris extends RetroGame {
  initialiser() {
    super.initialiser();
    this.grid = Array.from({ length: 20 }, () => Array(10).fill(0));
    this.lines = 0;
    this.drop = 0;
    this.repeat = 0;
    this.heldDirection = 0;
    this.gb = this.nom.includes("tetrisgb");
    this.next = Math.floor(Math.random() * 7);
    this.spawn();
  }
  spawn() {
    const type = this.next;
    this.next = Math.floor(Math.random() * 7);
    this.piece = { type, m: SHAPES[type].map((r) => [...r]), x: 3, y: 0 };
    if (this.collides(this.piece)) this.terminer();
  }
  collides(p) {
    return p.m.some((r, j) =>
      r.some(
        (v, i) =>
          v &&
          (p.x + i < 0 ||
            p.x + i >= 10 ||
            p.y + j >= 20 ||
            (p.y + j >= 0 && this.grid[p.y + j][p.x + i])),
      ),
    );
  }
  move(dx, dy) {
    const p = this.piece,
      test = { ...p, x: p.x + dx, y: p.y + dy };
    if (this.collides(test)) return false;
    p.x += dx;
    p.y += dy;
    return true;
  }
  rotate() {
    const p = this.piece,
      m = p.m[0].map((_, i) => p.m.map((r) => r[i]).reverse());
    for (const kick of [0, -1, 1, -2, 2])
      if (!this.collides({ ...p, m, x: p.x + kick })) {
        p.m = m;
        p.x += kick;
        this.son(500, 0.025);
        return;
      }
  }
  lock() {
    const p = this.piece;
    for (let y = 0; y < p.m.length; y++)
      for (let x = 0; x < p.m[y].length; x++)
        if (p.m[y][x]) {
          if (p.y + y < 0) {
            this.terminer();
            return;
          }
          this.grid[p.y + y][p.x + x] = p.type + 1;
        }
    const kept = this.grid.filter((r) => r.some((v) => v === 0)),
      count = 20 - kept.length;
    this.grid = [...Array.from({ length: count }, () => Array(10).fill(0)), ...kept];
    if (count) {
      this.lines += count;
      this.score += [0, 40, 100, 300, 1200][count] * this.level;
      this.level = 1 + Math.floor(this.lines / 10);
      this.son(620, 0.12);
      if (this.lines >= 40) {
        this.win();
        return;
      }
    }
    this.spawn();
    this.drop = 0;
  }
  appuyer(code) {
    const used = super.appuyer(code);
    if (used) return used;
    if (code === "ArrowUp" || code === "KeyX") this.rotate();
    if (code === "ArrowLeft" || code === "ArrowRight") {
      this.move(code === "ArrowLeft" ? -1 : 1, 0);
      this.repeat = 0.18;
    }
    if (code === "Space") {
      while (this.move(0, 1)) this.score += 2;
      this.lock();
    }
    return false;
  }
  direction(dx, dy) {
    if (dx) this.move(Math.sign(dx), 0);
    else if (dy < 0) this.rotate();
    else if (dy > 0) {
      while (this.move(0, 1)) {}
      this.lock();
    }
  }
  toucher() {
    this.rotate();
  }
  avancer(dt) {
    const dir = +this.toucheActive("ArrowRight") - this.toucheActive("ArrowLeft");
    this.repeat -= dt;
    if (dir && this.repeat <= 0) {
      this.move(dir, 0);
      this.repeat = 0.09;
    }
    this.drop += dt;
    const interval = this.toucheActive("ArrowDown")
      ? 0.04
      : Math.max(0.07, 0.8 - (this.level - 1) * 0.08);
    if (this.drop >= interval) {
      this.drop = 0;
      if (!this.move(0, 1)) this.lock();
    }
  }
  drawCell(g, x, y, value) {
    const color = this.gb ? "#365738" : COLORS[value - 1];
    rect(g, 71 + x * 9, 29 + y * 9, 8, 8, color);
    rect(g, 72 + x * 9, 30 + y * 9, 6, 1, this.gb ? "#8fa85a" : "#ffffff66");
  }
  dessinerJeu(g) {
    if (this.gb) rect(g, 0, 26, 320, 214, "#a1b85d");
    rect(g, 69, 27, 93, 184, this.gb ? "#78934e" : "#1b1e31");
    for (let y = 0; y < 20; y++)
      for (let x = 0; x < 10; x++) if (this.grid[y][x]) this.drawCell(g, x, y, this.grid[y][x]);
    const p = this.piece;
    if (p)
      for (let y = 0; y < p.m.length; y++)
        for (let x = 0; x < p.m[y].length; x++)
          if (p.m[y][x] && p.y + y >= 0) this.drawCell(g, p.x + x, p.y + y, p.type + 1);
    const ink = this.gb ? "#243d2a" : "#e9eaff";
    text(g, "SUIVANTE", 185, 45, 10, ink);
    SHAPES[this.next].forEach((r, y) =>
      r.forEach((v, x) => {
        if (v) rect(g, 185 + x * 10, 65 + y * 10, 9, 9, this.gb ? "#365738" : COLORS[this.next]);
      }),
    );
    text(g, `LIGNES ${this.lines}`, 185, 110, 11, ink);
    text(g, `NIVEAU ${this.level}`, 185, 130, 11, ink);
    text(g, "OBJECTIF 40", 185, 170, 10, ink);
  }
}
export class TetrisGB extends Tetris {}

const GEMS = ["#fa4d60", "#47c779", "#5598ff", "#ffce45", "#b475ed", "#ff9145", "#ddeeff"];
export class Bejeweled extends RetroGame {
  initialiser() {
    super.initialiser();
    this.selection = null;
    this.cursor = { x: 0, y: 0 };
    this.timer = 0;
    this.chain = 1;
    this.message = "ALIGNEZ 3 GEMMES";
    this.board();
  }
  gem() {
    return { color: Math.floor(Math.random() * 7), special: 0 };
  }
  board() {
    this.grid = Array.from({ length: 8 }, () => Array(8));
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++) {
        let p;
        do {
          p = this.gem();
        } while (
          (x > 1 &&
            this.grid[y][x - 1].color === p.color &&
            this.grid[y][x - 2].color === p.color) ||
          (y > 1 && this.grid[y - 1][x].color === p.color && this.grid[y - 2][x].color === p.color)
        );
        this.grid[y][x] = p;
      }
    if (!this.hasMove()) this.board();
  }
  matches() {
    const cells = new Set();
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++) {
        const p = this.grid[y][x];
        if (!p || p.special === 2) continue;
        for (const [dx, dy] of [
          [1, 0],
          [0, 1],
        ]) {
          let n = 1;
          while (
            x + dx * n < 8 &&
            y + dy * n < 8 &&
            this.grid[y + dy * n][x + dx * n]?.color === p.color &&
            this.grid[y + dy * n][x + dx * n]?.special !== 2
          )
            n++;
          if (n >= 3) for (let i = 0; i < n; i++) cells.add(`${x + dx * i},${y + dy * i}`);
        }
      }
    return cells;
  }
  exchange(a, b) {
    [this.grid[a.y][a.x], this.grid[b.y][b.x]] = [this.grid[b.y][b.x], this.grid[a.y][a.x]];
  }
  hasMove() {
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++)
        for (const [dx, dy] of [
          [1, 0],
          [0, 1],
        ])
          if (x + dx < 8 && y + dy < 8) {
            const a = { x, y },
              b = { x: x + dx, y: y + dy };
            if (this.grid[y][x].special === 2 || this.grid[b.y][b.x].special === 2) return true;
            this.exchange(a, b);
            const good = this.matches().size > 0;
            this.exchange(a, b);
            if (good) return true;
          }
    return false;
  }
  select(x, y) {
    if (this.timer > 0 || x < 0 || x > 7 || y < 0 || y > 7) return;
    const a = this.selection,
      b = { x, y };
    if (!a) {
      this.selection = b;
      return;
    }
    if (a.x === x && a.y === y) {
      this.selection = null;
      return;
    }
    if (Math.abs(a.x - x) + Math.abs(a.y - y) !== 1) {
      this.selection = b;
      return;
    }
    this.selection = null;
    this.chain = 1;
    let cells;
    if (this.grid[a.y][a.x].special === 2 || this.grid[y][x].special === 2) {
      const color =
        this.grid[a.y][a.x].special === 2 ? this.grid[y][x].color : this.grid[a.y][a.x].color;
      cells = new Set([`${a.x},${a.y}`, `${x},${y}`]);
      for (let j = 0; j < 8; j++)
        for (let i = 0; i < 8; i++) if (this.grid[j][i].color === color) cells.add(`${i},${j}`);
      this.clear(cells);
      return;
    }
    this.exchange(a, b);
    cells = this.matches();
    if (!cells.size) {
      this.exchange(a, b);
      this.message = "ÉCHANGE SANS ALIGNEMENT";
      this.son(150, 0.06);
      return;
    }
    let special = null;
    for (const [dx, dy] of [
      [1, 0],
      [0, 1],
    ]) {
      let n = 1;
      for (const sign of [-1, 1]) {
        let i = 1;
        while (
          x + dx * i * sign >= 0 &&
          x + dx * i * sign < 8 &&
          y + dy * i * sign >= 0 &&
          y + dy * i * sign < 8 &&
          this.grid[y + dy * i * sign][x + dx * i * sign].color === this.grid[y][x].color
        ) {
          n++;
          i++;
        }
      }
      if (n >= 4)
        special = {
          x,
          y,
          color: this.grid[y][x].color,
          special: n >= 5 ? 2 : 1,
        };
    }
    this.clear(cells, special);
  }
  clear(cells, special = null) {
    const pending = [...cells];
    for (let k = 0; k < pending.length; k++) {
      const [x, y] = pending[k].split(",").map(Number);
      if (this.grid[y][x]?.special === 1)
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const i = x + dx,
              j = y + dy,
              key = `${i},${j}`;
            if (i >= 0 && i < 8 && j >= 0 && j < 8 && !cells.has(key)) {
              cells.add(key);
              pending.push(key);
            }
          }
    }
    this.score += cells.size * 10 * this.chain;
    for (const key of cells) {
      const [x, y] = key.split(",").map(Number);
      this.grid[y][x] = null;
    }
    if (special) this.grid[special.y][special.x] = special;
    this.timer = 0.2;
    this.message = `${cells.size} GEMMES · CASCADE ×${this.chain}`;
    this.son(450 + this.chain * 80, 0.09);
  }
  collapse() {
    for (let x = 0; x < 8; x++) {
      const column = [];
      for (let y = 7; y >= 0; y--) if (this.grid[y][x]) column.push(this.grid[y][x]);
      for (let y = 7; y >= 0; y--) this.grid[y][x] = column[7 - y] ?? this.gem();
    }
    const cells = this.matches();
    if (cells.size) {
      this.chain++;
      this.clear(cells);
    } else {
      this.level = 1 + Math.floor(this.score / 1000);
      if (this.score >= 5000) this.win();
      else if (!this.hasMove()) {
        this.message = "NOUVELLE GRILLE";
        this.board();
      }
    }
  }
  appuyer(c) {
    const used = super.appuyer(c);
    if (used) return used;
    if (c === "ArrowLeft") this.cursor.x = clamp(this.cursor.x - 1, 0, 7);
    if (c === "ArrowRight") this.cursor.x = clamp(this.cursor.x + 1, 0, 7);
    if (c === "ArrowUp") this.cursor.y = clamp(this.cursor.y - 1, 0, 7);
    if (c === "ArrowDown") this.cursor.y = clamp(this.cursor.y + 1, 0, 7);
    if (c === "Space") this.select(this.cursor.x, this.cursor.y);
    return false;
  }
  toucher(x, y) {
    this.cursor = {
      x: Math.floor((x - 64) / 24),
      y: Math.floor((y - 29) / 24),
    };
    this.select(this.cursor.x, this.cursor.y);
  }
  avancer(dt) {
    if (this.timer > 0) {
      this.timer -= dt;
      if (this.timer <= 0) this.collapse();
    }
  }
  dessinerJeu(g) {
    rect(g, 60, 26, 200, 198, "#171b49");
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++) {
        rect(g, 65 + x * 24, 30 + y * 24, 22, 22, (x + y) % 2 ? "#2a3261" : "#232951");
        const p = this.grid[y][x];
        if (p) {
          const cx = 76 + x * 24,
            cy = 41 + y * 24;
          g.fillStyle = p.special === 2 ? "#fff" : GEMS[p.color];
          g.beginPath();
          g.moveTo(cx, cy - 9);
          g.lineTo(cx + 9, cy);
          g.lineTo(cx, cy + 9);
          g.lineTo(cx - 9, cy);
          g.closePath();
          g.fill();
          rect(g, cx - 3, cy - 4, 3, 3, "#ffffff99");
          if (p.special === 1) ball(g, cx, cy, 3, "#fff");
          if (p.special === 2) {
            g.strokeStyle = "#63f7f0";
            g.strokeRect(cx - 6, cy - 6, 12, 12);
          }
        }
      }
    const a = this.selection;
    if (a) {
      g.strokeStyle = "#fff";
      g.lineWidth = 2;
      g.strokeRect(65 + a.x * 24, 30 + a.y * 24, 22, 22);
    }
    g.strokeStyle = "#ffe88d";
    g.lineWidth = 1;
    g.strokeRect(67 + this.cursor.x * 24, 32 + this.cursor.y * 24, 18, 18);
    text(g, this.message, 160, 227, 9, "#ffe5a1", "center");
  }
}

export function bowlingTotal(rolls) {
  let total = 0,
    index = 0;
  for (let frame = 0; frame < 10; frame++) {
    if (rolls[index] === undefined) break;
    if (rolls[index] === 10) {
      if (rolls[index + 2] === undefined) break;
      total += 10 + rolls[index + 1] + rolls[index + 2];
      index++;
    } else {
      if (rolls[index + 1] === undefined) break;
      const sum = rolls[index] + rolls[index + 1];
      if (sum === 10) {
        if (rolls[index + 2] === undefined) break;
        total += 10 + rolls[index + 2];
      } else total += sum;
      index += 2;
    }
  }
  return total;
}
export class Bowling extends RetroGame {
  initialiser() {
    super.initialiser();
    this.aim = 0;
    this.spin = 0;
    this.power = 0;
    this.charge = false;
    this.rolling = false;
    this.rolls = [];
    this.frames = Array.from({ length: 10 }, () => []);
    this.frame = 0;
    this.message = "VISEZ PUIS MAINTENEZ ESPACE";
    this.rack();
  }
  rack() {
    this.pins = [];
    let n = 0;
    for (let row = 0; row < 4; row++)
      for (let i = 0; i <= row; i++)
        this.pins.push({
          x: (i - row / 2) * 0.2,
          z: 8.2 + row * 0.22,
          up: true,
          vx: 0,
          vz: 0,
          id: n++,
        });
  }
  appuyer(c) {
    const used = super.appuyer(c);
    if (!used && c === "Space" && !this.rolling) {
      this.charge = true;
      this.power = 0;
    }
    return used;
  }
  relacher(c) {
    super.relacher(c);
    if (c === "Space" && this.charge) this.launch();
  }
  toucher(x) {
    if (this.rolling) return;
    this.aim = clamp((x - 160) / 90, -0.85, 0.85);
    this.power = 0.7;
    this.launch();
  }
  launch() {
    if (this.rolling) return;
    this.charge = false;
    this.rolling = true;
    this.ball = { x: this.aim, z: 0, vx: 0, vz: 4 + this.power * 4 };
    this.timer = 0;
    this.before = this.pins.filter((p) => p.up).length;
    this.message = "";
  }
  finish() {
    this.rolling = false;
    const hit = this.before - this.pins.filter((p) => p.up).length,
      f = this.frames[this.frame];
    this.rolls.push(hit);
    f.push(hit);
    this.score = bowlingTotal(this.rolls);
    this.message =
      hit === 10 ? "STRIKE !" : f.length > 1 && f[0] + f[1] === 10 ? "SPARE !" : `${hit} QUILLES`;
    this.son(hit ? 700 : 120, 0.13);
    if (this.frame < 9) {
      if (hit === 10 || f.length === 2) {
        this.frame++;
        this.rack();
      }
    } else {
      const bonus = f[0] === 10 || f[0] + (f[1] ?? 0) === 10;
      if (f.length >= (bonus ? 3 : 2)) {
        this.score = bowlingTotal(this.rolls);
        this.win();
        return;
      }
      if (hit === 10 || (f.length === 2 && f[0] !== 10)) this.rack();
    }
  }
  avancer(dt) {
    if (!this.rolling) {
      this.aim = clamp(
        this.aim + (+this.toucheActive("ArrowRight") - this.toucheActive("ArrowLeft")) * dt,
        -0.85,
        0.85,
      );
      this.spin = clamp(
        this.spin + (+this.toucheActive("ArrowUp") - this.toucheActive("ArrowDown")) * dt,
        -1,
        1,
      );
      if (this.charge) this.power = clamp(this.power + dt * 0.7, 0, 1);
      return;
    }
    this.timer += dt;
    const b = this.ball;
    b.vx += this.spin * 0.32 * dt;
    b.x += b.vx * dt;
    b.z += b.vz * dt;
    const gutter = Math.abs(b.x) > 1;
    if (gutter) {
      b.x = Math.sign(b.x) * 1.08;
      b.vx = 0;
    }
    for (const p of this.pins) {
      if (p.up && !gutter && Math.hypot(p.x - b.x, p.z - b.z) < 0.17) {
        p.up = false;
        p.vx = (p.x - b.x) * 7 + b.vx * 0.5;
        p.vz = b.vz * 0.35;
        b.vz *= 0.88;
      }
      if (!p.up) {
        p.x += p.vx * dt;
        p.z += p.vz * dt;
        p.vx *= Math.exp(-dt * 2);
        p.vz *= Math.exp(-dt * 2);
        for (const q of this.pins)
          if (q.up && Math.hypot(q.x - p.x, q.z - p.z) < 0.16) {
            q.up = false;
            q.vx = p.vx + (q.x - p.x) * 5;
            q.vz = p.vz + 0.3;
          }
      }
    }
    if (this.timer > 3.2 || b.z > 10) this.finish();
  }
  project(x, z) {
    const t = 1 / (1 + z * 0.32);
    return { x: 160 + x * 100 * t, y: 211 - z * 36 * t, scale: t };
  }
  dessinerJeu(g) {
    rect(g, 0, 26, 320, 198, "#294d6a");
    g.fillStyle = "#d9bb77";
    g.beginPath();
    g.moveTo(53, 216);
    g.lineTo(130, 124);
    g.lineTo(190, 124);
    g.lineTo(267, 216);
    g.closePath();
    g.fill();
    g.strokeStyle = "#9a733e";
    for (let i = 0; i < 8; i++) {
      g.beginPath();
      g.moveTo(60 + i * 28, 214);
      g.lineTo(132 + i * 8, 125);
      g.stroke();
    }
    for (const p of [...this.pins].sort((a, b) => b.z - a.z)) {
      if (!p.up && Math.abs(p.vx) + Math.abs(p.vz) < 0.1) continue;
      const v = this.project(p.x, p.z);
      g.save();
      g.translate(v.x, v.y);
      if (!p.up) g.rotate(1.2);
      ball(g, 0, -9 * v.scale, 4 * v.scale, "#fff");
      rect(g, -4 * v.scale, -8 * v.scale, 8 * v.scale, 13 * v.scale, "#fff");
      rect(g, -3 * v.scale, -6 * v.scale, 6 * v.scale, 2 * v.scale, "#d82d3b");
      g.restore();
    }
    const p = this.project(this.rolling ? this.ball.x : this.aim, this.rolling ? this.ball.z : 0);
    ball(g, p.x, p.y - 5 * p.scale, 7 * p.scale, "#5836a5");
    text(
      g,
      `FRAME ${this.frame + 1}/10   EFFET ${this.spin.toFixed(1)}`,
      160,
      32,
      10,
      "#fff",
      "center",
    );
    text(g, this.message, 160, 53, 9, "#ffe3a8", "center");
    if (this.charge) {
      rect(g, 80, 221, 160, 7, "#222");
      rect(g, 80, 221, 160 * this.power, 7, "#58db7b");
    } else text(g, `SCORE ${this.score}`, 160, 225, 11, "#fff", "center");
  }
}
