/* ============================================================
   CONTINUE ? — Postes de consoles jouables (salles 3 et 4)
   Chaque poste reproduit un coin de salon de l'époque :
   un meuble, la télé du moment, la console à l'échelle réelle et
   sa manette branchée. L'écran affiche l'écran d'attente de la
   console ; un clic (ou E) s'approche de la télé et allume la
   console : démarrage, puis le jeu, avec la vraie manette à l'écran.
   Les modèles sont construits à partir des vraies dimensions
   (en mètres) ; les logos des marques ne sont pas reproduits.
   ============================================================ */
import * as THREE from "three";
import { PLAN, OBSTACLES } from "./plan.js";
import { EXPOSITIONS } from "../expositions.js";
import { textureCanvas } from "./batiment.js";
import { CONSOLES, dessinerAttente, tailleEcran } from "../retro/consoles.js";

/* ---------- Petits outils de modélisation ---------- */
const plastique = (couleur, rugosite = 0.5, extra = {}) =>
  new THREE.MeshStandardMaterial({ color: couleur, roughness: rugosite, metalness: 0, ...extra });
const lumineux = (couleur, intensite = 1.6) =>
  new THREE.MeshBasicMaterial({
    color: new THREE.Color(couleur).multiplyScalar(intensite),
    toneMapped: false,
  });

/** Boîte de largeur l (x), hauteur h (y), profondeur p (z), posée par son centre */
function bloc(parent, l, h, p, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(l, h, p), mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
/** Cylindre debout (axe y), posé par son centre */
function cyl(parent, r, h, mat, x, y, z, segments = 24) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, segments), mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
/** Cylindre couché dont la face regarde vers l'avant (+z) */
function bouton(parent, r, epais, mat, x, y, z) {
  const m = cyl(parent, r, epais, mat, x, y, z);
  m.rotation.x = Math.PI / 2;
  return m;
}
/** Rectangle aux coins arrondis ; rayons = [haut gauche, haut droit, bas droit, bas gauche] */
function formeArrondie(l, h, rayons) {
  const [hg, hd, bd, bg] = typeof rayons === "number" ? [rayons, rayons, rayons, rayons] : rayons;
  const x0 = -l / 2,
    y0 = -h / 2,
    x1 = l / 2,
    y1 = h / 2;
  const s = new THREE.Shape();
  s.moveTo(x0 + bg, y0);
  s.lineTo(x1 - bd, y0);
  s.quadraticCurveTo(x1, y0, x1, y0 + bd);
  s.lineTo(x1, y1 - hd);
  s.quadraticCurveTo(x1, y1, x1 - hd, y1);
  s.lineTo(x0 + hg, y1);
  s.quadraticCurveTo(x0, y1, x0, y1 - hg);
  s.lineTo(x0, y0 + bg);
  s.quadraticCurveTo(x0, y0, x0 + bg, y0);
  return s;
}
/**
 * Boîte arrondie posée à plat : vue de dessus l × p (coins arrondis), hauteur h.
 * Le bas est en y = 0. Les bords sont légèrement chanfreinés.
 */
function geoPlate(l, h, p, rayons, biseau = 0.003) {
  const b = Math.min(biseau, h / 3);
  const r =
    typeof rayons === "number"
      ? Math.max(0.0005, rayons - b)
      : rayons.map((v) => Math.max(0.0005, v - b));
  const g = new THREE.ExtrudeGeometry(formeArrondie(l - 2 * b, p - 2 * b, r), {
    depth: h - 2 * b,
    bevelEnabled: b > 0,
    bevelThickness: b,
    bevelSize: b,
    bevelSegments: 2,
    curveSegments: 10,
  });
  g.rotateX(-Math.PI / 2);
  g.translate(0, b, 0);
  return g;
}
/** Boîte arrondie debout : vue de face l × h (coins arrondis), profondeur p, centrée en z */
function geoDebout(l, h, p, rayons, biseau = 0.003) {
  const b = Math.min(biseau, p / 3);
  const r =
    typeof rayons === "number"
      ? Math.max(0.0005, rayons - b)
      : rayons.map((v) => Math.max(0.0005, v - b));
  const g = new THREE.ExtrudeGeometry(formeArrondie(l - 2 * b, h - 2 * b, r), {
    depth: p - 2 * b,
    bevelEnabled: b > 0,
    bevelThickness: b,
    bevelSize: b,
    bevelSegments: 2,
    curveSegments: 10,
  });
  g.translate(0, h / 2, -p / 2 + b);
  return g;
}
const maille = (parent, geo, mat, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
};
/** Croix directionnelle à plat (sur le dessus d'une manette) */
function croixPlate(parent, taille, epais, mat, x, y, z) {
  bloc(parent, taille, epais, taille / 3, mat, x, y, z);
  bloc(parent, taille / 3, epais, taille, mat, x, y, z);
}
/** Câble souple entre deux points, qui retombe sur le meuble */
function cable(parent, a, b, mat, rayon = 0.0028) {
  const milieu = a.clone().lerp(b, 0.5);
  const courbe = new THREE.CatmullRomCurve3([
    a,
    a
      .clone()
      .lerp(milieu, 0.5)
      .setY(Math.min(a.y, b.y) - 0.002),
    milieu
      .clone()
      .add(new THREE.Vector3(0.05, 0, 0.06))
      .setY(Math.min(a.y, b.y) - 0.004),
    b
      .clone()
      .lerp(milieu, 0.4)
      .setY(Math.min(a.y, b.y) - 0.002),
    b,
  ]);
  parent.add(new THREE.Mesh(new THREE.TubeGeometry(courbe, 40, rayon, 6), mat));
}

/* ---------- Matériaux partagés ---------- */
const MAT = {
  noir: plastique(0x141416, 0.55),
  noirBrillant: plastique(0x101012, 0.25),
  grisFonce: plastique(0x3a3a3e, 0.55),
  caoutchouc: plastique(0x26262a, 0.8),
  fente: plastique(0x050506, 0.9),
  ledRouge: lumineux("#ff2a2a", 2),
  ledVerte: lumineux("#38ff6a", 1.6),
  ledBleue: lumineux("#3aa8ff", 1.8),
  cable: plastique(0x2c2c30, 0.7),
  acrylique: new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.05,
    transparent: true,
    opacity: 0.25,
    envMapIntensity: 1.2,
    depthWrite: false,
  }),
  laiton: new THREE.MeshStandardMaterial({ color: 0xc39a4e, roughness: 0.3, metalness: 0.9 }),
};

/* ============================================================
   LES CONSOLES (origine : au sol, au centre ; l'avant regarde +z)
   Chaque fonction renvoie { groupe, port } : port = prise manette
   ============================================================ */

