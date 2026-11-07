/* ============================================================
   CONTINUE ? — Base commune des jeux d'arcade
   Chaque jeu hérite de cette classe. Elle gère :
     - les états : écran titre, partie, pause, fin de partie
     - le mode démo (l'ordinateur joue seul sur les bornes du musée)
       et le passage démo ↔ joueur quand un visiteur prend la borne
     - le meilleur score, gardé dans le navigateur
     - les effets communs : étincelles, secousse, éclair, sons
     - l'affichage des textes en style arcade
   ============================================================ */

export const LARGEUR = 320,
  HAUTEUR = 240; // taille logique de l'écran, comme une vieille borne
export const POLICE = "'Silkscreen', 'Courier New', monospace";

export class JeuArcade {
  /**
   * @param canvas   la balise <canvas> où dessiner
   * @param options  { demo, couleur, nom (identifiant), titre (affiché), aide (lignes de l'écran titre) }
   */
  constructor(
    canvas,
    { demo = false, couleur = "#3cf2c8", nom = "jeu", titre = null, aide = [] } = {},
  ) {
    this.canvas = canvas;
    canvas.width = LARGEUR;
    canvas.height = HAUTEUR;
    this.g = canvas.getContext("2d");
    this.demo = demo;
    this.couleur = couleur;
    this.nom = nom;
    this.titre = (titre || nom).toUpperCase();
    this.aide = aide;
    this.etat = demo ? "jeu" : "titre"; // "titre", "jeu", "pause" ou "fin"
    this.score = 0;
    this.temps = 0;
    this.finDepuis = 0;
    this.touches = new Set();
    this.etincelles = [];
    this.secousse = 0;
    this.flash = 0;
    this.flashCouleur = "#ffffff";
    this.surFin = null; // rappel (score, nouveauRecord) à la fin d'une vraie partie
    this.record = this.lireRecord();
    this.initialiser();
  }

  /* --- À redéfinir dans chaque jeu --- */
  initialiser() {} // remet la partie à zéro
  avancer(dt) {} // fait évoluer la partie de dt secondes
  dessinerJeu(g) {} // dessine la partie
  direction(dx, dy) {} // geste de balayage (tactile)
  pointeur(x, y, presse) {} // position de la souris ou du doigt, en pixels de l'écran du jeu
  toucher(x, y) {} // toucher ou clic court
  pointeurFin() {} // le doigt ou le bouton de la souris est relâché

  /* --- Meilleur score, conservé dans ce navigateur --- */
  lireRecord() {
    try {
      return Number(localStorage.getItem("continue-record-" + this.nom)) || 0;
    } catch (e) {
      return 0;
    }
  }
  ecrireRecord() {
    if (this.demo || this.score <= this.record) return false;
    this.record = this.score;
    try {
      localStorage.setItem("continue-record-" + this.nom, String(this.score));
    } catch (e) {
      /* stockage indisponible */
    }
    return true;
  }

  /* --- Passage entre la démo et une vraie partie (bornes du musée) --- */
  modeJoueur() {
    this.demo = false;
    this.touches.clear();
    this.score = 0;
    this.record = this.lireRecord();
    this.initialiser();
    this.etincelles = [];
    this.etat = "titre";
  }
  modeDemo() {
    this.demo = true;
    this.touches.clear();
    this.score = 0;
    this.initialiser();
    this.etincelles = [];
    this.etat = "jeu";
  }

