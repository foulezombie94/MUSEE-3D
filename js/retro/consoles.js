/* ============================================================
   CONTINUE ? — Les consoles jouables
   - données des sept consoles exposées dans les salles 3 et 4
   - écrans dessinés par le code : écran d'attente (la télé du musée)
     et séquence de démarrage (quand on lance le jeu)
   - habillage du lecteur : télé de l'époque autour de l'écran et
     manette de la console, dont les boutons sont cliquables
   Les logos et marques déposées ne sont pas reproduits.
   ============================================================ */
import { dessinerMenuPs4, dessinerDemarragePs4, TUILES } from "./ps4.js";

export const CONSOLES = [
  {
    id: "nes",
    expo: "nes",
    nom: "NES",
    annee: 1985,
    jeu: "mario",
    salle: "consoles",
    tele: "bois",
    duree: 1.8,
  },
  {
    id: "gameboy",
    expo: "gameboy",
    nom: "Game Boy",
    annee: 1989,
    jeu: "tetrisgb",
    salle: "consoles",
    tele: "portable",
    duree: 3.2,
  },
  {
    id: "megadrive",
    expo: "megadrive",
    nom: "Mega Drive",
    annee: 1988,
    jeu: "sonic",
    salle: "consoles",
    tele: "noir",
    duree: 2.8,
  },
  {
    id: "playstation",
    expo: "playstation",
    nom: "PlayStation",
    annee: 1994,
    jeu: "racing",
    salle: "moderne",
    tele: "gris",
    duree: 4.6,
  },
  {
    id: "n64",
    expo: "mario64",
    nom: "Nintendo 64",
    annee: 1996,
    jeu: "mario64",
    salle: "moderne",
    tele: "noir",
    duree: 2.8,
  },
  {
    id: "wii",
    expo: "wii",
    nom: "Wii",
    annee: 2006,
    jeu: "bowling",
    salle: "moderne",
    tele: "plat",
    duree: 4.2,
  },
  {
    // Pas de tableau associé : le poste est adossé au mur du fond de la salle 4
    id: "ps4",
    expo: null,
    place: "fond",
    nom: "PlayStation 4",
    annee: 2013,
    jeu: "ps4",
    salle: "moderne",
    tele: "plat",
    duree: 4.2,
  },
];
export const infoConsole = (id) => CONSOLES.find((c) => c.id === id);
export const consoleDuJeu = (jeu) => CONSOLES.find((c) => c.jeu === jeu);
/** Taille logique de l'écran : 4/3, sauf la Wii (16/9) et la PS4 (16/9, haute définition) */
export const tailleEcran = (id) =>
  id === "ps4" ? [640, 360] : id === "wii" ? [427, 240] : [320, 240];

const POLICE = "'Silkscreen', 'Courier New', monospace";
const texte = (g, t, x, y, taille, couleur, align = "center") => {
  g.font = `700 ${taille}px ${POLICE}`;
  g.textAlign = align;
  g.textBaseline = "middle";
  g.fillStyle = couleur;
  g.fillText(t, x, y);
};
const clignote = (t, vitesse = 1.6) => Math.floor(t * vitesse * 2) % 2 === 0;
const boucle = (x, l) => ((x % l) + l) % l;

