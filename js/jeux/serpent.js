/* ============================================================
   CONTINUE ? — Jeu « Serpent »
   Le serpent avance seul ; il grandit à chaque pastille mangée.
   La partie s'arrête s'il touche un bord ou sa propre queue.
   Une pastille dorée apparaît parfois : elle vaut plus, mais
   disparaît au bout de quelques secondes.
   ============================================================ */
import { JeuArcade, LARGEUR, HAUTEUR } from "./base.js";

const CASE = 12; // taille d'une case en pixels
const HAUT = 24; // hauteur du bandeau du score
const COLONNES = Math.floor(LARGEUR / CASE); // 26 colonnes
const LIGNES = Math.floor((HAUTEUR - HAUT) / CASE); // 18 lignes
const X0 = (LARGEUR - COLONNES * CASE) / 2;

export class Serpent extends JeuArcade {
  constructor(canvas, options = {}) {
    super(canvas, { nom: "serpent", couleur: "#9dff5c", ...options });
  }

  initialiser() {
    const y = Math.floor(LIGNES / 2);
    this.corps = [
      { x: 8, y },
      { x: 7, y },
      { x: 6, y },
    ];
    this.dir = { x: 1, y: 0 };
    this.file = []; // virages demandés, joués un par un
    this.chrono = 0;
    this.mangees = 0;
    this.doree = null;
    this.mort = 0;
    this.placerPastille();
  }

  caseLibre() {
    let p;
    do {
      p = { x: Math.floor(Math.random() * COLONNES), y: Math.floor(Math.random() * LIGNES) };
    } while (
      this.corps.some((c) => c.x === p.x && c.y === p.y) ||
      (this.pastille && p.x === this.pastille.x && p.y === this.pastille.y)
    );
    return p;
  }
  placerPastille() {
    this.pastille = null;
    this.pastille = this.caseLibre();
  }

  /** Change de direction, sans pouvoir faire demi-tour sur place */
  direction(dx, dy) {
    const derniere = this.file.length ? this.file[this.file.length - 1] : this.dir;
    if ((dx === -derniere.x && dy === -derniere.y) || (dx === derniere.x && dy === derniere.y))
      return;
    if (this.file.length < 2) this.file.push({ x: dx, y: dy });
  }

  appuyer(code) {
    if (super.appuyer(code)) return true;
    if (code === "ArrowUp" || code === "KeyW") this.direction(0, -1);
    if (code === "ArrowDown" || code === "KeyS") this.direction(0, 1);
    if (code === "ArrowLeft" || code === "KeyA") this.direction(-1, 0);
    if (code === "ArrowRight" || code === "KeyD") this.direction(1, 0);
    return false;
  }

  /** Un toucher : on tourne vers le côté touché, par rapport à la tête */
  toucher(x, y) {
    const t = this.corps[0];
    const dx = x - (X0 + t.x * CASE + CASE / 2),
      dy = y - (HAUT + t.y * CASE + CASE / 2);
    if (this.dir.x) this.direction(0, Math.sign(dy) || 1);
    else this.direction(Math.sign(dx) || 1, 0);
  }

  bloquee(x, y) {
    return (
      x < 0 ||
      y < 0 ||
      x >= COLONNES ||
      y >= LIGNES ||
      this.corps.some((c, i) => i < this.corps.length - 1 && c.x === x && c.y === y)
    );
  }