/** NES (1985) : 256 × 203 × 85 mm, coque en deux tons de gris, chargement frontal */
function nes() {
  const g = new THREE.Group();
  const L = 0.256,
    P = 0.203;
  const clair = plastique(0xc8c8c6, 0.6),
    fonce = plastique(0x4c4c4e, 0.55);
  maille(g, geoPlate(L, 0.036, P, 0.004, 0.002), fonce); // coque du bas
  maille(g, geoPlate(L, 0.049, P, 0.004, 0.002), clair, 0, 0.036, 0); // coque du haut
  // Partie droite du dessus, plus foncée et striée
  bloc(g, 0.088, 0.003, P - 0.012, fonce, L / 2 - 0.05, 0.0865, 0);
  for (let k = 0; k < 9; k++)
    bloc(g, 0.08, 0.0015, 0.004, MAT.noir, L / 2 - 0.05, 0.0885, -0.08 + k * 0.02);
  // Trappe de la cartouche, à l'avant
  bloc(g, 0.165, 0.04, 0.004, plastique(0xd2d2d0, 0.55), -0.03, 0.06, P / 2);
  for (let k = 0; k < 4; k++)
    bloc(g, 0.15, 0.0015, 0.002, plastique(0x9a9a98), -0.03, 0.074 - k * 0.004, P / 2 + 0.0022);
  // Bandeau du bas : boutons POWER et RESET, voyant rouge, deux prises manette
  [-0.104, -0.066].forEach((x) => bloc(g, 0.024, 0.012, 0.006, clair, x, 0.018, P / 2 + 0.002));
  bloc(g, 0.004, 0.004, 0.002, MAT.ledRouge, -0.085, 0.028, P / 2 + 0.001);
  [0.05, 0.086].forEach((x) => {
    bloc(g, 0.02, 0.024, 0.003, clair, x, 0.018, P / 2 + 0.001);
    bloc(g, 0.012, 0.016, 0.002, MAT.fente, x, 0.018, P / 2 + 0.003);
  });
  return { groupe: g, port: new THREE.Vector3(0.05, 0.018, P / 2) };
}
function manetteNes() {
  const g = new THREE.Group();
  const clair = plastique(0xcdcdcb, 0.6);
  maille(g, geoPlate(0.12, 0.016, 0.053, 0.004, 0.002), clair);
  bloc(g, 0.112, 0.001, 0.044, MAT.noir, 0, 0.0163, 0);
  croixPlate(g, 0.028, 0.004, MAT.noir, -0.036, 0.018, 0.002);
  [-0.006, 0.006].forEach((dz) =>
    bloc(g, 0.026, 0.0012, 0.005, plastique(0xa9a9a7), -0.002, 0.0168, dz - 0.006),
  );
  [-0.008, 0.006].forEach((x) => bloc(g, 0.01, 0.003, 0.004, MAT.noir, x, 0.0178, 0.009));
  [0.03, 0.046].forEach((x) => {
    bloc(g, 0.015, 0.0012, 0.015, clair, x, 0.0168, 0.004);
    cyl(g, 0.0062, 0.004, plastique(0xc8102e, 0.4), x, 0.018, 0.004);
  });
  return { groupe: g, prise: new THREE.Vector3(0, 0.008, -0.026) };
}

/** Game Boy (1989) : 90 × 148 × 32 mm, coin bas droit très arrondi */
function gameboy() {
  const g = new THREE.Group();
  const L = 0.09,
    H = 0.148,
    P = 0.032,
    av = P / 2 + 0.0005;
  maille(g, geoDebout(L, H, P, [0.006, 0.006, 0.03, 0.006], 0.003), plastique(0xc5c3bd, 0.55));
  // Rainures du haut
  bloc(g, L - 0.01, 0.001, 0.001, plastique(0x9e9c97), 0, H - 0.008, av);
  // Cadre de l'écran, gris-bleu, coin bas droit arrondi, deux filets colorés
  const cadre = new THREE.Mesh(
    new THREE.ShapeGeometry(formeArrondie(0.076, 0.058, [0.004, 0.004, 0.016, 0.004]), 8),
    plastique(0x5c5e6e, 0.5),
  );
  cadre.position.set(0, 0.106, av);
  g.add(cadre);
  bloc(g, 0.05, 0.0012, 0.0004, plastique(0x8c1c4c, 0.5), -0.008, 0.131, av + 0.0003);
  bloc(g, 0.05, 0.0012, 0.0004, plastique(0x2a2a74, 0.5), -0.008, 0.1295, av + 0.0003);
  bouton(g, 0.0016, 0.001, MAT.ledRouge, -0.031, 0.108, av + 0.0004);
  // Croix, boutons A et B magenta, SELECT et START inclinés
  const croix = new THREE.Group();
  croixPlate(croix, 0.024, 0.004, MAT.noir, 0, 0, 0);
  croix.rotation.x = Math.PI / 2;
  croix.position.set(-0.024, 0.054, av + 0.002);
  g.add(croix);
  [
    [0.018, 0.048],
    [0.035, 0.057],
  ].forEach(([x, y]) => bouton(g, 0.0058, 0.004, plastique(0x9b1b4b, 0.4), x, y, av + 0.002));
  [-0.008, 0.008].forEach((x) => {
    const pil = bloc(g, 0.012, 0.0035, 0.003, plastique(0x77777f, 0.8), x, 0.026, av + 0.0015);
    pil.rotation.z = 0.45;
  });
  // Haut-parleur : six fentes en biais
  for (let k = 0; k < 6; k++) {
    const f = bloc(g, 0.0022, 0.024, 0.001, plastique(0x7d7b77), 0.018 + k * 0.0055, 0.016, av);
    f.rotation.z = 0.45;
  }
  return { groupe: g, ecran: { l: 0.047, h: 0.043, x: 0.003, y: 0.104, z: av + 0.0006 } };
}

