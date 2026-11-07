import { RetroGame, rect, text, ball, TAU } from "./common.js";
export const PAC_MAP = [
  "############################",
  "#............##............#",
  "#.####.#####.##.#####.####.#",
  "#o####.#####.##.#####.####o#",
  "#.####.#####.##.#####.####.#",
  "#..........................#",
  "#.####.##.########.##.####.#",
  "#.####.##.########.##.####.#",
  "#......##....##....##......#",
  "######.##### ## #####.######",
  "     #.##### ## #####.#     ",
  "     #.##          ##.#     ",
  "     #.## ###--### ##.#     ",
  "######.## #      # ##.######",
  "      .   #      #   .      ",
  "######.## #      # ##.######",
  "     #.## ######## ##.#     ",
  "     #.##          ##.#     ",
  "     #.## ######## ##.#     ",
  "######.## ######## ##.######",
  "#............##............#",
  "#.####.#####.##.#####.####.#",
  "#.####.#####.##.#####.####.#",
  "#o..##.......  .......##..o#",
  "###.##.##.########.##.##.###",
  "###.##.##.########.##.##.###",
  "#......##....##....##......#",
  "#.##########.##.##########.#",
  "#.##########.##.##########.#",
  "#..........................#",
  "############################",
];
const DIRS = [
    { x: 0, y: -1, a: -Math.PI / 2 },
    { x: -1, y: 0, a: Math.PI },
    { x: 0, y: 1, a: Math.PI / 2 },
    { x: 1, y: 0, a: 0 },
  ],
  COLORS = ["#f34b52", "#ffb5dc", "#62ddeb", "#ffb55b"];
