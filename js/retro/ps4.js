/* ============================================================
   CONTINUE ? — Le menu d'accueil de la PlayStation 4 (2013)
   - dessinerMenuPs4 : l'écran d'accueil (barre de fonctions en haut,
     rangée de contenus, fond bleu animé), dessiné par le code
   - MenuPS4 : le menu jouable. On s'y déplace à la manette, on lance
     les jeux du musée depuis la rangée de contenus et la touche PS
     ramène à l'accueil.
   Les logos, icônes et jaquettes d'origine ne sont pas reproduits :
   tout est redessiné ici.
   ============================================================ */
import { JeuArcade } from "../jeux/base.js";

/** L'écran est dessiné dans un repère fixe de 640 × 360, puis mis à l'échelle */
export const PS4_L = 640,
  PS4_H = 360;
const POLICE = "'Figtree', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
const TAU = Math.PI * 2;
const lisse = (p) => p * p * (3 - 2 * p);
const borne = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---------- Contenus ---------- */
/** Rangée de contenus : les jeux du musée, encadrés par les tuiles du système */
export const TUILES = [
  {
    id: "nouveautes",
    nom: "Nouveautés",
    sous: "Activité du musée",
    action: "Afficher",
    page: [
      "Bienvenue dans la salle 4 du musée.",
      "Quatre jeux sont installés sur cette console.",
      "Choisissez une tuile puis appuyez sur ✕ pour démarrer.",
      "La touche PS ramène à l'accueil à tout moment.",
    ],
  },
  {
    id: "labyrinthe",
    jeu: "labyrinthe",
    nom: "Labyrinthe",
    sous: "Jeu · Musée Continue ?",
    action: "Démarrer",
    detail: [
      "Guidez le robot dans le labyrinthe et ramassez toute l'énergie.",
      "Flèches : diriger.",
    ],
  },
  {
    id: "raquettes",
    jeu: "raquettes",
    nom: "Raquettes",
    sous: "Jeu · Musée Continue ?",
    action: "Démarrer",
    detail: [
      "Renvoyez la balle et marquez avant l'ordinateur.",
      "Haut et bas : déplacer la raquette.",
    ],
  },
  {
    id: "serpent",
    jeu: "serpent",
    nom: "Serpent",
    sous: "Jeu · Musée Continue ?",
    action: "Démarrer",
    detail: ["Mangez les pastilles sans toucher les bords ni votre queue.", "Flèches : diriger."],
  },
  {
    id: "briques",
    jeu: "briques",
    nom: "Briques",
    sous: "Jeu · Musée Continue ?",
    action: "Démarrer",
    detail: [
      "Cassez toutes les briques sans laisser tomber la balle.",
      "Gauche et droite : déplacer la raquette.",
    ],
  },
  {
    id: "video",
    nom: "TV et vidéo",
    sous: "Applications",
    action: "Afficher",
    page: [
      "À partir de 2013, la console de salon devient aussi",
      "un lecteur de films, de séries et de musique.",
      "Aucune application vidéo n'est installée dans le musée.",
    ],
  },
  {
    id: "bibliotheque",
    nom: "Bibliothèque",
    sous: "Tous les contenus",
    action: "Afficher",
    page: ["Jeux installés : Labyrinthe, Raquettes, Serpent, Briques.", "Applications : aucune."],
  },
];
/** Barre de fonctions, en haut de l'écran */
export const FONCTIONS = [
  {
    id: "boutique",
    nom: "Boutique",
    page: [
      "La boutique en ligne permet d'acheter et de télécharger",
      "des jeux sans disque. Elle est fermée dans le musée.",
    ],
  },
  { id: "notifications", nom: "Notifications", page: ["Aucune nouvelle notification."] },
  {
    id: "amis",
    nom: "Amis",
    page: [
      "Jouer en ligne avec ses amis devient la norme sur cette",
      "génération. Aucun ami n'est connecté dans le musée.",
    ],
  },
  {
    id: "communautes",
    nom: "Communautés",
    page: ["Les communautés réunissent les joueurs d'un même jeu.", "Aucune communauté rejointe."],
  },
  {
    id: "evenements",
    nom: "Évènements",
    page: ["Tournois et rendez-vous en ligne s'affichent ici.", "Aucun évènement prévu."],
  },
  { id: "messages", nom: "Messages", page: ["Aucun message."] },
  {
    id: "groupe",
    nom: "Groupe",
    page: ["Le groupe permet de discuter à la voix pendant le jeu.", "Aucun groupe en cours."],
  },
  { id: "profil", nom: "Profil", page: ["Visiteur du musée", "Niveau 1 · Hors ligne"] },
  { id: "trophees", nom: "Trophées", page: "trophees" },
  { id: "parametres", nom: "Paramètres", page: "parametres" },
  {
    id: "alimentation",
    nom: "Alimentation",
    page: ["Appuyez sur Échap pour éteindre la console", "et revenir dans le musée."],
  },
];
const JEUX_INSTALLES = TUILES.filter((t) => t.jeu);