/** Mega Drive (1988, premier modèle) : 280 × 212 × 70 mm, noire, disque central */
function megadrive(renderer) {
  const g = new THREE.Group();
  const L = 0.28,
    P = 0.212;
  maille(g, geoPlate(L, 0.052, P, 0.018, 0.006), MAT.noirBrillant);
  // Rainures sur le dessus, de chaque côté du disque
  [-1, 1].forEach((c) => {
    for (let k = 0; k < 7; k++)
      bloc(g, 0.002, 0.0015, P - 0.05, MAT.grisFonce, c * (0.1 + k * 0.006), 0.0525, 0);
  });
  // Disque surélevé, son anneau et l'inscription dorée
  const texDisque = textureCanvas(renderer, 512, 512, (c, l, h) => {
    c.fillStyle = "#121214";
    c.fillRect(0, 0, l, h);
    c.strokeStyle = "#2c2c30";
    c.lineWidth = 3;
    for (let r = 60; r < 250; r += 26) {
      c.beginPath();
      c.arc(l / 2, h / 2, r, 0, Math.PI * 2);
      c.stroke();
    }
    c.fillStyle = "#d4a43a";
    c.font = "700 40px Arial, sans-serif";
    c.textAlign = "center";
    c.save();
    c.translate(l / 2, h / 2);
    "16-BIT".split("").forEach((ch, i) => {
      c.save();
      c.rotate(-0.55 + i * 0.22);
      c.fillText(ch, 0, -196);
      c.restore();
    });
    c.restore();
  });
  cyl(g, 0.09, 0.006, MAT.grisFonce, 0, 0.055, -0.005, 48);
  cyl(
    g,
    0.085,
    0.01,
    [MAT.noirBrillant, plastique(0xffffff, 0.35, { map: texDisque }), MAT.noir],
    0,
    0.062,
    -0.005,
    48,
  );
  // Fente de la cartouche et ses volets
  bloc(g, 0.118, 0.004, 0.026, MAT.fente, 0, 0.0665, -0.005);
  [-1, 1].forEach((c) =>
    bloc(g, 0.118, 0.003, 0.006, MAT.grisFonce, 0, 0.0675, -0.005 + c * 0.016),
  );
  // Interrupteur, voyant, bouton reset
  bloc(g, 0.03, 0.008, 0.016, MAT.grisFonce, -0.105, 0.056, 0.07);
  bloc(g, 0.01, 0.006, 0.01, plastique(0xb0b0b4), -0.112, 0.06, 0.07);
  bloc(g, 0.004, 0.002, 0.004, MAT.ledRouge, -0.085, 0.0525, 0.07);
  bloc(g, 0.02, 0.006, 0.014, MAT.grisFonce, 0.105, 0.056, 0.07);
  // Prises manettes à l'avant, curseur de volume et prise casque à gauche
  [0.05, 0.09].forEach((x) => {
    bloc(g, 0.022, 0.018, 0.003, MAT.grisFonce, x, 0.026, P / 2 + 0.001);
    bloc(g, 0.016, 0.01, 0.002, MAT.fente, x, 0.026, P / 2 + 0.003);
  });
  bloc(g, 0.03, 0.004, 0.002, MAT.fente, -0.09, 0.026, P / 2 + 0.002);
  bouton(g, 0.003, 0.003, MAT.fente, -0.115, 0.026, P / 2 + 0.002);
  return { groupe: g, port: new THREE.Vector3(0.05, 0.026, P / 2) };
}
function manetteMegadrive() {
  const g = new THREE.Group();
  // Forme en croissant : deux poignées arrondies reliées
  const s = new THREE.Shape();
  s.absellipse(0, 0, 0.084, 0.04, 0, Math.PI * 2, false);
  const corps = new THREE.ExtrudeGeometry(s, {
    depth: 0.014,
    bevelEnabled: true,
    bevelThickness: 0.006,
    bevelSize: 0.006,
    bevelSegments: 3,
    curveSegments: 32,
  });
  corps.rotateX(-Math.PI / 2);
  corps.translate(0, 0.006, 0);
  maille(g, corps, MAT.noirBrillant);
  cyl(g, 0.021, 0.004, MAT.grisFonce, -0.046, 0.026, 0.002, 32);
  croixPlate(g, 0.03, 0.004, MAT.noir, -0.046, 0.029, 0.002);
  [
    [0.026, 0.01],
    [0.045, 0.002],
    [0.064, -0.006],
  ].forEach(([x, z]) => cyl(g, 0.0068, 0.005, MAT.noir, x, 0.028, z));
  bloc(g, 0.012, 0.003, 0.005, MAT.grisFonce, 0.005, 0.0275, -0.016);
  return { groupe: g, prise: new THREE.Vector3(0, 0.012, -0.044) };
}

/** PlayStation (1994, SCPH-1001) : 270 × 188 × 60 mm, gris clair, couvercle rond */
function playstation() {
  const g = new THREE.Group();
  const L = 0.27,
    P = 0.188;
  const gris = plastique(0xc3c3c8, 0.55),
    grisClair = plastique(0xcfcfd4, 0.5);
  maille(g, geoPlate(L, 0.05, P, 0.01, 0.006), gris);
  // Arrière en gradins, strié
  bloc(g, L - 0.02, 0.006, 0.04, grisClair, 0, 0.053, -P / 2 + 0.026);
  for (let k = 0; k < 10; k++)
    bloc(g, 0.003, 0.002, 0.036, plastique(0x9c9ca2), -0.1 + k * 0.022, 0.0565, -P / 2 + 0.026);
  // Couvercle du lecteur CD
  cyl(g, 0.074, 0.004, plastique(0x9c9ca2, 0.5), 0.045, 0.051, 0.008, 64);
  cyl(g, 0.071, 0.006, grisClair, 0.045, 0.053, 0.008, 64);
  cyl(g, 0.04, 0.0015, gris, 0.045, 0.0565, 0.008, 48);
  // Boutons OPEN, POWER, RESET et voyant
  cyl(g, 0.012, 0.006, grisClair, -0.09, 0.052, -0.035);
  cyl(g, 0.0125, 0.006, grisClair, -0.09, 0.052, 0.03);
  cyl(g, 0.008, 0.005, grisClair, -0.11, 0.052, 0.0);
  bloc(g, 0.004, 0.002, 0.004, MAT.ledVerte, -0.072, 0.0505, 0.048);
  // À l'avant : fentes des cartes mémoire et prises manettes
  [-0.06, 0.06].forEach((x) => {
    bloc(g, 0.045, 0.004, 0.003, MAT.fente, x, 0.038, P / 2 + 0.001);
    bloc(g, 0.04, 0.014, 0.003, plastique(0x8e8e94), x, 0.018, P / 2 + 0.001);
    bloc(g, 0.032, 0.008, 0.002, MAT.fente, x, 0.018, P / 2 + 0.003);
  });
  return { groupe: g, port: new THREE.Vector3(0.06, 0.018, P / 2) };
}
function manettePlaystation() {
  const g = new THREE.Group();
  const gris = plastique(0xb9b9bf, 0.55);
  maille(g, geoPlate(0.11, 0.022, 0.046, 0.016, 0.006), gris, 0, 0, -0.004);
  [-1, 1].forEach((c) => {
    const poignee = maille(
      g,
      geoPlate(0.04, 0.026, 0.075, 0.018, 0.008),
      gris,
      c * 0.052,
      -0.002,
      0.018,
    );
    poignee.rotation.y = c * 0.28;
  });
  // Flèches séparées à gauche, quatre boutons d'action à droite
  [
    [0, -0.011],
    [0, 0.011],
    [-0.011, 0],
    [0.011, 0],
  ].forEach(([dx, dz]) =>
    bloc(
      g,
      dx ? 0.009 : 0.007,
      0.004,
      dz ? 0.009 : 0.007,
      MAT.grisFonce,
      -0.046 + dx,
      0.024,
      -0.006 + dz,
    ),
  );
  [
    [0, -0.012, "#3cc47c"],
    [-0.012, 0, "#e86bb0"],
    [0.012, 0, "#e8443a"],
    [0, 0.012, "#4c8cf0"],
  ].forEach(([dx, dz, c]) => {
    cyl(g, 0.0058, 0.004, MAT.grisFonce, 0.046 + dx, 0.024, -0.006 + dz);
    cyl(g, 0.0028, 0.0008, lumineux(c, 1), 0.046 + dx, 0.0263, -0.006 + dz, 12);
  });
  // Deux sticks, SELECT et START
  [-0.022, 0.022].forEach((x) => {
    cyl(g, 0.008, 0.008, MAT.noir, x, 0.026, 0.016);
    cyl(g, 0.011, 0.004, MAT.caoutchouc, x, 0.031, 0.016);
  });
  [-0.009, 0.009].forEach((x) => bloc(g, 0.008, 0.0025, 0.004, MAT.grisFonce, x, 0.0235, -0.008));
  return { groupe: g, prise: new THREE.Vector3(0, 0.012, -0.026) };
}

