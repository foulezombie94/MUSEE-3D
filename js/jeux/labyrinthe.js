/* ============================================================
   CONTINUE ? — Jeu « Labyrinthe »
   Un jeu de poursuite dans un labyrinthe, dans l'esprit des
   jeux d'arcade du début des années 1980.
   Le joueur pilote VOLT, un petit robot qui collecte toutes les
   cellules d'énergie du circuit. Quatre virus le poursuivent.
   Les grosses piles rendent les virus vulnérables pendant quelques secondes.
   Personnage, ennemis et labyrinthe sont des créations originales.
   ============================================================ */
import { JeuArcade, LARGEUR, POLICE } from "./base.js";

/* ---------- Le labyrinthe ----------
   # mur · . cellule d'énergie · o grosse pile · espace : couloir vide
   On décrit la moitié gauche ; la moitié droite est son reflet. */
const MOITIE = [
  "#############",
  "#o....#......",
  "#.###.##.###.",
  "#............",
  "#.###.#.####.",
  "#.....#....#.",
  "###.#.####.#.",
  "#...#........",
  "#.#.#.###.##.",
  "#.#...#     .",
  "#.###.# ###..",
  "#.....#..#...",
  "#.###.##.#.##",
  "#...#........",
  "###.#.#####.#",
  "#o....#......",
  "#############",
];
const PLAN = MOITIE.map((ligne) => ligne + [...ligne].reverse().join(""));
const COLONNES = PLAN[0].length; // 26
const LIGNES = PLAN.length; // 17
const CASE = 12; // taille d'une case en pixels
const X0 = (LARGEUR - COLONNES * CASE) / 2,
  Y0 = 30;

const DIRECTIONS = {
  haut: { x: 0, y: -1 },
  bas: { x: 0, y: 1 },
  gauche: { x: -1, y: 0 },
  droite: { x: 1, y: 0 },
};
const AUCUNE = { x: 0, y: 0 };
const memeDirection = (a, b) => a.x === b.x && a.y === b.y;

/* Les quatre virus : chacun a sa couleur et sa façon de chasser */
const VIRUS = [
  { nom: "Traqueur", couleur: "#ff4f6d", depart: [12, 9], coin: [24, 1] }, // fonce droit sur le joueur
  { nom: "Embuscade", couleur: "#ff9be0", depart: [13, 9], coin: [1, 1] }, // vise 4 cases devant le joueur
  { nom: "Rôdeur", couleur: "#ffb23e", depart: [11, 9], coin: [1, 15] }, // chasse de loin, fuit de près
  { nom: "Glitch", couleur: "#b98bff", depart: [14, 9], coin: [24, 15] }, // se déplace en partie au hasard
];

export class Labyrinthe extends JeuArcade {
  constructor(canvas, options = {}) {
    super(canvas, { nom: "labyrinthe", couleur: "#3cf2c8", ...options });
  }

  /* ---------- Mise en place ---------- */
  initialiser() {
    this.vies = 3;
    this.niveau = 1;
    this.nouveauNiveau();
  }

  nouveauNiveau() {
    // Copie du plan : on y efface les cellules mangées
    this.grille = PLAN.map((l) => [...l]);
    this.restantes = this.grille.flat().filter((c) => c === "." || c === "o").length;
    this.fondMurs = null; // le dessin des murs est préparé une seule fois
    this.nouvelleVie();
  }

  nouvelleVie() {
    this.volt = {
      x: 12.5,
      y: 13,
      dir: { ...DIRECTIONS.gauche },
      voulue: { ...DIRECTIONS.gauche },
      vitesse: 5.6 + this.niveau * 0.25,
    };
    this.virus = VIRUS.map((v, i) => ({
      ...v,
      x: v.depart[0],
      y: v.depart[1],
      dir: { ...(i % 2 ? DIRECTIONS.droite : DIRECTIONS.gauche) },
      attente: i * 1.6, // les virus sortent l'un après l'autre
      etat: "normal", // "normal", "peur" ou "repare"
    }));
    this.chronoMode = 0;
    this.modeChasse = false;
    this.peur = 0;
    this.combo = 0;
    this.pret = 1.6; // compte à rebours « PRÊT ! »
    this.mort = 0;
    this.particules = [];
    this.textes = [];
  }