  /* --- Commandes ---
     Renvoie vrai si la touche a servi à lancer, mettre en pause ou reprendre :
     le jeu ne doit alors pas l'utiliser (par exemple pour tirer). */
  appuyer(code) {
    this.touches.add(code);
    if (this.demo) return true;
    const pause = code === "KeyP" || code === "Enter";
    if (pause && this.etat === "jeu") {
      this.etat = "pause";
      this.son(330, 0.08, "triangle");
      return true;
    }
    if ((pause || code === "Space") && this.etat === "pause") {
      this.etat = "jeu";
      this.son(520, 0.08, "triangle");
      return true;
    }
    if (
      (code === "Space" || code === "Enter") &&
      (this.etat === "titre" || (this.etat === "fin" && this.temps - this.finDepuis > 0.7))
    ) {
      this.lancer();
      return true;
    }
    return this.etat !== "jeu";
  }
  relacher(code) {
    this.touches.delete(code);
  }
  basculerPause() {
    if (this.etat === "jeu" || this.etat === "pause") (this.appuyer("KeyP"), this.relacher("KeyP"));
  }
  lancer() {
    this.score = 0;
    this.initialiser();
    this.etincelles = [];
    this.etat = "jeu";
    this.son(440, 0.08);
    this.son(880, 0.12, "square", 0.03);
  }
  terminer() {
    const nouveau = this.ecrireRecord();
    if (this.demo) {
      this.score = 0;
      this.initialiser();
      return;
    } // la démo recommence aussitôt
    this.etat = "fin";
    this.finDepuis = this.temps;
    this.son(196, 0.25, "sawtooth");
    this.son(147, 0.45, "sawtooth", 0.035);
    if (this.surFin) this.surFin(this.score, nouveau);
  }
  toucheActive(...codes) {
    return codes.some((c) => this.touches.has(c));
  }

  /* --- Petits sons rétro, générés par le navigateur (désactivés en mode démo) --- */
  son(frequence, duree = 0.08, forme = "square", volume = 0.05) {
    if (this.demo || JeuArcade.muet) return;
    try {
      JeuArcade.audio ||= new (window.AudioContext || window.webkitAudioContext)();
      const a = JeuArcade.audio,
        osc = a.createOscillator(),
        gain = a.createGain();
      if (a.state === "suspended") a.resume();
      osc.type = forme;
      osc.frequency.value = frequence;
      gain.gain.setValueAtTime(volume, a.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + duree);
      osc.connect(gain).connect(a.destination);
      osc.start();
      osc.stop(a.currentTime + duree);
    } catch (e) {
      /* son indisponible : le jeu continue */
    }
  }

