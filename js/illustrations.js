/* ============================================================
   CONTINUE ? — Illustrations en pixel art
   Chaque exposition a une petite image dessinée par le code,
   pixel par pixel, sur une grille de 96 × 60.
   Illustrations originales pour les expositions historiques ;
   le tableau Minecraft utilise une capture du jeu intégré au musée.
   ============================================================ */

import { dessinerPosterMinecraft } from "./minecraft/poster.js";
export const GRILLE = { l: 96, h: 60 };

/* ---------- Outils de dessin sur la grille ---------- */
function outils(g) {
  const px = (x, y, c, l = 1, h = 1) => {
    g.fillStyle = c;
    g.fillRect(Math.round(x), Math.round(y), l, h);
  };
  const fond = (c) => px(0, 0, c, GRILLE.l, GRILLE.h);
  const disque = (cx, cy, r, c) => {
    for (let y = -r; y <= r; y++)
      for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) px(cx + x, cy + y, c);
  };
  const anneau = (cx, cy, r, c) => {
    for (let a = 0; a < Math.PI * 2; a += 0.02) px(cx + Math.cos(a) * r, cy + Math.sin(a) * r, c);
  };
  const ligne = (x0, y0, x1, y1, c) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
    for (let i = 0; i <= n; i++) px(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c);
  };
  const motif = (lignes, x, y, couleurs) => {
    // petit dessin décrit par des caractères
    lignes.forEach((ligneTexte, j) =>
      [...ligneTexte].forEach((car, i) => {
        if (couleurs[car]) px(x + i, y + j, couleurs[car]);
      }),
    );
  };
  const etoiles = (n, c, graine = 1) => {
    let s = graine;
    const hasard = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    for (let i = 0; i < n; i++) px(hasard() * GRILLE.l, hasard() * GRILLE.h, c);
  };
  return { px, fond, disque, anneau, ligne, motif, etoiles };
}