  /* ---------- Outils sur la grille ---------- */
  caseEn(x, y) {
    const cx = Math.round(x),
      cy = Math.round(y);
    if (cy < 0 || cy >= LIGNES) return "#";
    return this.grille[cy][((cx % COLONNES) + COLONNES) % COLONNES];
  }
  libre(x, y, d) {
    return this.caseEn(x + d.x, y + d.y) !== "#";
  }
  aUnCentre(e) {
    return Math.abs(e.x - Math.round(e.x)) < 1e-6 && Math.abs(e.y - Math.round(e.y)) < 1e-6;
  }

  /**
   * Fait avancer une entité de `distance` cases, en s'arrêtant au centre
   * de chaque case pour choisir la direction suivante.
   */
  deplacer(e, distance, choisir) {
    let reste = distance,
      securite = 0;
    while (reste > 1e-6 && securite++ < 8) {
      if (this.aUnCentre(e)) {
        e.x = Math.round(e.x);
        e.y = Math.round(e.y);
        choisir(e);
        if (memeDirection(e.dir, AUCUNE)) return;
      }
      // Distance jusqu'au centre de la prochaine case dans la direction actuelle
      const cibleX =
        e.dir.x > 0 ? Math.floor(e.x + 1e-6) + 1 : e.dir.x < 0 ? Math.ceil(e.x - 1e-6) - 1 : e.x;
      const cibleY =
        e.dir.y > 0 ? Math.floor(e.y + 1e-6) + 1 : e.dir.y < 0 ? Math.ceil(e.y - 1e-6) - 1 : e.y;
      const d = Math.abs(cibleX - e.x) + Math.abs(cibleY - e.y);
      if (reste >= d) {
        e.x = cibleX;
        e.y = cibleY;
        reste -= d;
      } else {
        e.x += e.dir.x * reste;
        e.y += e.dir.y * reste;
        reste = 0;
      }
    }
  }

  /* ---------- Commandes ---------- */
  direction(dx, dy) {
    this.volt.voulue = { x: dx, y: dy };
    // Demi-tour immédiat, même entre deux cases
    if (dx === -this.volt.dir.x && dy === -this.volt.dir.y && (dx || dy))
      this.volt.dir = { x: dx, y: dy };
  }
  appuyer(code) {
    if (super.appuyer(code)) return true;
    if (code === "ArrowUp" || code === "KeyW") this.direction(0, -1);
    if (code === "ArrowDown" || code === "KeyS") this.direction(0, 1);
    if (code === "ArrowLeft" || code === "KeyA") this.direction(-1, 0);
    if (code === "ArrowRight" || code === "KeyD") this.direction(1, 0);
    return false;
  }
  /** Doigt ou souris appuyés sur l'écran : on va vers ce côté du robot */
  pointeur(x, y, presse) {
    if (presse) this.toucher(x, y);
  }
  toucher(x, y) {
    const px = X0 + this.volt.x * CASE + CASE / 2,
      py = Y0 + this.volt.y * CASE + CASE / 2;
    const dx = x - px,
      dy = y - py;
    if (Math.hypot(dx, dy) < 14) return;
    if (Math.abs(dx) > Math.abs(dy)) this.direction(Math.sign(dx), 0);
    else this.direction(0, Math.sign(dy));
  }