/** Nintendo 64 (1996) : 260 × 190 × 73 mm, gris anthracite, bosse centrale */
function n64() {
  const g = new THREE.Group();
  const L = 0.26,
    P = 0.19;
  const coque = plastique(0x2a2a2e, 0.5);
  maille(g, geoPlate(L, 0.042, P, [0.05, 0.05, 0.06, 0.06], 0.008), coque);
  maille(g, geoPlate(0.132, 0.034, 0.15, 0.022, 0.006), coque, 0, 0.038, -0.018);
  // Fente de la cartouche sur la bosse
  bloc(g, 0.104, 0.004, 0.02, MAT.fente, 0, 0.072, -0.03);
  bloc(g, 0.11, 0.002, 0.026, MAT.grisFonce, 0, 0.0715, -0.03);
  // Trappe d'extension à l'avant de la bosse
  bloc(g, 0.08, 0.002, 0.034, plastique(0x323237, 0.45), 0, 0.0425, 0.07);
  for (let k = 0; k < 3; k++) bloc(g, 0.07, 0.001, 0.0015, MAT.noir, 0, 0.0437, 0.058 + k * 0.012);
  // Interrupteurs POWER et RESET
  [-0.088, 0.088].forEach((x) => {
    bloc(g, 0.02, 0.003, 0.03, MAT.noir, x, 0.0425, 0.02);
    bloc(g, 0.012, 0.006, 0.01, plastique(0x55555c), x, 0.045, 0.012);
  });
  // Quatre prises manettes à l'avant
  [-0.06, -0.02, 0.02, 0.06].forEach((x) => {
    bloc(g, 0.026, 0.02, 0.003, plastique(0x222226), x, 0.02, P / 2 + 0.001);
    bloc(g, 0.018, 0.012, 0.002, MAT.fente, x, 0.02, P / 2 + 0.003);
  });
  return { groupe: g, port: new THREE.Vector3(-0.06, 0.02, P / 2) };
}
function manetteN64() {
  const g = new THREE.Group();
  const gris = plastique(0x9b9ba3, 0.55);
  maille(g, geoPlate(0.155, 0.02, 0.05, [0.024, 0.024, 0.012, 0.012], 0.006), gris, 0, 0, -0.012);
  // Trois poignées
  [
    [-0.058, 0.25],
    [0, 0],
    [0.058, -0.25],
  ].forEach(([x, r]) => {
    const p = maille(g, geoPlate(0.032, 0.022, 0.07, 0.014, 0.007), gris, x, -0.002, 0.03);
    p.rotation.y = r;
  });
  croixPlate(g, 0.026, 0.004, MAT.noir, -0.05, 0.022, -0.012);
  // Stick analogique au centre, START rouge
  cyl(g, 0.012, 0.004, plastique(0x7c7c84), 0, 0.022, 0.018);
  cyl(g, 0.004, 0.012, plastique(0x8c8c94), 0, 0.028, 0.018);
  cyl(g, 0.008, 0.003, plastique(0x8c8c94, 0.7), 0, 0.035, 0.018);
  cyl(g, 0.006, 0.004, plastique(0xd62020, 0.4), 0, 0.022, -0.016);
  // A bleu, B vert, quatre C jaunes
  cyl(g, 0.0075, 0.005, plastique(0x1f4fd8, 0.4), 0.042, 0.022, 0.006);
  cyl(g, 0.0075, 0.005, plastique(0x199c3c, 0.4), 0.03, 0.022, -0.008);
  [
    [0, -0.011],
    [0, 0.011],
    [-0.011, 0],
    [0.011, 0],
  ].forEach(([dx, dz]) =>
    cyl(g, 0.0046, 0.004, plastique(0xf4c400, 0.4), 0.06 + dx, 0.022, -0.016 + dz),
  );
  return { groupe: g, prise: new THREE.Vector3(0, 0.01, -0.037) };
}

/** Wii (2006) : 157 × 215 × 44 mm, blanche, debout sur son socle */
function wii() {
  const g = new THREE.Group();
  const blanc = plastique(0xf3f3f1, 0.22);
  bloc(
    g,
    0.07,
    0.01,
    0.17,
    plastique(0xd8dade, 0.25, { transparent: true, opacity: 0.85 }),
    0,
    0.005,
    0,
  );
  const corps = new THREE.Mesh(geoDebout(0.044, 0.157, 0.215, 0.006, 0.003), blanc);
  corps.position.y = 0.01;
  g.add(corps);
  // Face avant : fente du disque éclairée en bleu, boutons, trappe
  const av = 0.1075 + 0.0005;
  bloc(g, 0.004, 0.128, 0.002, MAT.fente, -0.004, 0.09, av);
  bloc(g, 0.0016, 0.128, 0.001, MAT.ledBleue, 0.0015, 0.09, av + 0.0003);
  bloc(g, 0.012, 0.008, 0.002, plastique(0xe2e2e0, 0.3), 0, 0.158, av);
  bloc(g, 0.008, 0.006, 0.002, plastique(0xe2e2e0, 0.3), 0, 0.022, av);
  bloc(g, 0.03, 0.03, 0.001, plastique(0xe8e8e6, 0.3), 0.0, 0.04, av - 0.0002);
  return { groupe: g };
}
function telecommandeWii() {
  const g = new THREE.Group();
  const blanc = plastique(0xf5f5f3, 0.25);
  maille(g, geoPlate(0.036, 0.03, 0.148, 0.012, 0.006), blanc);
  const y = 0.0305;
  cyl(g, 0.0035, 0.002, plastique(0xd8352e, 0.4), -0.008, y, -0.062, 16);
  croixPlate(g, 0.02, 0.003, plastique(0xb8b8bc, 0.4), 0, y, -0.042);
  cyl(g, 0.0085, 0.003, plastique(0xe9e9eb, 0.3), 0, y, -0.016, 32);
  [-0.011, 0, 0.011].forEach((x, i) =>
    cyl(
      g,
      0.0036,
      0.002,
      i === 1 ? plastique(0x7fb6ff, 0.4) : plastique(0xd6d6da),
      x,
      y,
      0.012,
      16,
    ),
  );
  [0.04, 0.056].forEach((z) => cyl(g, 0.0046, 0.002, plastique(0xe9e9eb, 0.3), 0, y, z, 16));
  [0, 1, 2, 3].forEach((k) =>
    bloc(
      g,
      0.003,
      0.001,
      0.002,
      k === 0 ? MAT.ledBleue : plastique(0x9aa0aa),
      -0.0075 + k * 0.005,
      y,
      0.068,
    ),
  );
  return { groupe: g };
}