/* ---------- Écrans d'attente (télés du musée) ---------- */
function attenteNes(g, w, h, t) {
  g.fillStyle = "#5c94fc";
  g.fillRect(0, 0, w, h);
  // Nuages
  g.fillStyle = "#fcfcfc";
  for (let i = 0; i < 4; i++) {
    const x = boucle(i * 100 - t * 10, w + 80) - 40,
      y = 34 + (i % 2) * 26;
    g.fillRect(x, y, 36, 10);
    g.fillRect(x + 6, y - 6, 24, 6);
    g.fillRect(x + 12, y - 10, 12, 4);
  }
  // Collines
  g.fillStyle = "#00a800";
  for (let i = 0; i < 3; i++) {
    const x = boucle(i * 140 - t * 22, w + 160) - 80;
    g.beginPath();
    g.ellipse(x, h - 32, 56, 38 + (i % 2) * 14, 0, Math.PI, 0);
    g.fill();
  }
  // Sol en briques
  const d = boucle(t * 44, 16);
  for (let y = h - 32; y < h; y += 16)
    for (let x = -16; x < w + 16; x += 16) {
      g.fillStyle = "#c84c0c";
      g.fillRect(x - d, y, 16, 16);
      g.fillStyle = "#000";
      g.fillRect(x - d, y + 15, 16, 1);
      g.fillRect(x - d + ((y / 16) % 2 ? 8 : 15), y, 1, 16);
      g.fillStyle = "#fcbcb0";
      g.fillRect(x - d, y, 15, 1);
    }
  // Bloc mystère qui flotte
  const bx = boucle(200 - t * 44, w + 40) - 20;
  g.fillStyle = "#f8b800";
  g.fillRect(bx, h - 96, 16, 16);
  g.fillStyle = "#000";
  g.fillRect(bx + 6, h - 92, 4, 2);
  g.fillRect(bx + 8, h - 90, 2, 4);
  g.fillRect(bx + 7, h - 84, 2, 2);
  // Panneau titre
  g.fillStyle = "#c84c0c";
  g.fillRect(w / 2 - 110, 70, 220, 64);
  g.fillStyle = "#fcbcb0";
  g.fillRect(w / 2 - 106, 74, 212, 56);
  g.fillStyle = "#c84c0c";
  g.fillRect(w / 2 - 102, 78, 204, 48);
  texte(g, "CONSOLE 8 BITS", w / 2, 94, 14, "#fcfcfc");
  texte(g, "1985", w / 2, 114, 12, "#fcbcb0");
  if (clignote(t)) texte(g, "APPUYEZ SUR START", w / 2, 162, 10, "#fcfcfc");
}
const LCD = ["#0f380f", "#306230", "#8bac0f", "#9bbc0f"];
function attenteGameboy(g, w, h, t) {
  g.fillStyle = LCD[3];
  g.fillRect(0, 0, w, h);
  const c = 12,
    puitsX = w / 2 - 5 * c,
    puitsY = 6;
  g.fillStyle = LCD[1];
  g.fillRect(puitsX - 6, puitsY, 6, 19 * c);
  g.fillRect(puitsX + 10 * c, puitsY, 6, 19 * c);
  const bloc = (x, y, teinte) => {
    g.fillStyle = LCD[0];
    g.fillRect(puitsX + x * c, puitsY + y * c, c, c);
    g.fillStyle = LCD[teinte];
    g.fillRect(puitsX + x * c + 2, puitsY + y * c + 2, c - 4, c - 4);
  };
  // Pile de blocs, puis une pièce qui tombe en boucle
  const pile = [
    "##########".replace(/#/g, "x").split(""),
    "xxxx.xxxxx".split(""),
    "xx..xxx.xx".split(""),
    "x....xx..x".split(""),
  ];
  pile.forEach((ligne, k) =>
    ligne.forEach((v, x) => v === "x" && bloc(x, 18 - k, 1 + ((x + k) % 2))),
  );
  const chute = Math.floor((t * 4) % 16);
  [
    [4, 0],
    [5, 0],
    [4, 1],
    [5, 1],
  ].forEach(([x, y]) => bloc(x, chute + y, 2));
  if (clignote(t, 1.2)) {
    g.fillStyle = LCD[3];
    g.fillRect(w / 2 - 70, h / 2 - 14, 140, 28);
    texte(g, "APPUYEZ START", w / 2, h / 2, 11, LCD[0]);
  }
}
function attenteMegadrive(g, w, h, t) {
  const ciel = g.createLinearGradient(0, 0, 0, h * 0.6);
  ciel.addColorStop(0, "#2448d8");
  ciel.addColorStop(1, "#6c9cfc");
  g.fillStyle = ciel;
  g.fillRect(0, 0, w, h);
  // Eau scintillante
  g.fillStyle = "#3c6cfc";
  g.fillRect(0, h * 0.58, w, h * 0.12);
  g.fillStyle = "#b4d8fc";
  for (let x = 0; x < w; x += 24)
    g.fillRect(boucle(x - t * 30, w), h * 0.6 + ((x / 24) % 3) * 6, 10, 2);
  // Collines en damier
  const d = t * 120;
  for (let i = -1; i < 4; i++) {
    const cx = boucle(i * 140 - d * 0.6, w + 140) - 70;
    g.save();
    g.beginPath();
    g.ellipse(cx, h * 0.8, 90, 60, 0, Math.PI, 0);
    g.clip();
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 12; x++) {
        g.fillStyle = (x + y) % 2 ? "#b45c1c" : "#e48c3c";
        g.fillRect(cx - 90 + x * 16, h * 0.8 - 60 + y * 16, 16, 16);
      }
    g.restore();
    g.fillStyle = "#3cbc3c";
    g.beginPath();
    g.ellipse(cx, h * 0.8 - 52, 70, 10, 0, Math.PI, 0);
    g.fill();
  }
  // Sol
  for (let x = -16; x < w + 16; x += 16) {
    const xx = x - boucle(d, 16);
    g.fillStyle = Math.floor((x + boucle(d, 32)) / 16) % 2 ? "#b45c1c" : "#e48c3c";
    g.fillRect(xx, h - 40, 16, 40);
  }
  g.fillStyle = "#3cbc3c";
  g.fillRect(0, h - 46, w, 8);
  // Anneaux qui tournent
  for (let i = 0; i < 5; i++) {
    const x = boucle(i * 50 - d, w + 60) - 30,
      l = Math.abs(Math.cos(t * 5 + i)) * 8 + 1;
    g.strokeStyle = "#fcd800";
    g.lineWidth = 3;
    g.beginPath();
    g.ellipse(x, h - 70, l, 9, 0, 0, Math.PI * 2);
    g.stroke();
  }
  texte(g, "16-BIT", w / 2, 50, 30, "#fcfcfc");
  if (clignote(t)) texte(g, "APPUYEZ SUR START", w / 2, 84, 10, "#fcd800");
}
function attentePlaystation(g, w, h, t) {
  const horizon = h * 0.42;
  const ciel = g.createLinearGradient(0, 0, 0, horizon);
  ciel.addColorStop(0, "#1a1440");
  ciel.addColorStop(1, "#f07a3c");
  g.fillStyle = ciel;
  g.fillRect(0, 0, w, horizon);
  // Montagnes
  g.fillStyle = "#2c1f4a";
  g.beginPath();
  g.moveTo(0, horizon);
  for (let x = 0; x <= w; x += 20)
    g.lineTo(x, horizon - 18 - Math.abs(Math.sin(x * 0.03 + 1)) * 26);
  g.lineTo(w, horizon);
  g.fill();
  g.fillStyle = "#2f6b2f";
  g.fillRect(0, horizon, w, h - horizon);
  // Route en perspective
  for (let y = horizon; y < h; y += 2) {
    const p = (y - horizon) / (h - horizon);
    const demi = 12 + p * w * 0.55,
      bande = Math.floor((1 / (p + 0.05)) * 2 + t * 14) % 2;
    g.fillStyle = bande ? "#5a5a62" : "#55555c";
    g.fillRect(w / 2 - demi, y, demi * 2, 2);
    g.fillStyle = bande ? "#e8e8e8" : "#d03030";
    g.fillRect(w / 2 - demi - 6 * p - 2, y, 6 * p + 2, 2);
    g.fillRect(w / 2 + demi, y, 6 * p + 2, 2);
    if (bande) {
      g.fillStyle = "#f4f4f4";
      g.fillRect(w / 2 - 1 - p * 2, y, 2 + p * 4, 2);
    }
  }
  // Voiture vue de derrière
  const vx = w / 2 + Math.sin(t * 1.3) * 30,
    vy = h - 46;
  g.fillStyle = "#b8141e";
  g.fillRect(vx - 34, vy, 68, 24);
  g.fillStyle = "#8a0f16";
  g.fillRect(vx - 26, vy - 14, 52, 16);
  g.fillStyle = "#1b1b24";
  g.fillRect(vx - 22, vy - 11, 44, 9);
  g.fillRect(vx - 38, vy + 16, 14, 12);
  g.fillRect(vx + 24, vy + 16, 14, 12);
  g.fillStyle = "#ffcf5a";
  g.fillRect(vx - 30, vy + 6, 12, 5);
  g.fillRect(vx + 18, vy + 6, 12, 5);
  texte(g, "COURSE 32 BITS", w / 2, 34, 18, "#ffffff");
  if (clignote(t)) texte(g, "APPUYEZ SUR START", w / 2, 60, 10, "#ffcf5a");
}
/** Cube coloré en 3D (projection simple), utilisé par la N64 */
function cube(g, cx, cy, taille, t) {
  const a = t * 1.1,
    b = 0.5 + Math.sin(t * 0.7) * 0.25;
  const P = [-1, 1]
    .flatMap((x) => [-1, 1].flatMap((y) => [-1, 1].map((z) => [x, y, z])))
    .map(([x, y, z]) => {
      const x1 = x * Math.cos(a) - z * Math.sin(a),
        z1 = x * Math.sin(a) + z * Math.cos(a);
      const y1 = y * Math.cos(b) - z1 * Math.sin(b),
        z2 = y * Math.sin(b) + z1 * Math.cos(b);
      const f = 3 / (z2 + 4.2);
      return [cx + x1 * taille * f, cy + y1 * taille * f, z2];
    });
  const faces = [
    [[0, 1, 3, 2], "#1d4fd8"],
    [[4, 5, 7, 6], "#20a040"],
    [[0, 1, 5, 4], "#e8b800"],
    [[2, 3, 7, 6], "#d42020"],
    [[0, 2, 6, 4], "#1d4fd8"],
    [[1, 3, 7, 5], "#20a040"],
  ];
  faces
    .map(([f, c]) => [f, c, f.reduce((s, i) => s + P[i][2], 0)])
    .sort((x, y) => y[2] - x[2])
    .forEach(([f, c]) => {
      g.fillStyle = c;
      g.strokeStyle = "#0a0a0a";
      g.lineWidth = 2;
      g.beginPath();
      f.forEach((i, k) => (k ? g.lineTo(P[i][0], P[i][1]) : g.moveTo(P[i][0], P[i][1])));
      g.closePath();
      g.fill();
      g.stroke();
    });
}
function attenteN64(g, w, h, t) {
  const fond = g.createLinearGradient(0, 0, 0, h);
  fond.addColorStop(0, "#0b1a6e");
  fond.addColorStop(1, "#4fa3ff");
  g.fillStyle = fond;
  g.fillRect(0, 0, w, h);
  // Damier au sol en perspective
  const horizon = h * 0.62;
  for (let y = horizon; y < h; y += 2) {
    const p = (y - horizon) / (h - horizon) + 0.02,
      z = 1 / p;
    for (let x = -10; x < 10; x++) {
      const case_ = (Math.floor(x) + Math.floor(z * 2 + t * 3)) % 2;
      g.fillStyle = case_ ? "#2e9a3a" : "#8fd14f";
      const x0 = w / 2 + x * 40 * p * 2;
      g.fillRect(x0, y, 80 * p + 1, 2);
    }
  }
  cube(g, w / 2, h * 0.4, 46, t);
  if (clignote(t)) texte(g, "APPUYEZ SUR START", w / 2, h - 20, 10, "#ffffff");
}
/** Le menu de la Wii : grille de chaînes, barre du bas, pointeur en forme de main */
function menuWii(g, w, h, t, { pointeur = null, choisi = false } = {}) {
  const fond = g.createLinearGradient(0, 0, 0, h);
  fond.addColorStop(0, "#f7f8fa");
  fond.addColorStop(1, "#dfe3e8");
  g.fillStyle = fond;
  g.fillRect(0, 0, w, h);
  const colonnes = 4,
    lignes = 3,
    marge = 16,
    l = (w - marge * (colonnes + 1)) / colonnes,
    hc = 46;
  const arrondi = (x, y, lw, lh, r) => {
    g.beginPath();
    g.roundRect(x, y, lw, lh, r);
  };
  for (let j = 0; j < lignes; j++)
    for (let i = 0; i < colonnes; i++) {
      const x = marge + i * (l + marge),
        y = 18 + j * (hc + 12);
      const k = j * colonnes + i;
      arrondi(x, y, l, hc, 9);
      g.fillStyle = "#ffffff";
      g.fill();
      g.strokeStyle = k === 0 && choisi ? "#35a7ff" : "#c9ced6";
      g.lineWidth = k === 0 && choisi ? 3 : 1.5;
      g.stroke();
      if (k === 0) {
        // Chaîne du jeu de bowling : piste et quilles
        g.save();
        arrondi(x + 3, y + 3, l - 6, hc - 6, 7);
        g.clip();
        const piste = g.createLinearGradient(x, y, x, y + hc);
        piste.addColorStop(0, "#5bb3ff");
        piste.addColorStop(1, "#d9a35e");
        g.fillStyle = piste;
        g.fillRect(x, y, l, hc);
        for (let q = 0; q < 4; q++) {
          g.fillStyle = "#ffffff";
          g.beginPath();
          g.ellipse(x + l / 2 - 15 + q * 10, y + 20, 3.2, 7, 0, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = "#e33";
          g.fillRect(x + l / 2 - 18 + q * 10, y + 16, 6, 1.5);
        }
        g.restore();
        texte(g, "BOWLING", x + l / 2, y + hc - 8, 7, "#ffffff");
      } else if (k === 1) {
        g.fillStyle = "#e8eef6";
        g.beginPath();
        g.arc(x + l / 2, y + hc / 2, 14, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = "#c9ced6";
        g.beginPath();
        g.arc(x + l / 2, y + hc / 2, 3, 0, Math.PI * 2);
        g.fill();
        texte(g, "DISQUE", x + l / 2, y + hc - 7, 6, "#8a94a3");
      } else if (k === 2) {
        // Photos
        ["#f6b04a", "#5ec26a", "#5ab0f2"].forEach((c, n) => {
          g.fillStyle = c;
          g.fillRect(x + l / 2 - 22 + n * 14, y + 10 + (n % 2) * 4, 16, 14);
        });
        texte(g, "PHOTOS", x + l / 2, y + hc - 7, 6, "#8a94a3");
      } else if (k === 3) {
        g.fillStyle = "#7ac36a";
        g.fillRect(x + 6, y + 6, l - 12, hc - 20);
        g.fillStyle = "#ffffff";
        g.beginPath();
        g.arc(x + l / 2, y + 18, 6, 0, Math.PI * 2);
        g.fill();
        texte(g, "MÉTÉO", x + l / 2, y + hc - 7, 6, "#8a94a3");
      }
    }
  // Barre du bas : bouton, heure, date, bouton
  const yb = h - 52;
  g.fillStyle = "#e9ecf0";
  g.beginPath();
  g.moveTo(0, yb + 10);
  g.quadraticCurveTo(w / 2, yb - 12, w, yb + 10);
  g.lineTo(w, h);
  g.lineTo(0, h);
  g.fill();
  g.strokeStyle = "#35a7ff";
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(0, yb + 10);
  g.quadraticCurveTo(w / 2, yb - 12, w, yb + 10);
  g.stroke();
  [44, w - 44].forEach((x) => {
    g.fillStyle = "#ffffff";
    g.beginPath();
    g.arc(x, h - 24, 18, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "#c9ced6";
    g.lineWidth = 2;
    g.stroke();
  });
  const maintenant = new Date();
  const heure = maintenant.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  texte(g, clignote(t, 0.5) ? heure : heure.replace(":", " "), w / 2, h - 34, 16, "#8a94a3");
  texte(
    g,
    maintenant.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "numeric" }),
    w / 2,
    h - 14,
    8,
    "#a7afbb",
  );
  // Pointeur en forme de main
  if (pointeur) {
    const [px, py] = pointeur;
    g.fillStyle = "#ffffff";
    g.strokeStyle = "#5a6372";
    g.lineWidth = 1.5;
    g.beginPath();
    g.roundRect(px - 4, py, 8, 22, 4);
    g.fill();
    g.stroke();
    g.beginPath();
    g.roundRect(px - 2, py + 12, 20, 18, 6);
    g.fill();
    g.stroke();
    g.fillStyle = "#35a7ff";
    texte(g, "1", px + 10, py + 22, 7, "#35a7ff");
  }
}
function attenteWii(g, w, h, t) {
  const p = (t % 6) / 6;
  menuWii(g, w, h, t, {
    pointeur: [
      w * (0.5 + Math.sin(p * Math.PI * 2) * 0.32),
      h * (0.35 + Math.cos(p * Math.PI * 4) * 0.12),
    ],
  });
}
/** L'accueil de la PS4 : la sélection parcourt lentement la rangée de contenus */
function attentePs4(g, w, h, t) {
  const n = TUILES.length,
    pas = (((t / 3.2) % (2 * n - 2)) + 2 * n - 2) % (2 * n - 2),
    etape = Math.floor(pas),
    aller = (k) => (k < n ? k : 2 * n - 2 - k),
    p = Math.min(1, (pas - etape) * 4),
    defil = aller(etape) + (aller((etape + 1) % (2 * n - 2)) - aller(etape)) * p * p * (3 - 2 * p);
  dessinerMenuPs4(g, w, h, t, { tuile: Math.round(defil), defil });
}
const ATTENTES = {
  nes: attenteNes,
  gameboy: attenteGameboy,
  megadrive: attenteMegadrive,
  playstation: attentePlaystation,
  n64: attenteN64,
  wii: attenteWii,
  ps4: attentePs4,
};
/** Dessine l'écran d'attente de la console (affiché sur la télé du musée) */
export function dessinerAttente(id, g, w, h, t) {
  g.save();
  ATTENTES[id](g, w, h, t);
  g.restore();
}

/* ---------- Séquences de démarrage (au lancement du jeu) ---------- */
const DEMARRAGES = {
  nes(g, w, h, t) {
    // Télé allumée sur le canal 3, écran gris puis noir, comme à l'époque
    g.fillStyle = t < 0.5 ? "#000" : t < 0.62 ? "#7c7c7c" : "#000";
    g.fillRect(0, 0, w, h);
    if (t > 0.7) {
      const a = Math.min(1, (t - 0.7) * 3);
      g.globalAlpha = a;
      attenteNes(g, w, h, t);
      g.globalAlpha = 1;
    }
  },
  gameboy(g, w, h, t) {
    g.fillStyle = LCD[3];
    g.fillRect(0, 0, w, h);
    // Le nom descend lentement depuis le haut de l'écran, puis le « ding »
    const y = Math.min(h / 2 - 8, -20 + t * 70);
    texte(g, "GAME BOY", w / 2, y, 26, LCD[0]);
  },
  megadrive(g, w, h, t) {
    g.fillStyle = "#000";
    g.fillRect(0, 0, w, h);
    if (t < 0.4) return;
    // Balayage lumineux sur le nom de la console
    const p = Math.min(1, (t - 0.4) / 1.2);
    const grad = g.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(Math.max(0, p - 0.3), "#1b3fd0");
    grad.addColorStop(p, "#ffffff");
    grad.addColorStop(Math.min(1, p + 0.08), "#1b3fd0");
    g.font = `700 34px ${POLICE}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillStyle = grad;
    g.fillText("MEGA DRIVE", w / 2, h / 2 - 10);
    if (t > 1.6) texte(g, "16-BIT", w / 2, h / 2 + 26, 14, "#d4a43a");
  },
  playstation(g, w, h, t) {
    if (t < 2.4) {
      // Écran blanc, losange en relief qui tourne lentement
      const a = Math.min(1, t / 0.8);
      g.fillStyle = `rgb(${255 * a},${255 * a},${255 * a})`;
      g.fillRect(0, 0, w, h);
      if (t > 0.6) {
        g.save();
        g.translate(w / 2, h / 2 - 16);
        g.scale(Math.cos((t - 0.6) * 0.9), 1);
        g.rotate(Math.PI / 4);
        const c = Math.min(1, (t - 0.6) * 1.5);
        g.fillStyle = `rgba(240,120,40,${c})`;
        g.fillRect(-26, -26, 26, 26);
        g.fillStyle = `rgba(220,40,60,${c})`;
        g.fillRect(0, -26, 26, 26);
        g.fillStyle = `rgba(250,200,40,${c})`;
        g.fillRect(-26, 0, 26, 26);
        g.fillStyle = `rgba(40,140,220,${c})`;
        g.fillRect(0, 0, 26, 26);
        g.restore();
        texte(g, "CONSOLE DE SALON · 1994", w / 2, h / 2 + 44, 9, `rgba(80,80,90,${c})`);
      }
    } else {
      g.fillStyle = "#000";
      g.fillRect(0, 0, w, h);
      const a = Math.min(1, (t - 2.6) * 2);
      if (a > 0) {
        g.globalAlpha = a;
        g.font = `italic 700 28px Arial, sans-serif`;
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillStyle = "#ffffff";
        g.fillText("PlayStation", w / 2, h / 2);
        texte(g, "LECTURE DU CD-ROM…", w / 2, h / 2 + 34, 8, "#9aa0ad");
        g.globalAlpha = 1;
      }
    }
  },
  n64(g, w, h, t) {
    g.fillStyle = "#000";
    g.fillRect(0, 0, w, h);
    if (t < 0.3) return;
    const a = Math.min(1, (t - 0.3) * 2);
    g.globalAlpha = a;
    cube(g, w / 2, h / 2 - 16, 40 + Math.max(0, 1.2 - t) * 30, t * 2);
    texte(g, "NINTENDO 64", w / 2, h - 50, 18, "#ffffff");
    g.globalAlpha = 1;
  },
  wii(g, w, h, t) {
    if (t < 0.6) {
      g.fillStyle = "#000";
      g.fillRect(0, 0, w, h);
      return;
    }
    // Le pointeur va jusqu'à la chaîne Bowling, puis on l'ouvre
    const p = Math.min(1, (t - 0.8) / 1.6),
      lisse = p * p * (3 - 2 * p);
    const cible = [16 + (w - 80) / 8, 40];
    const px = w * 0.75 + (cible[0] - w * 0.75) * lisse,
      py = h * 0.7 + (cible[1] - h * 0.7) * lisse;
    menuWii(g, w, h, t, { pointeur: [px, py], choisi: p >= 1 });
    g.globalAlpha = Math.min(1, (t - 0.6) * 3) < 1 ? 1 - Math.min(1, (t - 0.6) * 3) : 0;
    g.fillStyle = "#000";
    g.fillRect(0, 0, w, h);
    g.globalAlpha = 1;
    if (t > 2.8) {
      // Zoom sur la chaîne choisie
      const z = Math.min(1, (t - 2.8) / 0.9),
        l0 = (w - 80) / 4;
      g.fillStyle = `rgba(91,179,255,${0.4 + z * 0.6})`;
      g.beginPath();
      g.roundRect(16 * (1 - z), 18 * (1 - z), l0 + (w - l0) * z, 46 + (h - 46) * z, 9 * (1 - z));
      g.fill();
    }
  },
  ps4: dessinerDemarragePs4,
};
/** Sons de démarrage : [fréquence, début, durée, forme, volume] */
export const SONS_DEMARRAGE = {
  nes: [[70, 0, 0.25, "sine", 0.12]],
  gameboy: [
    [987.8, 2.45, 0.09, "square", 0.05],
    [1318.5, 2.55, 0.6, "square", 0.05],
  ],
  megadrive: [
    [70, 0, 0.25, "sine", 0.12],
    [392, 0.5, 0.12, "triangle", 0.08],
    [523.3, 0.62, 0.12, "triangle", 0.08],
    [784, 0.74, 0.5, "triangle", 0.08],
  ],
  playstation: [
    [70, 0, 0.25, "sine", 0.12],
    [110, 0.6, 2.2, "sine", 0.08],
    [220, 0.7, 2.0, "sine", 0.05],
    [329.6, 0.8, 1.8, "sine", 0.04],
    [1760, 1.1, 1.2, "sine", 0.015],
    [55, 2.6, 1.6, "sine", 0.1],
    [82.4, 2.7, 1.5, "sine", 0.06],
  ],
  n64: [
    [70, 0, 0.25, "sine", 0.12],
    [523.3, 0.4, 0.1, "triangle", 0.08],
    [659.3, 0.5, 0.1, "triangle", 0.08],
    [784, 0.6, 0.1, "triangle", 0.08],
    [1046.5, 0.7, 0.45, "triangle", 0.08],
  ],
  wii: [
    [880, 2.4, 0.06, "sine", 0.05],
    [1318.5, 2.85, 0.25, "sine", 0.05],
    [1760, 2.95, 0.4, "sine", 0.04],
  ],
  ps4: [
    [130.8, 0.5, 2.6, "sine", 0.07],
    [196, 0.7, 2.4, "sine", 0.05],
    [392, 1.0, 2.0, "sine", 0.03],
    [587.3, 1.4, 1.6, "sine", 0.02],
    [784, 3.3, 0.5, "sine", 0.03],
  ],
};
/** Dessine l'image t (en secondes) de la séquence de démarrage */
export function dessinerDemarrage(id, g, w, h, t) {
  g.save();
  DEMARRAGES[id](g, w, h, t);
  g.restore();
}

/* ---------- Habillage du lecteur : télé et manette ---------- */
const bouton = (code, classe, etiquette, contenu = "") =>
  `<button type="button" class="${classe}" data-retro-key="${code}" aria-label="${etiquette}">${contenu}</button>`;
const croix = (classe = "") =>
  `<div class="croix ${classe}">${bouton("ArrowUp", "c-haut", "Haut")}${bouton(
    "ArrowLeft",
    "c-gauche",
    "Gauche",
  )}<span class="c-centre"></span>${bouton("ArrowRight", "c-droite", "Droite")}${bouton(
    "ArrowDown",
    "c-bas",
    "Bas",
  )}</div>`;

const MANETTES = {
  nes: () => `<div class="manette manette-nes" aria-label="Manette 8 bits">
    <div class="nes-face">
      ${croix()}
      <div class="nes-milieu">
        <span class="nes-raie"></span><span class="nes-raie"></span><span class="nes-raie"></span>
        <div class="nes-select"><small>SELECT</small><small>START</small></div>
        <div class="nes-pilules">${bouton("KeyQ", "pilule", "Select")}${bouton("Enter", "pilule", "Start")}</div>
      </div>
      <div class="nes-ab">
        <div class="nes-case">${bouton("KeyX", "rond rouge", "Bouton B")}<small>B</small></div>
        <div class="nes-case">${bouton("Space", "rond rouge", "Bouton A")}<small>A</small></div>
      </div>
    </div></div>`,
  megadrive: () => `<div class="manette manette-md" aria-label="Manette 3 boutons">
    <div class="md-disque">${croix()}</div>
    ${bouton("Enter", "md-start", "Start", "<small>START</small>")}
    <div class="md-boutons">
      ${bouton("KeyX", "md-b md-a", "Bouton A", "A")}${bouton("Space", "md-b md-bb", "Bouton B", "B")}${bouton("KeyE", "md-b md-c", "Bouton C", "C")}
    </div></div>`,
  playstation: () => `<div class="manette manette-ps" aria-label="Manette à deux poignées">
    ${bouton("KeyQ", "ps-l", "L1", "L1")}${bouton("KeyE", "ps-r", "R1", "R1")}
    <div class="ps-corps">
      <div class="ps-fleches">${croix("ps-croix")}</div>
      <div class="ps-centre">${bouton("KeyP", "ps-pilule", "Select", "<small>SELECT</small>")}${bouton("Enter", "ps-pilule", "Start", "<small>START</small>")}</div>
      <div class="ps-actions">
        ${bouton("KeyQ", "ps-b ps-tri", "Triangle", "△")}${bouton("KeyX", "ps-b ps-car", "Carré", "□")}${bouton("KeyE", "ps-b ps-rond", "Rond", "○")}${bouton("Space", "ps-b ps-croixb", "Croix", "✕")}
      </div>
      <span class="ps-stick ps-stick-g"></span><span class="ps-stick ps-stick-d"></span>
    </div></div>`,
  n64: () => `<div class="manette manette-n64" aria-label="Manette à trois poignées">
    <div class="n64-corps">
      <div class="n64-gauche">${croix()}</div>
      ${bouton("Enter", "n64-start", "Start")}
      <div class="n64-stick">
        ${bouton("ArrowUp", "st-h", "Stick haut")}${bouton("ArrowLeft", "st-g", "Stick gauche")}${bouton("ArrowRight", "st-d", "Stick droite")}${bouton("ArrowDown", "st-b", "Stick bas")}<span></span>
      </div>
      <div class="n64-droite">
        ${bouton("KeyW", "n64-c c-h", "C haut")}${bouton("KeyQ", "n64-c c-g", "C gauche")}${bouton("KeyE", "n64-c c-d", "C droite")}${bouton("KeyS", "n64-c c-b", "C bas")}
        ${bouton("KeyX", "n64-b", "Bouton B", "B")}${bouton("Space", "n64-a", "Bouton A", "A")}
      </div>
    </div>
    <span class="n64-poignee g"></span><span class="n64-poignee m"></span><span class="n64-poignee d"></span></div>`,
  wii: () => `<div class="manette manette-wii" aria-label="Télécommande à détection de mouvement">
    <span class="wii-power"></span>
    ${croix("wii-croix")}
    ${bouton("Space", "wii-a", "Bouton A", "A")}
    <div class="wii-milieu">${bouton("KeyQ", "wii-petit", "Moins", "−")}${bouton("Enter", "wii-home", "Home", "⌂")}${bouton("KeyE", "wii-petit", "Plus", "+")}</div>
    <div class="wii-12">${bouton("KeyQ", "wii-chiffre", "Bouton 1", "1")}${bouton("KeyE", "wii-chiffre", "Bouton 2", "2")}</div>
    <span class="wii-leds"><i class="on"></i><i></i><i></i><i></i></span>
    ${bouton("KeyX", "wii-gachette", "Gâchette B", "B")}</div>`,
  ps4: () => `<div class="manette manette-ps4" aria-label="Manette sans fil à pavé tactile">
    ${bouton("KeyQ", "ps4-l", "L1", "L1")}${bouton("KeyE", "ps4-r", "R1", "R1")}
    <span class="ps4-lumiere"></span>
    <div class="ps4-corps">
      <div class="ps4-fleches">${croix("ps4-croix")}</div>
      ${bouton("KeyP", "ps4-petit ps4-share", "Share", "<small>SHARE</small>")}
      <span class="ps4-pave"></span>
      ${bouton("Enter", "ps4-petit ps4-options", "Options", "<small>OPTIONS</small>")}
      <div class="ps4-actions">
        ${bouton("KeyQ", "ps4-b ps4-tri", "Triangle", "△")}${bouton("KeyX", "ps4-b ps4-car", "Carré", "□")}${bouton("KeyE", "ps4-b ps4-rond", "Rond", "○")}${bouton("Space", "ps4-b ps4-croixb", "Croix", "✕")}
      </div>
      <span class="ps4-stick ps4-stick-g"></span><span class="ps4-stick ps4-stick-d"></span>
      ${bouton("KeyC", "ps4-home", "Touche PS : accueil")}
      <span class="ps4-hp"></span>
    </div></div>`,
};

/** HTML de la scène : télé (ou console portable) et manette */
export function habillage(cons) {
  if (cons.id === "gameboy")
    return `<div class="console-gb">
      <div class="gb-haut"><span>◂ OFF · ON ▸</span></div>
      <div class="gb-cadre">
        <div class="gb-raies"><span></span><span></span></div>
        <div class="gb-ligne"><span class="gb-led"></span><small>BATTERY</small>
          <div class="console-ecran gb-ecran"><div class="console-image"><p class="retro-loading">Chargement…</p></div></div>
        </div>
      </div>
      <div class="gb-nom">PORTABLE · 1989</div>
      <div class="gb-commandes">
        ${croix("gb-croix")}
        <div class="gb-ab">${bouton("KeyX", "gb-rond gb-b", "Bouton B")}${bouton("Space", "gb-rond gb-a", "Bouton A")}<small class="gb-lb">B</small><small class="gb-la">A</small></div>
      </div>
      <div class="gb-ss">${bouton("KeyQ", "gb-pilule", "Select")}${bouton("Enter", "gb-pilule", "Start")}<small>SELECT</small><small>START</small></div>
      <div class="gb-hp"><i></i><i></i><i></i><i></i><i></i><i></i></div>
    </div>`;
  const panneau =
    cons.tele === "bois"
      ? `<div class="tele-panneau"><span class="molette"></span><span class="molette petite"></span><span class="canal">3</span><span class="grille"></span></div>`
      : "";
  const pied =
    cons.tele === "plat"
      ? `<span class="tele-pied"></span>${cons.id === "wii" ? `<span class="barre-capteur"></span>` : ""}`
      : "";
  return `<div class="console-tv tele-${cons.tele}">
      ${pied}
      <div class="tele-avant">
        <div class="console-ecran"><div class="console-image"><p class="retro-loading">Chargement…</p></div></div>
        ${panneau}
      </div>
      ${cons.tele === "plat" ? "" : `<div class="tele-bas"><span class="tele-led"></span><span class="tele-hp"></span></div>`}
    </div>
    ${MANETTES[cons.id]()}`;
}
