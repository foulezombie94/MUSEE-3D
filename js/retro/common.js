import { JeuArcade } from "../jeux/base.js";
export const W = 320,
  H = 240,
  TAU = Math.PI * 2;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export function rect(g, x, y, w, h, c) {
  g.fillStyle = c;
  g.fillRect(Math.round(x), Math.round(y), w, h);
}
export function text(g, s, x, y, size = 10, c = "#fff", align = "left") {
  g.font = `${size}px monospace`;
  g.textAlign = align;
  g.textBaseline = "top";
  g.fillStyle = c;
  g.fillText(s, x, y);
}
export function ball(g, x, y, r, c) {
  g.fillStyle = c;
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fill();
}
export function sprite(g, rows, x, y, palette, scale = 1, flip = false) {
  g.save();
  g.translate(Math.round(x), Math.round(y));
  if (flip) {
    g.translate(rows[0].length * scale, 0);
    g.scale(-1, 1);
  }
  for (let j = 0; j < rows.length; j++)
    for (let i = 0; i < rows[j].length; i++) {
      const c = palette[rows[j][i]];
      if (c) rect(g, i * scale, j * scale, scale, scale, c);
    }
  g.restore();
}
export const MARIO = [
  "...RRRR.....",
  "..RRRRRRRR..",
  "..HHHSSS....",
  ".HSHSSSSSS..",
  ".HSHHSSSHSS.",
  ".HHSSSSHHHH.",
  "...SSSSSS...",
  "..RRBRR.....",
  ".RRRBRBRRR..",
  "RRRRBBBBRRRR",
  "SSRBYYBYYRSS",
  "SSSBBBBBBSSS",
  "..BBB..BBB..",
  ".HHH....HHH.",
  "HHHH....HHHH",
];
export const MARIO_COLORS = {
  R: "#d83018",
  H: "#763216",
  S: "#ffb886",
  B: "#235dcb",
  Y: "#ffe060",
};
export class RetroGame extends JeuArcade {
  constructor(canvas, options = {}) {
    super(canvas, {
      nom: options.id ?? "retro",
      titre: options.title ?? "Jeu",
      couleur: options.color ?? "#ffd858",
      aide: [],
      ...options,
    });
    this.gameId = options.id;
  }
  initialiser() {
    this.lives = 3;
    this.level = 1;
    this.won = false;
  }
  action(code) {
    if (this.etat === "jeu" && !this.touches.has(code)) return true;
    return false;
  }
  lose() {
    if (this.invulnerable > 0) return;
    this.lives--;
    this.invulnerable = 1.5;
    this.son(90, 0.15);
    if (this.lives <= 0) this.terminer();
  }
  win() {
    this.won = true;
    this.terminer();
  }
  dessiner() {
    super.dessiner();
    if (this.won && this.etat === "fin") {
      this.voile();
      this.bandeau("BRAVO !", 83, 24, "#ffe17c");
      this.bandeau("PARCOURS TERMINE", 117, 13);
      this.bandeau("ESPACE POUR REJOUER", 175, 10);
    }
  }
  hud(g, extra = "") {
    text(g, `VIES ${this.lives}   ${extra}`, 8, 226, 9, "#eee");
  }
}
