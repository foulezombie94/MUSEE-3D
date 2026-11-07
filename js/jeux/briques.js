/* ============================================================
   CONTINUE ? — Jeu « Briques »
   La balle rebondit sur la raquette et casse les briques.
   Trois vies ; un nouveau mur, avec un autre motif, apparaît
   quand tout est cassé. Les briques claires demandent deux coups.
   ============================================================ */
import { JeuArcade, LARGEUR, HAUTEUR } from "./base.js";

const COULEURS = ["#ff4f9a", "#ff8a4f", "#ffb23e", "#3cf2c8", "#7c9cff", "#b98bff"];
const L_RAQUETTE = 48,
  BALLE = 5,
  Y_RAQUETTE = HAUTEUR - 18;
const COLONNES = 10,
  L_BRIQUE = 28,
  H_BRIQUE = 9;

/* Motifs des murs : chaque ligne décrit une rangée ; « # » brique normale, « @ » brique solide, « . » vide */
const MURS = [
  ["##########", "##########", "##########", "##########", "##########"],
  ["@@@@@@@@@@", "#.#.##.#.#", "##########", "#.######.#", "##########"],
  ["...@##@...", "..######..", ".########.", "##@####@##", "##########", ".#.#..#.#."],
  ["@........@", "##@####@##", "##########", "@@..##..@@", "##########", "##########"],
];

export class Briques extends JeuArcade {
  constructor(canvas, options = {}) {
    super(canvas, { nom: "briques", couleur: "#ff4f9a", ...options });
  }

  initialiser() {
    this.vies = 3;
    this.niveau = 1;
    this.raquette = LARGEUR / 2 - L_RAQUETTE / 2;
    this.eclatRaquette = 0;
    this.cible = null;
    this.trainee = [];
    this.construireMur();
    this.nouvelleBalle();
  }

  construireMur() {
    const motif = MURS[(this.niveau - 1) % MURS.length];
    this.briques = [];
    motif.forEach((ligne, r) =>
      [...ligne].forEach((car, c) => {
        if (car === ".") return;
        const solide = car === "@";
        this.briques.push({
          x: 8 + c * 30.4,
          y: 32 + r * 12,
          l: L_BRIQUE,
          h: H_BRIQUE,
          couleur: COULEURS[r % COULEURS.length],
          coups: solide ? 2 : 1,
          valeur: (motif.length - r) * 10 + (solide ? 20 : 0),
        });
      }),
    );
  }

  nouvelleBalle() {
    const vitesse = 150 + this.niveau * 18;
    this.balle = {
      x: LARGEUR / 2,
      y: Y_RAQUETTE - BALLE,
      vx: (Math.random() < 0.5 ? -1 : 1) * vitesse * 0.6,
      vy: -vitesse * 0.8,
      attente: 1,
    };
  }

  pointeur(x) {
    this.cible = x - L_RAQUETTE / 2;
  }

  avancer(dt) {
    const b = this.balle;
    this.eclatRaquette = Math.max(0, this.eclatRaquette - dt * 4);

    // Raquette
    if (this.demo) this.cible = b.x - L_RAQUETTE / 2 + Math.sin(this.temps * 3) * 12;
    if (this.toucheActive("ArrowLeft", "KeyA")) {
      this.raquette -= 290 * dt;
      this.cible = null;
    }
    if (this.toucheActive("ArrowRight", "KeyD")) {
      this.raquette += 290 * dt;
      this.cible = null;
    }
    if (this.cible !== null) this.raquette += (this.cible - this.raquette) * Math.min(1, dt * 16);
    this.raquette = Math.max(0, Math.min(LARGEUR - L_RAQUETTE, this.raquette));

    if (b.attente > 0) {
      b.attente -= dt;
      b.x = this.raquette + L_RAQUETTE / 2 - BALLE / 2;
      b.y = Y_RAQUETTE - BALLE;
      this.trainee = [];
      return;
    }
    this.trainee.push({ x: b.x, y: b.y });
    if (this.trainee.length > 6) this.trainee.shift();

    // Déplacement en petits pas pour ne pas traverser les briques quand la balle va vite
    const pas = Math.ceil((Math.hypot(b.vx, b.vy) * dt) / 3);
    for (let i = 0; i < pas; i++) if (this.pas(dt / pas)) break;
  }

