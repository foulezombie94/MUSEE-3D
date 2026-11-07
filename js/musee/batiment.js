/* ============================================================
   CONTINUE ? — Construction du bâtiment
   Une galerie de musée classique, revisitée pour le jeu vidéo :
   - verrière en berceau avec ses arcs métalliques et ses lunettes
     en éventail (salles 1, 3 et 4), plafond à caissons ;
   - arches en pierre entre les salles, avec clé de voûte ;
   - pilastres, corniche à éclairage indirect, lambris à panneaux ;
   - parquet en point de Hongrie, bordures de marbre, filets de
     laiton et rosace au pied de chaque vitrine.
   Chaque époque garde sa couleur de murs et sa lumière ; la salle
   d'arcade reste sombre, avec moquette et néons.
   Les éléments répétés sont regroupés en « lots » (InstancedMesh) :
   beaucoup de détails pour très peu d'appels de dessin.
   ============================================================ */
import * as THREE from "three";
import { Reflector } from "three/addons/objects/Reflector.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { PLAN, debutSalle, centreSalle, CLOISONS, OBSTACLES } from "./plan.js";
import { SALLES } from "../expositions.js";

/* Couleur des murs de chaque salle (peinture mate de musée) */
export const PEINTURES = {
  pionniers: "#2e4b49",
  arcade: "#16141d",
  consoles: "#5a2f33",
  moderne: "#22304f",
};

/* Mesures de l'architecture (en mètres) */
const EPAIS = 0.5; // épaisseur des cloisons
const CORNICHE_Y = 5.4; // bas de la corniche
const LAMBRIS_H = 0.82; // hauteur du lambris (sous les cadres)
const PILASTRES = [9, 17]; // distance des pilastres au début de la salle
const VOUTE_R = 2.6; // rayon de la verrière en berceau
const VOUTE_MARGE = 2; // distance entre la verrière et les cloisons
const NAISSANCE = 3.1; // hauteur où l'arc des portes commence
const FLECHE = 0.7; // montée de l'arc des portes
const BANDEAU = 0.3; // largeur de l'encadrement en pierre des portes

/** Crée une texture en dessinant sur un canvas */
export function textureCanvas(renderer, l, h, dessiner) {
  const c = document.createElement("canvas");
  c.width = l;
  c.height = h;
  dessiner(c.getContext("2d"), l, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}

/** Matériau « néon » : couleur très lumineuse, qui déclenche l'effet de halo */
export function neon(couleur, intensite = 2.2) {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(couleur).multiplyScalar(intensite),
    toneMapped: false,
  });
}

/** Ajoute une boîte à la scène */
function boite(parent, l, h, p, materiau, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(l, h, p), materiau);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

/** Petit générateur pseudo-aléatoire, pour que les textures soient toujours identiques */
function hasard(graine) {
  let s = graine;
  return () => (s = (s * 9301 + 49297) % 233280) / 233280;
}

/* ---------- Lots : des centaines de pièces identiques en un seul dessin ---------- */
const CUBE = new THREE.BoxGeometry(1, 1, 1);
const AIDE = new THREE.Object3D();
class Lot {
  constructor(materiau, geometrie) {
    this.materiau = materiau;
    this.geometrie = geometrie;
    this.matrices = [];
  }
  /** Pièce centrée en (x, y, z), étirée de (sx, sy, sz) et tournée de (rx, ry, rz) */
  ajouter(x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) {
    AIDE.position.set(x, y, z);
    AIDE.rotation.set(rx, ry, rz);
    AIDE.scale.set(sx, sy, sz);
    AIDE.updateMatrix();
    this.matrices.push(AIDE.matrix.clone());
  }
  /** Boîte de largeur l (x), hauteur h (y), profondeur p (z) */
  boite(l, h, p, x, y, z) {
    this.ajouter(x, y, z, l, h, p);
  }
  poser(scene) {
    if (!this.matrices.length) return;
    const im = new THREE.InstancedMesh(this.geometrie, this.materiau, this.matrices.length);
    this.matrices.forEach((m, i) => im.setMatrixAt(i, m));
    im.computeBoundingSphere();
    scene.add(im);
  }
}

/** Dessine un trait plusieurs fois décalé, pour qu'une texture se répète sans couture */
function tracerRaccord(g, l, h, points) {
  for (const ox of [-l, 0, l])
    for (const oy of [-h, 0, h]) {
      g.beginPath();
      points.forEach(([x, y], i) => (i ? g.lineTo(x + ox, y + oy) : g.moveTo(x + ox, y + oy)));
      g.stroke();
    }
}

