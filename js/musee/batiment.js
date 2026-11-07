/* ============================================================
   CONTINUE ? — Construction du bâtiment
   Inspiré des vrais musées du jeu vidéo : un parcours
   chronologique où chaque époque a sa couleur de murs et sa
   lumière. Parquet ciré, plafond avec éclairage zénithal et rails
   de spots, socles et vitrines en verre, bancs, cloisons épaisses.
   La salle d'arcade reste sombre, éclairée par ses néons.
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

/* ---------- Textures dessinées par le code ---------- */
function textureParquet(renderer) {
  // 1024 pixels = 4 mètres ; lames de 20 cm de large
  const t = textureCanvas(renderer, 1024, 1024, (g, l, h) => {
    const r = hasard(7);
    const largeur = l / 20;
    for (let c = 0; c < 20; c++) {
      let y = -r() * 300;
      while (y < h) {
        const longueur = 260 + r() * 260;
        const teinte = 27 + r() * 7,
          lum = 36 + r() * 9;
        g.fillStyle = `hsl(${teinte}, 42%, ${lum}%)`;
        g.fillRect(c * largeur, y, largeur, longueur);
        // Veinage du bois
        for (let k = 0; k < 7; k++) {
          g.strokeStyle = `hsla(${teinte - 6}, 45%, ${lum - 12}%, ${0.15 + r() * 0.2})`;
          g.lineWidth = 0.6 + r() * 1.2;
          g.beginPath();
          const x0 = c * largeur + 4 + r() * (largeur - 8);
          g.moveTo(x0, y);
          g.bezierCurveTo(
            x0 + (r() - 0.5) * 10,
            y + longueur / 3,
            x0 + (r() - 0.5) * 10,
            y + (2 * longueur) / 3,
            x0 + (r() - 0.5) * 6,
            y + longueur,
          );
          g.stroke();
        }
        // Joint entre deux lames
        g.fillStyle = "rgba(40,24,12,0.55)";
        g.fillRect(c * largeur, y, largeur, 2);
        y += longueur;
      }
      g.fillStyle = "rgba(40,24,12,0.5)";
      g.fillRect(c * largeur, 0, 2, h);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function texturePeinture(renderer) {
  // Grain très léger d'un mur peint, et ombre douce en bas du mur
  return textureCanvas(renderer, 256, 512, (g, l, h) => {
    const r = hasard(3);
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, l, h);
    for (let i = 0; i < 5000; i++) {
      g.fillStyle = `rgba(0,0,0,${r() * 0.035})`;
      g.fillRect(r() * l, r() * h, 2, 2);
    }
    const ombre = g.createLinearGradient(0, h, 0, h * 0.82);
    ombre.addColorStop(0, "rgba(0,0,0,0.35)");
    ombre.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = ombre;
    g.fillRect(0, h * 0.82, l, h * 0.18);
    const haut = g.createLinearGradient(0, 0, 0, h * 0.12);
    haut.addColorStop(0, "rgba(0,0,0,0.25)");
    haut.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = haut;
    g.fillRect(0, 0, l, h * 0.12);
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

/**
 * Construit tout le bâtiment.
 * Renvoie une fonction animer(dt) pour les objets qui tournent dans les vitrines.
 */
export function construireBatiment(scene, renderer, { mobile }) {
  const { LARGEUR, HAUTEUR, DEMI_L, Z_ENTREE, Z_FOND, PORTE_L, PORTE_H, LONG_SALLE } = PLAN;
  const longueur = Z_ENTREE - Z_FOND,
    zMilieu = (Z_ENTREE + Z_FOND) / 2;
  const animations = [];

  // Reflets réalistes sur le verre, le métal et le bois ciré
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  pmrem.dispose();

  /* --- Sol : parquet ciré, avec un léger reflet sur ordinateur --- */
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
      roughness: 0.42,
      metalness: 0,
      envMapIntensity: 0.6,
      transparent: !mobile,
      opacity: 0.9,
    }),
  );
  sol.rotation.x = -Math.PI / 2;
  sol.position.set(0, 0.002, zMilieu);
  scene.add(sol);

  /* --- Murs peints, salle par salle --- */
  const texMur = texturePeinture(renderer);
  const peinture = {};
  SALLES.forEach((s) => {
    peinture[s.id] = new THREE.MeshStandardMaterial({
      color: PEINTURES[s.id],
      map: texMur,
      roughness: 0.92,
      envMapIntensity: 0.25,
    });
  });
  const matPlinthe = new THREE.MeshStandardMaterial({ color: 0x111114, roughness: 0.6 });
  const matPlafond = new THREE.MeshStandardMaterial({
    color: 0xe9e6df,
    roughness: 0.95,
    envMapIntensity: 0.3,
  });
  const matLumiere = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0xfff3e0).multiplyScalar(1.15),
    toneMapped: false,
  });
  const matRail = new THREE.MeshStandardMaterial({
    color: 0x1a1a1e,
    roughness: 0.4,
    metalness: 0.7,
  });

  SALLES.forEach((salle, i) => {
    const zc = centreSalle(i);
    [-1, 1].forEach((cote) => {
      const mur = new THREE.Mesh(new THREE.PlaneGeometry(LONG_SALLE, HAUTEUR), peinture[salle.id]);
      mur.position.set(cote * DEMI_L, HAUTEUR / 2, zc);
      mur.rotation.y = (-cote * Math.PI) / 2;
      scene.add(mur);
      boite(scene, 0.03, 0.12, LONG_SALLE, matPlinthe, cote * (DEMI_L - 0.015), 0.06, zc); // plinthe
    });
  });
  [
    [Z_ENTREE, Math.PI, "pionniers"],
    [Z_FOND, 0, "moderne"],
  ].forEach(([z, r, id]) => {
    const mur = new THREE.Mesh(new THREE.PlaneGeometry(LARGEUR, HAUTEUR), peinture[id]);
    mur.position.set(0, HAUTEUR / 2, z);
    mur.rotation.y = r;
    scene.add(mur);
  });

  /* --- Plafond : verrière centrale et rails de spots --- */
  const plafond = new THREE.Mesh(new THREE.PlaneGeometry(LARGEUR, longueur), matPlafond);
  plafond.rotation.x = Math.PI / 2;
  plafond.position.set(0, HAUTEUR, zMilieu);
  scene.add(plafond);
  SALLES.forEach((salle, i) => {
    const zc = centreSalle(i);
    if (salle.id !== "arcade") {
      // Verrière : un long caisson lumineux encastré
      boite(scene, 2.6, 0.04, LONG_SALLE - 6, matLumiere, 0, HAUTEUR - 0.03, zc);
      [-1, 1].forEach((c) =>
        boite(scene, 0.1, 0.16, LONG_SALLE - 5.8, matRail, c * 1.35, HAUTEUR - 0.08, zc),
      );
    }
    // Rails de spots, le long des murs
    [-1, 1].forEach((cote) =>
      boite(scene, 0.05, 0.05, LONG_SALLE - 1, matRail, cote * (DEMI_L - 2.6), HAUTEUR - 0.35, zc),
    );
  });

  /* --- Cloisons épaisses entre les salles, avec une porte au milieu --- */
  const largeurCote = (LARGEUR - PORTE_L) / 2,
    EPAIS = 0.5;
  CLOISONS.forEach((z, k) => {
    const avant = peinture[SALLES[k].id],
      apres = peinture[SALLES[k + 1].id];
    // Ordre des faces d'une boîte : +x, -x, +y, -y, +z (côté salle k), -z (côté salle k+1)
    const mats = [avant, avant, matPlafond, matPlafond, avant, apres];
    [-1, 1].forEach((cote) =>
      boite(
        scene,
        largeurCote,
        HAUTEUR,
        EPAIS,
        mats,
        cote * (PORTE_L / 2 + largeurCote / 2),
        HAUTEUR / 2,
        z,
      ),
    );
    boite(scene, PORTE_L, HAUTEUR - PORTE_H, EPAIS, mats, 0, PORTE_H + (HAUTEUR - PORTE_H) / 2, z);
    // Encadrement de porte en bois clair et liseré de la couleur de la salle suivante
    const matCadre = new THREE.MeshStandardMaterial({ color: 0xcaa57a, roughness: 0.5 });
    [-1, 1].forEach((cote) =>
      boite(
        scene,
        0.08,
        PORTE_H,
        EPAIS + 0.04,
        matCadre,
        cote * (PORTE_L / 2 - 0.04),
        PORTE_H / 2,
        z,
      ),
    );
    boite(scene, PORTE_L, 0.08, EPAIS + 0.04, matCadre, 0, PORTE_H - 0.04, z);
    boite(
      scene,
      PORTE_L - 0.16,
      0.025,
      0.02,
      neon(SALLES[k + 1].couleur, 1.3),
      0,
      PORTE_H - 0.1,
      z + EPAIS / 2 + 0.03,
    );
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
      // Néons au plafond et au ras du sol, comme dans une salle de jeux
      const m = neon(salle.couleur, 1.6);
      [-1, 1].forEach((cote) => {
        boite(scene, 0.05, 0.05, LONG_SALLE - 0.6, m, cote * (DEMI_L - 0.05), HAUTEUR - 0.3, zc);
        boite(scene, 0.05, 0.04, LONG_SALLE - 0.6, m, cote * (DEMI_L - 0.05), 0.14, zc);
      });
      [-3, 0, 3].forEach((x) =>
        boite(
          scene,
          0.06,
          0.06,
          LONG_SALLE - 6,
          neon(["#3cf2c8", "#ff4f9a", "#7c9cff"][x / 3 + 1], 1.8),
          x,
          HAUTEUR - 0.05,
          zc,
        ),
      );
    } else {
      // Liseré lumineux de la couleur de l'époque, en haut des murs (éclairage indirect)
      [-1, 1].forEach((cote) =>
        boite(
          scene,
          0.04,
          0.03,
          LONG_SALLE - 0.6,
          neon(salle.couleur, 1.1),
          cote * (DEMI_L - 0.03),
          HAUTEUR - 0.02,
          zc,
        ),
      );
    }
  });

  /* --- Titre de chaque salle, peint au-dessus de la porte (ou suspendu à l'entrée) --- */
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
      i === 0 ? 4.4 : PORTE_H + 1.05,
      i === 0 ? Z_ENTREE - 0.02 : z0 + EPAIS / 2 + 0.02,
    );
    if (i === 0) titre.rotation.y = Math.PI;
    scene.add(titre);
    if (i === 0) {
      // À l'entrée, le titre est aussi suspendu face au visiteur
      const suspendu = titre.clone();
      suspendu.rotation.y = 0;
      suspendu.position.set(0, 4.5, z0 - 4);
      scene.add(suspendu);
    }
  });

  /* --- Au centre des salles 1, 3 et 4 : une vitrine en verre sur un socle blanc, et un banc --- */
  const matSocle = new THREE.MeshStandardMaterial({ color: 0xf1eee8, roughness: 0.7 });
  const matVerre = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.02,
    metalness: 0,
    transparent: true,
    opacity: 0.14,
    envMapIntensity: 1.4,
    depthWrite: false,
  });
  const matBois = new THREE.MeshStandardMaterial({ color: 0xa8784c, roughness: 0.45 });
  const matNoir = new THREE.MeshStandardMaterial({
    color: 0x151518,
    roughness: 0.4,
    metalness: 0.6,
  });
  const texHalo = textureHalo(renderer);
  SALLES.forEach((salle) => {
    if (salle.id === "arcade") return;
    const zc = centreSalle(SALLES.indexOf(salle));
    boite(scene, 1.2, 1.0, 1.2, matSocle, 0, 0.5, zc);
    boite(scene, 1.26, 0.06, 1.26, matSocle, 0, 0.03, zc);
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
    tache.position.set(0, 0.01, zc);
    scene.add(tache);
    // Bancs de part et d'autre
    [5.2, -5.2].forEach((dz) => {
      const z = zc + dz;
      boite(scene, 2.2, 0.08, 0.5, matBois, 0, 0.46, z);
      [-0.95, 0.95].forEach((x) => boite(scene, 0.06, 0.42, 0.44, matNoir, x, 0.21, z));
      OBSTACLES.push({ x: 0, z, demiX: 1.1, demiZ: 0.25 });
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
  fin.position.set(0, 3.4, Z_FOND + 0.02);
  scene.add(fin);

  let temps = 0;
  return (dt) => {
    temps += dt;
    animations.forEach((a) => a(dt, temps));
  };
}