/* ---------- Un dessin par exposition ---------- */
const DESSINS = {
  tennis({ fond, anneau, px, ligne }) {
    fond("#04140f");
    anneau(48, 30, 27, "#0e5c46");
    anneau(48, 30, 28, "#0b4434");
    ligne(26, 42, 70, 42, "#3cf2c8"); // le sol du court
    ligne(48, 42, 48, 35, "#3cf2c8"); // le filet
    [
      [30, 38],
      [33, 31],
      [37, 26],
      [41, 23],
      [45, 22],
      [49, 23],
    ].forEach(([x, y]) => px(x, y, "#1d8f71"));
    px(53, 25, "#bfffee", 2, 2); // la balle
  },
  spacewar({ fond, etoiles, disque, motif, px }) {
    fond("#05060f");
    etoiles(70, "#5d6a8a", 3);
    etoiles(18, "#e7ecff", 9);
    disque(48, 30, 4, "#fff3c2");
    disque(48, 30, 2, "#ffffff");
    motif(["  X  ", " XXX ", "XX XX", "X   X"], 20, 14, { X: "#7cf0ff" });
    motif(["X   X", "XX XX", " XXX ", "  X  "], 70, 40, { X: "#ff9bd2" });
    [
      [27, 20],
      [31, 23],
      [35, 26],
    ].forEach(([x, y]) => px(x, y, "#7cf0ff"));
  },
  odyssey({ fond, px }) {
    fond("#14101d");
    px(16, 8, "#2b2438", 64, 44);
    px(18, 10, "#0a2a3a", 60, 38); // téléviseur et écran
    px(18, 10, "#1d6b5c", 30, 38);
    px(48, 10, "#6b2a52", 30, 38); // calque coloré posé sur l'écran
    px(47, 10, "#e8f6ff", 1, 38); // la ligne centrale
    px(26, 22, "#ffffff", 3, 3);
    px(66, 32, "#ffffff", 3, 3);
    px(40, 28, "#ffffff", 2, 2);
    px(30, 53, "#3a3150", 36, 3);
  },
  pong({ fond, px, motif }) {
    fond("#030303");
    for (let y = 2; y < 60; y += 5) px(47, y, "#9a9a9a", 2, 3);
    px(10, 20, "#f0f0f0", 3, 12);
    px(83, 30, "#f0f0f0", 3, 12);
    px(60, 26, "#ffffff", 3, 3);
    const chiffre = {
      3: ["XXX", "  X", "XXX", "  X", "XXX"],
      5: ["XXX", "X  ", "XXX", "  X", "XXX"],
    };
    motif(chiffre[3], 34, 5, { X: "#f0f0f0" });
    motif(chiffre[5], 58, 5, { X: "#f0f0f0" });
  },
  vcs({ fond, px }) {
    fond("#17110b");
    const couleurs = ["#ff6b4a", "#ffd34a", "#4ad4ff", "#9b6bff", "#4aff9b"];
    couleurs.forEach((c, i) => {
      const x = 14 + i * 14,
        y = 14 + (i % 2) * 6;
      px(x, y, "#2a2a2a", 12, 30);
      px(x + 2, y + 3, c, 8, 12);
      px(x + 2, y + 17, "#4a4a4a", 8, 2);
    });
    px(0, 50, "#5a3a20", 96, 10);
    for (let x = 0; x < 96; x += 6) px(x, 52, "#4a2e18", 4, 1);
  },
  invaders({ fond, motif, px, etoiles }) {
    fond("#02030a");
    etoiles(30, "#3b3f66", 7);
    const ennemi = ["X XX X", "XXXXXX", "X XX X", " X  X "];
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 7; c++)
        motif(ennemi, 14 + c * 10, 8 + r * 7, { X: ["#ff4f9a", "#ffb23e", "#3cf2c8"][r] });
    [20, 44, 68].forEach((x) => {
      px(x, 44, "#3cf2c8", 9, 3);
      px(x + 1, 43, "#3cf2c8", 7, 1);
    });
    px(45, 54, "#e8ffe8", 7, 2);
    px(47, 52, "#e8ffe8", 3, 2);
    px(48, 46, "#ffffff", 1, 4);
  },
  pacman({ fond, px, disque }) {
    fond("#02020c");
    const mur = "#2a4bff";
    px(4, 4, mur, 88, 2);
    px(4, 54, mur, 88, 2);
    px(4, 4, mur, 2, 52);
    px(90, 4, mur, 2, 52);
    px(16, 14, mur, 20, 2);
    px(60, 14, mur, 20, 2);
    px(16, 44, mur, 20, 2);
    px(60, 44, mur, 20, 2);
    px(44, 18, mur, 2, 24);
    px(30, 28, mur, 36, 2);
    px(16, 22, mur, 2, 16);
    px(78, 22, mur, 2, 16);
    for (let x = 10; x < 88; x += 6) {
      px(x, 9, "#ffd9b0");
      px(x, 49, "#ffd9b0");
    }
    for (let y = 14; y < 48; y += 6) {
      px(10, y, "#ffd9b0");
      px(86, y, "#ffd9b0");
    }
    disque(10, 9, 1, "#ffd9b0");
    disque(86, 49, 1, "#ffd9b0");
  },
  donkeykong({ fond, px, disque }) {
    fond("#05030a");
    const poutre = (y, pente) => {
      for (let x = 6; x < 90; x += 2) px(x, y + Math.round((x - 6) * pente), "#ff3d5a", 2, 2);
    };
    poutre(14, 0.04);
    poutre(28, -0.04);
    poutre(42, 0.04);
    poutre(54, 0);
    [
      [78, 17],
      [20, 31],
      [70, 45],
    ].forEach(([x, y]) => {
      for (let k = 0; k < 9; k += 2) {
        px(x, y + k, "#4ad4ff");
        px(x + 4, y + k, "#4ad4ff");
        px(x, y + k, "#4ad4ff", 5, 1);
      }
    });
    [
      [30, 24],
      [58, 38],
      [44, 50],
    ].forEach(([x, y]) => {
      disque(x, y, 2, "#c46a2a");
      px(x - 2, y, "#7a3a12", 5, 1);
    });
  },
  dragonslair({ fond, px, disque, anneau, etoiles }) {
    fond("#0b0618");
    etoiles(25, "#4a3a7a", 5);
    disque(70, 30, 18, "#c9c9d9");
    anneau(70, 30, 18, "#ffffff");
    disque(70, 30, 3, "#0b0618");
    for (let i = 0; i < 4; i++)
      anneau(70, 30, 6 + i * 3, ["#ff4f9a", "#ffb23e", "#3cf2c8", "#7c9cff"][i]);
    px(8, 30, "#2a1a3a", 34, 26);
    px(10, 22, "#2a1a3a", 6, 8);
    px(34, 18, "#2a1a3a", 6, 12);
    px(20, 26, "#2a1a3a", 8, 4);
    for (let x = 10; x < 40; x += 4) px(x, 20 + (x % 8 ? 8 : 0), "#2a1a3a", 2, 2);
    px(22, 40, "#ffb23e", 3, 4);
    px(14, 36, "#ffb23e", 2, 3);
  },
  krach({ fond, px, disque }) {
    fond("#2a1606");
    for (let y = 0; y < 34; y++) px(0, y, `hsl(${25 + y} 80% ${18 + y * 0.9}%)`, 96, 1);
    disque(72, 18, 7, "#ffe2a0");
    for (let y = 34; y < 60; y++) px(0, y, y % 4 ? "#c78a4a" : "#b67a3c", 96, 1);
    [
      [20, 42, -0.3],
      [34, 46, 0.2],
      [52, 40, 0.1],
      [62, 48, -0.2],
      [42, 52, 0],
    ].forEach(([x, y]) => {
      px(x, y, "#2a2a2a", 9, 6);
      px(x + 2, y + 1, "#ff6b4a", 5, 3);
    });
  },
  nes({ fond, px, disque }) {
    fond("#141018");
    disque(24, 34, 13, "#3b2a6b");
    disque(72, 34, 13, "#3b2a6b");
    px(24, 21, "#3b2a6b", 48, 26); // manette générique
    px(18, 31, "#e8e6f0", 12, 4);
    px(22, 27, "#e8e6f0", 4, 12); // croix directionnelle
    disque(68, 36, 3, "#3cf2c8");
    disque(77, 30, 3, "#ffb23e");
    px(42, 36, "#7a6aa8", 4, 2);
    px(50, 36, "#7a6aa8", 4, 2);
    px(47, 4, "#7a6aa8", 2, 17);
  },

  tetris({ fond, px }) {
    fond("#07080f");
    px(30, 0, "#1c2036", 36, 60);
    const bloc = (x, y, c) => {
      px(30 + x * 4, y * 4, c, 4, 4);
      px(30 + x * 4, y * 4, "#ffffff55", 4, 1);
    };
    const pile = ["#ff4f9a", "#ffb23e", "#3cf2c8", "#7c9cff", "#b77cff"];
    for (let y = 11; y < 15; y++)
      for (let x = 0; x < 9; x++)
        if ((x * 7 + y * 3) % 11 !== 0 || y === 14) bloc(x, y, pile[(x + y) % 5]);
    bloc(3, 3, "#3cf2c8");
    bloc(4, 3, "#3cf2c8");
    bloc(5, 3, "#3cf2c8");
    bloc(4, 4, "#3cf2c8");
    bloc(7, 6, "#ffb23e");
    bloc(7, 7, "#ffb23e");
    bloc(7, 8, "#ffb23e");
    bloc(6, 8, "#ffb23e");
  },
  smb({ fond, px, disque }) {
    fond("#5c8cff");
    disque(18, 12, 4, "#ffffff");
    disque(23, 11, 5, "#ffffff");
    disque(28, 12, 4, "#ffffff");
    disque(70, 50, 12, "#2fae4a");
    disque(30, 52, 8, "#2fae4a");
    for (let x = 0; x < 96; x += 4) {
      px(x, 52, "#c8692a", 4, 8);
      px(x, 52, "#e09050", 4, 1);
      px(x, 56, "#8a4518", 4, 1);
    }
    px(36, 30, "#c8692a", 24, 4);
    px(36, 30, "#e09050", 24, 1);
    [40, 46, 52].forEach((x) => {
      disque(x, 25, 1, "#ffd23a");
    });
  },
  zelda({ fond, px, disque }) {
    fond("#d9c48a");
    for (let i = 0; i < 26; i++) {
      const x = (i * 37) % 90,
        y = (i * 23) % 52;
      if (Math.abs(x - 46) > 10) {
        disque(x + 3, y + 4, 3, "#2f7a3a");
        px(x + 3, y + 7, "#5a3a1a", 1, 2);
      }
    }
    px(40, 0, "#e8d6a0", 14, 60); // le chemin
    px(70, 8, "#5a5a5a", 18, 14);
    px(76, 14, "#111111", 6, 8); // l'entrée d'une grotte
    px(46, 30, "#e0e6ff", 1, 12);
    px(44, 40, "#c9a23a", 5, 1);
    px(46, 41, "#7a4a1a", 1, 3); // une épée
  },
  gameboy({ fond, px, disque }) {
    fond("#1a1420");
    disque(18, 30, 14, "#1f8f86");
    disque(78, 30, 14, "#1f8f86");
    px(18, 16, "#1f8f86", 60, 29); // console portable générique
    px(32, 18, "#123c38", 32, 24);
    px(34, 20, "#9bbc0f", 28, 20);
    [
      [38, 32],
      [42, 32],
      [46, 32],
      [46, 28],
      [50, 32],
      [54, 24],
      [54, 28],
    ].forEach(([x, y]) => px(x, y, "#306230", 4, 4));
    px(10, 29, "#0b3d38", 10, 3);
    px(13, 26, "#0b3d38", 3, 9);
    disque(80, 26, 2, "#ffb23e");
    disque(86, 32, 2, "#ff4f9a");
  },

  megadrive({ fond, px, anneau }) {
    fond("#0a1a4a");
    for (let y = 0; y < 60; y += 3) px((y * 13) % 96, y, "#2a5aff", 24, 1);
    for (let r = 14; r <= 18; r++) anneau(54, 28, r, r === 18 ? "#ffd23a" : "#2fae4a");
    px(0, 46, "#2fae4a", 96, 3);
    for (let x = 0; x < 96; x += 6) px(x, 49, x % 12 ? "#8a4a1a" : "#b0682a", 6, 11);
    for (let i = 0; i < 5; i++) px(10 + i * 4, 30 + i, "#7cd0ff", 12, 1);
  },
  alone({ fond, px, disque, etoiles }) {
    fond("#06070f");
    etoiles(30, "#3a3f5a", 11);
    disque(80, 10, 5, "#dcd8c0");
    px(18, 22, "#14121c", 56, 38);
    px(12, 20, "#14121c", 68, 4);
    for (let i = 0; i < 14; i++) px(30 + i, 6 + i, "#14121c", 32 - i * 2 + i, 1);
    px(26, 30, "#1f1c2a", 8, 10);
    px(58, 30, "#ffcf5a", 8, 10);
    px(42, 40, "#1f1c2a", 8, 20);
    px(61, 30, "#14121c", 2, 10);
    px(58, 34, "#14121c", 8, 1);
  },
  playstation({ fond, disque, anneau, px }) {
    fond("#0c0c14");
    disque(48, 30, 24, "#cfd3dc");
    for (let i = 0; i < 6; i++)
      anneau(
        48,
        30,
        9 + i * 2.6,
        ["#ff4f9a", "#ffb23e", "#ffe24f", "#3cf2c8", "#7c9cff", "#b77cff"][i],
      );
    disque(48, 30, 5, "#0c0c14");
    anneau(48, 30, 24, "#ffffff");
    px(6, 50, "#3cf2c8", 1, 1);
  },
  mario64({ fond, px, ligne }) {
    for (let y = 0; y < 60; y++) px(0, y, `hsl(215 80% ${70 - y * 0.6}%)`, 96, 1);
    for (let i = -12; i <= 12; i++) ligne(48 + i * 2, 30, 48 + i * 10, 60, "#2fae4a");
    for (let y = 30; y < 60; y += 3 + Math.floor((y - 30) / 6)) px(0, y, "#2fae4a", 96, 1);
    px(0, 30, "#62d36a", 96, 1);
    [
      [22, 30, 10],
      [70, 30, 14],
    ].forEach(([x, y, h]) => {
      for (let k = 0; k < h; k++) px(x - k, y - h + k, "#8a6a4a", k * 2 + 1, 1);
    });
    px(46, 40, "#ffd23a", 4, 4);
    px(47, 39, "#ffd23a", 2, 6);
    px(45, 41, "#ffd23a", 6, 2);
  },
  arkanoid({ fond, px }) {
    fond("#081b35");
    const colors = ["#d8dce0", "#ef595f", "#f0a844", "#54c273", "#63a3ed"];
    for (let y = 0; y < 5; y++)
      for (let x = 0; x < 10; x++) px(8 + x * 8, 8 + y * 5, colors[y], 7, 4);
    px(38, 52, "#aadfff", 20, 3);
    px(53, 42, "#fff", 2, 2);
    px(31, 41, "#43dc71", 5, 3);
  },
  bejeweled({ fond, px, disque }) {
    fond("#16133b");
    const colors = ["#ff5574", "#56d3a1", "#67a8ff", "#ffda52", "#bb82e2", "#fa9a4f"];
    for (let y = 0; y < 7; y++)
      for (let x = 0; x < 8; x++) {
        const cx = 18 + x * 8,
          cy = 6 + y * 7,
          c = colors[(x * 3 + y * 2 + x * y) % 6];
        px(cx, cy, c, 5, 5);
        px(cx + 1, cy + 1, "#ffffff88", 2, 1);
      }
  },
  wow({ fond, disque, px, ligne, etoiles }) {
    fond("#08061a");
    etoiles(40, "#4a4a7a", 13);
    disque(48, 30, 22, "#1a3a8a");
    disque(40, 24, 8, "#3a8a4a");
    disque(56, 36, 7, "#8a7a3a");
    disque(50, 18, 4, "#3a8a4a");
    const noeuds = [
      [14, 10],
      [84, 12],
      [10, 50],
      [86, 48],
      [48, 4],
    ];
    noeuds.forEach(([x, y]) => {
      ligne(x, y, 48, 30, "#7c9cff44");
      px(x - 1, y - 1, "#7c9cff", 3, 3);
    });
  },
  wii({ fond, px, anneau }) {
    fond("#eef1f6");
    px(36, 12, "#ffffff", 9, 34);
    px(36, 12, "#c9cfd9", 9, 1);
    px(36, 45, "#c9cfd9", 9, 1);
    px(39, 16, "#c9cfd9", 3, 3);
    px(40, 24, "#3aa0ff", 1, 1);
    for (let r = 6; r < 22; r += 5)
      for (let a = -0.9; a < 0.9; a += 0.03)
        px(50 + Math.cos(a) * r, 22 + Math.sin(a) * r, "#3aa0ff");
    anneau(26, 30, 4, "#c9cfd9");
  },
  minecraft({ fond, px, disque }) {
    fond("#8ec8ff");
    disque(80, 10, 4, "#fff6c8");
    const hauteurs = [5, 5, 6, 7, 7, 6, 5, 4, 4, 5, 6, 6]; // colonnes de cubes vues de côté
    hauteurs.forEach((n, c) => {
      for (let k = 0; k < n; k++) {
        const x = c * 8,
          y = 60 - (k + 1) * 6;
        const herbe = k === n - 1;
        px(x, y, herbe ? "#5fbf3a" : k < 2 ? "#7d7d86" : "#7a5232", 8, 6);
        px(x, y, herbe ? "#7fd95a" : "#00000022", 8, 1);
        px(x + 7, y, "#00000033", 1, 6);
        if (!herbe && k >= 2) {
          px(x + 2, y + 2, "#5e3e24", 1, 1);
          px(x + 5, y + 4, "#5e3e24", 1, 1);
        }
      }
    });
    px(43, 10, "#5e3e24", 4, 14);
    px(37, 3, "#2f8f2a", 16, 8); // un arbre en cubes
  },

  /* Écrans titres des bornes jouables */
  labyrinthe({ fond, px, disque }) {
    fond("#06061a");
    const mur = "#6b86ff";
    px(4, 4, mur, 88, 1);
    px(4, 55, mur, 88, 1);
    px(4, 4, mur, 1, 52);
    px(91, 4, mur, 1, 52);
    [
      [14, 14, 26],
      [56, 14, 26],
      [14, 44, 26],
      [56, 44, 26],
      [30, 29, 36],
    ].forEach(([x, y, l]) => px(x, y, mur, l, 1));
    [
      [24, 20, 10],
      [70, 20, 10],
      [47, 36, 8],
    ].forEach(([x, y, h]) => px(x, y, mur, 1, h));
    for (let x = 10; x < 88; x += 5) {
      px(x, 9, "#ffe9b0");
      px(x, 50, "#ffe9b0");
    }
    px(9, 48, "#fff4d6", 3, 4);
    disque(40, 50, 3, "#3cf2c8");
    px(40, 46, "#ff4f9a");
    disque(66, 22, 3, "#ff4f6d");
    px(66, 22, "#ffffff");
    disque(76, 38, 3, "#b98bff");
    px(76, 38, "#ffffff");
  },

  raquettes: (o) => DESSINS.pong(o),
  serpent({ fond, px }) {
    fond("#081006");
    const corps = [
      [20, 30],
      [24, 30],
      [28, 30],
      [32, 30],
      [36, 30],
      [36, 26],
      [36, 22],
      [40, 22],
      [44, 22],
      [48, 22],
    ];
    corps.forEach(([x, y], i) => px(x, y, i === corps.length - 1 ? "#ffe680" : "#ffb23e", 4, 4));
    px(64, 22, "#ff4f9a", 4, 4);
    px(2, 2, "#3a5a1a", 92, 1);
    px(2, 57, "#3a5a1a", 92, 1);
    px(2, 2, "#3a5a1a", 1, 56);
    px(93, 2, "#3a5a1a", 1, 56);
  },
  briques({ fond, px }) {
    fond("#08030c");
    const c = ["#ff4f9a", "#ff8a4f", "#ffb23e", "#3cf2c8", "#7c9cff"];
    for (let r = 0; r < 5; r++)
      for (let k = 0; k < 8; k++) if (!(r === 4 && k === 3)) px(5 + k * 11, 6 + r * 4, c[r], 10, 3);
    px(40, 54, "#e8e8f0", 16, 2);
    px(52, 40, "#ffffff", 2, 2);
  },
};