/** Tranche penchée vers l'arrière : profil en parallélogramme (z, y), largeur l en x */
function geoPenchee(l, y0, y1, p, pente) {
  const s = new THREE.Shape();
  s.moveTo(p / 2 - pente * y0, y0);
  s.lineTo(p / 2 - pente * y1, y1);
  s.lineTo(-p / 2 - pente * y1, y1);
  s.lineTo(-p / 2 - pente * y0, y0);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: l, bevelEnabled: false });
  g.rotateY(-Math.PI / 2); // le profil passe dans le plan (z, y), l'épaisseur le long de x
  g.translate(l / 2, 0, 0);
  return g;
}

/**
 * PlayStation 4 (2013, premier modèle) : 275 × 53 × 305 mm, posée à plat.
 * Deux plateaux noirs séparés par une fente, profil penché vers l'arrière,
 * dessus en deux parties (un tiers brillant, deux tiers mats) séparées par
 * le filet lumineux.
 */
function ps4() {
  const g = new THREE.Group();
  const L = 0.275,
    H = 0.053,
    P = 0.305,
    PENTE = 0.56, // recul de la façade par mètre de hauteur
    Y_FENTE = 0.023,
    Y_HAUT = 0.03;
  const mat = plastique(0x101012, 0.7, { envMapIntensity: 0.5 }),
    brillant = plastique(0x0c0c0e, 0.12, { envMapIntensity: 1.3 });
  const avant = (y) => P / 2 - PENTE * y; // position de la façade à la hauteur y
  // Plateau du bas, fente centrale en retrait, plateau du haut en deux parties
  maille(g, geoPenchee(L, 0, Y_FENTE, P, PENTE), mat);
  maille(g, geoPenchee(L - 0.006, Y_FENTE, Y_HAUT, P - 0.014, PENTE), MAT.fente);
  const lBrillant = 0.09,
    lFilet = 0.004,
    lMat = L - lBrillant - lFilet;
  maille(g, geoPenchee(lBrillant, Y_HAUT, H, P, PENTE), brillant, -L / 2 + lBrillant / 2, 0, 0);
  maille(g, geoPenchee(lMat, Y_HAUT, H, P, PENTE), mat, L / 2 - lMat / 2, 0, 0);
  // Filet lumineux entre les deux parties du dessus : il court de l'avant à l'arrière
  const xFilet = -L / 2 + lBrillant + lFilet / 2;
  maille(g, geoPenchee(lFilet, Y_HAUT, H - 0.003, P - 0.004, PENTE), MAT.fente, xFilet, 0, 0);
  maille(
    g,
    geoPenchee(0.0016, H - 0.003, H - 0.0012, P - 0.006, PENTE),
    lumineux("#bfe0ff", 1.5),
    xFilet,
    0,
    0,
  );
  // Dans la fente, à l'avant : lecteur de disque à gauche, deux prises USB à droite
  const yF = (Y_FENTE + Y_HAUT) / 2,
    zF = avant(yF) - 0.007;
  bloc(g, 0.122, 0.0022, 0.002, plastique(0x2a2a2e, 0.3), xFilet + 0.07, yF + 0.001, zF + 0.0012);
  [0.068, 0.092].forEach((x) => {
    bloc(g, 0.014, 0.0052, 0.003, plastique(0x3c3c42, 0.4), x, yF, zF + 0.001);
    bloc(g, 0.011, 0.0022, 0.001, plastique(0xd8d8dc, 0.3), x, yF, zF + 0.0028);
  });
  // Touches sensitives marche et éjection, dans l'alignement du filet lumineux
  [Y_FENTE - 0.007, Y_HAUT + 0.007].forEach((y) =>
    bloc(
      g,
      0.0022,
      0.009,
      0.0012,
      plastique(0x6c6c74, 0.3, { metalness: 0.6 }),
      xFilet,
      y,
      avant(y) + 0.0002,
    ),
  );
  // Grille d'aération à l'arrière, dans la fente, et quatre patins
  for (let k = 0; k < 16; k++)
    bloc(
      g,
      0.004,
      0.005,
      0.002,
      MAT.grisFonce,
      -0.105 + k * 0.014,
      yF,
      -P / 2 - PENTE * yF + 0.008,
    );
  [-1, 1].forEach((cx) =>
    [-1, 1].forEach((cz) =>
      bloc(g, 0.03, 0.002, 0.008, MAT.caoutchouc, cx * 0.1, 0.0005, cz * 0.12),
    ),
  );
  return { groupe: g };
}
/** Manette sans fil de 2013 : poignées longues, pavé tactile, barre lumineuse à l'arrière */
function manettePs4() {
  const g = new THREE.Group();
  const noir = plastique(0x1c1c1f, 0.6);
  maille(g, geoPlate(0.122, 0.024, 0.054, 0.018, 0.007), noir, 0, 0, -0.006);
  [-1, 1].forEach((c) => {
    const poignee = maille(
      g,
      geoPlate(0.044, 0.028, 0.094, 0.02, 0.009),
      noir,
      c * 0.058,
      -0.002,
      0.02,
    );
    poignee.rotation.y = c * 0.24;
  });
  // Pavé tactile brillant, barre lumineuse et gâchettes à l'arrière
  maille(
    g,
    geoPlate(0.052, 0.0016, 0.03, [0.002, 0.002, 0.006, 0.006], 0.0005),
    MAT.noirBrillant,
    0,
    0.0238,
    -0.016,
  );
  bloc(g, 0.042, 0.007, 0.002, MAT.ledBleue, 0, 0.013, -0.0335);
  [-1, 1].forEach((c) => bloc(g, 0.03, 0.009, 0.012, MAT.noirBrillant, c * 0.044, 0.021, -0.031));
  // Flèches séparées à gauche, quatre boutons d'action à droite
  [
    [0, -0.0105],
    [0, 0.0105],
    [-0.0105, 0],
    [0.0105, 0],
  ].forEach(([dx, dz]) =>
    bloc(
      g,
      dx ? 0.009 : 0.0065,
      0.003,
      dz ? 0.009 : 0.0065,
      MAT.noirBrillant,
      -0.05 + dx,
      0.0252,
      -0.008 + dz,
    ),
  );
  [
    [0, -0.0115, "#3cc47c"],
    [-0.0115, 0, "#e86bb0"],
    [0.0115, 0, "#e8443a"],
    [0, 0.0115, "#4c8cf0"],
  ].forEach(([dx, dz, c]) => {
    cyl(g, 0.0054, 0.004, MAT.noirBrillant, 0.05 + dx, 0.0252, -0.008 + dz);
    cyl(g, 0.0026, 0.0008, lumineux(c, 1), 0.05 + dx, 0.0275, -0.008 + dz, 12);
  });
  // Deux sticks au même niveau, touches SHARE et OPTIONS, touche centrale, haut-parleur
  [-0.024, 0.024].forEach((x) => {
    cyl(g, 0.012, 0.002, MAT.noirBrillant, x, 0.0245, 0.016, 32);
    cyl(g, 0.0065, 0.009, MAT.noir, x, 0.028, 0.016);
    cyl(g, 0.0095, 0.003, MAT.caoutchouc, x, 0.0335, 0.016, 32);
  });
  [-0.0315, 0.0315].forEach((x) =>
    bloc(g, 0.0035, 0.0016, 0.008, MAT.noirBrillant, x, 0.0246, -0.024),
  );
  cyl(g, 0.0048, 0.0016, MAT.noirBrillant, 0, 0.0246, 0.018, 24);
  for (let k = 0; k < 5; k++)
    bloc(g, 0.0012, 0.0008, 0.004, MAT.fente, -0.0048 + k * 0.0024, 0.0244, 0.005);
  return { groupe: g };
}