/* ---------- Petits outils de dessin ---------- */
function ecrire(g, t, x, y, taille, couleur = "#fff", align = "left", graisse = 400) {
  g.font = `${graisse} ${taille}px ${POLICE}`;
  g.textAlign = align;
  g.textBaseline = "middle";
  g.fillStyle = couleur;
  g.fillText(t, x, y);
}
function arrondi(g, x, y, l, h, r) {
  g.beginPath();
  g.roundRect(x, y, l, h, r);
}

/** Fond du thème par défaut : dégradé bleu, rubans de lumière et poussières */
function fond(g, t) {
  const d = g.createLinearGradient(0, 0, PS4_L, PS4_H);
  d.addColorStop(0, "#0a2f86");
  d.addColorStop(0.55, "#0d56b8");
  d.addColorStop(1, "#0a3a96");
  g.fillStyle = d;
  g.fillRect(0, 0, PS4_L, PS4_H);
  const halo = g.createRadialGradient(
    PS4_L * 0.62,
    PS4_H * 0.55,
    10,
    PS4_L * 0.62,
    PS4_H * 0.55,
    330,
  );
  halo.addColorStop(0, "rgba(90,170,255,0.5)");
  halo.addColorStop(1, "rgba(90,170,255,0)");
  g.fillStyle = halo;
  g.fillRect(0, 0, PS4_L, PS4_H);
  // Rubans : bandes ondulées translucides qui glissent lentement
  for (let k = 0; k < 4; k++) {
    const base = 150 + k * 34,
      amp = 26 + k * 7,
      phase = t * (0.16 + k * 0.035) + k * 1.9,
      epais = 16 + k * 9;
    g.beginPath();
    for (let x = -10; x <= PS4_L + 10; x += 16) {
      const y =
        base + Math.sin(x * 0.006 + phase) * amp + Math.sin(x * 0.013 - phase * 1.4) * amp * 0.35;
      x < 0 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    for (let x = PS4_L + 10; x >= -10; x -= 16) {
      const y =
        base +
        epais +
        Math.sin(x * 0.006 + phase + 0.5) * amp +
        Math.sin(x * 0.013 - phase * 1.4) * amp * 0.35;
      g.lineTo(x, y);
    }
    g.closePath();
    const r = g.createLinearGradient(0, base - amp, 0, base + amp + epais);
    r.addColorStop(0, "rgba(160,215,255,0)");
    r.addColorStop(0.5, `rgba(160,215,255,${0.13 - k * 0.02})`);
    r.addColorStop(1, "rgba(160,215,255,0)");
    g.fillStyle = r;
    g.fill();
  }
  // Poussières lumineuses
  for (let i = 0; i < 26; i++) {
    const x = (i * 97.3 + t * (4 + (i % 5) * 2.2)) % (PS4_L + 20),
      y = 60 + ((i * 53.7) % 280) + Math.sin(t * 0.5 + i) * 8,
      a = 0.12 + 0.2 * Math.abs(Math.sin(t * 0.8 + i * 1.7));
    g.fillStyle = `rgba(210,235,255,${a})`;
    g.beginPath();
    g.arc(x - 10, y, 0.7 + (i % 3) * 0.5, 0, TAU);
    g.fill();
  }
}

/** Icônes de la barre de fonctions, tracées au trait dans un carré de côté 2 centré en (0, 0) */
const ICONES = {
  boutique(g) {
    g.strokeRect(-0.62, -0.3, 1.24, 0.95);
    g.beginPath();
    g.arc(0, -0.3, 0.34, Math.PI, 0);
    g.stroke();
  },
  notifications(g) {
    g.beginPath();
    g.arc(0, 0, 0.72, 0, TAU);
    g.stroke();
    g.beginPath();
    g.moveTo(0, -0.38);
    g.lineTo(0, 0.12);
    g.stroke();
    g.fillRect(-0.07, 0.3, 0.14, 0.14);
  },
  amis(g) {
    [-0.34, 0.34].forEach((x) => {
      g.beginPath();
      g.arc(x, -0.28, 0.25, 0, TAU);
      g.stroke();
      g.beginPath();
      g.arc(x, 0.62, 0.42, Math.PI * 1.08, Math.PI * 1.92);
      g.stroke();
    });
  },
  communautes(g) {
    [
      [0, -0.42],
      [-0.5, 0.3],
      [0.5, 0.3],
    ].forEach(([x, y]) => {
      g.beginPath();
      g.arc(x, y, 0.27, 0, TAU);
      g.stroke();
    });
  },
  evenements(g) {
    g.beginPath();
    g.roundRect(-0.66, -0.5, 1.32, 1.16, 0.12);
    g.stroke();
    g.beginPath();
    g.moveTo(-0.66, -0.14);
    g.lineTo(0.66, -0.14);
    g.moveTo(-0.32, -0.72);
    g.lineTo(-0.32, -0.38);
    g.moveTo(0.32, -0.72);
    g.lineTo(0.32, -0.38);
    g.stroke();
    g.fillRect(-0.12, 0.12, 0.24, 0.24);
  },
  messages(g) {
    g.beginPath();
    g.roundRect(-0.72, -0.52, 1.44, 0.92, 0.16);
    g.stroke();
    g.beginPath();
    g.moveTo(-0.3, 0.4);
    g.lineTo(-0.42, 0.72);
    g.lineTo(0.02, 0.4);
    g.stroke();
  },
  groupe(g) {
    g.beginPath();
    g.arc(0, 0.05, 0.6, Math.PI, 0);
    g.stroke();
    [-0.6, 0.6].forEach((x) => {
      g.beginPath();
      g.roundRect(x - 0.14, 0, 0.28, 0.5, 0.1);
      g.stroke();
    });
    g.beginPath();
    g.moveTo(0.6, 0.5);
    g.quadraticCurveTo(0.55, 0.78, 0.15, 0.78);
    g.stroke();
  },
  profil(g) {
    g.beginPath();
    g.arc(0, -0.3, 0.32, 0, TAU);
    g.stroke();
    g.beginPath();
    g.arc(0, 0.82, 0.62, Math.PI * 1.1, Math.PI * 1.9);
    g.stroke();
  },
  trophees(g) {
    g.beginPath();
    g.moveTo(-0.4, -0.62);
    g.lineTo(0.4, -0.62);
    g.lineTo(0.34, -0.1);
    g.quadraticCurveTo(0, 0.4, -0.34, -0.1);
    g.closePath();
    g.stroke();
    g.beginPath();
    g.moveTo(0, 0.22);
    g.lineTo(0, 0.5);
    g.moveTo(-0.34, 0.62);
    g.lineTo(0.34, 0.62);
    g.stroke();
    [-1, 1].forEach((c) => {
      g.beginPath();
      g.arc(
        c * 0.46,
        -0.36,
        0.2,
        c > 0 ? -Math.PI / 2 : Math.PI / 2,
        c > 0 ? Math.PI / 2 : Math.PI * 1.5,
      );
      g.stroke();
    });
  },
  parametres(g) {
    // Boîte à outils
    g.beginPath();
    g.roundRect(-0.72, -0.28, 1.44, 0.92, 0.1);
    g.stroke();
    g.beginPath();
    g.roundRect(-0.26, -0.58, 0.52, 0.3, 0.08);
    g.stroke();
    g.beginPath();
    g.moveTo(-0.72, 0.08);
    g.lineTo(0.72, 0.08);
    g.stroke();
  },
  alimentation(g) {
    g.beginPath();
    g.arc(0, 0.06, 0.58, -Math.PI * 0.3, Math.PI * 1.3);
    g.stroke();
    g.beginPath();
    g.moveTo(0, -0.72);
    g.lineTo(0, -0.05);
    g.stroke();
  },
};
function icone(g, id, x, y, rayon, couleur) {
  g.save();
  g.translate(x, y);
  g.scale(rayon, rayon);
  g.lineWidth = 1.6 / rayon;
  g.lineCap = "round";
  g.lineJoin = "round";
  g.strokeStyle = couleur;
  g.fillStyle = couleur;
  ICONES[id](g);
  g.restore();
}

/** Jaquettes dessinées des tuiles, dans un carré de côté c dont le coin est en (x, y) */
function jaquette(g, tuile, x, y, c, t) {
  g.save();
  g.beginPath();
  g.rect(x, y, c, c);
  g.clip();
  g.translate(x, y);
  const u = c / 100; // on dessine dans un carré de 100
  g.scale(u, u);
  const degrade = (a, b) => {
    const d = g.createLinearGradient(0, 0, 100, 100);
    d.addColorStop(0, a);
    d.addColorStop(1, b);
    g.fillStyle = d;
    g.fillRect(0, 0, 100, 100);
  };
  if (tuile.id === "labyrinthe") {
    degrade("#0b1036", "#1a2a7a");
    g.strokeStyle = "#7c9cff";
    g.lineWidth = 3;
    [
      [12, 14, 76, 14],
      [12, 14, 12, 62],
      [88, 14, 88, 62],
      [30, 32, 70, 32],
      [30, 32, 30, 48],
      [70, 32, 70, 48],
      [12, 62, 40, 62],
      [60, 62, 88, 62],
    ].forEach(([a, b, d, e]) => {
      g.beginPath();
      g.moveTo(a, b);
      g.lineTo(d, e);
      g.stroke();
    });
    g.fillStyle = "#ffe17c";
    for (let i = 0; i < 6; i++) g.fillRect(20 + i * 11, 22, 3, 3);
    for (let i = 0; i < 3; i++) g.fillRect(40 + i * 9, 52, 3, 3);
    // Le robot du musée
    g.fillStyle = "#3cf2c8";
    g.fillRect(43, 38, 14, 12);
    g.fillStyle = "#0b1036";
    g.fillRect(46, 41, 3, 3);
    g.fillRect(52, 41, 3, 3);
  } else if (tuile.id === "raquettes") {
    degrade("#04261f", "#0c5a4a");
    g.fillStyle = "rgba(60,242,200,0.35)";
    for (let k = 0; k < 7; k++) g.fillRect(49, 10 + k * 9, 2, 5);
    g.fillStyle = "#3cf2c8";
    g.fillRect(14, 24, 5, 24);
    g.fillRect(81, 34, 5, 24);
    g.fillStyle = "#ffffff";
    g.fillRect(58, 30, 6, 6);
  } else if (tuile.id === "serpent") {
    degrade("#10260a", "#2f6a16");
    g.strokeStyle = "#9dff5c";
    g.lineWidth = 8;
    g.lineJoin = "round";
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(16, 54);
    g.lineTo(40, 54);
    g.lineTo(40, 30);
    g.lineTo(66, 30);
    g.lineTo(66, 46);
    g.stroke();
    g.fillStyle = "#10260a";
    g.fillRect(63, 44, 2.5, 2.5);
    g.fillRect(67.5, 44, 2.5, 2.5);
    g.fillStyle = "#ffcf5a";
    g.beginPath();
    g.arc(82, 54, 4.5, 0, TAU);
    g.fill();
  } else if (tuile.id === "briques") {
    degrade("#2a0a22", "#7a1650");
    ["#ff4f9a", "#ffb23e", "#ffe17c", "#3cf2c8"].forEach((c2, j) => {
      g.fillStyle = c2;
      for (let i = 0; i < 6; i++)
        if ((i + j) % 5 !== 3) g.fillRect(11 + i * 13.4, 14 + j * 8, 11.4, 6);
    });
    g.fillStyle = "#ffffff";
    g.fillRect(52, 52, 4, 4);
    g.fillStyle = "#e8e6f0";
    g.fillRect(36, 64, 26, 4);
  } else if (tuile.id === "nouveautes") {
    degrade("#1d7fe0", "#0a4cae");
    g.fillStyle = "rgba(255,255,255,0.92)";
    [
      [22, 26, 56],
      [22, 42, 40],
      [22, 58, 48],
    ].forEach(([a, b, l]) => {
      g.fillRect(a, b, 9, 9);
      g.fillRect(a + 15, b + 2, l - 15, 5);
    });
  } else if (tuile.id === "video") {
    degrade("#3b4a63", "#1c2536");
    g.strokeStyle = "#ffffff";
    g.lineWidth = 3;
    g.strokeRect(24, 26, 52, 34);
    g.fillStyle = "#ffffff";
    g.beginPath();
    g.moveTo(44, 35);
    g.lineTo(60, 43);
    g.lineTo(44, 51);
    g.closePath();
    g.fill();
    g.fillRect(40, 66, 20, 3);
  } else {
    degrade("#30486e", "#16233c");
    g.fillStyle = "#ffffff";
    for (let j = 0; j < 2; j++)
      for (let i = 0; i < 3; i++) g.fillRect(24 + i * 19, 28 + j * 19, 14, 14);
  }
  if (tuile.jeu) {
    // Bandeau du titre en bas de la jaquette
    g.fillStyle = "rgba(0,0,0,0.42)";
    g.fillRect(0, 76, 100, 24);
    ecrire(g, tuile.nom.toUpperCase(), 50, 88.5, 10.5, "#ffffff", "center", 700);
  }
  g.restore();
  void t;
}

/* ---------- Mise en page (partagée par le dessin et le pointeur) ---------- */
const X_TUILE = 76, // bord gauche de la tuile choisie
  Y_RANGEE = 128,
  GRANDE = 150,
  PETITE = 104,
  ECART = 6;
const X_FONCTION = 92,
  PAS_FONCTION = 45;
const MONTEE = 150; // défilement de l'écran quand on descend sur les détails
/** Rectangle de la tuile i quand la tuile `choix` est choisie (defil = position lissée du choix) */
function rectTuile(i, defil, descente = 0) {
  const y = Y_RANGEE + descente;
  const d = i - defil;
  if (Math.abs(d) < 1) {
    // Tuile en train de grandir ou de rétrécir
    const p = 1 - Math.abs(d),
      c = PETITE + (GRANDE - PETITE) * lisse(p);
    const x = d >= 0 ? X_TUILE + d * (GRANDE + ECART) : X_TUILE + d * (PETITE + ECART);
    return { x, y, c };
  }
  if (d > 0) return { x: X_TUILE + GRANDE + ECART + (d - 1) * (PETITE + ECART), y, c: PETITE };
  return { x: X_TUILE + d * (PETITE + ECART), y, c: PETITE };
}
const xFonction = (i) => X_FONCTION + i * PAS_FONCTION;

/**
 * Dessine l'écran d'accueil.
 * @param etat { tuile, fonction, zone: "contenu" | "fonctions" | "details", defil,
 *               monte (0 à 1 : barre de fonctions ouverte), bas (0 à 1 : détails ouverts),
 *               trophees, record }
 */
export function dessinerMenuPs4(g, w, h, t, etat = {}) {
  const {
    tuile = 1,
    fonction = 0,
    zone = "contenu",
    defil = tuile,
    monte = zone === "fonctions" ? 1 : 0,
  } = etat;
  g.save();
  g.scale(w / PS4_L, h / PS4_H);
  fond(g, t);
  const m = lisse(borne(monte, 0, 1)),
    b = lisse(borne(etat.bas ?? (zone === "details" ? 1 : 0), 0, 1));
  g.save();
  g.translate(0, -b * MONTEE);

  /* --- En-tête : message à gauche ; profil, trophées et heure à droite --- */
  g.globalAlpha = 1 - m * 0.75;
  icone(g, "notifications", 40, 22, 6, "rgba(255,255,255,0.85)");
  ecrire(g, "Bienvenue au musée Continue ?", 54, 22.5, 10.5, "rgba(255,255,255,0.85)");
  const maintenant = new Date();
  const heure = maintenant.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  ecrire(g, heure, PS4_L - 34, 22.5, 12, "#ffffff", "right", 500);
  icone(g, "trophees", PS4_L - 96, 22, 6, "rgba(255,255,255,0.9)");
  ecrire(g, String(etat.trophees ?? 0), PS4_L - 86, 22.5, 10.5, "rgba(255,255,255,0.9)");
  ecrire(g, "Visiteur", PS4_L - 116, 22.5, 10.5, "rgba(255,255,255,0.9)", "right");
  g.fillStyle = "#7fc1ff";
  g.beginPath();
  g.arc(PS4_L - 170, 22, 8, 0, TAU);
  g.fill();
  icone(g, "profil", PS4_L - 170, 23, 5.5, "#0a3a96");
  icone(g, "amis", PS4_L - 212, 22, 6.5, "rgba(255,255,255,0.9)");
  ecrire(g, "0", PS4_L - 201, 22.5, 10.5, "rgba(255,255,255,0.9)");
  g.globalAlpha = 1;

  /* --- Barre de fonctions --- */
  const yF = 62 + m * 30;
  FONCTIONS.forEach((f, i) => {
    const actif = zone === "fonctions" && i === fonction;
    const x = xFonction(i);
    const r = 9 + m * 4 + (actif ? 3 : 0);
    if (actif) {
      g.fillStyle = "rgba(255,255,255,0.16)";
      g.beginPath();
      g.arc(x, yF, r + 9, 0, TAU);
      g.fill();
      g.strokeStyle = `rgba(255,255,255,${0.55 + 0.35 * Math.sin(t * 4)})`;
      g.lineWidth = 1.4;
      g.stroke();
    }
    icone(g, f.id, x, yF, r, `rgba(255,255,255,${actif ? 1 : 0.55 + m * 0.25})`);
    if (actif) ecrire(g, f.nom, x, yF + r + 22, 13, "#ffffff", "center", 500);
  });

  /* --- Rangée de contenus --- */
  const descente = m * 62;
  g.globalAlpha = 1 - m * 0.45;
  TUILES.forEach((tu, i) => {
    const r = rectTuile(i, defil, descente);
    if (r.x > PS4_L || r.x + r.c < 0) return;
    jaquette(g, tu, r.x, r.y, r.c, t);
  });
  // Tuile choisie : cadre lumineux, bandeau d'action et titre
  const choisie = TUILES[borne(Math.round(defil), 0, TUILES.length - 1)];
  const rc = rectTuile(Math.round(defil), defil, descente);
  if (zone === "contenu" || zone === "details") {
    g.strokeStyle = `rgba(255,255,255,${0.7 + 0.3 * Math.sin(t * 4)})`;
    g.lineWidth = 2;
    g.strokeRect(rc.x - 1, rc.y - 1, rc.c + 2, rc.c + 2);
  }
  const yB = rc.y + rc.c;
  g.globalAlpha = (1 - m) * (1 - m);
  g.fillStyle = "rgba(255,255,255,0.2)";
  g.fillRect(rc.x, yB, rc.c, 24);
  ecrire(g, choisie.action, rc.x + 12, yB + 12.5, 12.5, "#ffffff", "left", 500);
  // Petit repère « options »
  g.strokeStyle = "rgba(255,255,255,0.8)";
  g.lineWidth = 1;
  arrondi(g, rc.x + rc.c - 26, yB + 7, 16, 10, 5);
  g.stroke();
  ecrire(g, choisie.nom, rc.x + rc.c + 16, yB + 12.5, 17, "#ffffff", "left", 300);
  ecrire(g, choisie.sous, rc.x + rc.c + 16, yB + 34, 10.5, "rgba(255,255,255,0.75)");
  g.globalAlpha = 1;

  /* --- Détails du contenu choisi, sous la rangée (touche bas) --- */
  if (b > 0.01) {
    const y0 = Y_RANGEE + GRANDE + 64;
    g.globalAlpha = b;
    g.fillStyle = "rgba(4,18,58,0.45)";
    g.fillRect(0, y0, PS4_L, PS4_H);
    g.fillStyle = "rgba(255,255,255,0.3)";
    g.fillRect(X_TUILE, y0, PS4_L - 2 * X_TUILE, 1);
    ecrire(g, "Aperçu", X_TUILE, y0 + 24, 15, "#ffffff", "left", 500);
    const lignes = choisie.detail || choisie.page || [];
    lignes
      .slice(0, 3)
      .forEach((ligne, i) =>
        ecrire(g, ligne, X_TUILE, y0 + 52 + i * 20, 11.5, "rgba(255,255,255,0.9)"),
      );
    if (choisie.jeu) {
      ecrire(
        g,
        "Meilleur score",
        PS4_L - X_TUILE,
        y0 + 24,
        10.5,
        "rgba(255,255,255,0.75)",
        "right",
      );
      ecrire(g, String(etat.record ?? 0), PS4_L - X_TUILE, y0 + 50, 24, "#ffffff", "right", 300);
    }
    g.globalAlpha = 1;
  }
  g.restore();

  /* --- Aide en bas de l'écran --- */
  const aide = (x, signe, texteAide) => {
    g.strokeStyle = "rgba(255,255,255,0.85)";
    g.lineWidth = 1;
    g.beginPath();
    g.arc(x, PS4_H - 18, 6.5, 0, TAU);
    g.stroke();
    ecrire(g, signe, x, PS4_H - 17.5, 8.5, "#ffffff", "center", 700);
    ecrire(g, texteAide, x + 11, PS4_H - 17.5, 10, "rgba(255,255,255,0.85)");
  };
  aide(PS4_L - 150, "✕", "Valider");
  aide(PS4_L - 84, "○", "Retour");
  g.restore();
}

/* ---------- Séquence de démarrage ---------- */
export function dessinerDemarragePs4(g, w, h, t) {
  g.save();
  g.scale(w / PS4_L, h / PS4_H);
  g.fillStyle = "#000";
  g.fillRect(0, 0, PS4_L, PS4_H);
  if (t > 0.5 && t < 3.3) {
    // Lueur bleue qui pulse, comme le voyant de la console, puis le nom
    const a = Math.min(1, (t - 0.5) / 0.8) * Math.min(1, (3.3 - t) / 0.5);
    const halo = g.createRadialGradient(PS4_L / 2, PS4_H / 2, 4, PS4_L / 2, PS4_H / 2, 230);
    halo.addColorStop(0, `rgba(60,140,255,${0.5 * a})`);
    halo.addColorStop(1, "rgba(60,140,255,0)");
    g.fillStyle = halo;
    g.fillRect(0, 0, PS4_L, PS4_H);
    g.globalAlpha = a;
    const l = 150 * lisse(Math.min(1, (t - 0.5) / 1.1));
    g.fillStyle = "#bfe0ff";
    g.fillRect(PS4_L / 2 - l, PS4_H / 2 + 22, l * 2, 1.5);
    ecrire(g, "CONSOLE DE SALON · 2013", PS4_L / 2, PS4_H / 2 - 4, 22, "#ffffff", "center", 300);
    ecrire(
      g,
      "Huitième génération",
      PS4_L / 2,
      PS4_H / 2 + 42,
      11,
      "rgba(255,255,255,0.7)",
      "center",
    );
    g.globalAlpha = 1;
  }
  g.restore();
  if (t >= 3.3) {
    // L'accueil apparaît en fondu
    g.globalAlpha = Math.min(1, (t - 3.3) / 0.7);
    dessinerMenuPs4(g, w, h, t);
    g.globalAlpha = 1;
  }
}

/* ============================================================
   LE MENU JOUABLE
   ============================================================ */
const lireRecord = (nom) => {
  try {
    return Number(localStorage.getItem("continue-record-" + nom)) || 0;
  } catch (e) {
    return 0;
  }
};

export class MenuPS4 extends JeuArcade {
  constructor(canvas, options = {}) {
    super(canvas, { ...options, nom: "ps4", titre: "PS4", demo: false });
    // Écran en haute définition : le repère de 640 × 360 est doublé
    canvas.width = PS4_L * 2;
    canvas.height = PS4_H * 2;
    this.g = canvas.getContext("2d");
    this.etat = "jeu"; // le menu est toujours actif : pas d'écran titre
  }
  initialiser() {
    this.fermerJeu?.();
    this.tuile = 1;
    this.fonction = 0;
    this.zone = "contenu";
    this.defil = 1;
    this.monte = 0;
    this.bas = 0;
    this.page = null; // { titre, lignes } : panneau ouvert par-dessus l'accueil
    this.lancement = null; // { tuile, t } : animation avant le jeu
    this.jeu = null; // jeu en cours
    this.toile = null;
    this.chargement = 0;
  }
  dispose() {
    this.fermerJeu();
  }
  fermerJeu() {
    this.jeu?.touches?.clear();
    this.jeu = null;
    this.toile = null;
    this.lancement = null;
  }
  // Les boutons de la barre d'outils du lecteur
  lancer() {
    this.fermerJeu();
    this.page = null;
    this.zone = "contenu";
    this.etat = "jeu";
    this.bip(660);
  }
  basculerPause() {
    if (this.jeu) this.jeu.basculerPause();
  }
  bip(f, duree = 0.05) {
    this.son(f, duree, "sine", 0.045);
  }

  /* --- Commandes --- */
  appuyer(code) {
    this.touches.add(code);
    if (code === "KeyC") {
      // Touche PS : retour à l'accueil
      if (this.jeu || this.lancement || this.page) {
        this.fermerJeu();
        this.page = null;
        this.bip(520, 0.09);
      }
      return true;
    }
    if (this.jeu) return this.jeu.appuyer(code);
    if (this.lancement) return true;
    const valider = code === "Space" || code === "Enter",
      retour = code === "KeyE" || code === "KeyX";
    if (this.page) {
      if (this.page.reglage && valider) {
        JeuArcade.muet = !JeuArcade.muet;
        this.page.lignes = this.lignesParametres();
        this.bip(880);
      } else if (valider || retour) {
        this.page = null;
        this.bip(440);
      }
      return true;
    }
    if (this.zone === "contenu") {
      if (code === "ArrowRight") this.choisirTuile(this.tuile + 1);
      else if (code === "ArrowLeft") this.choisirTuile(this.tuile - 1);
      else if (code === "ArrowUp") {
        this.zone = "fonctions";
        this.bip(700);
      } else if (code === "ArrowDown") {
        this.zone = "details";
        this.bip(600);
      } else if (valider) this.ouvrirTuile();
    } else if (this.zone === "details") {
      if (code === "ArrowRight") this.choisirTuile(this.tuile + 1);
      else if (code === "ArrowLeft") this.choisirTuile(this.tuile - 1);
      else if (code === "ArrowUp" || retour) {
        this.zone = "contenu";
        this.bip(700);
      } else if (valider) this.ouvrirTuile();
    } else {
      if (code === "ArrowRight") this.choisirFonction(this.fonction + 1);
      else if (code === "ArrowLeft") this.choisirFonction(this.fonction - 1);
      else if (code === "ArrowDown" || retour) {
        this.zone = "contenu";
        this.bip(600);
      } else if (valider) this.ouvrirFonction();
    }
    return true;
  }
  relacher(code) {
    this.touches.delete(code);
    this.jeu?.relacher(code);
  }
  choisirTuile(i) {
    const n = borne(i, 0, TUILES.length - 1);
    if (n === this.tuile) return;
    this.tuile = n;
    this.bip(760);
  }
  choisirFonction(i) {
    const n = borne(i, 0, FONCTIONS.length - 1);
    if (n === this.fonction) return;
    this.fonction = n;
    this.bip(760);
  }
  ouvrirTuile() {
    const tu = TUILES[this.tuile];
    this.bip(980, 0.09);
    if (tu.jeu) this.lancement = { tuile: tu, t: 0 };
    else this.page = { titre: tu.nom, lignes: tu.page };
  }
  ouvrirFonction() {
    const f = FONCTIONS[this.fonction];
    this.bip(980, 0.09);
    if (f.page === "trophees")
      this.page = {
        titre: f.nom,
        lignes: JEUX_INSTALLES.map((j) => {
          const r = lireRecord(j.jeu);
          return `${j.nom} — ${r ? "meilleur score : " + r : "aucune partie jouée"}`;
        }),
      };
    else if (f.page === "parametres")
      this.page = { titre: f.nom, lignes: this.lignesParametres(), reglage: true };
    else this.page = { titre: f.nom, lignes: f.page };
  }
  lignesParametres() {
    return [
      `Son : ${JeuArcade.muet ? "coupé" : "activé"}`,
      "Appuyez sur ✕ pour changer ce réglage.",
    ];
  }
  compterTrophees() {
    return JEUX_INSTALLES.filter((j) => lireRecord(j.jeu) > 0).length;
  }

  /* --- Souris et tactile (le lecteur donne des positions dans un écran de 320 × 240) --- */
  versEcran(x, y) {
    return { x: (x / 320) * PS4_L, y: (y / 240) * PS4_H };
  }
  versJeu(x, y) {
    const p = this.versEcran(x, y);
    return { x: ((p.x - 80) / 480) * 320, y: (p.y / PS4_H) * 240 };
  }
  pointeur(x, y, presse) {
    if (this.jeu?.etat === "jeu") {
      const p = this.versJeu(x, y);
      this.jeu.pointeur(p.x, p.y, presse);
    }
  }
  pointeurFin() {
    this.jeu?.pointeurFin();
  }
  direction(dx, dy) {
    if (this.jeu) return this.jeu.direction(dx, dy);
    if (this.page || this.lancement) return;
    // Balayage : on fait défiler la rangée ou on change de zone
    if (dx) this.appuyer(dx < 0 ? "ArrowRight" : "ArrowLeft");
    else if (dy) this.appuyer(dy < 0 ? "ArrowUp" : "ArrowDown");
    this.touches.clear();
  }
  toucher(x, y) {
    if (this.jeu) {
      if (this.jeu.etat !== "jeu") {
        this.jeu.appuyer("Enter");
        this.jeu.relacher("Enter");
      } else {
        const p = this.versJeu(x, y);
        this.jeu.toucher(p.x, p.y);
      }
      return;
    }
    if (this.lancement) return;
    if (this.page) {
      this.appuyer("Space");
      this.touches.clear();
      return;
    }
    if (this.zone === "details") {
      this.zone = "contenu";
      return this.bip(700);
    }
    const p = this.versEcran(x, y);
    const yF = 62 + lisse(this.monte) * 30;
    const iF = FONCTIONS.findIndex((f, i) => Math.hypot(p.x - xFonction(i), p.y - yF) < 20);
    if (iF >= 0) {
      if (this.zone === "fonctions" && iF === this.fonction) return this.ouvrirFonction();
      this.zone = "fonctions";
      this.fonction = iF;
      return this.bip(760);
    }
    const descente = lisse(this.monte) * 62;
    const iT = TUILES.findIndex((tu, i) => {
      const r = rectTuile(i, this.tuile, descente);
      return (
        p.x >= r.x &&
        p.x <= r.x + r.c &&
        p.y >= r.y &&
        p.y <= r.y + r.c + (i === this.tuile ? 24 : 0)
      );
    });
    if (iT >= 0) {
      if (this.zone === "contenu" && iT === this.tuile) return this.ouvrirTuile();
      this.zone = "contenu";
      this.tuile = iT;
      this.bip(760);
    }
  }

  /* --- Lancement d'un jeu installé --- */
  async demarrerJeu(tuile) {
    const numero = ++this.chargement;
    try {
      const { creerJeu } = await import("../jeux/index.js");
      if (numero !== this.chargement || !this.lancement) return;
      this.toile = document.createElement("canvas");
      this.jeu = creerJeu(tuile.jeu, this.toile);
      this.lancement = null;
    } catch (erreur) {
      console.error(erreur);
      this.lancement = null;
      this.page = { titre: tuile.nom, lignes: ["Le jeu n'a pas pu démarrer."] };
    }
  }

  /* --- Une image --- */
  etape(dt) {
    dt = Math.min(Math.max(dt, 0), 0.05);
    this.temps += dt;
    const g = this.g,
      w = this.canvas.width,
      h = this.canvas.height;
    if (this.jeu) {
      // Jeu en 4/3 au centre de l'écran 16/9
      this.jeu.etape(dt);
      g.fillStyle = "#000";
      g.fillRect(0, 0, w, h);
      g.imageSmoothingEnabled = false;
      g.drawImage(this.toile, w * 0.125, 0, w * 0.75, h);
      g.imageSmoothingEnabled = true;
      g.save();
      g.scale(w / PS4_L, h / PS4_H);
      g.translate(40, PS4_H / 2);
      g.rotate(-Math.PI / 2);
      ecrire(g, "Touche PS (C) : accueil", 0, 0, 9.5, "rgba(255,255,255,0.4)", "center");
      g.restore();
      return;
    }
    // Animations de l'accueil
    const k = 1 - Math.exp(-dt * 14);
    this.defil += (this.tuile - this.defil) * k;
    if (Math.abs(this.tuile - this.defil) < 0.002) this.defil = this.tuile;
    this.monte = borne(this.monte + (this.zone === "fonctions" ? 1 : -1) * dt * 5, 0, 1);
    this.bas = borne(this.bas + (this.zone === "details" ? 1 : -1) * dt * 4, 0, 1);
    dessinerMenuPs4(g, w, h, this.temps, {
      tuile: this.tuile,
      fonction: this.fonction,
      zone: this.zone,
      defil: this.defil,
      monte: this.monte,
      bas: this.bas,
      trophees: this.compterTrophees(),
      record: TUILES[this.tuile].jeu ? lireRecord(TUILES[this.tuile].jeu) : 0,
    });
    g.save();
    g.scale(w / PS4_L, h / PS4_H);
    if (this.page) this.dessinerPage(g);
    if (this.lancement) {
      // La jaquette grandit jusqu'à remplir l'écran, puis le jeu démarre
      const l = this.lancement;
      l.t += dt;
      const p = lisse(Math.min(1, l.t / 0.7));
      const r = rectTuile(this.tuile, this.tuile);
      r.y -= lisse(this.bas) * MONTEE;
      const c = r.c + (PS4_H * 1.25 - r.c) * p,
        cx = r.x + r.c / 2 + (PS4_L / 2 - r.x - r.c / 2) * p,
        cy = r.y + r.c / 2 + (PS4_H / 2 - r.y - r.c / 2) * p;
      g.fillStyle = `rgba(0,0,0,${p * 0.8})`;
      g.fillRect(0, 0, PS4_L, PS4_H);
      jaquette(g, l.tuile, cx - c / 2, cy - c / 2, c, this.temps);
      g.fillStyle = `rgba(0,0,0,${Math.max(0, (l.t - 0.6) / 0.4)})`;
      g.fillRect(0, 0, PS4_L, PS4_H);
      if (l.t >= 1 && !l.demande) {
        l.demande = true;
        this.demarrerJeu(l.tuile);
      }
    }
    g.restore();
  }
  dessinerPage(g) {
    const { titre, lignes } = this.page;
    g.fillStyle = "rgba(4,18,58,0.82)";
    g.fillRect(0, 0, PS4_L, PS4_H);
    ecrire(g, titre, 76, 70, 26, "#ffffff", "left", 300);
    g.fillStyle = "rgba(255,255,255,0.35)";
    g.fillRect(76, 94, PS4_L - 152, 1);
    lignes.forEach((ligne, i) => {
      const y = 124 + i * 30;
      if (this.page.reglage && i === 0) {
        g.fillStyle = "rgba(255,255,255,0.18)";
        g.fillRect(76, y - 14, PS4_L - 152, 28);
        g.strokeStyle = `rgba(255,255,255,${0.6 + 0.4 * Math.sin(this.temps * 4)})`;
        g.lineWidth = 1.5;
        g.strokeRect(76, y - 14, PS4_L - 152, 28);
      }
      ecrire(g, ligne, 90, y + 0.5, 13.5, "rgba(255,255,255,0.92)");
    });
    ecrire(g, "✕ ou ○ : retour", PS4_L - 76, PS4_H - 17.5, 10, "rgba(255,255,255,0.85)", "right");
  }
}
