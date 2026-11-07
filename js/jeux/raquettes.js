/* ============================================================
   CONTINUE ? — Jeu « Raquettes »
   Un tennis de table en duel contre l'ordinateur,
   dans l'esprit des premiers jeux d'arcade des années 1970.
   Le premier à 7 points gagne.
   ============================================================ */
import { JeuArcade, LARGEUR, HAUTEUR, POLICE } from "./base.js";

const HAUT_RAQUETTE = 36,
  EPAISSEUR = 6,
  TAILLE_BALLE = 6,
  POINTS_GAGNANTS = 7,
  HAUT_TERRAIN = 24;

export class Raquettes extends JeuArcade {
  constructor(canvas, options = {}) {
    super(canvas, { nom: "raquettes", couleur: "#3cf2c8", ...options });
  }

  initialiser() {
    this.joueur = { y: HAUTEUR / 2 - HAUT_RAQUETTE / 2, points: 0, eclat: 0 };
    this.ordi = { y: HAUTEUR / 2 - HAUT_RAQUETTE / 2, points: 0, eclat: 0 };
    this.cible = null; // position voulue du doigt ou de la souris
    this.trainee = [];
    this.echanges = 0;
    this.servir(1);
  }

  /** Remet la balle au centre et l'envoie vers un côté */
  servir(sens) {
    const angle = Math.random() * 0.8 - 0.4;
    this.balle = {
      x: LARGEUR / 2,
      y: HAUTEUR / 2 + 10,
      vx: Math.cos(angle) * 150 * sens,
      vy: Math.sin(angle) * 150,
      attente: 0.8,
    };
    this.echanges = 0;
  }

  pointeur(x, y) {
    this.cible = y - HAUT_RAQUETTE / 2;
  }

  /** L'ordinateur suit la balle avec un léger retard, pour rester battable */
  piloter(raquette, vitesse, dt) {
    const b = this.balle;
    const versLui = (raquette === this.ordi) === b.vx > 0;
    const viseY = (versLui ? b.y : HAUTEUR / 2 + 10) - HAUT_RAQUETTE / 2 + TAILLE_BALLE / 2;
    const ecart = viseY - raquette.y;
    raquette.y += Math.max(-vitesse * dt, Math.min(vitesse * dt, ecart));
  }

  avancer(dt) {
    const b = this.balle;

    // Raquette du joueur (ou de l'ordinateur en mode démo)
    if (this.demo) this.piloter(this.joueur, 200, dt);
    else {
      if (this.toucheActive("ArrowUp", "KeyW")) {
        this.joueur.y -= 240 * dt;
        this.cible = null;
      }
      if (this.toucheActive("ArrowDown", "KeyS")) {
        this.joueur.y += 240 * dt;
        this.cible = null;
      }
      if (this.cible !== null) this.joueur.y += (this.cible - this.joueur.y) * Math.min(1, dt * 14);
    }
    this.piloter(this.ordi, 150 + this.joueur.points * 9, dt);
    [this.joueur, this.ordi].forEach((r) => {
      r.y = Math.max(HAUT_TERRAIN, Math.min(HAUTEUR - HAUT_RAQUETTE - 2, r.y));
      r.eclat = Math.max(0, r.eclat - dt * 4);
    });

    this.trainee.push({ x: b.x, y: b.y });
    if (this.trainee.length > 8) this.trainee.shift();

    if (b.attente > 0) {
      b.attente -= dt;
      return;
    }
    const xAvant = b.x; // position avant le déplacement, pour ne pas traverser une raquette
    b.x += b.vx * dt;
    b.y += b.vy * dt;

    // Rebonds en haut et en bas
    if (b.y < HAUT_TERRAIN) {
      b.y = HAUT_TERRAIN;
      b.vy = Math.abs(b.vy);
      this.son(240, 0.03);
    }
    if (b.y > HAUTEUR - TAILLE_BALLE) {
      b.y = HAUTEUR - TAILLE_BALLE;
      b.vy = -Math.abs(b.vy);
      this.son(240, 0.03);
    }

    // Rebond sur une raquette : l'angle dépend de l'endroit touché
    const toucher = (r, x, sens) => {
      if (b.y + TAILLE_BALLE < r.y - 1 || b.y > r.y + HAUT_RAQUETTE + 1) return;
      const decalage = (b.y + TAILLE_BALLE / 2 - (r.y + HAUT_RAQUETTE / 2)) / (HAUT_RAQUETTE / 2);
      const vitesse = Math.min(400, Math.hypot(b.vx, b.vy) * 1.06);
      const angle = decalage * 0.9;
      b.vx = Math.cos(angle) * vitesse * sens;
      b.vy = Math.sin(angle) * vitesse;
      b.x = x;
      r.eclat = 1;
      this.echanges++;
      this.eclater(
        x + (sens > 0 ? 0 : TAILLE_BALLE),
        b.y + 3,
        sens > 0 ? this.couleur : "#e8e6f0",
        8,
        70,
      );
      this.son(sens > 0 ? 520 : 440, 0.05);
      if (sens > 0 && !this.demo) this.score += 10;
    };
    const bordGauche = 16 + EPAISSEUR,
      bordDroit = LARGEUR - 16 - EPAISSEUR - TAILLE_BALLE;
    if (b.vx < 0 && xAvant >= bordGauche && b.x <= bordGauche) toucher(this.joueur, bordGauche, 1);
    if (b.vx > 0 && xAvant <= bordDroit && b.x >= bordDroit) toucher(this.ordi, bordDroit, -1);

    // Point marqué
    if (b.x < -10) {
      this.ordi.points++;
      this.secouer(5);
      this.son(160, 0.25, "sawtooth");
      this.finDePoint(-1);
    }
    if (b.x > LARGEUR + 10) {
      this.joueur.points++;
      this.score += 100 + this.echanges * 5;
      this.eclairer(this.couleur, 0.25);
      this.son(660, 0.1);
      this.son(990, 0.16, "square", 0.03);
      this.finDePoint(1);
    }
  }