const MODELES = { nes, gameboy, megadrive, playstation, n64, wii, ps4 };
const MANETTES = {
  nes: manetteNes,
  megadrive: manetteMegadrive,
  playstation: manettePlaystation,
  n64: manetteN64,
  wii: telecommandeWii,
  ps4: manettePs4,
};

/* ============================================================
   LES TÉLÉS (origine : au sol, au centre ; l'écran regarde +z)
   Renvoient { groupe, ecran: { l, h, x, y, z }, courbe }
   ============================================================ */
function textureBois(renderer, teinte = 24) {
  const t = textureCanvas(renderer, 512, 512, (g, l, h) => {
    let s = 5;
    const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    g.fillStyle = `hsl(${teinte}, 45%, 26%)`;
    g.fillRect(0, 0, l, h);
    for (let i = 0; i < 160; i++) {
      g.strokeStyle = `hsla(${teinte + (r() - 0.5) * 6}, 50%, ${16 + r() * 18}%, ${0.25 + r() * 0.35})`;
      g.lineWidth = 0.6 + r() * 2.2;
      g.beginPath();
      const y = r() * h;
      g.moveTo(0, y);
      for (let x = 0; x <= l; x += 32)
        g.lineTo(x, y + Math.sin(x * 0.02 + i) * 3 + (r() - 0.5) * 2);
      g.stroke();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function teleCRT(renderer, style) {
  const g = new THREE.Group();
  const L = 0.62,
    H = 0.5,
    P = 0.3;
  const bois = style === "bois";
  const coque = bois
    ? plastique(0xffffff, 0.45, { map: textureBois(renderer, 26) })
    : plastique(style === "gris" ? 0x8e8f95 : 0x1c1c1f, 0.45);
  // Caisson avant et cul du tube cathodique
  maille(g, geoDebout(L, H, P, 0.03, 0.01), coque, 0, 0, -P / 2 + 0.15);
  maille(
    g,
    geoDebout(0.44, 0.36, 0.2, 0.06, 0.02),
    bois ? plastique(0x2b2420, 0.7) : coque,
    0,
    0.07,
    -0.22,
  );
  const av = 0.15 + 0.001;
  if (bois) {
    // Façade argentée, écran à gauche, molettes et haut-parleur à droite
    const facade = plastique(0xb9b9bb, 0.35, { metalness: 0.4 });
    bloc(g, L - 0.05, H - 0.05, 0.006, facade, 0, H / 2, av);
    bloc(g, 0.46, 0.37, 0.004, MAT.noir, -0.065, H / 2 + 0.01, av + 0.004);
    [0.36, 0.3].forEach((y, i) => {
      const m = bouton(g, i ? 0.016 : 0.022, 0.02, MAT.noirBrillant, 0.225, y, av + 0.012);
      m.material = MAT.noirBrillant;
    });
    for (let k = 0; k < 7; k++)
      bloc(g, 0.07, 0.004, 0.002, MAT.noir, 0.225, 0.09 + k * 0.014, av + 0.004);
    // Antenne « oreilles de lapin »
    cyl(g, 0.04, 0.025, MAT.noir, 0.1, H + 0.012, -0.08);
    [-1, 1].forEach((c) => {
      const brin = cyl(
        g,
        0.0025,
        0.46,
        plastique(0xd9d9dc, 0.2, { metalness: 0.9 }),
        0.1 + c * 0.1,
        H + 0.22,
        -0.08,
        8,
      );
      brin.rotation.z = -c * 0.45;
      cyl(g, 0.006, 0.01, MAT.noir, 0.1 + c * 0.2, H + 0.43, -0.08, 12);
    });
    return { groupe: g, ecran: { l: 0.42, h: 0.315, x: -0.065, y: H / 2 + 0.01, z: av + 0.008 } };
  }
  // Télé des années 90 : écran centré, grille de haut-parleur et voyant en bas
  bloc(g, 0.5, 0.38, 0.004, MAT.noir, 0, H / 2 + 0.035, av);
  for (let k = 0; k < 4; k++) bloc(g, 0.18, 0.004, 0.002, MAT.noir, -0.17, 0.035 + k * 0.012, av);
  for (let k = 0; k < 4; k++) bloc(g, 0.18, 0.004, 0.002, MAT.noir, 0.17, 0.035 + k * 0.012, av);
  bouton(g, 0.004, 0.003, MAT.ledVerte, 0.02, 0.05, av);
  bloc(
    g,
    0.02,
    0.01,
    0.004,
    style === "gris" ? plastique(0x6f7076) : MAT.grisFonce,
    -0.02,
    0.05,
    av,
  );
  return { groupe: g, ecran: { l: 0.44, h: 0.33, x: 0, y: H / 2 + 0.035, z: av + 0.004 } };
}
function telePlate(capteurs = true) {
  const g = new THREE.Group();
  // Écran plat 16/9 sur pied ; la Wii y pose sa barre de capteurs
  bloc(g, 0.32, 0.016, 0.2, MAT.noirBrillant, 0, 0.008, -0.08);
  bloc(g, 0.06, 0.11, 0.035, MAT.noirBrillant, 0, 0.07, -0.1);
  const panneau = maille(
    g,
    geoDebout(0.88, 0.53, 0.055, 0.008, 0.004),
    MAT.noirBrillant,
    0,
    0.11,
    -0.08,
  );
  panneau.position.y = 0.11;
  bloc(g, 0.84, 0.475, 0.002, MAT.noir, 0, 0.11 + 0.53 / 2 + 0.01, -0.0515);
  bouton(g, 0.003, 0.002, MAT.ledBleue, 0.38, 0.13, -0.052);
  if (capteurs) {
    bloc(g, 0.23, 0.018, 0.02, MAT.noirBrillant, 0, 0.11 + 0.53 + 0.009, -0.06);
    bloc(g, 0.21, 0.01, 0.001, plastique(0x15151a, 0.1), 0, 0.11 + 0.53 + 0.009, -0.0499);
  }
  return { groupe: g, ecran: { l: 0.8, h: 0.45, x: 0, y: 0.11 + 0.53 / 2 + 0.01, z: -0.05 } };
}

/** Écran bombé (tube cathodique) ou plat, avec sa texture animée */
function ecranAnime(info, courbe) {
  const [lw, lh] = tailleEcran(info.id);
  const canvas = document.createElement("canvas");
  canvas.width = lw;
  canvas.height = lh;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = ["nes", "gameboy", "megadrive"].includes(info.id)
    ? THREE.NearestFilter
    : THREE.LinearFilter;
  return { canvas, g: canvas.getContext("2d"), texture, courbe, lw, lh };
}
function planEcran(e, anime, bombe) {
  const geo = new THREE.PlaneGeometry(e.l, e.h, 12, 9);
  if (bombe) {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i) / (e.l / 2),
        v = p.getY(i) / (e.h / 2);
      p.setZ(i, bombe * (1 - u * u * 0.6) * (1 - v * v * 0.6));
    }
    geo.computeVertexNormals();
  }
  const m = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({ map: anime.texture, color: 0xd8d8d8, toneMapped: false }),
  );
  m.position.set(e.x, e.y, e.z);
  return m;
}

/* ---------- Meuble télé ---------- */
function meuble(renderer, epoque) {
  const g = new THREE.Group();
  const L = 1.2,
    H = 0.6,
    P = 0.85;
  const moderne = epoque === "moderne";
  const corps = moderne
    ? plastique(0x17171a, 0.35)
    : plastique(0xffffff, 0.45, { map: textureBois(renderer, 22) });
  bloc(g, L, 0.04, P, corps, 0, H - 0.02, 0); // plateau
  bloc(g, L, 0.04, P - 0.04, corps, 0, 0.1, 0); // fond
  [-1, 1].forEach((c) =>
    bloc(g, 0.04, H - 0.08, P - 0.02, corps, c * (L / 2 - 0.02), H / 2 + 0.04, 0),
  );
  bloc(g, L - 0.08, H - 0.12, 0.02, corps, 0, H / 2 + 0.04, -P / 2 + 0.02); // dos
  bloc(g, 0.03, H - 0.16, P - 0.08, corps, 0, H / 2 + 0.02, 0); // séparation
  if (moderne) {
    // Deux étagères ouvertes en verre fumé
    [-1, 1].forEach((c) =>
      bloc(g, L / 2 - 0.08, 0.012, P - 0.12, MAT.acrylique, c * (L / 4 - 0.005), 0.34, 0.02),
    );
    bloc(
      g,
      L,
      0.012,
      0.012,
      plastique(0x707078, 0.3, { metalness: 0.8 }),
      0,
      H - 0.002,
      P / 2 - 0.006,
    );
  } else {
    // Deux portes à panneaux et boutons de laiton
    [-1, 1].forEach((c) => {
      bloc(g, L / 2 - 0.05, H - 0.17, 0.02, corps, c * (L / 4 - 0.005), H / 2 + 0.02, P / 2 - 0.01);
      bloc(
        g,
        L / 2 - 0.15,
        H - 0.27,
        0.01,
        plastique(0xffffff, 0.4, { map: corps.map, color: 0xd8c8b8 }),
        c * (L / 4 - 0.005),
        H / 2 + 0.02,
        P / 2 + 0.003,
      );
      cyl(g, 0.012, 0.02, MAT.laiton, c * 0.05, H / 2 + 0.02, P / 2 + 0.012).rotation.x =
        Math.PI / 2;
    });
  }
  // Pieds
  [-1, 1].forEach((cx) =>
    [-1, 1].forEach((cz) => {
      const pied = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.014, 0.08, 12),
        moderne ? MAT.noir : corps,
      );
      pied.position.set(cx * (L / 2 - 0.06), 0.04, cz * (P / 2 - 0.06));
      g.add(pied);
    }),
  );
  return { groupe: g, dessus: H };
}