  /* --- Effets communs --- */
  eclater(x, y, couleur, n = 12, vitesse = 90) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2,
        v = vitesse * (0.3 + Math.random() * 0.7);
      this.etincelles.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        vie: 0.35 + Math.random() * 0.4,
        couleur,
      });
    }
  }
  secouer(force = 4) {
    this.secousse = Math.max(this.secousse, force);
  }
  eclairer(couleur = "#ffffff", force = 0.35) {
    this.flash = force;
    this.flashCouleur = couleur;
  }

  /* --- Une image : on fait avancer le jeu puis on le dessine --- */
  etape(dt) {
    dt = Math.min(Math.max(dt, 0), 0.05);
    this.temps += dt;
    if (this.etat === "jeu") this.avancer(dt);
    if (this.etat !== "pause") {
      for (const e of this.etincelles) {
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        e.vx *= 0.94;
        e.vy *= 0.94;
        e.vie -= dt;
      }
      this.etincelles = this.etincelles.filter((e) => e.vie > 0);
      this.secousse = this.secousse > 0.3 ? this.secousse * Math.exp(-dt * 12) : 0;
      this.flash = Math.max(0, this.flash - dt * 2.5);
    }
    this.dessiner();
  }

  dessiner() {
    const g = this.g;
    g.fillStyle = "#04040a";
    g.fillRect(0, 0, LARGEUR, HAUTEUR);
    g.save();
    if (this.secousse)
      g.translate(
        Math.round((Math.random() - 0.5) * this.secousse),
        Math.round((Math.random() - 0.5) * this.secousse),
      );
    this.dessinerJeu(g);
    for (const e of this.etincelles) {
      g.globalAlpha = Math.min(1, e.vie * 3);
      g.fillStyle = e.couleur;
      g.fillRect(e.x - 1, e.y - 1, 2, 2);
    }
    g.globalAlpha = 1;
    g.restore();

    // Bandeau du score
    g.font = `12px ${POLICE}`;
    g.textBaseline = "top";
    g.fillStyle = "#e8e6f0";
    g.textAlign = "left";
    g.fillText(`SCORE ${String(this.score).padStart(5, "0")}`, 8, 6);
    g.textAlign = "right";
    g.fillStyle = this.couleur;
    g.fillText(
      `RECORD ${String(Math.max(this.record, this.demo ? 0 : this.score)).padStart(5, "0")}`,
      LARGEUR - 8,
      6,
    );

    // Textes selon l'état
    const clignote = Math.floor(this.temps * 2) % 2 === 0;
    if (this.demo && clignote) this.bandeau("INSÉREZ UNE PIÈCE", HAUTEUR - 30, 12, "#ffffff", true);
    if (this.etat === "titre") {
      this.voile();
      this.bandeau(this.titre, 76, 26, this.couleur, true);
      this.aide.forEach((ligne, i) => this.bandeau(ligne, 116 + i * 14, 8, "#a9a7c2"));
      if (clignote) this.bandeau("APPUYEZ POUR JOUER", 190, 12, "#ffffff", true);
    }
    if (this.etat === "pause") {
      this.voile();
      this.bandeau("PAUSE", 100, 26, this.couleur, true);
      this.bandeau("P OU ESPACE POUR REPRENDRE", 140, 8, "#a9a7c2");
    }
    if (this.etat === "fin") {
      this.voile();
      this.bandeau("PARTIE TERMINÉE", 76, 18, this.couleur, true);
      this.bandeau(`SCORE ${this.score}`, 112, 14);
      if (this.score > 0 && this.score >= this.record)
        this.bandeau("NOUVEAU RECORD !", 138, 12, "#ffb23e", true);
      if (clignote && this.temps - this.finDepuis > 0.7)
        this.bandeau("APPUYEZ POUR REJOUER", 180, 12);
    }

    // Éclair (impact, niveau gagné)
    if (this.flash > 0) {
      g.globalAlpha = this.flash;
      g.fillStyle = this.flashCouleur;
      g.fillRect(0, 0, LARGEUR, HAUTEUR);
      g.globalAlpha = 1;
    }
    // Lignes de balayage façon écran cathodique
    g.fillStyle = "rgba(0,0,0,0.2)";
    for (let y = 0; y < HAUTEUR; y += 3) g.fillRect(0, y, LARGEUR, 1);
  }

  voile() {
    this.g.fillStyle = "rgba(4,4,10,0.76)";
    this.g.fillRect(0, 0, LARGEUR, HAUTEUR);
  }
  /** Texte centré ; il rétrécit tout seul s'il est trop large pour l'écran */
  bandeau(texte, y, taille, couleur = "#e8e6f0", lueur = false) {
    const g = this.g;
    g.font = `${taille}px ${POLICE}`;
    const largeur = g.measureText(texte).width;
    if (largeur > LARGEUR - 20) {
      taille = Math.floor((taille * (LARGEUR - 20)) / largeur);
      g.font = `${taille}px ${POLICE}`;
    }
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillStyle = couleur;
    if (lueur) {
      g.shadowColor = couleur;
      g.shadowBlur = 8;
    }
    g.fillText(texte, LARGEUR / 2, y);
    g.shadowBlur = 0;
    g.textBaseline = "top";
  }
}

/* ---------- Commandes : clavier, souris et tactile ---------- */
const CODES = [
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "Space",
  "Enter",
  "KeyP",
];

/** Convertit un évènement pointeur en coordonnées de l'écran du jeu (canvas affiché à plat) */
export const versCanvas = (canvas) => (e) => {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * LARGEUR,
    y: ((e.clientY - r.top) / r.height) * HAUTEUR,
  };
};

/**
 * Branche le clavier, la souris et le tactile sur un jeu.
 * @param zone     élément qui reçoit les pointeurs (le canvas, ou la scène 3D du musée)
 * @param versJeu  fonction évènement → {x, y} dans l'écran du jeu, ou null si on est à côté
 * Renvoie une fonction pour tout débrancher.
 */