  /* ---------- Intelligence des virus ---------- */
  cibleVirus(v, i) {
    const j = this.volt;
    if (!this.modeChasse) return { x: v.coin[0], y: v.coin[1] }; // phase de dispersion : chacun son coin
    if (i === 0) return { x: j.x, y: j.y };
    if (i === 1) return { x: j.x + j.dir.x * 4, y: j.y + j.dir.y * 4 };
    if (i === 2)
      return Math.hypot(v.x - j.x, v.y - j.y) > 7
        ? { x: j.x, y: j.y }
        : { x: v.coin[0], y: v.coin[1] };
    return Math.random() < 0.5
      ? { x: j.x, y: j.y }
      : { x: Math.random() * COLONNES, y: Math.random() * LIGNES };
  }
  choisirVirus(v, i) {
    const options = Object.values(DIRECTIONS).filter(
      (d) => !(d.x === -v.dir.x && d.y === -v.dir.y) && this.libre(v.x, v.y, d),
    );
    if (!options.length) {
      v.dir = { x: -v.dir.x, y: -v.dir.y };
      return;
    } // impasse : demi-tour
    if (v.etat === "peur") {
      v.dir = options[Math.floor(Math.random() * options.length)];
      return;
    }
    const cible = this.cibleVirus(v, i);
    options.sort(
      (a, b) =>
        Math.hypot(v.x + a.x - cible.x, v.y + a.y - cible.y) -
        Math.hypot(v.x + b.x - cible.x, v.y + b.y - cible.y),
    );
    v.dir = options[0];
  }

  /* ---------- Pilote automatique (mode démo) : cherche la cellule la plus proche en évitant les virus ---------- */
  choisirDemo() {
    const depart = { x: Math.round(this.volt.x), y: Math.round(this.volt.y) };
    const danger = (x, y) =>
      this.virus.some(
        (v) => v.etat === "normal" && v.attente <= 0 && Math.abs(v.x - x) + Math.abs(v.y - y) < 3,
      );
    const vus = new Set([depart.x + "," + depart.y]);
    const file = Object.values(DIRECTIONS)
      .filter((d) => this.libre(depart.x, depart.y, d) && !danger(depart.x + d.x, depart.y + d.y))
      .map((d) => ({ x: depart.x + d.x, y: depart.y + d.y, premier: d }));
    while (file.length) {
      const n = file.shift();
      const c = this.grille[n.y][n.x];
      if (c === "." || c === "o") {
        this.volt.voulue = n.premier;
        return;
      }
      for (const d of Object.values(DIRECTIONS)) {
        const x = n.x + d.x,
          y = n.y + d.y,
          cle = x + "," + y;
        if (!vus.has(cle) && this.caseEn(x, y) !== "#" && !danger(x, y)) {
          vus.add(cle);
          file.push({ x, y, premier: n.premier });
        }
      }
    }
  }

  /* ---------- Une étape de jeu ---------- */
  avancer(dt) {
    this.majEffets(dt);
    if (this.pret > 0) {
      this.pret -= dt;
      return;
    }
    if (this.mort > 0) {
      // petite pause après avoir été touché
      this.mort -= dt;
      if (this.mort <= 0) {
        if (this.vies <= 0) this.terminer();
        else this.nouvelleVie();
      }
      return;
    }

    // Alternance dispersion / chasse
    if (this.peur <= 0) {
      this.chronoMode += dt;
      const duree = this.modeChasse ? 18 : 6;
      if (this.chronoMode > duree) {
        this.chronoMode = 0;
        this.modeChasse = !this.modeChasse;
        this.virus.forEach((v) => {
          if (v.etat === "normal") v.dir = { x: -v.dir.x, y: -v.dir.y };
        });
      }
    } else {
      this.peur -= dt;
      if (this.peur <= 0)
        this.virus.forEach((v) => {
          if (v.etat === "peur") v.etat = "normal";
        });
    }

    // Le robot
    const volt = this.volt;
    this.deplacer(volt, volt.vitesse * dt, (e) => {
      if (this.demo) this.choisirDemo();
      if (this.libre(e.x, e.y, e.voulue)) e.dir = { ...e.voulue };
      else if (!this.libre(e.x, e.y, e.dir)) e.dir = { ...AUCUNE };
      this.manger(e.x, e.y);
    });
    if (memeDirection(volt.dir, AUCUNE) && this.libre(volt.x, volt.y, volt.voulue))
      volt.dir = { ...volt.voulue };

    // Les virus
    this.virus.forEach((v, i) => {
      if (v.attente > 0) {
        v.attente -= dt;
        return;
      }
      if (v.etat === "repare") {
        // un virus mangé se répare au centre
        v.repare -= dt;
        if (v.repare <= 0) {
          v.etat = "normal";
          v.x = v.depart[0];
          v.y = v.depart[1];
        }
        return;
      }
      const vitesse = v.etat === "peur" ? 3.2 : 4.8 + this.niveau * 0.3;
      this.deplacer(v, vitesse * dt, (e) => this.choisirVirus(e, i));

      // Contact avec le robot
      if (Math.hypot(v.x - volt.x, v.y - volt.y) < 0.7) {
        if (v.etat === "peur") {
          this.combo++;
          const points = 200 * 2 ** (this.combo - 1);
          this.score += points;
          this.texte(`${points}`, v.x, v.y, v.couleur);
          this.eclat(v.x, v.y, v.couleur, 18);
          this.son(880, 0.12, "triangle");
          this.son(1320, 0.18, "triangle", 0.04);
          v.etat = "repare";
          v.repare = 3;
          v.x = v.depart[0];
          v.y = v.depart[1];
        } else if (v.etat === "normal") {
          this.vies--;
          this.mort = 1.4;
          this.secouer(6);
          this.eclat(volt.x, volt.y, "#3cf2c8", 30);
          this.son(220, 0.3, "sawtooth");
          this.son(110, 0.5, "sawtooth", 0.04);
        }
      }
    });
  }

