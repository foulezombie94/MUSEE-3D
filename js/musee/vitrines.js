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

/* ---------- Bornes d'arcade jouables ---------- */
export function installerBornes(scene, renderer) {
  const numSalle = SALLES.findIndex((s) => s.id === "arcade");
  const zc = centreSalle(numSalle);
  const cibles = [],
    bornes = [];
  const matMeuble = new THREE.MeshStandardMaterial({
    color: 0x15162c,
    roughness: 0.55,
    metalness: 0.3,
  });
  const matNoir = new THREE.MeshStandardMaterial({ color: 0x05050a, roughness: 0.6 });

  BORNES.forEach((infos, k) => {
    // Le Labyrinthe est seul au premier rang, les trois autres bornes sont alignées derrière
    const x = k === 0 ? 0 : (k - 2) * 2.6;
    const z = k === 0 ? zc + 4 : zc - 1;
    const groupe = new THREE.Group();
    groupe.position.set(x, 0, z); // les bornes regardent vers l'entrée de la salle (+z)

    const piece = (l, h, p, materiau, px, py, pz, rx = 0) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(l, h, p), materiau);
      m.position.set(px, py, pz);
      m.rotation.x = rx;
      groupe.add(m);
      return m;
    };
    piece(1.0, 1.0, 0.8, matMeuble, 0, 0.5, 0); // bas du meuble
    piece(1.0, 0.1, 0.5, matNoir, 0, 1.06, 0.3, -0.28); // pupitre de commandes
    piece(1.0, 1.0, 0.5, matMeuble, 0, 1.62, -0.15); // haut du meuble
    piece(1.04, 0.32, 0.64, matMeuble, 0, 2.27, -0.08); // fronton

    // Néons sur les côtés
    const m = neon(infos.couleur, 1.5);
    [-0.52, 0.52].forEach((cx) => {
      piece(0.03, 2.4, 0.03, m, cx, 1.2, 0.41);
    });

    // Fronton lumineux avec le nom du jeu
    const fronton = new THREE.Mesh(
      new THREE.PlaneGeometry(0.98, 0.28),
      new THREE.MeshBasicMaterial({
        toneMapped: false,
        map: textureCanvas(renderer, 512, 146, (g, l, h) => {
          g.fillStyle = "#0a0a14";
          g.fillRect(0, 0, l, h);
          g.textAlign = "center";
          g.textBaseline = "middle";
          g.shadowColor = infos.couleur;
          g.shadowBlur = 18;
          g.fillStyle = infos.couleur;
          g.font = "700 58px Silkscreen, 'Courier New', monospace";
          g.fillText(infos.nom.toUpperCase(), l / 2, h / 2 + 4);
        }),
      }),
    );
    fronton.position.set(0, 2.27, 0.245);

    // Écran : la partie de démonstration est dessinée dans un canvas, recopié à chaque image
    const canvasJeu = document.createElement("canvas");
    const jeu = creerJeu(infos.id, canvasJeu, { demo: true });
    const texture = new THREE.CanvasTexture(canvasJeu);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.NearestFilter;
    const ecran = new THREE.Mesh(
      new THREE.PlaneGeometry(0.8, 0.6),
      new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }),
    );
    ecran.position.set(0, 1.66, 0.14);
    ecran.rotation.x = -0.08;
    ecran.userData = { type: "borne", id: infos.id };
    cibles.push(ecran);

    // Boutons et manette sur le pupitre
    [
      [-0.22, infos.couleur],
      [0.12, "#ffffff"],
      [0.24, infos.couleur],
    ].forEach(([bx, c]) => {
      const bouton = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.035, 0.03, 16),
        neon(c, 1.4),
      );
      bouton.position.set(bx, 1.13, 0.36);
      bouton.rotation.x = -0.28;
      groupe.add(bouton);
    });

    groupe.add(fronton, ecran);
    scene.add(groupe);
    groupe.updateMatrixWorld();
    OBSTACLES.push({ x, z, demiX: 0.55, demiZ: 0.45 });

    // Petite lumière colorée devant chaque borne
    const lumiere = new THREE.PointLight(infos.couleur, 3, 4, 2);
    lumiere.position.set(x, 1.6, z + 0.9);
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
      lacet: groupe.rotation.y,
      position: new THREE.Vector3(x, 1.6, z),
      emplacement: {
        vue: new THREE.Vector3(x, PLAN.YEUX, z + 2.9),
        lacet: 0,
        tangage: -0.04,
        salle: numSalle,
      },
    });
  });

  /** Fait avancer les parties de démonstration des bornes proches du visiteur */
  function animer(dt, positionVisiteur, active = null) {
    bornes.forEach((b) => {
      b.anneau.material.opacity = 0.35 + 0.25 * Math.sin(performance.now() / 400 + b.position.x);
      if (b !== active && b.position.distanceTo(positionVisiteur) > 22) return;
      b.jeu.etape(dt);
      b.texture.needsUpdate = true;
    });
  }
  return { cibles, bornes, animer };
}