export function brancherCommandes(jeu, zone = jeu.canvas, versJeu = versCanvas(jeu.canvas)) {
  const bas = (e) => {
    if (!CODES.includes(e.code) || e.target.tagName === "INPUT") return;
    e.preventDefault();
    if (!e.repeat) jeu.appuyer(e.code);
  };
  const haut = (e) => {
    if (CODES.includes(e.code)) jeu.relacher(e.code);
  };
  const perte = () => jeu.touches.clear();

  let appui = null;
  const debut = (e) => {
    if (e.button > 0) return;
    const p = versJeu(e);
    if (!p) return;
    appui = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      x0: e.clientX,
      y0: e.clientY,
      t: performance.now(),
      glisse: false,
      lance: false,
    };
    try {
      zone.setPointerCapture(e.pointerId);
    } catch (erreur) {
      /* sans importance */
    }
    if (jeu.etat !== "jeu") {
      if (jeu.etat === "pause") jeu.basculerPause();
      else {
        jeu.appuyer("Enter");
        jeu.relacher("Enter");
      }
      appui.lance = true;
      return;
    }
    jeu.pointeur(p.x, p.y, true);
  };
  const deplacement = (e) => {
    if (appui && e.pointerId !== appui.id) return;
    if (!appui && e.pointerType !== "mouse") return;
    const p = versJeu(e);
    if (p && jeu.etat === "jeu" && !(appui && appui.lance)) jeu.pointeur(p.x, p.y, !!appui);
    if (appui) {
      const dx = e.clientX - appui.x,
        dy = e.clientY - appui.y;
      if (Math.hypot(dx, dy) > 26) {
        if (Math.abs(dx) > Math.abs(dy)) jeu.direction(Math.sign(dx), 0);
        else jeu.direction(0, Math.sign(dy));
        appui.x = e.clientX;
        appui.y = e.clientY;
        appui.glisse = true;
      }
    }
  };
  const fin = (e) => {
    if (!appui || e.pointerId !== appui.id) return;
    const court =
      !appui.glisse &&
      !appui.lance &&
      performance.now() - appui.t < 380 &&
      Math.hypot(e.clientX - appui.x0, e.clientY - appui.y0) < 14;
    if (court && jeu.etat === "jeu") {
      const p = versJeu(e);
      if (p) jeu.toucher(p.x, p.y);
    }
    appui = null;
    jeu.pointeurFin();
  };

  addEventListener("keydown", bas);
  addEventListener("keyup", haut);
  addEventListener("blur", perte);
  zone.addEventListener("pointerdown", debut);
  zone.addEventListener("pointermove", deplacement);
  addEventListener("pointerup", fin);
  addEventListener("pointercancel", fin);

  return function debrancher() {
    removeEventListener("keydown", bas);
    removeEventListener("keyup", haut);
    removeEventListener("blur", perte);
    zone.removeEventListener("pointerdown", debut);
    zone.removeEventListener("pointermove", deplacement);
    removeEventListener("pointerup", fin);
    removeEventListener("pointercancel", fin);
    jeu.touches.clear();
  };
}

/**
 * Fait tourner un jeu dans sa propre boucle, avec clavier, souris et tactile.
 * Utilisé par la page Arcade. Renvoie une fonction pour arrêter le jeu.
 */
export function brancherJeu(jeu, zone = jeu.canvas) {
  let actif = true,
    precedent = performance.now();
  const boucle = (maintenant) => {
    if (!actif) return;
    jeu.etape((maintenant - precedent) / 1000);
    precedent = maintenant;
    requestAnimationFrame(boucle);
  };
  requestAnimationFrame(boucle);
  const debrancher = brancherCommandes(jeu, zone, versCanvas(jeu.canvas));
  return function arreter() {
    actif = false;
    debrancher();
  };
}