  /** En démo : la case libre la plus proche de la pastille, en évitant les culs-de-sac */
  choisirDirection() {
    const tete = this.corps[0];
    const but = this.doree || this.pastille;
    const espace = (x, y) => {
      // nombre de cases accessibles (petite exploration)
      const vus = new Set([x + "," + y]),
        file = [[x, y]];
      while (file.length && vus.size < 60) {
        const [cx, cy] = file.shift();
        for (const [ax, ay] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const nx = cx + ax,
            ny = cy + ay,
            k = nx + "," + ny;
          if (!vus.has(k) && !this.bloquee(nx, ny)) {
            vus.add(k);
            file.push([nx, ny]);
          }
        }
      }
      return vus.size;
    };
    const options = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ]
      .filter((d) => !(d.x === -this.dir.x && d.y === -this.dir.y))
      .filter((d) => !this.bloquee(tete.x + d.x, tete.y + d.y))
      .map((d) => ({
        d,
        place: espace(tete.x + d.x, tete.y + d.y),
        dist: Math.abs(tete.x + d.x - but.x) + Math.abs(tete.y + d.y - but.y),
      }));
    if (!options.length) return;
    const assez = Math.min(60, this.corps.length + 4);
    options.sort((a, b) => (b.place >= assez) - (a.place >= assez) || a.dist - b.dist);
    this.file = [options[0].d];
  }

  avancer(dt) {
    if (this.doree) {
      this.doree.vie -= dt;
      if (this.doree.vie <= 0) this.doree = null;
    }
    if (this.mort > 0) {
      this.mort -= dt;
      if (this.mort <= 0) this.terminer();
      return;
    }
    const delai = Math.max(0.055, 0.13 - this.corps.length * 0.002); // le serpent accélère en grandissant
    this.chrono += dt;
    if (this.chrono < delai) return;
    this.chrono = 0;

    if (this.demo) this.choisirDirection();
    if (this.file.length) this.dir = this.file.shift();
    const tete = { x: this.corps[0].x + this.dir.x, y: this.corps[0].y + this.dir.y };
    if (this.bloquee(tete.x, tete.y)) {
      this.mort = 0.8;
      this.secouer(6);
      this.eclater(
        X0 + this.corps[0].x * CASE + 6,
        HAUT + this.corps[0].y * CASE + 6,
        this.couleur,
        24,
        120,
      );
      this.son(150, 0.3, "sawtooth");
      return;
    }

    this.corps.unshift(tete);
    const centre = (p) => [X0 + p.x * CASE + CASE / 2, HAUT + p.y * CASE + CASE / 2];
    if (tete.x === this.pastille.x && tete.y === this.pastille.y) {
      this.score += 10;
      this.mangees++;
      this.eclater(...centre(tete), "#ff4f9a", 10, 70);
      this.son(520 + (this.mangees % 5) * 60, 0.06);
      this.placerPastille();
      if (this.mangees % 5 === 0) this.doree = { ...this.caseLibre(), vie: 6 };
    } else if (this.doree && tete.x === this.doree.x && tete.y === this.doree.y) {
      this.score += 50;
      this.eclater(...centre(tete), "#ffd84a", 18, 100);
      this.eclairer("#ffd84a", 0.18);
      this.son(880, 0.08);
      this.son(1320, 0.14, "square", 0.03);
      this.doree = null;
      this.corps.push({ ...this.corps[this.corps.length - 1] });
    } else {
      this.corps.pop();
    }
  }

  dessinerJeu(g) {
    // Terrain : cadre et points de grille
    g.fillStyle = "#070d07";
    g.fillRect(X0, HAUT, COLONNES * CASE, LIGNES * CASE);
    g.fillStyle = "#16261a";
    for (let y = 1; y < LIGNES; y++)
      for (let x = 1; x < COLONNES; x++) g.fillRect(X0 + x * CASE, HAUT + y * CASE, 1, 1);
    g.strokeStyle = "#2c4a2a";
    g.strokeRect(X0 + 0.5, HAUT + 0.5, COLONNES * CASE - 1, LIGNES * CASE - 1);

    // Pastilles
    const pulse = 1 + Math.round(Math.sin(this.temps * 8));
    g.shadowColor = "#ff4f9a";
    g.shadowBlur = 8;
    g.fillStyle = "#ff4f9a";
    g.fillRect(
      X0 + this.pastille.x * CASE + 3 - pulse / 2,
      HAUT + this.pastille.y * CASE + 3 - pulse / 2,
      CASE - 6 + pulse,
      CASE - 6 + pulse,
    );
    if (this.doree && (this.doree.vie > 2 || Math.floor(this.temps * 8) % 2)) {
      g.shadowColor = "#ffd84a";
      g.fillStyle = "#ffd84a";
      g.fillRect(X0 + this.doree.x * CASE + 2, HAUT + this.doree.y * CASE + 2, CASE - 4, CASE - 4);
      g.fillStyle = "#fff6c0";
      g.fillRect(X0 + this.doree.x * CASE + 4, HAUT + this.doree.y * CASE + 4, 2, 2);
    }
    g.shadowBlur = 0;

    // Le serpent : la couleur s'assombrit vers la queue
    const n = this.corps.length;
    const clignote = this.mort > 0 && Math.floor(this.temps * 12) % 2;
    this.corps.forEach((c, i) => {
      if (clignote) return;
      g.globalAlpha = 1 - (i / n) * 0.55;
      g.fillStyle = i === 0 ? "#f4ffe0" : this.couleur;
      g.fillRect(X0 + c.x * CASE + 1, HAUT + c.y * CASE + 1, CASE - 2, CASE - 2);
      // Lien avec le segment suivant pour un corps continu
      const s = this.corps[i + 1];
      if (s) {
        const mx = Math.min(c.x, s.x),
          my = Math.min(c.y, s.y);
        if (c.x !== s.x) g.fillRect(X0 + mx * CASE + CASE - 1, HAUT + my * CASE + 3, 2, CASE - 6);
        else g.fillRect(X0 + mx * CASE + 3, HAUT + my * CASE + CASE - 1, CASE - 6, 2);
      }
    });
    g.globalAlpha = 1;
    // Yeux qui regardent dans la direction de marche
    if (!clignote) {
      const t = this.corps[0],
        cx = X0 + t.x * CASE + CASE / 2,
        cy = HAUT + t.y * CASE + CASE / 2;
      const px = -this.dir.y,
        py = this.dir.x;
      g.fillStyle = "#0a140a";
      [-1, 1].forEach((s) =>
        g.fillRect(
          cx + this.dir.x * 2 + px * s * 3 - 1,
          cy + this.dir.y * 2 + py * s * 3 - 1,
          2,
          2,
        ),
      );
    }
  }
}