  /** Un petit pas de la balle ; renvoie vrai si la balle est perdue */
  pas(dt) {
    const b = this.balle;
    b.x += b.vx * dt;
    b.y += b.vy * dt;

    // Murs
    if (b.x < 0) {
      b.x = 0;
      b.vx = Math.abs(b.vx);
      this.son(300, 0.02);
    }
    if (b.x > LARGEUR - BALLE) {
      b.x = LARGEUR - BALLE;
      b.vx = -Math.abs(b.vx);
      this.son(300, 0.02);
    }
    if (b.y < 22) {
      b.y = 22;
      b.vy = Math.abs(b.vy);
      this.son(300, 0.02);
    }

    // Raquette : l'angle de rebond dépend de l'endroit touché
    if (
      b.vy > 0 &&
      b.y + BALLE >= Y_RAQUETTE &&
      b.y + BALLE <= Y_RAQUETTE + 8 &&
      b.x + BALLE >= this.raquette &&
      b.x <= this.raquette + L_RAQUETTE
    ) {
      const decalage = (b.x + BALLE / 2 - (this.raquette + L_RAQUETTE / 2)) / (L_RAQUETTE / 2);
      const vitesse = Math.hypot(b.vx, b.vy);
      b.vx = decalage * vitesse * 0.8;
      b.vy = -Math.sqrt(Math.max(vitesse * vitesse - b.vx * b.vx, vitesse * vitesse * 0.3));
      b.y = Y_RAQUETTE - BALLE;
      this.eclatRaquette = 1;
      this.son(440, 0.04);
    }

    // Briques
    for (const br of this.briques) {
      if (b.x + BALLE < br.x || b.x > br.x + br.l || b.y + BALLE < br.y || b.y > br.y + br.h)
        continue;
      const parLeCote = b.x + BALLE / 2 < br.x || b.x + BALLE / 2 > br.x + br.l;
      if (parLeCote) b.vx = -b.vx;
      else b.vy = -b.vy;
      br.coups--;
      if (br.coups > 0) {
        this.son(220, 0.05, "triangle");
        br.choc = 1;
        break;
      }
      this.briques.splice(this.briques.indexOf(br), 1);
      this.score += br.valeur;
      this.eclater(br.x + br.l / 2, br.y + br.h / 2, br.couleur, 10, 80);
      this.son(600 + (br.y % 60) * 6, 0.05);
      // La balle accélère un peu à chaque brique
      const v = Math.hypot(b.vx, b.vy),
        k = Math.min(1.012, 340 / v);
      b.vx *= k;
      b.vy *= k;
      break;
    }
    if (!this.briques.length) {
      this.niveau++;
      this.score += 500;
      this.eclairer(this.couleur, 0.35);
      this.son(660, 0.12);
      this.son(990, 0.2, "square", 0.03);
      this.construireMur();
      this.nouvelleBalle();
      return true;
    }

    // Balle perdue
    if (b.y > HAUTEUR) {
      this.vies--;
      this.secouer(6);
      this.son(130, 0.35, "sawtooth");
      if (this.vies <= 0) this.terminer();
      else this.nouvelleBalle();
      return true;
    }
    return false;
  }

  dessinerJeu(g) {
    this.briques.forEach((br) => {
      g.fillStyle = br.coups > 1 ? "#f2eefc" : br.couleur;
      g.fillRect(br.x, br.y, br.l, br.h);
      g.fillStyle = "rgba(255,255,255,0.3)";
      g.fillRect(br.x, br.y, br.l, 1);
      g.fillStyle = "rgba(0,0,0,0.25)";
      g.fillRect(br.x, br.y + br.h - 1, br.l, 1);
      if (br.coups > 1) {
        g.fillStyle = br.couleur;
        g.fillRect(br.x + 3, br.y + 3, br.l - 6, br.h - 6);
      }
    });
    // Traînée et balle
    this.trainee.forEach((p, i) => {
      g.globalAlpha = (i / this.trainee.length) * 0.3;
      g.fillStyle = "#ffffff";
      g.fillRect(p.x + 1, p.y + 1, BALLE - 2, BALLE - 2);
    });
    g.globalAlpha = 1;
    g.shadowColor = this.couleur;
    g.shadowBlur = 6 + this.eclatRaquette * 10;
    g.fillStyle = this.eclatRaquette > 0.5 ? "#ffffff" : "#e8e6f0";
    g.fillRect(this.raquette, Y_RAQUETTE, L_RAQUETTE, 5);
    g.fillStyle = this.couleur;
    g.fillRect(this.raquette, Y_RAQUETTE, 4, 5);
    g.fillRect(this.raquette + L_RAQUETTE - 4, Y_RAQUETTE, 4, 5);
    g.shadowColor = "#ffffff";
    g.shadowBlur = 6;
    g.fillStyle = "#ffffff";
    g.fillRect(this.balle.x, this.balle.y, BALLE, BALLE);
    g.shadowBlur = 0;
    for (let i = 0; i < this.vies; i++) {
      g.fillStyle = this.couleur;
      g.fillRect(LARGEUR / 2 - 14 + i * 10, 9, 6, 6);
    }
  }
}