/* ---------- Textures dessinées par le code ---------- */
function textureParquet(renderer) {
  // 1024 pixels = 4 mètres. Point de Hongrie : 8 colonnes de 50 cm,
  // lames inclinées à 45°, dans un sens puis dans l'autre.
  const t = textureCanvas(renderer, 1024, 1024, (g, l, h) => {
    const r = hasard(7);
    const COLONNES = 8,
      C = l / COLONNES,
      E = 32; // épaisseur (verticale) d'une lame
    const RANGS = h / E;
    for (let c = 0; c < COLONNES; c++) {
      const x0 = c * C,
        dy = c % 2 ? C : -C;
      const lames = Array.from({ length: RANGS }, () => [26 + r() * 8, 33 + r() * 13, r()]);
      for (let k = -6; k < RANGS + 6; k++) {
        const [teinte, lum, v] = lames[((k % RANGS) + RANGS) % RANGS];
        const y = k * E;
        g.fillStyle = `hsl(${teinte}, 46%, ${lum}%)`;
        g.beginPath();
        g.moveTo(x0, y);
        g.lineTo(x0 + C, y + dy);
        g.lineTo(x0 + C, y + dy + E);
        g.lineTo(x0, y + E);
        g.closePath();
        g.fill();
        // Veinage du bois, parallèle à la lame
        for (let j = 0; j < 3; j++) {
          const o = 5 + ((v * 23 + j * 9) % (E - 10));
          g.strokeStyle = `hsla(${teinte - 6}, 45%, ${lum - 11}%, ${0.18 + ((v * 7 + j) % 1) * 0.2})`;
          g.lineWidth = 0.8;
          g.beginPath();
          g.moveTo(x0, y + o);
          g.lineTo(x0 + C, y + dy + o);
          g.stroke();
        }
        // Reflet ciré sur le bord haut, joint sur le bord bas
        g.strokeStyle = "rgba(255,230,190,0.08)";
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(x0, y + E - 3);
        g.lineTo(x0 + C, y + dy + E - 3);
        g.stroke();
        g.strokeStyle = "rgba(35,20,10,0.6)";
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(x0, y);
        g.lineTo(x0 + C, y + dy);
        g.stroke();
      }
      g.fillStyle = "rgba(35,20,10,0.65)";
      g.fillRect(x0, 0, 2, h);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function texturePeinture(renderer) {
  // Grain très léger d'un mur peint, et ombre douce en haut du mur
  return textureCanvas(renderer, 256, 512, (g, l, h) => {
    const r = hasard(3);
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, l, h);
    for (let i = 0; i < 5000; i++) {
      g.fillStyle = `rgba(0,0,0,${r() * 0.035})`;
      g.fillRect(r() * l, r() * h, 2, 2);
    }
    const ombre = g.createLinearGradient(0, h, 0, h * 0.8);
    ombre.addColorStop(0, "rgba(0,0,0,0.3)");
    ombre.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = ombre;
    g.fillRect(0, h * 0.8, l, h * 0.2);
    // La corniche éclaire le haut du mur (éclairage indirect)
    const haut = g.createLinearGradient(0, 0, 0, h * 0.16);
    haut.addColorStop(0, "rgba(255,255,255,0)");
    haut.addColorStop(1, "rgba(0,0,0,0.12)");
    g.fillStyle = haut;
    g.fillRect(0, 0, l, h * 0.16);
  });
}
/** Marbre veiné, qui se répète sans couture (512 pixels = 2 mètres) */
function textureMarbre(renderer, fond, veine, graine) {
  const t = textureCanvas(renderer, 512, 512, (g, l, h) => {
    const r = hasard(graine);
    g.fillStyle = fond;
    g.fillRect(0, 0, l, h);
    for (let i = 0; i < 3000; i++) {
      g.fillStyle = `rgba(${veine},${r() * 0.05})`;
      g.fillRect(r() * l, r() * h, 3, 3);
    }
    g.lineCap = "round";
    for (let v = 0; v < 16; v++) {
      let x = r() * l,
        y = r() * h,
        a = r() * Math.PI * 2;
      const points = [[x, y]];
      for (let s = 0; s < 50; s++) {
        a += (r() - 0.5) * 0.6;
        x += Math.cos(a) * 9;
        y += Math.sin(a) * 9;
        points.push([x, y]);
      }
      g.strokeStyle = `rgba(${veine},${0.07 + r() * 0.2})`;
      g.lineWidth = 0.5 + r() * 1.8;
      tracerRaccord(g, l, h, points);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
/** Moquette de salle d'arcade : motifs fluo sur fond nuit (512 pixels = 2 mètres) */
function textureMoquette(renderer) {
  const t = textureCanvas(renderer, 512, 512, (g, l, h) => {
    const r = hasard(21);
    g.fillStyle = "#110e22";
    g.fillRect(0, 0, l, h);
    for (let i = 0; i < 4000; i++) {
      g.fillStyle = `rgba(120,110,200,${r() * 0.08})`;
      g.fillRect(r() * l, r() * h, 2, 2);
    }
    const couleurs = ["#ff4f9a", "#3cf2c8", "#7c9cff", "#ffb23e"];
    g.lineWidth = 4;
    g.lineJoin = g.lineCap = "round";
    g.globalAlpha = 0.7;
    for (let i = 0; i < 20; i++) {
      const x = r() * l,
        y = r() * h,
        taille = 14 + r() * 22,
        type = Math.floor(r() * 4),
        angle = r() * Math.PI * 2;
      g.strokeStyle = couleurs[Math.floor(r() * couleurs.length)];
      let points;
      if (type === 0) {
        // triangle
        points = [0, 1, 2, 3].map((k) => [
          x + Math.cos(angle + (k * 2 * Math.PI) / 3) * taille,
          y + Math.sin(angle + (k * 2 * Math.PI) / 3) * taille,
        ]);
      } else if (type === 1) {
        // cercle
        points = Array.from({ length: 25 }, (_, k) => [
          x + Math.cos((k / 24) * Math.PI * 2) * taille * 0.6,
          y + Math.sin((k / 24) * Math.PI * 2) * taille * 0.6,
        ]);
      } else if (type === 2) {
        // éclair en zigzag
        points = Array.from({ length: 5 }, (_, k) => [
          x + Math.cos(angle) * (k - 2) * taille * 0.5 + (k % 2 ? 1 : -1) * Math.sin(angle) * 8,
          y + Math.sin(angle) * (k - 2) * taille * 0.5 - (k % 2 ? 1 : -1) * Math.cos(angle) * 8,
        ]);
      } else {
        // vague
        points = Array.from({ length: 13 }, (_, k) => [
          x + Math.cos(angle) * (k - 6) * 5 - Math.sin(angle) * Math.sin(k * 0.9) * 8,
          y + Math.sin(angle) * (k - 6) * 5 + Math.cos(angle) * Math.sin(k * 0.9) * 8,
        ]);
      }
      tracerRaccord(g, l, h, points);
    }
    g.globalAlpha = 1;
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
/** Un carreau de verre dépoli de la verrière */
function textureVerriere(renderer) {
  const t = textureCanvas(renderer, 256, 256, (g, l, h) => {
    const d = g.createRadialGradient(l / 2, h / 2, 0, l / 2, h / 2, l * 0.72);
    d.addColorStop(0, "#fdfdff");
    d.addColorStop(0.7, "#e4ebf6");
    d.addColorStop(1, "#b9c8de");
    g.fillStyle = d;
    g.fillRect(0, 0, l, h);
    g.fillStyle = "#30333b";
    g.fillRect(0, 0, l, 4);
    g.fillRect(0, h - 4, l, 4);
    g.fillRect(0, 0, 4, h);
    g.fillRect(l - 4, 0, 4, h);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
/** Lunette en éventail qui ferme chaque bout de la verrière */
function textureLunette(renderer) {
  return textureCanvas(renderer, 512, 512, (g, l, h) => {
    const cx = l / 2,
      cy = h / 2,
      R = l / 2;
    const d = g.createRadialGradient(cx, cy, 0, cx, cy, R);
    d.addColorStop(0, "#ffffff");
    d.addColorStop(0.6, "#eef2fa");
    d.addColorStop(1, "#c2cfe2");
    g.fillStyle = d;
    g.fillRect(0, 0, l, h);
    g.strokeStyle = "#30333b";
    g.lineWidth = 7;
    for (let k = 1; k < 8; k++) {
      const a = (k * Math.PI) / 8;
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * 50, cy - Math.sin(a) * 50);
      g.lineTo(cx + Math.cos(a) * R, cy - Math.sin(a) * R);
      g.stroke();
    }
    [50, 140, 215].forEach((rr) => {
      g.beginPath();
      g.arc(cx, cy, rr, Math.PI, 2 * Math.PI);
      g.stroke();
    });
    g.fillStyle = "#30333b";
    g.beginPath();
    g.arc(cx, cy, 22, Math.PI, 2 * Math.PI);
    g.fill();
  });
}
/** Rosace de marbre et de laiton posée au sol, au pied des vitrines */
function textureRosace(renderer) {
  return textureCanvas(renderer, 1024, 1024, (g, l, h) => {
    const c = l / 2;
    const marbre = (rayon, couleur) => {
      g.fillStyle = couleur;
      g.beginPath();
      g.arc(c, c, rayon, 0, Math.PI * 2);
      g.fill();
    };
    marbre(c, "#b8893b"); // anneau de laiton extérieur
    marbre(c - 18, "#2b2724");
    marbre(c - 60, "#b8893b");
    marbre(c - 70, "#e8e1d4");
    // Étoile à 16 branches, en deux marbres
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2,
        long = k % 2 ? 0.62 : 0.9;
      g.fillStyle = k % 4 === 0 ? "#2b2724" : k % 2 ? "#8c7a64" : "#5a4c3e";
      g.beginPath();
      g.moveTo(c, c);
      g.lineTo(c + Math.cos(a - 0.17) * (c - 70) * 0.3, c + Math.sin(a - 0.17) * (c - 70) * 0.3);
      g.lineTo(c + Math.cos(a) * (c - 70) * long, c + Math.sin(a) * (c - 70) * long);
      g.lineTo(c + Math.cos(a + 0.17) * (c - 70) * 0.3, c + Math.sin(a + 0.17) * (c - 70) * 0.3);
      g.closePath();
      g.fill();
    }
    g.strokeStyle = "#b8893b";
    g.lineWidth = 6;
    g.beginPath();
    g.arc(c, c, (c - 70) * 0.3, 0, Math.PI * 2);
    g.stroke();
    marbre(42, "#b8893b");
  });
}
/** Tache de lumière douce (projecteur sur un mur ou sur le sol) */
export function textureHalo(renderer) {
  return textureCanvas(renderer, 256, 256, (g, l, h) => {
    const d = g.createRadialGradient(l / 2, h * 0.42, 0, l / 2, h * 0.5, l / 2);
    d.addColorStop(0, "rgba(255,255,255,1)");
    d.addColorStop(0.45, "rgba(255,255,255,0.45)");
    d.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = d;
    g.fillRect(0, 0, l, h);
  });
}

/* ---------- Formes des portes en arc ---------- */
const DEMI_PORTE = PLAN.PORTE_L / 2;
const R_ARC = (DEMI_PORTE ** 2 + FLECHE ** 2) / (2 * FLECHE);
const CY_ARC = NAISSANCE + FLECHE - R_ARC; // centre du cercle de l'arc
const A_ARC = Math.atan2(NAISSANCE - CY_ARC, DEMI_PORTE);
const X_BANDEAU = DEMI_PORTE + BANDEAU;

/** Cloison pleine percée d'une porte en arc surbaissé */
function formeCloison() {
  const { DEMI_L, HAUTEUR } = PLAN;
  const s = new THREE.Shape();
  s.moveTo(-DEMI_L, 0);
  s.lineTo(-DEMI_PORTE, 0);
  s.lineTo(-DEMI_PORTE, NAISSANCE);
  s.absarc(0, CY_ARC, R_ARC, Math.PI - A_ARC, A_ARC, true);
  s.lineTo(DEMI_PORTE, 0);
  s.lineTo(DEMI_L, 0);
  s.lineTo(DEMI_L, HAUTEUR);
  s.lineTo(-DEMI_L, HAUTEUR);
  return s;
}
/** Encadrement de pierre qui suit l'arc de la porte */
function formeBandeau() {
  const Re = R_ARC + BANDEAU;
  const ye = CY_ARC + Math.sqrt(Re * Re - X_BANDEAU * X_BANDEAU);
  const b = Math.atan2(ye - CY_ARC, X_BANDEAU);
  const s = new THREE.Shape();
  s.moveTo(-X_BANDEAU, 0);
  s.lineTo(-X_BANDEAU, ye);
  s.absarc(0, CY_ARC, Re, Math.PI - b, b, true);
  s.lineTo(X_BANDEAU, 0);
  s.lineTo(DEMI_PORTE, 0);
  s.lineTo(DEMI_PORTE, NAISSANCE);
  s.absarc(0, CY_ARC, R_ARC, A_ARC, Math.PI - A_ARC, false);
  s.lineTo(-DEMI_PORTE, 0);
  return s;
}

/**
 * Construit tout le bâtiment.
 * Renvoie une fonction animer(dt) pour les objets qui tournent dans les vitrines.
 */
export function construireBatiment(scene, renderer, { mobile }) {
  const { LARGEUR, HAUTEUR, DEMI_L, Z_ENTREE, Z_FOND, LONG_SALLE } = PLAN;
  const longueur = Z_ENTREE - Z_FOND,
    zMilieu = (Z_ENTREE + Z_FOND) / 2;
  const animations = [];

  // Reflets réalistes sur le verre, le métal et le bois ciré
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  pmrem.dispose();

  /* Lots de pièces, regroupés par matériau et par forme */
  const lots = new Map();
  const lot = (materiau, geometrie = CUBE) => {
    const cle = materiau.uuid + geometrie.uuid;
    if (!lots.has(cle)) lots.set(cle, new Lot(materiau, geometrie));
    return lots.get(cle);
  };

  /* --- Matériaux --- */
  const texMur = texturePeinture(renderer);
  const matPlinthe = new THREE.MeshStandardMaterial({ color: 0x121216, roughness: 0.5 });
  const matLaiton = new THREE.MeshStandardMaterial({
    color: 0xc39a4e,
    roughness: 0.28,
    metalness: 0.9,
  });
  const matMetal = new THREE.MeshStandardMaterial({
    color: 0x2a2c33,
    roughness: 0.35,
    metalness: 0.8,
  });
  const matAmpoule = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0xfff1d6).multiplyScalar(1.5),
    toneMapped: false,
  });
  /** Un jeu de matériaux par salle : peinture, lambris, moulures… */
  const MATS = SALLES.map((salle) => {
    const sombre = salle.id === "arcade";
    const base = new THREE.Color(PEINTURES[salle.id]);
    const blanc = new THREE.Color(0xffffff);
    return {
      salle,
      sombre,
      peinture: new THREE.MeshStandardMaterial({
        color: base,
        map: texMur,
        roughness: 0.92,
        envMapIntensity: 0.25,
      }),
      lambris: new THREE.MeshStandardMaterial({
        color: base.clone().multiplyScalar(0.62),
        roughness: 0.55,
        envMapIntensity: 0.5,
      }),
      panneau: new THREE.MeshStandardMaterial({
        color: base.clone().multiplyScalar(0.8),
        roughness: 0.5,
        envMapIntensity: 0.5,
      }),
      pilastre: new THREE.MeshStandardMaterial({
        color: base.clone().lerp(blanc, sombre ? 0.02 : 0.07),
        roughness: 0.85,
        envMapIntensity: 0.3,
      }),
      moulure: new THREE.MeshStandardMaterial({
        color: sombre ? 0x2a2634 : 0xe2d8c4,
        roughness: sombre ? 0.45 : 0.62,
        envMapIntensity: 0.4,
      }),
      plafond: new THREE.MeshStandardMaterial({
        color: sombre ? 0x15131c : 0xebe7df,
        roughness: 0.95,
        envMapIntensity: 0.3,
      }),
      poutre: new THREE.MeshStandardMaterial({
        color: sombre ? 0x1d1a26 : 0xdcd5c8,
        roughness: 0.9,
        envMapIntensity: 0.3,
      }),
      neon: neon(salle.couleur, sombre ? 1.7 : 1.15),
    };
  });

  /* --- Sol : parquet ciré en point de Hongrie, avec un léger reflet sur ordinateur --- */
  const texSol = textureParquet(renderer);
  texSol.repeat.set(LARGEUR / 4, longueur / 4);
  if (!mobile) {
    const miroir = new Reflector(new THREE.PlaneGeometry(LARGEUR, longueur), {
      textureWidth: Math.floor(innerWidth * 0.5),
      textureHeight: Math.floor(innerHeight * 0.5),
      color: 0x8a8a8a,
    });
    miroir.rotation.x = -Math.PI / 2;
    miroir.position.z = zMilieu;
    scene.add(miroir);
  }
  const sol = new THREE.Mesh(
    new THREE.PlaneGeometry(LARGEUR, longueur),
    new THREE.MeshStandardMaterial({
      map: texSol,
      roughness: 0.4,
      metalness: 0,
      envMapIntensity: 0.6,
      transparent: !mobile,
      opacity: 0.9,
    }),
  );
  sol.rotation.x = -Math.PI / 2;
  sol.position.set(0, 0.002, zMilieu);
  scene.add(sol);

  /** Dalle posée au sol ; la texture se répète tous les `echelle` mètres */
  function dalle(l, p, materiau, x, y, z, echelle = 2) {
    const g = new THREE.PlaneGeometry(l, p);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++)
      uv.setXY(i, (uv.getX(i) * l) / echelle, (uv.getY(i) * p) / echelle);
    const m = new THREE.Mesh(g, materiau);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    scene.add(m);
    return m;
  }
  // Bordure de marbre le long des murs, cernée d'un filet de laiton
  const matMarbre = new THREE.MeshStandardMaterial({
    map: textureMarbre(renderer, "#e6dfd2", "92,84,74", 11),
    roughness: 0.22,
    envMapIntensity: 0.8,
    transparent: !mobile,
    opacity: 0.86,
  });
  const LARGE_BORD = 0.5;
  [-1, 1].forEach((cote) => {
    dalle(LARGE_BORD, longueur, matMarbre, cote * (DEMI_L - LARGE_BORD / 2), 0.006, zMilieu);
    dalle(0.04, longueur, matLaiton, cote * (DEMI_L - LARGE_BORD - 0.02), 0.008, zMilieu);
  });
  // Seuils de marbre sous les portes, et bordure au bout de chaque salle
  const bordTravers = (z, p, sens) => {
    dalle(LARGEUR - 2 * LARGE_BORD, p, matMarbre, 0, 0.006, z);
    if (sens.includes(1)) dalle(LARGEUR - 2 * LARGE_BORD - 0.08, 0.04, matLaiton, 0, 0.008, z + p / 2 + 0.02);
    if (sens.includes(-1)) dalle(LARGEUR - 2 * LARGE_BORD - 0.08, 0.04, matLaiton, 0, 0.008, z - p / 2 - 0.02);
  };
  bordTravers(Z_ENTREE - LARGE_BORD / 2, LARGE_BORD, [-1]);
  bordTravers(Z_FOND + LARGE_BORD / 2, LARGE_BORD, [1]);
  CLOISONS.forEach((z) => bordTravers(z, EPAIS + 2 * LARGE_BORD, [-1, 1]));
  // Moquette à motifs fluo dans la salle d'arcade
  const iArcade = SALLES.findIndex((s) => s.id === "arcade");
  if (iArcade >= 0) {
    const texMoquette = textureMoquette(renderer);
    dalle(
      LARGEUR - 2 * LARGE_BORD - 0.08,
      LONG_SALLE - EPAIS - 2 * LARGE_BORD - 0.08,
      new THREE.MeshStandardMaterial({
        map: texMoquette,
        emissiveMap: texMoquette,
        emissive: 0xffffff,
        emissiveIntensity: 0.16,
        roughness: 1,
      }),
      0,
      0.006,
      centreSalle(iArcade),
    );
  }

  /* --- Murs latéraux peints, salle par salle --- */
  SALLES.forEach((salle, i) => {
    const zc = centreSalle(i);
    [-1, 1].forEach((cote) => {
      const mur = new THREE.Mesh(new THREE.PlaneGeometry(LONG_SALLE, HAUTEUR), MATS[i].peinture);
      mur.position.set(cote * DEMI_L, HAUTEUR / 2, zc);
      mur.rotation.y = (-cote * Math.PI) / 2;
      scene.add(mur);
    });
  });
  [
    [Z_ENTREE, Math.PI, 0],
    [Z_FOND, 0, SALLES.length - 1],
  ].forEach(([z, r, i]) => {
    const mur = new THREE.Mesh(new THREE.PlaneGeometry(LARGEUR, HAUTEUR), MATS[i].peinture);
    mur.position.set(0, HAUTEUR / 2, z);
    mur.rotation.y = r;
    scene.add(mur);
  });

  /**
   * Habillage d'un mur : lambris à panneaux, plinthe, cimaise, pilastres,
   * corniche et néon d'éclairage indirect posé sur la corniche.
   * Le mur est décrit dans un repère local : u le long du mur, n vers la salle.
   * `place(u, n)` renvoie la position (x, z) et `taille(lu, ln)` les dimensions (x, z).
   */
  function habillerMur(m, { place, taille, segments, pilastres, longueurTotale, centre }) {
    const piece = (materiau, lu, h, ln, u, y, n) => {
      const [x, z] = place(u, n);
      const [sx, sz] = taille(lu, ln);
      lot(materiau).boite(sx, h, sz, x, y, z);
    };
    segments.forEach(([a, b]) => {
      const lu = b - a,
        u = (a + b) / 2;
      piece(m.lambris, lu, LAMBRIS_H, 0.04, u, LAMBRIS_H / 2, 0.02);
      piece(matPlinthe, lu, 0.16, 0.07, u, 0.08, 0.035);
      piece(m.moulure, lu, 0.05, 0.07, u, LAMBRIS_H + 0.02, 0.035);
    });
    // Panneaux en relief, répartis entre les pilastres
    const coupures = [...pilastres.map((p) => [p - 0.42, p + 0.42])];
    segments.forEach(([a, b]) => {
      const travees = [];
      let debut = a + 0.12;
      coupures
        .filter(([c0]) => c0 > a && c0 < b)
        .sort((x, y) => x[0] - y[0])
        .forEach(([c0, c1]) => {
          travees.push([debut, c0]);
          debut = c1;
        });
      travees.push([debut, b - 0.12]);
      travees.forEach(([t0, t1]) => {
        const lu = t1 - t0;
        if (lu < 0.6) return;
        const n = Math.max(1, Math.round(lu / 1.8)),
          pas = lu / n;
        for (let k = 0; k < n; k++)
          piece(m.panneau, pas - 0.28, 0.46, 0.02, t0 + pas * (k + 0.5), 0.45, 0.05);
      });
    });
    // Pilastres : base, fût, astragale et chapiteau
    pilastres.forEach((u) => {
      piece(m.pilastre, 0.5, CORNICHE_Y, 0.14, u, CORNICHE_Y / 2, 0.07);
      piece(m.moulure, 0.64, 0.34, 0.2, u, 0.17, 0.1);
      piece(m.moulure, 0.58, 0.05, 0.18, u, CORNICHE_Y - 0.3, 0.09);
      piece(m.moulure, 0.68, 0.12, 0.24, u, CORNICHE_Y - 0.17, 0.12);
    });
    // Corniche en trois ressauts, soulignée d'un fin néon de la couleur de l'époque
    piece(m.moulure, longueurTotale, 0.1, 0.16, centre, CORNICHE_Y + 0.05, 0.08);
    piece(m.moulure, longueurTotale, 0.18, 0.3, centre, CORNICHE_Y + 0.19, 0.15);
    piece(m.moulure, longueurTotale, 0.04, 0.34, centre, CORNICHE_Y + 0.3, 0.17);
    piece(m.neon, longueurTotale - 0.7, 0.022, 0.02, centre, CORNICHE_Y + 0.3, 0.35);
  }

  // Murs latéraux : u = z, n vers le centre de la salle
  SALLES.forEach((salle, i) => {
    const z0 = debutSalle(i);
    [-1, 1].forEach((cote) =>
      habillerMur(MATS[i], {
        place: (u, n) => [cote * (DEMI_L - n), u],
        taille: (lu, ln) => [ln, lu],
        segments: [[z0 - LONG_SALLE, z0]],
        pilastres: PILASTRES.map((p) => z0 - p),
        longueurTotale: LONG_SALLE,
        centre: z0 - LONG_SALLE / 2,
      }),
    );
  });
  // Murs transversaux : u = x ; s = +1 si la salle est du côté des z positifs
  const habillerTravers = (i, zMur, s, arche) =>
    habillerMur(MATS[i], {
      place: (u, n) => [u, zMur + s * n],
      taille: (lu, ln) => [lu, ln],
      segments: arche
        ? [
            [-DEMI_L, -X_BANDEAU - 0.06],
            [X_BANDEAU + 0.06, DEMI_L],
          ]
        : [[-DEMI_L, DEMI_L]],
      pilastres: arche ? [] : [-5.4, 5.4],
      longueurTotale: LARGEUR,
      centre: 0,
    });
  habillerTravers(0, Z_ENTREE, -1, false);
  habillerTravers(SALLES.length - 1, Z_FOND, 1, false);

  /* --- Cloisons entre les salles : portes en arc encadrées de pierre --- */
  const uvMur = (geo) => {
    const p = geo.attributes.position,
      uv = geo.attributes.uv;
    for (let k = 0; k < p.count; k++)
      uv.setXY(k, (p.getX(k) + DEMI_L) / LARGEUR, p.getY(k) / HAUTEUR);
  };
  const geoCloison = new THREE.ExtrudeGeometry(formeCloison(), {
    depth: EPAIS / 2,
    bevelEnabled: false,
    curveSegments: 24,
  });
  uvMur(geoCloison);
  const geoBandeau = new THREE.ExtrudeGeometry(formeBandeau(), {
    depth: 0.08,
    bevelEnabled: false,
    curveSegments: 24,
  });
  CLOISONS.forEach((z, k) => {
    // Chaque cloison a deux moitiés : l'une peinte aux couleurs de la salle k,
    // l'autre à celles de la salle k + 1
    [
      [k, 1],
      [k + 1, -1],
    ].forEach(([i, s]) => {
      const m = MATS[i];
      const moitie = new THREE.Mesh(geoCloison, [m.peinture, m.moulure]);
      moitie.position.z = s > 0 ? z : z - EPAIS / 2;
      scene.add(moitie);
      const zf = z + (s * EPAIS) / 2; // face visible depuis la salle i
      const bandeau = new THREE.Mesh(geoBandeau, m.moulure);
      bandeau.position.z = s > 0 ? zf : zf - 0.08;
      scene.add(bandeau);
      const pierre = (l, h, p, x, y) => lot(m.moulure).boite(l, h, p, x, y, zf + (s * p) / 2);
      pierre(0.5, 0.56, 0.16, 0, NAISSANCE + FLECHE + 0.18); // clé de voûte
      [-1, 1].forEach((c) => {
        pierre(BANDEAU + 0.12, 0.13, 0.13, c * (DEMI_PORTE + BANDEAU / 2), NAISSANCE); // imposte
        pierre(BANDEAU + 0.1, 0.38, 0.14, c * (DEMI_PORTE + BANDEAU / 2), 0.19); // socle
      });
      habillerTravers(i, zf, s, true);
    });
  });

  /* --- Plafonds : verrière en berceau et caissons --- */
  const texVerriere = textureVerriere(renderer);
  const matVerriere = new THREE.MeshBasicMaterial({
    map: texVerriere,
    color: new THREE.Color(0xffffff).multiplyScalar(1.05),
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const matLunette = new THREE.MeshBasicMaterial({
    map: textureLunette(renderer),
    color: new THREE.Color(0xffffff).multiplyScalar(1.05),
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const LONG_VOUTE = LONG_SALLE - 2 * VOUTE_MARGE;
  const NB_ARCS = Math.round(LONG_VOUTE / 1.6),
    PAS_ARC = LONG_VOUTE / NB_ARCS;
  const NB_CARREAUX = 8;
  texVerriere.repeat.set(NB_CARREAUX, NB_ARCS);
  const geoVoute = new THREE.CylinderGeometry(
    VOUTE_R,
    VOUTE_R,
    LONG_VOUTE,
    40,
    1,
    true,
    Math.PI / 2,
    Math.PI,
  );
  geoVoute.rotateX(Math.PI / 2);
  const geoArc = new THREE.TorusGeometry(VOUTE_R - 0.05, 0.055, 8, 40, Math.PI);
  const geoLunette = new THREE.CircleGeometry(VOUTE_R, 40, 0, Math.PI);
  const geoSpot = new THREE.CylinderGeometry(0.06, 0.085, 0.24, 12);
  const geoLentille = new THREE.CylinderGeometry(0.062, 0.062, 0.01, 12);
  const largeurCote = DEMI_L - VOUTE_R;

  SALLES.forEach((salle, i) => {
    const m = MATS[i],
      z0 = debutSalle(i),
      zc = centreSalle(i);
    const voute = !m.sombre;
    // Panneaux de plafond plats (tout le plafond pour la salle d'arcade)
    const plaque = (l, p, x, z) => {
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(l, p), m.plafond);
      pl.rotation.x = Math.PI / 2;
      pl.position.set(x, HAUTEUR, z);
      scene.add(pl);
    };
    if (voute) {
      [-1, 1].forEach((c) => plaque(largeurCote, LONG_SALLE, c * (VOUTE_R + largeurCote / 2), zc));
      plaque(2 * VOUTE_R, VOUTE_MARGE, 0, z0 - VOUTE_MARGE / 2);
      plaque(2 * VOUTE_R, VOUTE_MARGE, 0, z0 - LONG_SALLE + VOUTE_MARGE / 2);

      // La verrière, ses arcs, ses meneaux et ses deux lunettes
      const verre = new THREE.Mesh(geoVoute, matVerriere);
      verre.position.set(0, HAUTEUR, zc);
      scene.add(verre);
      const zDebut = z0 - VOUTE_MARGE;
      for (let k = 0; k <= NB_ARCS; k++) lot(matMetal, geoArc).ajouter(0, HAUTEUR, zDebut - k * PAS_ARC);
      for (let k = 1; k < NB_CARREAUX; k++) {
        const a = (k * Math.PI) / NB_CARREAUX,
          r = VOUTE_R - 0.04;
        lot(matMetal).ajouter(
          Math.cos(a) * r,
          HAUTEUR + Math.sin(a) * r,
          zc,
          0.045,
          0.045,
          LONG_VOUTE,
          0,
          0,
          a,
        );
      }
      [
        [zDebut, Math.PI],
        [zDebut - LONG_VOUTE, 0],
      ].forEach(([z, r]) => {
        const lunette = new THREE.Mesh(geoLunette, matLunette);
        lunette.position.set(0, HAUTEUR, z);
        lunette.rotation.y = r;
        scene.add(lunette);
      });
      // Poutres de pierre qui portent la verrière
      [-1, 1].forEach((c) => lot(m.poutre).boite(0.34, 0.4, LONG_SALLE, c * VOUTE_R, HAUTEUR - 0.2, zc));
      [zDebut, zDebut - LONG_VOUTE].forEach((z) =>
        lot(m.poutre).boite(2 * VOUTE_R + 0.34, 0.4, 0.34, 0, HAUTEUR - 0.2, z),
      );
    } else {
      plaque(LARGEUR, LONG_SALLE, 0, zc);
      [-1, 1].forEach((c) => lot(m.poutre).boite(0.3, 0.3, LONG_SALLE, c * VOUTE_R, HAUTEUR - 0.15, zc));
    }
    // Caissons : poutres croisées sur les côtés du plafond
    for (let z = z0 - 1; z > z0 - LONG_SALLE + 0.5; z -= 2) {
      [-1, 1].forEach((c) =>
        lot(m.poutre).boite(largeurCote, 0.24, 0.16, c * (VOUTE_R + largeurCote / 2), HAUTEUR - 0.12, z),
      );
      if (!voute) lot(m.poutre).boite(2 * VOUTE_R, 0.24, 0.16, 0, HAUTEUR - 0.12, z);
    }
    [-1, 1].forEach((c) =>
      lot(m.poutre).boite(0.16, 0.24, LONG_SALLE, c * (DEMI_L - 2.6), HAUTEUR - 0.12, zc),
    );
    // Rails de spots sous les poutres, avec des projecteurs orientés vers les murs
    [-1, 1].forEach((c) => {
      const x = c * (DEMI_L - 2.6);
      lot(matMetal).boite(0.06, 0.05, LONG_SALLE - 1, x, HAUTEUR - 0.27, zc);
      for (let z = z0 - 1.6; z > z0 - LONG_SALLE + 1; z -= 2.6) {
        const incl = c * 0.65;
        const y = HAUTEUR - 0.45;
        lot(matMetal, geoSpot).ajouter(x, y, z, 1, 1, 1, 0, 0, incl);
        lot(matMetal).boite(0.02, 0.16, 0.02, x, HAUTEUR - 0.33, z);
        lot(matAmpoule, geoLentille).ajouter(
          x + Math.sin(incl) * 0.122,
          y - Math.cos(incl) * 0.122,
          z,
          1,
          1,
          1,
          0,
          0,
          incl,
        );
      }
    });
  });

  /* --- Lumière : chaleureuse dans les salles d'exposition, néons dans la salle d'arcade --- */
  scene.add(new THREE.HemisphereLight(0xfff4e6, 0x2a1d14, 0.45));
  scene.add(new THREE.AmbientLight(0xffffff, 0.08));
  SALLES.forEach((salle, i) => {
    const z0 = debutSalle(i),
      zc = centreSalle(i);
    const arcade = salle.id === "arcade";
    [z0 - 7, z0 - 19].forEach((z) => {
      const lumiere = new THREE.PointLight(
        arcade ? salle.couleur : 0xffe6c7,
        arcade ? 9 : 13,
        20,
        1.5,
      );
      lumiere.position.set(0, HAUTEUR - 0.6, z);
      scene.add(lumiere);
    });
    if (arcade) {
      // Néons au ras du sol et tubes au plafond, comme dans une salle de jeux
      const m = MATS[i].neon;
      [-1, 1].forEach((cote) =>
        lot(m).boite(0.04, 0.04, LONG_SALLE - 1.2, cote * (DEMI_L - 0.09), 0.2, zc),
      );
      [-3, 0, 3].forEach((x) =>
        boite(
          scene,
          0.06,
          0.06,
          LONG_SALLE - 6,
          neon(["#3cf2c8", "#ff4f9a", "#7c9cff"][x / 3 + 1], 1.8),
          x,
          HAUTEUR - 0.32,
          zc,
        ),
      );
    }
  });

  /* --- Titre de chaque salle, gravé au-dessus de l'arche (ou suspendu à l'entrée) --- */
  SALLES.forEach((salle, i) => {
    const z0 = debutSalle(i);
    const titre = new THREE.Mesh(
      new THREE.PlaneGeometry(6.4, 1.2),
      new THREE.MeshBasicMaterial({
        transparent: true,
        toneMapped: false,
        map: textureCanvas(renderer, 1280, 240, (g, l, h) => {
          g.textAlign = "center";
          g.textBaseline = "middle";
          g.fillStyle = salle.couleur;
          g.font = "700 38px Silkscreen, 'Courier New', monospace";
          g.fillText(`SALLE ${salle.numero} · ${salle.periode}`, l / 2, 50);
          g.fillRect(l / 2 - 40, 92, 80, 4);
          g.fillStyle = "#f4f1ea";
          g.font = "600 92px 'Chakra Petch', sans-serif";
          g.fillText(salle.nom.toUpperCase(), l / 2, 162);
        }),
      }),
    );
    titre.position.set(
      0,
      i === 0 ? 4.3 : 4.88,
      i === 0 ? Z_ENTREE - 0.06 : z0 + EPAIS / 2 + 0.02,
    );
    if (i === 0) titre.rotation.y = Math.PI;
    scene.add(titre);
    if (i === 0) {
      // À l'entrée, le titre est aussi suspendu face au visiteur, par deux câbles
      const suspendu = titre.clone();
      suspendu.rotation.y = 0;
      suspendu.position.set(0, 4.5, z0 - 4);
      scene.add(suspendu);
      [-2.9, 2.9].forEach((x) =>
        lot(matMetal).boite(0.012, HAUTEUR - 5.0, 0.012, x, (HAUTEUR + 5.0) / 2, z0 - 4),
      );
    }
  });

  /* --- Au centre des salles 1, 3 et 4 : une vitrine sur une rosace de marbre, et deux banquettes --- */
  const matSocle = new THREE.MeshStandardMaterial({ color: 0xf1eee8, roughness: 0.6 });
  const matVerre = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.02,
    metalness: 0,
    transparent: true,
    opacity: 0.14,
    envMapIntensity: 1.4,
    depthWrite: false,
  });
  const matBois = new THREE.MeshStandardMaterial({ color: 0x8a5a34, roughness: 0.4 });
  const matCuir = new THREE.MeshStandardMaterial({ color: 0x3a2a24, roughness: 0.55 });
  const matNoir = new THREE.MeshStandardMaterial({
    color: 0x151518,
    roughness: 0.4,
    metalness: 0.6,
  });
  const matRosace = new THREE.MeshStandardMaterial({
    map: textureRosace(renderer),
    roughness: 0.25,
    envMapIntensity: 0.8,
  });
  const geoRosace = new THREE.CircleGeometry(2.2, 72);
  const texHalo = textureHalo(renderer);
  SALLES.forEach((salle) => {
    if (salle.id === "arcade") return;
    const zc = centreSalle(SALLES.indexOf(salle));
    const rosace = new THREE.Mesh(geoRosace, matRosace);
    rosace.rotation.x = -Math.PI / 2;
    rosace.position.set(0, 0.008, zc);
    scene.add(rosace);
    boite(scene, 1.2, 1.0, 1.2, matSocle, 0, 0.5, zc);
    boite(scene, 1.28, 0.08, 1.28, matNoir, 0, 0.04, zc);
    boite(scene, 1.24, 0.03, 1.24, matLaiton, 0, 1.0, zc);
    const vitre = boite(scene, 1.08, 0.9, 1.08, matVerre, 0, 1.46, zc);
    vitre.renderOrder = 2;
    boite(scene, 1.1, 0.02, 1.1, matNoir, 0, 1.92, zc);
    OBSTACLES.push({ x: 0, z: zc, demiX: 0.65, demiZ: 0.65 });
    // L'objet exposé : une sculpture qui évoque l'époque
    const formes = {
      pionniers: new THREE.IcosahedronGeometry(0.28, 0),
      consoles: new THREE.TorusKnotGeometry(0.18, 0.06, 120, 16),
      moderne: new THREE.SphereGeometry(0.27, 32, 20),
    };
    const objet = new THREE.Mesh(
      formes[salle.id],
      new THREE.MeshStandardMaterial({
        color: salle.couleur,
        roughness: 0.25,
        metalness: 0.7,
        flatShading: salle.id === "pionniers",
      }),
    );
    objet.position.set(0, 1.42, zc);
    scene.add(objet);
    animations.push((dt, t) => {
      objet.rotation.y += dt * 0.5;
      objet.position.y = 1.42 + Math.sin(t * 1.3) * 0.03;
    });
    // Tache de lumière du spot sur le sol autour du socle
    const tache = new THREE.Mesh(
      new THREE.PlaneGeometry(4, 4),
      new THREE.MeshBasicMaterial({
        map: texHalo,
        color: 0xffe2b8,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    tache.rotation.x = -Math.PI / 2;
    tache.position.set(0, 0.02, zc);
    scene.add(tache);
    // Banquettes de cuir sur piètement de bois, de part et d'autre
    [zc + 5.2, zc - 5.2].forEach((z) => {
      lot(matBois).boite(2.2, 0.07, 0.56, 0, 0.4, z);
      lot(matCuir).boite(2.12, 0.1, 0.5, 0, 0.485, z);
      [-0.98, 0.98].forEach((x) => {
        lot(matBois).boite(0.07, 0.38, 0.07, x, 0.19, z - 0.22);
        lot(matBois).boite(0.07, 0.38, 0.07, x, 0.19, z + 0.22);
      });
      lot(matLaiton).boite(1.9, 0.025, 0.025, 0, 0.12, z);
      OBSTACLES.push({ x: 0, z, demiX: 1.1, demiZ: 0.28 });
    });
  });

  /* --- Mot de la fin, sur le mur du fond --- */
  const fin = new THREE.Mesh(
    new THREE.PlaneGeometry(9, 2.2),
    new THREE.MeshBasicMaterial({
      transparent: true,
      toneMapped: false,
      map: textureCanvas(renderer, 1800, 440, (g, l, h) => {
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.shadowColor = "#3cf2c8";
        g.shadowBlur = 20;
        g.fillStyle = "#3cf2c8";
        g.font = "700 150px Silkscreen, 'Courier New', monospace";
        g.fillText("CONTINUE ?", l / 2, 170);
        g.shadowBlur = 0;
        g.fillStyle = "#d9d5cc";
        g.font = "500 54px Figtree, sans-serif";
        g.fillText("Merci de votre visite · revenez jouer quand vous voulez", l / 2, 330);
      }),
    }),
  );
  fin.position.set(0, 3.4, Z_FOND + 0.06);
  scene.add(fin);

  // Toutes les pièces répétées sont posées en une fois
  lots.forEach((l) => l.poser(scene));

  let temps = 0;
  return (dt) => {
    temps += dt;
    animations.forEach((a) => a(dt, temps));
  };
}
