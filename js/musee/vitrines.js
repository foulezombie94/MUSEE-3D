/* ============================================================
   CONTINUE ? — Expositions et bornes d'arcade
   - Expositions : un écran mural encadré de néon, avec son cartel
   - Bornes : trois meubles d'arcade dont l'écran montre une
     vraie partie en mode démo, et qu'on peut lancer
   ============================================================ */
import * as THREE from "three";
import { PLAN, debutSalle, centreSalle, OBSTACLES } from "./plan.js";
import { SALLES, EXPOSITIONS, BORNES } from "../expositions.js";
import { dessinerIllustration } from "../illustrations.js";
import { creerJeu } from "../jeux/index.js";
import { textureCanvas, neon, textureHalo } from "./batiment.js";
import { chargerImage, composerTableau } from "./images-officielles.js";

/* ---------- Expositions murales ----------
   Comme dans un vrai musée : un écran encadré de noir avec un
   passe-partout clair, un cartel blanc à côté, à hauteur des yeux,
   une petite lampe au-dessus et la tache de lumière d'un spot. */
export function installerExpositions(scene, renderer) {
  const cibles = [],
    emplacements = [];
  const matCadre = new THREE.MeshStandardMaterial({
    color: 0x0d0d10,
    roughness: 0.35,
    metalness: 0.5,
  });
  const matPassePartout = new THREE.MeshStandardMaterial({ color: 0xc9c4ba, roughness: 0.9 });
  const matLampe = new THREE.MeshStandardMaterial({
    color: 0x1b1b1f,
    roughness: 0.3,
    metalness: 0.8,
  });
  const matAmpoule = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0xfff1d6).multiplyScalar(1.6),
    toneMapped: false,
  });
  const texHalo = textureHalo(renderer);

  SALLES.forEach((salle, numSalle) => {
    const liste = EXPOSITIONS.filter((e) => e.salle === salle.id);
    const sombre = salle.id === "arcade";
    liste.forEach((expo, k) => {
      const aGauche = k % 2 === 0;
      const z = debutSalle(numSalle) - 5 - Math.floor(k / 2) * 8;
      const groupe = new THREE.Group();
      groupe.position.set(aGauche ? -PLAN.DEMI_L : PLAN.DEMI_L, 0, z);
      groupe.rotation.y = aGauche ? Math.PI / 2 : -Math.PI / 2;
      // Dans le groupe : x = droite du visiteur, y = haut, z = vers la salle

      const L = 3.0,
        H = 1.875,
        Y = 2.15;
      // Halo du spot sur le mur
      const halo = new THREE.Mesh(
        new THREE.PlaneGeometry(5.6, 4.6),
        new THREE.MeshBasicMaterial({
          map: texHalo,
          color: sombre ? salle.couleur : 0xffe7c4,
          transparent: true,
          opacity: sombre ? 0.16 : 0.11,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      halo.position.set(0, Y + 0.3, 0.012);
      // Cadre noir, passe-partout clair
      const cadre = new THREE.Mesh(new THREE.BoxGeometry(L + 0.62, H + 0.62, 0.08), matCadre);
      cadre.position.set(0, Y, 0.04);
      const passe = new THREE.Mesh(new THREE.PlaneGeometry(L + 0.5, H + 0.5), matPassePartout);
      passe.position.set(0, Y, 0.081);

      // L'écran avec l'illustration en pixel art
      const illustration = dessinerIllustration(expo.id, document.createElement("canvas"), 6);
      const texture = new THREE.CanvasTexture(illustration);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.magFilter = expo.id === "minecraft" ? THREE.LinearFilter : THREE.NearestFilter;
      const ecran = new THREE.Mesh(
        new THREE.PlaneGeometry(L, H),
        new THREE.MeshBasicMaterial({
          map: texture,
          color: expo.id === "minecraft" ? 0xffffff : 0xc4c4c4,
          toneMapped: false,
        }),
      );
      ecran.position.set(0, Y, expo.id === "minecraft" ? 0.105 : 0.083);
      ecran.userData = { type: "expo", index: EXPOSITIONS.indexOf(expo) };
      cibles.push(ecran);
      // Image fournie dans assets/tableaux : elle remplace l'illustration
      if (expo.id !== "minecraft")
        chargerImage(expo.id).then((img) => {
          if (!img) return;
          const t = new THREE.CanvasTexture(composerTableau(img));
          t.colorSpace = THREE.SRGBColorSpace;
          t.anisotropy = renderer.capabilities.getMaxAnisotropy();
          ecran.material.map = t;
          ecran.material.color.set(0xe6e6e6);
          ecran.material.needsUpdate = true;
          texture.dispose();
        });

      // Lampe de tableau au-dessus du cadre
      const bras = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.32), matLampe);
      bras.position.set(0, Y + H / 2 + 0.5, 0.16);
      const lampe = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 0.09), matLampe);
      lampe.position.set(0, Y + H / 2 + 0.47, 0.32);
      const ampoule = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.05), matAmpoule);
      ampoule.rotation.x = Math.PI / 2;
      ampoule.position.set(0, Y + H / 2 + 0.439, 0.32);

      // Cartel blanc à droite du cadre, à hauteur des yeux
      const cartel = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.78, 0.015), [
        matPassePartout,
        matPassePartout,
        matPassePartout,
        matPassePartout,
        new THREE.MeshBasicMaterial({
          color: 0xd6d3cc,
          map: textureCanvas(renderer, 496, 624, (g, l, h) => {
            g.fillStyle = "#f6f4ef";
            g.fillRect(0, 0, l, h);
            g.fillStyle = salle.couleur;
            g.fillRect(36, 40, 56, 8);
            g.fillStyle = "#1b1b20";
            g.font = "700 26px Silkscreen, 'Courier New', monospace";
            g.fillText(expo.date.toUpperCase(), 36, 96, l - 72);
            g.font = "600 46px 'Chakra Petch', sans-serif";
            const mots = expo.titre.split(" ");
            let ligne = "",
              y = 160;
            mots.forEach((m) => {
              const essai = ligne ? ligne + " " + m : m;
              if (g.measureText(essai).width > l - 72) {
                g.fillText(ligne, 36, y);
                ligne = m;
                y += 50;
              } else ligne = essai;
            });
            g.fillText(ligne, 36, y);
            g.fillStyle = "#55535e";
            g.font = "26px Figtree, sans-serif";
            [expo.createur, expo.lieu, expo.support].forEach((t, i) =>
              g.fillText(t, 36, y + 64 + i * 38, l - 72),
            );
            g.fillStyle = "#8a8893";
            g.font = "22px Figtree, sans-serif";
            g.fillText(
              expo.id === "minecraft"
                ? "Cliquez ou E : entrez dans le monde"
                : expo.retro
                  ? "Cliquez ou E : jouez à ce jeu"
                  : expo.jeu
                    ? "Jouable salle 2 · cliquez l'écran"
                    : "Cliquez l'écran pour lire la suite",
              36,
              h - 44,
              l - 72,
            );
          }),
        }),
        matPassePartout,
      ]);
      cartel.position.set(L / 2 + 0.95, 1.5, 0.01);

      groupe.add(halo, cadre, passe, ecran, bras, lampe, ampoule, cartel);
      if (expo.id === "minecraft") {
        const bord = new THREE.Mesh(
          new THREE.PlaneGeometry(L + 0.12, H + 0.12),
          neon("#86c65a", 1.2),
        );
        bord.position.set(0, Y, 0.092);
        groupe.add(bord);
      }
      scene.add(groupe);
      groupe.updateMatrixWorld();
      emplacements[EXPOSITIONS.indexOf(expo)] = {
        vue: new THREE.Vector3(0.35, PLAN.YEUX, 4.2).applyMatrix4(groupe.matrixWorld),
        lacet: aGauche ? Math.PI / 2 : -Math.PI / 2,
        tangage: 0.06,
        x: groupe.position.x,
        z,
        salle: numSalle,
      };
    });
  });
  return { cibles, emplacements };
}