  /** Le robot mange ce qui se trouve sur sa case */
  manger(x, y) {
    const c = this.grille[y][x];
    if (c === ".") {
      this.grille[y][x] = " ";
      this.score += 10;
      this.restantes--;
      this.son(this.restantes % 2 ? 660 : 520, 0.04, "square", 0.025);
    } else if (c === "o") {
      this.grille[y][x] = " ";
      this.score += 50;
      this.restantes--;
      this.peur = Math.max(3, 7.5 - this.niveau * 0.5);
      this.combo = 0;
      this.virus.forEach((v) => {
        if (v.etat === "normal") {
          v.etat = "peur";
          v.dir = { x: -v.dir.x, y: -v.dir.y };
        }
      });
      this.eclat(x, y, "#ffffff", 14);
      this.son(330, 0.25, "triangle", 0.06);
    }
    if (this.restantes <= 0) {
      this.score += 1000;
      this.eclairer("#3cf2c8", 0.3);
      this.niveau++;
      this.son(990, 0.4, "triangle", 0.06);
      this.nouveauNiveau();
      this.texte(`NIVEAU ${this.niveau}`, 12.5, 7, "#3cf2c8", 2);
    }
  }

  /* ---------- Effets : particules et textes flottants ---------- */
  eclat(x, y, couleur, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2,
        v = 2 + Math.random() * 5;
      this.particules.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        vie: 0.6 + Math.random() * 0.4,
        couleur,
      });
    }
  }
  texte(t, x, y, couleur, duree = 1) {
    this.textes.push({ t, x, y, couleur, vie: duree });
  }
  majEffets(dt) {
    this.particules.forEach((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.92;
      p.vy *= 0.92;
      p.vie -= dt;
    });
    this.particules = this.particules.filter((p) => p.vie > 0);
    this.textes.forEach((t) => {
      t.y -= dt * 0.8;
      t.vie -= dt;
    });
    this.textes = this.textes.filter((t) => t.vie > 0);
  }

  /* ---------- Dessin ---------- */
  /** Les murs sont dessinés une seule fois dans une image, avec un contour néon */
  preparerMurs() {
    const c = document.createElement("canvas");
    c.width = LARGEUR;
    c.height = 240;
    const g = c.getContext("2d");
    const mur = (x, y) => this.caseEn(x, y) === "#" && y >= 0 && y < LIGNES;
    g.lineCap = "round";
    const tracer = (couleur, largeur, flou) => {
      g.strokeStyle = couleur;
      g.lineWidth = largeur;
      g.shadowColor = "#5b7bff";
      g.shadowBlur = flou;
      g.beginPath();
      for (let y = 0; y < LIGNES; y++)
        for (let x = 0; x < COLONNES; x++) {
          if (!mur(x, y)) continue;
          const px = X0 + x * CASE,
            py = Y0 + y * CASE;
          // On trace seulement les bords qui touchent un couloir
          if (!mur(x, y - 1) && y > 0) {
            g.moveTo(px, py + 2);
            g.lineTo(px + CASE, py + 2);
          }
          if (!mur(x, y + 1) && y < LIGNES - 1) {
            g.moveTo(px, py + CASE - 2);
            g.lineTo(px + CASE, py + CASE - 2);
          }
          if (!mur(x - 1, y) && x > 0) {
            g.moveTo(px + 2, py);
            g.lineTo(px + 2, py + CASE);
          }
          if (!mur(x + 1, y) && x < COLONNES - 1) {
            g.moveTo(px + CASE - 2, py);
            g.lineTo(px + CASE - 2, py + CASE);
          }
        }
      g.stroke();
    };
    tracer("rgba(91,123,255,0.5)", 3, 10);
    tracer("#8fa6ff", 1.2, 0);
    // Cadre extérieur double
    g.shadowBlur = 8;
    g.strokeStyle = "#5b7bff";
    g.lineWidth = 1.5;
    g.strokeRect(X0 + 0.5, Y0 + 0.5, COLONNES * CASE - 1, LIGNES * CASE - 1);
    g.strokeRect(X0 + 3.5, Y0 + 3.5, COLONNES * CASE - 7, LIGNES * CASE - 7);
    this.fondMurs = c;
  }

  dessinerJeu(g) {
    if (!this.fondMurs) this.preparerMurs();
    const pX = (x) => X0 + x * CASE + CASE / 2,
      pY = (y) => Y0 + y * CASE + CASE / 2;

    // Fond : légère grille de circuit imprimé
    g.fillStyle = "#06061a";
    g.fillRect(X0, Y0, COLONNES * CASE, LIGNES * CASE);
    g.drawImage(this.fondMurs, 0, 0);

    // Cellules d'énergie et grosses piles
    const pulse = 0.5 + 0.5 * Math.sin(this.temps * 6);
    for (let y = 0; y < LIGNES; y++)
      for (let x = 0; x < COLONNES; x++) {
        const c = this.grille[y][x];
        if (c === ".") {
          g.fillStyle = "#ffe9b0";
          g.fillRect(pX(x) - 1, pY(y) - 1, 2, 2);
        }
        if (c === "o") {
          g.shadowColor = "#ffe9b0";
          g.shadowBlur = 8 + pulse * 8;
          g.fillStyle = "#fff4d6";
          g.fillRect(pX(x) - 3, pY(y) - 4, 6, 8);
          g.fillStyle = "#3cf2c8";
          g.fillRect(pX(x) - 1, pY(y) - 6, 2, 2); // borne de la pile
          g.shadowBlur = 0;
        }
      }

    // Virus
    this.virus.forEach((v) => this.dessinerVirus(g, v, pX(v.x), pY(v.y)));

    // Le robot VOLT
    if (!(this.mort > 0 && Math.floor(this.temps * 10) % 2))
      this.dessinerVolt(g, pX(this.volt.x), pY(this.volt.y));

    // Particules et textes
    this.particules.forEach((p) => {
      g.globalAlpha = Math.min(1, p.vie * 2);
      g.fillStyle = p.couleur;
      g.fillRect(pX(p.x) - 1, pY(p.y) - 1, 2, 2);
    });
    g.globalAlpha = 1;
    g.textAlign = "center";
    g.textBaseline = "middle";
    this.textes.forEach((t) => {
      g.font = `10px ${POLICE}`;
      g.fillStyle = t.couleur;
      g.fillText(t.t, pX(t.x), pY(t.y));
    });

    // Vies restantes (petits robots) et niveau
    for (let i = 0; i < this.vies; i++) this.dessinerVolt(g, LARGEUR / 2 - 14 + i * 14, 12, 0.6);
    if (this.pret > 0 && this.etat === "jeu") {
      g.font = `14px ${POLICE}`;
      g.fillStyle = "#3cf2c8";
      g.shadowColor = "#3cf2c8";
      g.shadowBlur = 10;
      g.fillText("PRÊT !", pX(12.5), pY(11));
      g.shadowBlur = 0;
    }
    g.textBaseline = "top";
  }

  /** VOLT : un petit robot rond avec une visière qui regarde dans sa direction */
  dessinerVolt(g, x, y, echelle = 1) {
    const r = 5.2 * echelle,
      d = this.volt.dir.x || this.volt.dir.y ? this.volt.dir : DIRECTIONS.droite;
    g.save();
    g.shadowColor = "#3cf2c8";
    g.shadowBlur = 10 * echelle;
    g.fillStyle = "#3cf2c8";
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
    g.shadowBlur = 0;
    // Antenne qui clignote
    g.fillStyle = "#1a8f7a";
    g.fillRect(x - 0.5, y - r - 3 * echelle, 1, 3 * echelle);
    g.fillStyle = Math.floor(this.temps * 4) % 2 ? "#ff4f9a" : "#ffffff";
    g.fillRect(x - 1, y - r - 4 * echelle, 2, 2);
    // Visière sombre et œil lumineux, décalés vers la direction de marche
    g.fillStyle = "#0b2a26";
    g.fillRect(
      x - 3.5 * echelle + d.x * 1.5 * echelle,
      y - 2 * echelle + d.y * 1.5 * echelle,
      7 * echelle,
      3 * echelle,
    );
    g.fillStyle = "#ffffff";
    g.fillRect(
      x + d.x * 2.5 * echelle - 1,
      y - 1 * echelle + d.y * 2 * echelle,
      2 * echelle,
      1.5 * echelle,
    );
    g.restore();
  }

  /** Un virus : une cellule à pointes avec un œil unique */
  dessinerVirus(g, v, x, y) {
    if (v.etat === "repare") {
      // simple contour qui clignote pendant la réparation
      g.strokeStyle = v.couleur;
      g.globalAlpha = 0.4 + 0.3 * Math.sin(this.temps * 10);
      g.beginPath();
      g.arc(x, y, 5, 0, Math.PI * 2);
      g.stroke();
      g.globalAlpha = 1;
      return;
    }
    const finPeur = this.peur < 2 && Math.floor(this.temps * 8) % 2;
    const couleur = v.etat === "peur" ? (finPeur ? "#ffffff" : "#3a5bff") : v.couleur;
    const tour = this.temps * 3 + v.depart[0];
    g.save();
    g.shadowColor = couleur;
    g.shadowBlur = 8;
    g.fillStyle = couleur;
    // Pointes qui tournent
    for (let k = 0; k < 8; k++) {
      const a = tour + (k * Math.PI) / 4;
      g.fillRect(x + Math.cos(a) * 6 - 1, y + Math.sin(a) * 6 - 1, 2, 2);
    }
    g.beginPath();
    g.arc(x, y, 4.6, 0, Math.PI * 2);
    g.fill();
    g.shadowBlur = 0;
    // Œil : regarde vers le robot, ou plisse quand le virus a peur
    if (v.etat === "peur") {
      g.fillStyle = "#ffffff";
      g.fillRect(x - 3, y - 1, 6, 1);
      g.fillRect(x - 2, y + 2, 1, 1);
      g.fillRect(x + 1, y + 2, 1, 1);
    } else {
      const ax = Math.sign(this.volt.x - v.x),
        ay = Math.sign(this.volt.y - v.y);
      g.fillStyle = "#ffffff";
      g.beginPath();
      g.arc(x, y, 2.4, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#0a0a14";
      g.fillRect(x - 1 + ax, y - 1 + ay, 2, 2);
    }
    g.restore();
  }
}