/**
 * Dessine l'illustration `id` sur un canvas.
 * La grille 96 × 60 est agrandie sans flou pour garder l'aspect pixel art,
 * puis des lignes de balayage imitent un écran cathodique.
 */
export function dessinerIllustration(id, canvas, echelle = 4) {
  const { l, h } = GRILLE;
  if (id === "minecraft") return dessinerPosterMinecraft(canvas, l * echelle, h * echelle);
  canvas.width = l * echelle;
  canvas.height = h * echelle;
  const petit = document.createElement("canvas");
  petit.width = l;
  petit.height = h;
  const g = petit.getContext("2d");
  (DESSINS[id] || DESSINS.pong)(outils(g));

  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(petit, 0, 0, l * echelle, h * echelle);
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  for (let y = 0; y < canvas.height; y += echelle)
    ctx.fillRect(0, y + echelle - 1, canvas.width, 1);
  return canvas;
}

/** Renvoie l'illustration sous forme d'image (pour les balises <img>) */
const cache = new Map();
export function urlIllustration(id, echelle = 4) {
  const cle = id + "@" + echelle;
  if (!cache.has(cle))
    cache.set(
      cle,
      dessinerIllustration(id, document.createElement("canvas"), echelle).toDataURL("image/png"),
    );
  return cache.get(cle);
}