export class Pacman extends RetroGame {
  initialiser() {
    super.initialiser();
    this.newLevel();
  }
  newLevel() {
    this.grid = PAC_MAP.map((r, y) =>
      [...r].map((c, x) => (y !== 14 && (x < 5 || x > 22) && c === " " ? "#" : c)),
    );
    this.remaining = this.grid.flat().filter((c) => c === "." || c === "o").length;
    this.power = 0;
    this.fruit = 0;
    this.fruitShown = false;
    this.life();
  }
  actor(x, y, dir) {
    return { x, y, cx: x, cy: y, dir, left: 0 };
  }
  life() {
    this.player = this.actor(14, 23, 1);
    this.want = 1;
    this.ghosts = [
      this.actor(13, 11, 1),
      this.actor(13, 14, 0),
      this.actor(14, 14, 0),
      this.actor(12, 14, 0),
    ].map((a, i) => ({
      ...a,
      index: i,
      release: i * 2,
      color: COLORS[i],
      eyes: false,
    }));
    this.ready = 1;
    this.phase = 0;
    this.power = 0;
    this.combo = 0;
  }
  tile(x, y, ghost = false) {
    if (y === 14) {
      x = (x + 28) % 28;
    }
    if (x < 0 || x >= 28 || y < 0 || y >= 31) return false;
    const c = this.grid[y][x];
    return c !== "#" && (ghost || c !== "-");
  }
  options(a, ghost) {
    return DIRS.map((d, i) => (this.tile(a.cx + d.x, a.cy + d.y, ghost) ? i : -1)).filter(
      (i) => i >= 0,
    );
  }
  appuyer(c) {
    const used = super.appuyer(c);
    if (!used) {
      const map = {
        ArrowUp: 0,
        KeyW: 0,
        ArrowLeft: 1,
        KeyA: 1,
        ArrowDown: 2,
        KeyS: 2,
        ArrowRight: 3,
        KeyD: 3,
      };
      if (map[c] !== undefined) this.want = map[c];
    }
    return used;
  }
  direction(dx, dy) {
    this.want = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 3) : dy < 0 ? 0 : 2;
  }
  eat() {
    const p = this.player,
      c = this.grid[p.cy][p.cx];
    if (c === "." || c === "o") {
      this.grid[p.cy][p.cx] = " ";
      this.remaining--;
      this.score += c === "o" ? 50 : 10;
      if (c === "o") {
        this.power = Math.max(2, 7 - this.level * 0.7);
        this.combo = 0;
        for (const g of this.ghosts) if (!g.eyes && g.left === 0) g.dir = (g.dir + 2) % 4;
      }
      if (!this.remaining) {
        this.level++;
        if (this.level > 3) this.win();
        else this.newLevel();
      }
      if (this.remaining < 170 && !this.fruitShown) {
        this.fruitShown = true;
        this.fruit = 12;
      }
    }
    if (this.fruit > 0 && p.cx === 13 && p.cy === 17) {
      this.score += 100 * this.level;
      this.fruit = 0;
    }
  }
  choose(g) {
    const choices = this.options(g, true),
      reverse = (g.dir + 2) % 4,
      dirs = choices.filter((d) => d !== reverse),
      options = dirs.length ? dirs : choices;
    if (!options.length) return reverse;
    if (this.power > 0 && !g.eyes) return options[Math.floor(Math.random() * options.length)];
    const p = this.player,
      pd = DIRS[p.dir],
      corners = [
        [26, 1],
        [1, 1],
        [26, 29],
        [1, 29],
      ];
    let target;
    if (g.eyes) target = [13, 14];
    else if (this.phase % 27 < 7) target = corners[g.index];
    else if (g.index === 0) target = [p.x, p.y];
    else if (g.index === 1) target = [p.x + pd.x * 4, p.y + pd.y * 4];
    else if (g.index === 2)
      target = [(p.x + pd.x * 2) * 2 - this.ghosts[0].x, (p.y + pd.y * 2) * 2 - this.ghosts[0].y];
    else target = Math.hypot(g.x - p.x, g.y - p.y) < 8 ? corners[3] : [p.x, p.y];
    return options.reduce((best, d) => {
      const a = DIRS[d],
        b = DIRS[best];
      return Math.hypot(g.cx + a.x - target[0], g.cy + a.y - target[1]) <
        Math.hypot(g.cx + b.x - target[0], g.cy + b.y - target[1])
        ? d
        : best;
    }, options[0]);
  }
  move(a, budget, ghost = false) {
    for (let iter = 0; budget > 0 && iter < 10; iter++) {
      if (a.left === 0) {
        const opts = this.options(a, ghost);
        if (ghost) a.dir = this.choose(a);
        else if (opts.includes(this.want)) a.dir = this.want;
        else if (!opts.includes(a.dir)) return;
        if (!opts.includes(a.dir)) return;
        a.startX = a.cx;
        a.startY = a.cy;
        a.left = 1;
      }
      const d = DIRS[a.dir],
        step = Math.min(budget, a.left);
      a.left = Math.max(0, a.left - step);
      budget -= step;
      const t = 1 - a.left;
      a.x = a.startX + d.x * t;
      a.y = a.startY + d.y * t;
      if (a.left < 1e-8) {
        a.left = 0;
        a.cx = (a.startX + d.x + 28) % 28;
        a.cy = a.startY + d.y;
        a.x = a.cx;
        a.y = a.cy;
        if (!ghost) this.eat();
        else if (a.eyes && a.cx === 13 && a.cy === 14) {
          a.eyes = false;
          a.release = 1;
        }
      }
    }
  }
  avancer(dt) {
    if (this.ready > 0) {
      this.ready -= dt;
      return;
    }
    this.power = Math.max(0, this.power - dt);
    this.fruit = Math.max(0, this.fruit - dt);
    this.phase += dt;
    this.move(this.player, dt * (7.3 + this.level * 0.25));
    for (const g of this.ghosts) {
      if (g.release > 0) {
        g.release -= dt;
        continue;
      }
      this.move(g, dt * (g.eyes ? 14 : this.power > 0 ? 4.2 : 6.5 + this.level * 0.25), true);
      if (Math.hypot(g.x - this.player.x, g.y - this.player.y) < 0.7 && !g.eyes) {
        if (this.power > 0) {
          g.eyes = true;
          this.score += 200 * 2 ** Math.min(3, this.combo++);
          this.son(900, 0.06);
        } else {
          this.lives--;
          this.son(120, 0.2);
          if (!this.lives) this.terminer();
          else this.life();
          return;
        }
      }
    }
  }
  dessinerJeu(g) {
    const s = 6,
      x0 = 76,
      y0 = 29;
    rect(g, x0 - 2, y0 - 2, 172, 190, "#000");
    for (let y = 0; y < 31; y++)
      for (let x = 0; x < 28; x++) {
        const c = this.grid[y][x],
          px = x0 + x * s,
          py = y0 + y * s;
        if (c === "#") {
          g.strokeStyle = "#3045ec";
          g.strokeRect(px + 1, py + 1, 4, 4);
        } else if (c === ".") rect(g, px + 2, py + 2, 2, 2, "#f2c5a1");
        else if (c === "o" && Math.floor(this.temps * 5) % 2 === 0)
          ball(g, px + 3, py + 3, 3, "#f2c5a1");
        else if (c === "-") rect(g, px, py + 2, 6, 1, "#eda7d1");
      }
    for (const a of this.ghosts) {
      const x = x0 + a.x * s + 3,
        y = y0 + a.y * s + 3;
      if (!a.eyes) {
        g.fillStyle =
          this.power > 0
            ? this.power < 2 && Math.floor(this.temps * 8) % 2
              ? "#eee"
              : "#2839dc"
            : a.color;
        g.beginPath();
        g.arc(x, y - 1, 5, Math.PI, 0);
        g.lineTo(x + 5, y + 5);
        g.lineTo(x + 2, y + 3);
        g.lineTo(x, y + 5);
        g.lineTo(x - 2, y + 3);
        g.lineTo(x - 5, y + 5);
        g.closePath();
        g.fill();
      }
      ball(g, x - 2, y - 1, 1.6, "#fff");
      ball(g, x + 2, y - 1, 1.6, "#fff");
      rect(g, x - 2 + DIRS[a.dir].x, y - 1 + DIRS[a.dir].y, 1, 1, "#263beb");
      rect(g, x + 2 + DIRS[a.dir].x, y - 1 + DIRS[a.dir].y, 1, 1, "#263beb");
    }
    const p = this.player,
      px = x0 + p.x * s + 3,
      py = y0 + p.y * s + 3,
      a = DIRS[p.dir].a,
      mouth = 0.12 + Math.abs(Math.sin(this.temps * 14)) * 0.6;
    g.fillStyle = "#ffe22e";
    g.beginPath();
    g.moveTo(px, py);
    g.arc(px, py, 5, a + mouth, a + TAU - mouth);
    g.closePath();
    g.fill();
    if (this.fruit > 0) {
      ball(g, x0 + 13 * s, y0 + 17 * s + 3, 2, "#ff334e");
      ball(g, x0 + 14 * s, y0 + 17 * s + 3, 2, "#ff334e");
    }
    if (this.ready > 0) text(g, "READY!", 160, 166, 10, "#ffe72b", "center");
    this.hud(g, `NIVEAU ${this.level}`);
  }
}