/** Petite plaque de cartel posée sur l'avant du meuble */
function plaque(renderer, info) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(0.34, 0.085),
    new THREE.MeshBasicMaterial({
      toneMapped: false,
      map: textureCanvas(renderer, 512, 128, (g, l, h) => {
        g.fillStyle = "#16161a";
        g.fillRect(0, 0, l, h);
        g.strokeStyle = "#c39a4e";
        g.lineWidth = 6;
        g.strokeRect(3, 3, l - 6, h - 6);
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillStyle = "#f4f1ea";
        g.font = "600 46px 'Chakra Petch', sans-serif";
        g.fillText(info.nom.toUpperCase(), l / 2, 52);
        g.fillStyle = "#c39a4e";
        g.font = "700 22px Silkscreen, monospace";
        g.fillText(`${info.annee} · JOUABLE`, l / 2, 98);
      }),
    }),
  );
  return m;
}

/* ============================================================
   INSTALLATION DES POSTES
   ============================================================ */
/**
 * Chaque console est posée contre le mur, juste à côté du tableau de son jeu,
 * du côté opposé au cartel, et tournée vers le centre de la salle.
 * Une console sans tableau (place : "fond") est adossée au mur du fond.
 * @param emplacements  positions des tableaux (installerExpositions)
 */