/* ---------- Bornes d'arcade jouables ----------
   Une vraie borne « debout » des années 80, aux dimensions réelles :
   flancs découpés avec leur jonc lumineux (T-molding) et leur décor peint,
   fronton rétroéclairé, écran cathodique incliné derrière sa vitre et son
   cache, pupitre avec joystick à boule et boutons à LED, porte à monnayeur
   avec ses fentes éclairées, plinthe en métal.
   Le joystick et les boutons bougent avec les touches du joueur (et tout
   seuls pendant la démo) ; on peut aussi les actionner à la souris. */

/* Profil d'un flanc, vu de côté : (z vers l'avant, y vers le haut), en mètres */
const PROFIL = [
  [-0.42, 0],
  [0.34, 0],
  [0.34, 0.86],
  [0.5, 0.9],
  [0.5, 0.97],
  [0.22, 1.06],
  [0.2, 1.1],
  [0.06, 1.62],
  [0.2, 1.64],
  [0.2, 1.86],
  [0.04, 1.92],
  [-0.42, 1.92],
];
const LARGEUR_BORNE = 0.66,
  EPAIS_FLANC = 0.022;
// Écran incliné : du bas (0.2, 1.1) au haut (0.06, 1.62)
const ECRAN_INCLI = Math.atan2(0.14, 0.52);
const ECRAN_CENTRE = [0.13, 1.36];
const ECRAN_L = 0.5,
  ECRAN_H = 0.375;
// Pupitre : de l'avant (0.5, 0.97) à l'arrière (0.22, 1.06)
const PUPITRE_INCLI = Math.atan2(0.09, 0.28);
const PUPITRE_CENTRE = [0.36, 1.015];