  finDePoint(sens) {
    if (this.joueur.points >= POINTS_GAGNANTS || this.ordi.points >= POINTS_GAGNANTS) {
      if (this.joueur.points >= POINTS_GAGNANTS && !this.demo) this.score += 500;
      this.terminer();
    } else this.servir(sens);
  }

  dessinerJeu(g) {
    // Terrain : filet central et lignes
    g.fillStyle = "#1c1c2c";
    g.fillRect(0, HAUT_TERRAIN - 2, LARGEUR, 1);
    g.fillStyle = "#34344a";
    for (let y = HAUT_TERRAIN + 2; y < HAUTEUR; y += 12) g.fillRect(LARGEUR / 2 - 1, y, 2, 6);
    g.font = `32px ${POLICE}`;
    g.textAlign = "center";
    g.textBaseline = "top";
    g.fillStyle = "#4a4a64";
    g.fillText(this.joueur.points, LARGEUR / 2 - 40, 30);
    g.fillText(this.ordi.points, LARGEUR / 2 + 40, 30);

    // Traînée de la balle
    this.trainee.forEach((p, i) => {
      g.globalAlpha = (i / this.trainee.length) * 0.35;
      g.fillStyle = "#ffffff";
      g.fillRect(p.x + 1, p.y + 1, TAILLE_BALLE - 2, TAILLE_BALLE - 2);
    });
    g.globalAlpha = 1;

    // Raquettes et balle, avec un halo
    const raquette = (x, r, couleur) => {
      g.shadowColor = couleur;
      g.shadowBlur = 6 + r.eclat * 12;
      g.fillStyle = r.eclat > 0.5 ? "#ffffff" : couleur;
      g.fillRect(x, r.y, EPAISSEUR, HAUT_RAQUETTE);
    };
    raquette(16, this.joueur, this.couleur);
    raquette(LARGEUR - 16 - EPAISSEUR, this.ordi, "#e8e6f0");
    g.shadowColor = "#ffffff";
    g.shadowBlur = 8;
    g.fillStyle = "#ffffff";
    if (!(this.balle.attente > 0 && Math.floor(this.temps * 8) % 2))
      g.fillRect(this.balle.x, this.balle.y, TAILLE_BALLE, TAILLE_BALLE);
    g.shadowBlur = 0;
  }
}