export function installerConsoles(scene, renderer, emplacements) {
  const cibles = [],
    postes = [];
  const ECHELLE = 1.2; // consoles un peu agrandies pour être lisibles de loin
  const DEMI_CADRE = 1.81, // demi-largeur du cadre d'un tableau
    ECART = 0.25; // espace entre le cadre et le meuble

  CONSOLES.forEach((info) => {
    {
      const portable = info.tele === "portable";
      const demiLargeur = portable ? 0.27 : 0.6,
        demiProfondeur = portable ? 0.27 : 0.425;
      let x, zc, lacet;
      if (info.place === "fond") {
        // Au milieu du mur du fond, face à l'enfilade des salles
        x = 0;
        zc = PLAN.Z_FOND + 0.08 + demiProfondeur;
        lacet = 0;
      } else {
        const iExpo = EXPOSITIONS.findIndex((e) => e.id === info.expo);
        const tableau = emplacements[iExpo];
        if (!tableau) return;
        const aGauche = tableau.x < 0;
        // Mur de gauche : le cartel est vers -z, la console va vers +z (et inversement)
        zc = tableau.z + (aGauche ? 1 : -1) * (DEMI_CADRE + ECART + demiLargeur);
        x = (aGauche ? -1 : 1) * (PLAN.DEMI_L - 0.08 - demiProfondeur);
        lacet = aGauche ? Math.PI / 2 : -Math.PI / 2;
      }
      const deCote = Math.abs(Math.sin(lacet)) > 0.5; // poste adossé à un mur latéral
      const poste = new THREE.Group();
      poste.position.set(x, 0, zc);
      poste.rotation.y = lacet;
      scene.add(poste);
      let ecranInfo, bombe, regard;

      if (info.tele === "portable") {
        // Game Boy : socle de musée, présentoir en plexiglas
        bloc(poste, 0.5, 0.98, 0.5, plastique(0xf1eee8, 0.6), 0, 0.49, 0);
        bloc(poste, 0.54, 0.04, 0.54, MAT.noir, 0, 0.02, 0);
        bloc(poste, 0.52, 0.02, 0.52, MAT.laiton, 0, 0.99, 0);
        const support = bloc(poste, 0.16, 0.12, 0.06, MAT.acrylique, 0, 1.06, -0.02);
        support.rotation.x = -0.25;
        const { groupe, ecran } = gameboy();
        const echelle = 1.8;
        groupe.scale.setScalar(echelle);
        groupe.position.set(0, 1.0, 0.03);
        groupe.rotation.x = -0.22;
        poste.add(groupe);
        const anime = ecranAnime(info);
        const plan = planEcran(ecran, anime, 0);
        groupe.add(plan);
        poste.updateMatrixWorld(true);
        ecranInfo = { anime, mesh: plan };
        const pl = plaque(renderer, info);
        pl.position.set(0, 0.86, 0.252);
        poste.add(pl);
        regard = { distance: 0.62, tangage: -0.32 };
      } else {
        const m = meuble(renderer, info.salle);
        poste.add(m.groupe);
        const tele =
          info.tele === "plat" ? telePlate(info.id === "wii") : teleCRT(renderer, info.tele);
        tele.groupe.position.set(0, m.dessus, -0.12);
        poste.add(tele.groupe);
        bombe = info.tele === "plat" ? 0 : 0.012;
        const anime = ecranAnime(info);
        const plan = planEcran(tele.ecran, anime, bombe);
        tele.groupe.add(plan);
        ecranInfo = { anime, mesh: plan };
        // La console devant la télé, la manette branchée à côté
        const modele = MODELES[info.id](renderer);
        const cg = modele.groupe;
        cg.scale.setScalar(ECHELLE);
        if (info.id === "wii") cg.position.set(-0.4, m.dessus, 0.12);
        else if (info.id === "ps4") cg.position.set(-0.2, m.dessus, 0.2);
        else cg.position.set(-0.08, m.dessus, 0.24);
        poste.add(cg);
        if (MANETTES[info.id]) {
          const man = MANETTES[info.id]();
          man.groupe.scale.setScalar(ECHELLE);
          man.groupe.position.set(
            info.id === "wii" ? 0.05 : 0.33,
            m.dessus,
            info.id === "wii" ? 0.25 : 0.27,
          );
          if (info.id === "ps4") man.groupe.position.y += 0.003;
          man.groupe.rotation.y = info.id === "wii" ? 0.25 : -0.18;
          poste.add(man.groupe);
          if (modele.port && man.prise) {
            poste.updateMatrixWorld(true);
            const a = cg.localToWorld(modele.port.clone().add(new THREE.Vector3(0, 0, 0.004)));
            const b = man.groupe.localToWorld(man.prise.clone());
            poste.worldToLocal(a);
            poste.worldToLocal(b);
            cable(poste, a, b, MAT.cable);
          }
        }
        const pl = plaque(renderer, info);
        pl.position.set(0, m.dessus - 0.075, 0.432);
        poste.add(pl);
        regard =
          info.tele === "plat"
            ? { distance: 1.25, tangage: -0.04 }
            : { distance: 1.0, tangage: -0.05 };
      }

      // Zone cliquable invisible qui couvre tout le poste
      const zone = new THREE.Mesh(
        new THREE.BoxGeometry(1.3, 1.45, 1.0),
        new THREE.MeshBasicMaterial({ visible: false }),
      );
      zone.position.set(0, 0.72, 0);
      zone.userData = { type: "console", id: info.id };
      poste.add(zone);
      cibles.push(zone);
      OBSTACLES.push({
        x,
        z: zc,
        demiX: (deCote ? demiProfondeur : demiLargeur) + 0.02,
        demiZ: (deCote ? demiLargeur : demiProfondeur) + 0.02,
      });

      // Points de vue : debout devant le poste, puis assis face à l'écran
      poste.updateMatrixWorld(true);
      const centre = new THREE.Vector3();
      ecranInfo.mesh.getWorldPosition(centre);
      const versSalle = new THREE.Vector3(
        Math.round(Math.sin(lacet)),
        0,
        Math.round(Math.cos(lacet)),
      );
      const devant = (d, y) => new THREE.Vector3(x, y, zc).addScaledVector(versSalle, d);
      postes.push({
        info,
        position: new THREE.Vector3(x, 1.0, zc),
        anime: ecranInfo.anime,
        emplacement: { vue: devant(2.4, PLAN.YEUX), lacet, tangage: -0.18 },
        jeu: {
          approche: devant(2.0, PLAN.YEUX),
          vue: centre
            .clone()
            .addScaledVector(versSalle, regard.distance)
            .setY(centre.y + regard.distance * Math.sin(-regard.tangage) * 0.9),
          lacet,
          tangage: regard.tangage,
        },
      });
    }
  });

  /** Écrans d'attente : animés seulement quand le visiteur est assez près */
  let horloge = 0,
    accumule = 0;
  function animer(dt, positionVisiteur) {
    horloge += dt;
    accumule += dt;
    if (accumule < 1 / 24) return;
    accumule = 0;
    postes.forEach((p) => {
      if (p.position.distanceTo(positionVisiteur) > 18) return;
      dessinerAttente(p.info.id, p.anime.g, p.anime.lw, p.anime.lh, horloge + p.position.x);
      p.anime.texture.needsUpdate = true;
    });
  }
  // Première image pour tous les écrans
  postes.forEach((p) => {
    dessinerAttente(p.info.id, p.anime.g, p.anime.lw, p.anime.lh, 0);
    p.anime.texture.needsUpdate = true;
  });
  return { cibles, postes, animer };
}