/** @param miroir  vrai pour le flanc droit, vu « de dos » : le nom est retourné pour rester lisible */
function textureFlanc(renderer, infos, miroir = false) {
  // Coordonnées du dessin = coordonnées du profil (z de -0.42 à 0.5, y de 0 à 1.92)
  return textureCanvas(renderer, 512, 1024, (g, l, h) => {
    const X = (z) => ((z + 0.42) / 0.92) * l,
      Y = (y) => h - (y / 1.92) * h;
    g.fillStyle = "#0b0a14";
    g.fillRect(0, 0, l, h);
    // Grandes bandes obliques aux couleurs du jeu
    const c = new THREE.Color(infos.couleur);
    [0, 1, 2].forEach((k) => {
      g.fillStyle = `rgba(${(c.r * 255) | 0},${(c.g * 255) | 0},${(c.b * 255) | 0},${0.85 - k * 0.25})`;
      g.beginPath();
      g.moveTo(X(-0.42), Y(0.25 + k * 0.17));
      g.lineTo(X(0.5), Y(0.9 + k * 0.17));
      g.lineTo(X(0.5), Y(0.98 + k * 0.17));
      g.lineTo(X(-0.42), Y(0.33 + k * 0.17));
      g.fill();
    });
    // Étoiles et grille rétro
    let s = 9;
    const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    for (let i = 0; i < 90; i++) {
      g.fillStyle = `rgba(255,255,255,${0.2 + r() * 0.6})`;
      const t = 1 + r() * 2.5;
      g.fillRect(r() * l, r() * h * 0.55, t, t);
    }
    g.strokeStyle = `rgba(${(c.r * 255) | 0},${(c.g * 255) | 0},${(c.b * 255) | 0},0.35)`;
    g.lineWidth = 2;
    for (let i = 0; i < 9; i++) {
      g.beginPath();
      g.moveTo(0, Y(0.05 + i * 0.03));
      g.lineTo(l, Y(0.05 + i * 0.03));
      g.stroke();
    }
    // Nom du jeu, en grand, à la verticale
    g.save();
    g.translate(X(-0.1), Y(1.45));
    if (miroir) g.scale(-1, 1);
    g.rotate(-Math.PI / 2);
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = "700 92px Silkscreen, 'Courier New', monospace";
    g.shadowColor = infos.couleur;
    g.shadowBlur = 16;
    g.fillStyle = infos.couleur;
    g.fillText(infos.nom.toUpperCase(), 0, 0, h * 0.45);
    g.restore();
  });
}
function textureCache(renderer, infos) {
  // Cache imprimé autour de l'écran (la vitre est posée dessus)
  return textureCanvas(renderer, 512, 448, (g, l, h) => {
    const d = g.createLinearGradient(0, 0, 0, h);
    d.addColorStop(0, "#111018");
    d.addColorStop(1, "#06060a");
    g.fillStyle = d;
    g.fillRect(0, 0, l, h);
    g.strokeStyle = infos.couleur;
    g.lineWidth = 3;
    g.strokeRect(14, 14, l - 28, h - 28);
    g.globalAlpha = 0.5;
    g.strokeRect(24, 24, l - 48, h - 48);
    g.globalAlpha = 1;
    g.textAlign = "center";
    g.fillStyle = "#cfcbe0";
    g.font = "700 15px Silkscreen, monospace";
    g.fillText("1 CRÉDIT = 1 PARTIE", l / 2, h - 30);
    g.fillStyle = infos.couleur;
    g.fillText("★ HIGH SCORE ★", l / 2, 44);
  });
}
function texturePupitre(renderer, infos) {
  return textureCanvas(renderer, 512, 256, (g, l, h) => {
    g.fillStyle = "#101018";
    g.fillRect(0, 0, l, h);
    const c = infos.couleur;
    g.fillStyle = c;
    g.globalAlpha = 0.85;
    g.fillRect(0, h - 26, l, 10);
    g.fillRect(0, 16, l, 4);
    g.globalAlpha = 0.18;
    g.beginPath();
    g.arc(l * 0.28, h * 0.55, 70, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;
    g.fillStyle = "#cfcbe0";
    g.font = "700 12px Silkscreen, monospace";
    g.textAlign = "center";
    g.fillText("START", l * 0.532, 40);
    g.fillText("PAUSE", l * 0.67, 40);
  });
}
function textureMarquee(renderer, infos) {
  return textureCanvas(renderer, 1024, 360, (g, l, h) => {
    const d = g.createLinearGradient(0, 0, 0, h);
    d.addColorStop(0, "#0c0c1c");
    d.addColorStop(0.5, "#191433");
    d.addColorStop(1, "#0c0c1c");
    g.fillStyle = d;
    g.fillRect(0, 0, l, h);
    // Rayons de soleil rétro derrière le titre
    g.save();
    g.translate(l / 2, h * 0.9);
    for (let k = 0; k < 18; k++) {
      g.rotate(Math.PI / 18);
      g.fillStyle = k % 2 ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.0)";
      g.fillRect(0, -6, l, 12);
    }
    g.restore();
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = "700 150px Silkscreen, 'Courier New', monospace";
    g.lineWidth = 14;
    g.strokeStyle = "#ffffff";
    g.strokeText(infos.nom.toUpperCase(), l / 2, h / 2 + 6, l - 60);
    g.shadowColor = infos.couleur;
    g.shadowBlur = 30;
    g.fillStyle = infos.couleur;
    g.fillText(infos.nom.toUpperCase(), l / 2, h / 2 + 6, l - 60);
    g.shadowBlur = 0;
    g.fillStyle = "#ffffff";
    g.font = "700 26px Silkscreen, monospace";
    g.fillText("© MUSÉE CONTINUE · 1 OU 2 JOUEURS", l / 2, h - 30);
  });
}
function textureMonnayeur(renderer) {
  return textureCanvas(renderer, 128, 128, (g, l, h) => {
    g.fillStyle = "#ff3b1f";
    g.fillRect(0, 0, l, h);
    g.fillStyle = "#2a0400";
    g.fillRect(l / 2 - 5, 18, 10, h - 56);
    g.fillStyle = "#fff4d6";
    g.font = "700 30px Silkscreen, monospace";
    g.textAlign = "center";
    g.fillText("1 €", l / 2, h - 12);
  });
}

/* Pièces du joystick, partagées par toutes les bornes */
const GEO_BOULE = new THREE.SphereGeometry(0.0175, 40, 28);
const GEO_RONDELLE = new THREE.CylinderGeometry(0.026, 0.026, 0.0016, 48);
const GEO_ECROU = new THREE.CylinderGeometry(0.0068, 0.0068, 0.004, 6);
const GEO_VIS = new THREE.SphereGeometry(0.0035, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
const MAT_TROU = new THREE.MeshBasicMaterial({ color: 0x020203 });
const MAT_RONDELLE = new THREE.MeshStandardMaterial({ color: 0x0b0b0e, roughness: 0.35 });
const MAT_ZONE = new THREE.MeshBasicMaterial({ visible: false }); // zones de clic invisibles

export function installerBornes(scene, renderer) {
  const numSalle = SALLES.findIndex((s) => s.id === "arcade");
  const zc = centreSalle(numSalle);
  const cibles = [],
    bornes = [];
  const matCaisson = new THREE.MeshStandardMaterial({ color: 0x0c0c12, roughness: 0.55 });
  const matNoirBrillant = new THREE.MeshStandardMaterial({ color: 0x07070a, roughness: 0.25 });
  const matMetal = new THREE.MeshStandardMaterial({
    color: 0x9a9ca4,
    roughness: 0.35,
    metalness: 0.9,
  });
  const matMetalSombre = new THREE.MeshStandardMaterial({
    color: 0x2a2b30,
    roughness: 0.4,
    metalness: 0.8,
  });
  const matTige = new THREE.MeshStandardMaterial({ color: 0xd8d8dc, roughness: 0.2, metalness: 1 });
  // Vitre : un simple reflet en biais, ajouté par-dessus l'écran sans le voiler
  // (une vraie vitre réfléchissait tout l'éclairage d'ambiance et blanchissait l'image)
  const matVitre = new THREE.MeshBasicMaterial({
    map: textureCanvas(renderer, 256, 256, (g, l, h) => {
      const d = g.createLinearGradient(0, 0, l, h);
      d.addColorStop(0, "rgba(255,255,255,0)");
      d.addColorStop(0.18, "rgba(255,255,255,0.55)");
      d.addColorStop(0.3, "rgba(255,255,255,0)");
      d.addColorStop(0.36, "rgba(255,255,255,0.22)");
      d.addColorStop(0.42, "rgba(255,255,255,0)");
      g.fillStyle = d;
      g.fillRect(0, 0, l, h);
    }),
    transparent: true,
    opacity: 0.07,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  // Plastiques noirs : peu de reflets d'ambiance, sinon ils paraissent gris dans la salle sombre
  [matCaisson, matNoirBrillant, matMetalSombre].forEach((m) => (m.envMapIntensity = 0.3));
  const texMonnayeur = textureMonnayeur(renderer);

  // Silhouette des flancs, avec les coordonnées de texture du décor peint
  const forme = new THREE.Shape(PROFIL.map(([z, y]) => new THREE.Vector2(z, y)));
  const geoFlanc = new THREE.ExtrudeGeometry(forme, {
    depth: EPAIS_FLANC,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.004,
    bevelSegments: 2,
  });
  {
    const p = geoFlanc.attributes.position,
      uv = geoFlanc.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + 0.42) / 0.92, p.getY(i) / 1.92);
  }
  geoFlanc.rotateY(-Math.PI / 2); // le profil passe dans le plan (z, y), l'épaisseur vers -x

  // Cache de l'écran : panneau percé d'une fenêtre aux coins arrondis
  const hauteurCache = Math.hypot(0.14, 0.52);
  const cacheForme = new THREE.Shape();
  cacheForme.moveTo(-LARGEUR_BORNE / 2 + EPAIS_FLANC, -hauteurCache / 2);
  cacheForme.lineTo(LARGEUR_BORNE / 2 - EPAIS_FLANC, -hauteurCache / 2);
  cacheForme.lineTo(LARGEUR_BORNE / 2 - EPAIS_FLANC, hauteurCache / 2);
  cacheForme.lineTo(-LARGEUR_BORNE / 2 + EPAIS_FLANC, hauteurCache / 2);
  const trou = new THREE.Path();
  const tl = ECRAN_L / 2 + 0.012,
    th = ECRAN_H / 2 + 0.012,
    rr = 0.03;
  trou.moveTo(-tl + rr, -th);
  trou.lineTo(tl - rr, -th);
  trou.quadraticCurveTo(tl, -th, tl, -th + rr);
  trou.lineTo(tl, th - rr);
  trou.quadraticCurveTo(tl, th, tl - rr, th);
  trou.lineTo(-tl + rr, th);
  trou.quadraticCurveTo(-tl, th, -tl, th - rr);
  trou.lineTo(-tl, -th + rr);
  trou.quadraticCurveTo(-tl, -th, -tl + rr, -th);
  cacheForme.holes.push(trou);
  const geoCache = new THREE.ShapeGeometry(cacheForme, 12);
  {
    const p = geoCache.attributes.position,
      uv = geoCache.attributes.uv;
    for (let i = 0; i < p.count; i++)
      uv.setXY(i, p.getX(i) / (LARGEUR_BORNE - 2 * EPAIS_FLANC) + 0.5, p.getY(i) / hauteurCache + 0.5);
  }
  // Écran cathodique légèrement bombé
  const geoEcran = new THREE.PlaneGeometry(ECRAN_L, ECRAN_H, 10, 8);
  {
    const p = geoEcran.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i) / (ECRAN_L / 2),
        v = p.getY(i) / (ECRAN_H / 2);
      p.setZ(i, 0.018 * (1 - u * u * 0.7) * (1 - v * v * 0.7));
    }
    geoEcran.computeVertexNormals();
  }

  BORNES.forEach((infos, k) => {
    // Le Labyrinthe est seul au premier rang, les trois autres bornes sont alignées derrière
    const x = k === 0 ? 0 : (k - 2) * 2.6;
    const z = k === 0 ? zc + 4 : zc - 1;
    const groupe = new THREE.Group();
    groupe.position.set(x, 0, z); // les bornes regardent vers l'entrée de la salle (+z)
    const interieur = LARGEUR_BORNE - 2 * EPAIS_FLANC;
    const piece = (l, h, p, materiau, px, py, pz, rx = 0) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(l, h, p), materiau);
      m.position.set(px, py, pz);
      m.rotation.x = rx;
      groupe.add(m);
      return m;
    };

    // Flancs peints, bordés d'un jonc lumineux de la couleur du jeu
    const matFlanc = (miroir) =>
      new THREE.MeshStandardMaterial({
        map: textureFlanc(renderer, infos, miroir),
        roughness: 0.4,
        envMapIntensity: 0.3,
      });
    const matJonc = new THREE.MeshStandardMaterial({
      color: infos.couleur,
      emissive: infos.couleur,
      emissiveIntensity: 0.16, // assez pour luire, pas assez pour éblouir avec le halo
      roughness: 0.35,
      envMapIntensity: 0.3,
    });
    [-1, 1].forEach((c) => {
      const flanc = new THREE.Mesh(geoFlanc, [matFlanc(c > 0), matJonc]);
      flanc.position.x = c > 0 ? LARGEUR_BORNE / 2 : -LARGEUR_BORNE / 2 + EPAIS_FLANC;
      groupe.add(flanc);
    });

    // Caisson : dos, toit, bas avant, plinthe métallique
    piece(interieur, 1.92, 0.4, matCaisson, 0, 0.96, -0.22);
    piece(interieur, 0.06, 0.46, matCaisson, 0, 1.89, -0.2);
    piece(interieur, 0.86, 0.36, matCaisson, 0, 0.43, 0.16);
    piece(interieur, 0.1, 0.012, matMetal, 0, 0.05, 0.341);
    // Porte du monnayeur : plaque métal, deux fentes éclairées, boutons de retour
    piece(0.3, 0.34, 0.012, matMetalSombre, 0, 0.5, 0.346);
    piece(0.31, 0.35, 0.006, matMetal, 0, 0.5, 0.343);
    const matFente = new THREE.MeshBasicMaterial({
      map: texMonnayeur,
      color: new THREE.Color(1.1, 1.1, 1.1),
      toneMapped: false,
    });
    [-0.065, 0.065].forEach((cx) => {
      piece(0.07, 0.09, 0.02, matMetal, cx, 0.6, 0.355);
      const f = new THREE.Mesh(new THREE.PlaneGeometry(0.052, 0.07), matFente);
      f.position.set(cx, 0.6, 0.366);
      groupe.add(f);
      piece(0.04, 0.03, 0.02, matMetalSombre, cx, 0.5, 0.355);
    });
    piece(0.05, 0.02, 0.012, matNoirBrillant, 0, 0.4, 0.354); // serrure
    // Bloc sous le pupitre
    piece(interieur, 0.12, 0.42, matCaisson, 0, 0.92, 0.25);

    // Pupitre incliné, avec son décor et sa tranche avant
    const pupitre = new THREE.Group();
    pupitre.position.set(0, PUPITRE_CENTRE[1], PUPITRE_CENTRE[0]);
    pupitre.rotation.x = PUPITRE_INCLI;
    groupe.add(pupitre);
    const longPupitre = Math.hypot(0.28, 0.09);
    const plateau = new THREE.Mesh(new THREE.BoxGeometry(interieur, 0.03, longPupitre), [
      matCaisson,
      matCaisson,
      new THREE.MeshStandardMaterial({
        map: texturePupitre(renderer, infos),
        roughness: 0.35,
        envMapIntensity: 0.3,
      }),
      matCaisson,
      matNoirBrillant,
      matCaisson,
    ]);
    plateau.position.y = -0.015;
    pupitre.add(plateau);
    piece(interieur, 0.075, 0.02, matNoirBrillant, 0, 0.935, 0.49);
    /* Joystick de borne japonaise, à l'échelle réelle :
       la tige chromée pivote 3 cm SOUS le pupitre ; au-dessus on voit le trou,
       la rondelle anti-poussière qui glisse quand on penche le manche,
       l'écrou sous la boule, et la boule de 35 mm en plastique brillant. */
    const JX = -0.15,
      JZ = 0.02,
      PIVOT = 0.03;
    const trouJ = new THREE.Mesh(new THREE.CircleGeometry(0.017, 40), MAT_TROU);
    trouJ.rotation.x = -Math.PI / 2;
    trouJ.position.set(JX, 0.0004, JZ);
    pupitre.add(trouJ);
    // Quatre têtes de vis bombées qui tiennent le mécanisme
    [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ].forEach(([sx, sz]) => {
      const vis = new THREE.Mesh(GEO_VIS, matNoirBrillant);
      vis.position.set(JX + sx * 0.034, 0, JZ + sz * 0.026);
      pupitre.add(vis);
    });
    const rondelle = new THREE.Mesh(GEO_RONDELLE, MAT_RONDELLE);
    rondelle.position.set(JX, 0.0012, JZ);
    pupitre.add(rondelle);
    const joystick = new THREE.Group(); // origine : le pivot, sous le pupitre
    joystick.position.set(JX, -PIVOT, JZ);
    pupitre.add(joystick);
    const longTige = PIVOT + 0.032;
    const tige = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, longTige, 16), matTige);
    tige.position.y = longTige / 2;
    const ecrou = new THREE.Mesh(GEO_ECROU, matTige);
    ecrou.position.y = PIVOT + 0.004;
    const collier = new THREE.Mesh(new THREE.CylinderGeometry(0.0062, 0.0075, 0.006, 20), matNoirBrillant);
    collier.position.y = longTige - 0.001;
    const boule = new THREE.Mesh(
      GEO_BOULE,
      new THREE.MeshPhysicalMaterial({
        color: infos.couleur,
        roughness: 0.22,
        clearcoat: 1,
        clearcoatRoughness: 0.04,
        envMapIntensity: 1.3,
      }),
    );
    boule.position.y = longTige + 0.0155;
    joystick.add(tige, ecrou, collier, boule);
    // Zone de prise invisible autour du joystick (fixe, elle ne penche pas avec lui)
    const zonesCommandes = [];
    const priseJoy = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 8), MAT_ZONE);
    priseJoy.position.set(JX, 0.045, JZ);
    priseJoy.userData = { joystick: true };
    pupitre.add(priseJoy);
    zonesCommandes.push(priseJoy);

    // Boutons à LED : bague colorée, poussoir concave éclairé de l'intérieur
    const commandes = [];
    const ajouterBouton = (bx, bz, couleur, code, rayon = 0.015) => {
      const bouton = new THREE.Group();
      bouton.position.set(bx, 0, bz);
      pupitre.add(bouton);
      const bague = new THREE.Mesh(
        new THREE.CylinderGeometry(rayon + 0.004, rayon + 0.005, 0.008, 28),
        new THREE.MeshStandardMaterial({ color: 0x0d0d10, roughness: 0.3 }),
      );
      bague.position.y = 0.004;
      const led = new THREE.MeshStandardMaterial({
        color: couleur,
        emissive: couleur,
        emissiveIntensity: 0.5,
        roughness: 0.25,
      });
      const poussoir = new THREE.Mesh(new THREE.CylinderGeometry(rayon, rayon * 0.96, 0.012, 28), led);
      poussoir.position.y = 0.01;
      bouton.add(bague, poussoir);
      const commande = { code, poussoir, led, enfonce: 0 };
      commandes.push(commande);
      // Zone de clic invisible, un peu plus large que le bouton : facile à viser
      const zone = new THREE.Mesh(new THREE.CylinderGeometry(rayon * 1.7, rayon * 1.7, 0.03, 16), MAT_ZONE);
      zone.position.y = 0.012;
      zone.userData = { bouton: commande };
      bouton.add(zone);
      zonesCommandes.push(zone);
      return poussoir;
    };
    // Trois boutons d'action en arc, comme sur les bornes de l'époque
    [
      [0.02, 0.035],
      [0.075, 0.015],
      [0.13, 0.012],
    ].forEach(([bx, bz], i) => ajouterBouton(bx, bz, i === 1 ? "#ffffff" : infos.couleur, "Space"));
    ajouterBouton(0.02, -0.075, "#ffffff", "Enter", 0.011); // 1P START
    ajouterBouton(0.105, -0.075, "#ffd23a", "KeyP", 0.011); // PAUSE

    // Écran incliné, son cache imprimé et sa vitre
    const zoneEcran = new THREE.Group();
    zoneEcran.position.set(0, ECRAN_CENTRE[1], ECRAN_CENTRE[0]);
    zoneEcran.rotation.x = -ECRAN_INCLI;
    groupe.add(zoneEcran);
    const cacheEcran = new THREE.Mesh(
      geoCache,
      new THREE.MeshStandardMaterial({
        map: textureCache(renderer, infos),
        roughness: 0.5,
        envMapIntensity: 0.25,
      }),
    );
    cacheEcran.position.z = 0.002;
    const fond = new THREE.Mesh(new THREE.PlaneGeometry(interieur, hauteurCache), matNoirBrillant);
    fond.position.z = -0.04;
    const vitre = new THREE.Mesh(new THREE.PlaneGeometry(interieur, hauteurCache), matVitre);
    vitre.position.z = 0.01;
    vitre.renderOrder = 3;
    zoneEcran.add(cacheEcran, fond, vitre);

    // Fronton rétroéclairé, haut-parleurs et néon qui éclaire le cache
    const fronton = new THREE.Mesh(
      new THREE.PlaneGeometry(interieur, 0.21),
      new THREE.MeshBasicMaterial({
        map: textureMarquee(renderer, infos),
        color: new THREE.Color(1.08, 1.08, 1.08),
        toneMapped: false,
      }),
    );
    fronton.position.set(0, 1.75, 0.192);
    piece(interieur, 0.24, 0.16, matCaisson, 0, 1.75, 0.11);
    piece(interieur, 0.012, 0.15, matMetalSombre, 0, 1.637, 0.13);
    const tube = piece(interieur - 0.06, 0.01, 0.01, neon("#f4f6ff", 0.95), 0, 1.63, 0.17);
    tube.renderOrder = 1;
    [-0.2, 0.2].forEach((sx) => {
      const hp = new THREE.Mesh(new THREE.CircleGeometry(0.035, 24), matMetalSombre);
      hp.rotation.x = Math.PI / 2;
      hp.position.set(sx, 1.6305, 0.13);
      groupe.add(hp);
    });

    // L'écran : la partie de démonstration est dessinée dans un canvas, recopié à chaque image
    const canvasJeu = document.createElement("canvas");
    const jeu = creerJeu(infos.id, canvasJeu, { demo: true });
    const texture = new THREE.CanvasTexture(canvasJeu);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.NearestFilter;
    const ecran = new THREE.Mesh(
      geoEcran,
      new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }),
    );
    ecran.position.z = -0.03;
    ecran.userData = { type: "borne", id: infos.id };
    zoneEcran.add(ecran);
    cibles.push(ecran);

    groupe.add(fronton);
    scene.add(groupe);
    groupe.updateMatrixWorld(true);
    OBSTACLES.push({ x, z: z + 0.04, demiX: 0.36, demiZ: 0.48 });

    // Lumière colorée douce, placée haut et en avant : elle colore le sol et la borne
    // sans faire de tache blanche sur l'écran du joueur (elle était à hauteur des yeux)
    const lumiere = new THREE.PointLight(infos.couleur, 1.3, 4.5, 2);
    lumiere.position.set(x, 2.5, z + 1.7);
    scene.add(lumiere);

    // Anneau lumineux au sol : « cette borne est jouable »
    const anneau = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.62, 48),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(infos.couleur).multiplyScalar(1.4),
        transparent: true,
        opacity: 0.55,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
    );
    anneau.rotation.x = -Math.PI / 2;
    anneau.position.set(x, 0.01, z + 1.25);
    scene.add(anneau);

    // Centre et orientation de l'écran, pour placer la caméra pile en face quand on joue
    const centreEcran = new THREE.Vector3();
    ecran.getWorldPosition(centreEcran);
    const normale = new THREE.Vector3(0, 0, 1).applyQuaternion(
      ecran.getWorldQuaternion(new THREE.Quaternion()),
    );

    bornes.push({
      infos,
      jeu,
      texture,
      ecran,
      anneau,
      centreEcran,
      normale,
      ecranL: ECRAN_L,
      ecranH: ECRAN_H,
      inclinaison: ECRAN_INCLI,
      joystick,
      rondelle,
      joyPivot: PIVOT,
      joyBase: { x: JX, z: JZ },
      joyVitesse: { x: 0, z: 0 },
      joyManuel: null, // inclinaison imposée quand on tire la boule à la souris
      commandes,
      zonesCommandes,
      contacts: "",
      pupitre: pupitre.getWorldPosition(new THREE.Vector3()),
      lacet: groupe.rotation.y,
      position: new THREE.Vector3(x, 1.4, z),
      emplacement: {
        vue: new THREE.Vector3(x, PLAN.YEUX, z + 2.6),
        lacet: 0,
        tangage: -0.12,
        salle: numSalle,
      },
    });
  });

  /** Fait avancer les démos, et bouge joystick et boutons selon les touches enfoncées */
  function animer(dt, positionVisiteur, active = null) {
    const t = performance.now() / 1000;
    bornes.forEach((b) => {
      b.anneau.material.opacity = 0.35 + 0.25 * Math.sin(t * 2.5 + b.position.x);
      const proche = b === active || b.position.distanceTo(positionVisiteur) <= 22;
      if (!proche) return;
      b.jeu.etape(dt);
      b.texture.needsUpdate = true;

      const touches = b.jeu.touches;
      let ax = 0,
        az = 0;
      const INCLINAISON = 0.33; // environ 19°, la course d'un vrai joystick
      if (b.jeu.demo) {
        // Pendant la démo, un joueur fantôme donne de petits coups de manche, avec des pauses
        const pas = Math.floor(t * 3 + b.position.x * 7);
        const d = (((pas * 7919) % 11) + 11) % 11; // suite pseudo-aléatoire, toujours positive
        const direction = [[1, 0], [0, 0], [-1, 0], [0, 1], [0, 0], [0, -1], [1, 1], [0, 0], [-1, -1], [1, -1], [0, 0]][d];
        ax = direction[0] * INCLINAISON;
        az = direction[1] * INCLINAISON;
      } else if (b.joyManuel) {
        // Tiré à la souris : le manche suit exactement le geste
        ax = b.joyManuel.ax;
        az = b.joyManuel.az;
      } else {
        if (touches.has("ArrowLeft") || touches.has("KeyA")) ax += INCLINAISON;
        if (touches.has("ArrowRight") || touches.has("KeyD")) ax -= INCLINAISON;
        if (touches.has("ArrowUp") || touches.has("KeyW")) az -= INCLINAISON;
        if (touches.has("ArrowDown") || touches.has("KeyS")) az += INCLINAISON;
      }
      // Ressort de rappel : le manche part vite, cogne la butée et revient au centre en vibrant un peu
      const j = b.joystick,
        v = b.joyVitesse,
        n = Math.max(1, Math.ceil(dt / 0.008));
      for (let k = 0; k < n; k++) {
        const h = dt / n;
        v.z += (900 * (ax - j.rotation.z) - 22 * v.z) * h;
        v.x += (900 * (az - j.rotation.x) - 22 * v.x) * h;
        j.rotation.z = THREE.MathUtils.clamp(j.rotation.z + v.z * h, -0.36, 0.36);
        j.rotation.x = THREE.MathUtils.clamp(j.rotation.x + v.x * h, -0.36, 0.36);
      }
      // Petit « clic » des micro-interrupteurs quand une direction ou un bouton s'enclenche
      if (!b.jeu.demo) {
        const contacts = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space", "Enter", "KeyP"]
          .filter((c) => touches.has(c))
          .join();
        const nouveau = contacts.split(",").some((c) => c && !b.contacts.split(",").includes(c));
        if (nouveau) b.jeu.son(2200, 0.012, "square", 0.018);
        b.contacts = contacts;
      }
      // La rondelle suit l'endroit où la tige traverse le pupitre
      b.rondelle.position.x = b.joyBase.x - b.joyPivot * Math.tan(j.rotation.z);
      b.rondelle.position.z = b.joyBase.z + b.joyPivot * Math.tan(j.rotation.x);
      b.commandes.forEach((c, i) => {
        const appuye = !b.jeu.demo && (touches.has(c.code) || c.clic);
        c.enfonce += ((appuye ? 1 : 0) - c.enfonce) * (1 - Math.exp(-dt * 30));
        c.poussoir.position.y = 0.01 - c.enfonce * 0.005;
        c.led.emissiveIntensity = b.jeu.demo
          ? 0.35 + 0.45 * Math.max(0, Math.sin(t * 4 - i * 0.9))
          : 0.5 + c.enfonce * 1.1;
      });
    });
  }
  return { cibles, bornes, animer };
}
