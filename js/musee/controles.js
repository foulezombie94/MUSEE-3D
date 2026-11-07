/* ============================================================
   CONTINUE ? — Déplacements du visiteur
   - Clavier : ZQSD ou WASD (touches physiques) et flèches, Maj pour courir
   - Souris : pointeur verrouillé (comme un jeu vidéo) ou glisser
   - Tactile : joystick pour avancer, glisser pour regarder
   - Vol automatique de la caméra jusqu'à une œuvre
   ============================================================ */
import * as THREE from "three";
import { PLAN, bloque, OBSTACLES } from "./plan.js";

/* ---------- Recherche de chemin (A*) sur une grille du musée ----------
   Le sol est découpé en cases de 25 cm. Une case est libre si un visiteur
   peut s'y tenir (murs, cloisons, socles, bornes, consoles exclus).
   Le chemin trouvé est ensuite raccourci : on garde seulement les points
   où il faut vraiment tourner, ce qui évite les zigzags. */
const PAS = 0.25;
const NX = Math.round(PLAN.LARGEUR / PAS) + 1;
const NZ = Math.round((PLAN.Z_ENTREE - PLAN.Z_FOND) / PAS) + 1;
let grille = null,
  obstaclesConnus = -1;
function grilleLibre() {
  // Recalculée seulement si des obstacles ont été ajoutés
  if (grille && obstaclesConnus === OBSTACLES.length) return grille;
  grille = new Uint8Array(NX * NZ);
  for (let j = 0; j < NZ; j++)
    for (let i = 0; i < NX; i++)
      grille[j * NX + i] = bloque(i * PAS - PLAN.DEMI_L, PLAN.Z_ENTREE - j * PAS) ? 0 : 1;
  obstaclesConnus = OBSTACLES.length;
  return grille;
}
const versCase = (x, z) => [
  THREE.MathUtils.clamp(Math.round((x + PLAN.DEMI_L) / PAS), 0, NX - 1),
  THREE.MathUtils.clamp(Math.round((PLAN.Z_ENTREE - z) / PAS), 0, NZ - 1),
];
const versPoint = (i, j) => new THREE.Vector3(i * PAS - PLAN.DEMI_L, PLAN.YEUX, PLAN.Z_ENTREE - j * PAS);
const estLibre = (g, i, j) => i >= 0 && j >= 0 && i < NX && j < NZ && g[j * NX + i] === 1;

/** Case libre la plus proche (le point de vue final peut être tout contre un objet) */
function caseLibreProche(g, i0, j0) {
  if (estLibre(g, i0, j0)) return [i0, j0];
  for (let r = 1; r < 24; r++)
    for (let dj = -r; dj <= r; dj++)
      for (let di = -r; di <= r; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
        if (estLibre(g, i0 + di, j0 + dj)) return [i0 + di, j0 + dj];
      }
  return null;
}

/** Vrai si on peut aller en ligne droite de a à b sans toucher d'obstacle */
function voitDirectement(g, a, b) {
  const n = Math.ceil(a.distanceTo(b) / (PAS * 0.4));
  for (let k = 1; k < n; k++) {
    const [i, j] = versCase(a.x + ((b.x - a.x) * k) / n, a.z + ((b.z - a.z) * k) / n);
    if (!estLibre(g, i, j)) return false;
  }
  return true;
}

/** Plus court chemin de a à b, sous forme de quelques points de passage */
function chercherChemin(a, b) {
  const g = grilleLibre();
  if (voitDirectement(g, a, b)) return [];
  const depart = caseLibreProche(g, ...versCase(a.x, a.z));
  const but = caseLibreProche(g, ...versCase(b.x, b.z));
  if (!depart || !but) return [];
  const indice = (i, j) => j * NX + i;
  const cible = indice(...but);
  const cout = new Float32Array(NX * NZ).fill(Infinity);
  const parent = new Int32Array(NX * NZ).fill(-1);
  const ferme = new Uint8Array(NX * NZ);
  const estime = (i, j) => {
    const dx = Math.abs(i - but[0]),
      dz = Math.abs(j - but[1]);
    return Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz);
  };
  // File de priorité (tas binaire) de [priorité, case]
  const tas = [];
  const pousser = (p, c) => {
    tas.push([p, c]);
    let k = tas.length - 1;
    while (k > 0) {
      const h = (k - 1) >> 1;
      if (tas[h][0] <= tas[k][0]) break;
      [tas[h], tas[k]] = [tas[k], tas[h]];
      k = h;
    }
  };
  const extraire = () => {
    const haut = tas[0],
      dernier = tas.pop();
    if (tas.length) {
      tas[0] = dernier;
      let k = 0;
      for (;;) {
        const l = 2 * k + 1,
          r = l + 1;
        let m = k;
        if (l < tas.length && tas[l][0] < tas[m][0]) m = l;
        if (r < tas.length && tas[r][0] < tas[m][0]) m = r;
        if (m === k) break;
        [tas[m], tas[k]] = [tas[k], tas[m]];
        k = m;
      }
    }
    return haut;
  };
  const d0 = indice(...depart);
  cout[d0] = 0;
  pousser(estime(...depart), d0);
  while (tas.length) {
    const [, c] = extraire();
    if (c === cible) break;
    if (ferme[c]) continue;
    ferme[c] = 1;
    const i = c % NX,
      j = (c / NX) | 0;
    for (let dj = -1; dj <= 1; dj++)
      for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ni = i + di,
          nj = j + dj;
        if (!estLibre(g, ni, nj)) continue;
        // En diagonale, on ne coupe pas le coin d'un obstacle
        if (di && dj && (!estLibre(g, i + di, j) || !estLibre(g, i, j + dj))) continue;
        const n = indice(ni, nj),
          nouveau = cout[c] + (di && dj ? Math.SQRT2 : 1);
        if (nouveau < cout[n]) {
          cout[n] = nouveau;
          parent[n] = c;
          pousser(nouveau + estime(ni, nj), n);
        }
      }
  }
  if (parent[cible] < 0 && cible !== d0) return [];
  // On remonte le chemin, puis on ne garde que les points utiles
  const cases = [];
  for (let c = cible; c >= 0; c = parent[c]) cases.unshift(versPoint(c % NX, (c / NX) | 0));
  const points = [a.clone().setY(PLAN.YEUX), ...cases, b.clone().setY(PLAN.YEUX)];
  const utiles = [];
  let k = 0;
  while (k < points.length - 1) {
    let suivant = points.length - 1;
    while (suivant > k + 1 && !voitDirectement(g, points[k], points[suivant])) suivant--;
    if (suivant < points.length - 1) utiles.push(points[suivant]);
    k = suivant;
  }
  return utiles;
}

/** Plus court écart entre deux angles (pour tourner dans le bon sens) */
const ecartAngle = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

/**
 * Crée les contrôles.
 * @param rappels.clic(x, y)       un clic ou un toucher court sur la salle
 * @param rappels.bouge()          le visiteur reprend la main (arrête la visite guidée)
 * @param rappels.verrou(estVerrouille)  le pointeur vient d'être verrouillé ou libéré
 */
export function creerControles({ canvas, joystick, estTactile, mouvementReduit, rappels }) {
  const joueur = {
    pos: new THREE.Vector3(0, PLAN.YEUX, PLAN.Z_ENTREE - 2),
    lacet: 0, // rotation gauche / droite
    tangage: 0, // regard vers le haut / le bas
    vitesse: new THREE.Vector3(),
  };
  const touches = new Set();
  const joy = { actif: false, x: 0, y: 0 };
  const etat = { actif: false, verrouille: false, vol: null };

  /* ---------- Clavier ---------- */
  const TOUCHES_MOUVEMENT = [
    "KeyW",
    "KeyA",
    "KeyS",
    "KeyD",
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "ShiftLeft",
    "ShiftRight",
  ];
  addEventListener("keydown", (e) => {
    if (!etat.actif || e.target.tagName === "INPUT") return;
    if (TOUCHES_MOUVEMENT.includes(e.code)) {
      touches.add(e.code);
      if (e.code.startsWith("Arrow")) e.preventDefault();
    }
  });
  addEventListener("keyup", (e) => touches.delete(e.code));
  addEventListener("blur", () => touches.clear());

  /* ---------- Souris verrouillée ---------- */
  document.addEventListener("pointerlockchange", () => {
    etat.verrouille = document.pointerLockElement === canvas;
    canvas.classList.toggle("verrouille", etat.verrouille);
    rappels.verrou(etat.verrouille);
  });
  document.addEventListener("mousemove", (e) => {
    if (!etat.verrouille || etat.vol) return;
    if (Math.abs(e.movementX) > 250 || Math.abs(e.movementY) > 250) return; // saut parasite au verrouillage
    joueur.lacet -= e.movementX * 0.0022;
    joueur.tangage = THREE.MathUtils.clamp(joueur.tangage - e.movementY * 0.0022, -1.2, 1.2);
  });

  function verrouiller() {
    if (estTactile || etat.verrouille) return;
    try {
      const promesse = canvas.requestPointerLock();
      if (promesse && promesse.catch) promesse.catch(() => {});
    } catch (erreur) {
      /* refusé par le navigateur : le glisser reste disponible */
    }
  }
  function liberer() {
    if (document.pointerLockElement) document.exitPointerLock();
    touches.clear();
  }

  /* ---------- Glisser pour regarder, clic court pour viser ---------- */
  let appui = null;
  canvas.addEventListener("pointerdown", (e) => {
    if (!etat.actif) return;
    appui = { x: e.clientX, y: e.clientY, distance: 0, debut: performance.now(), id: e.pointerId };
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch (erreur) {
      /* sans importance */
    }
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!appui || etat.verrouille || e.pointerId !== appui.id) return;
    const dx = e.clientX - appui.x,
      dy = e.clientY - appui.y;
    appui.distance += Math.abs(dx) + Math.abs(dy);
    appui.x = e.clientX;
    appui.y = e.clientY;
    if (etat.vol) return;
    if (appui.distance > 4) rappels.bouge();
    joueur.lacet += dx * 0.0042;
    joueur.tangage = THREE.MathUtils.clamp(joueur.tangage + dy * 0.0034, -1.2, 1.2);
  });
  canvas.addEventListener("pointerup", (e) => {
    if (!appui || e.pointerId !== appui.id) return;
    const estUnClic = appui.distance < 8 && performance.now() - appui.debut < 450;
    appui = null;
    if (estUnClic) rappels.clic(e.clientX, e.clientY);
  });

  /* ---------- Joystick tactile ---------- */
  const bouton = joystick.firstElementChild;
  function majJoystick(e) {
    const r = joystick.getBoundingClientRect();
    let x = (e.clientX - r.left - r.width / 2) / (r.width / 2);
    let y = (e.clientY - r.top - r.height / 2) / (r.height / 2);
    const n = Math.hypot(x, y);
    if (n > 1) {
      x /= n;
      y /= n;
    }
    joy.x = x;
    joy.y = y;
    bouton.style.transform = `translate(${x * 34}px, ${y * 34}px)`;
  }
  joystick.addEventListener("pointerdown", (e) => {
    joy.actif = true;
    try {
      joystick.setPointerCapture(e.pointerId);
    } catch (erreur) {
      /* sans importance */
    }
    majJoystick(e);
  });
  joystick.addEventListener("pointermove", (e) => {
    if (joy.actif) majJoystick(e);
  });
  const relacher = () => {
    joy.actif = false;
    joy.x = joy.y = 0;
    bouton.style.transform = "";
  };
  joystick.addEventListener("pointerup", relacher);
  joystick.addEventListener("pointercancel", relacher);

  /* ---------- Marche ---------- */
  function marcher(dt) {
    let avant = 0,
      cote = 0;
    if (touches.has("KeyW") || touches.has("ArrowUp")) avant += 1;
    if (touches.has("KeyS") || touches.has("ArrowDown")) avant -= 1;
    if (touches.has("KeyD") || touches.has("ArrowRight")) cote += 1;
    if (touches.has("KeyA") || touches.has("ArrowLeft")) cote -= 1;
    if (joy.actif) {
      avant -= joy.y;
      cote += joy.x;
    }
    if (avant || cote) rappels.bouge();

    // Direction voulue, calculée à partir de l'orientation de la caméra
    const vitesseMax = touches.has("ShiftLeft") || touches.has("ShiftRight") ? 6.5 : 3.6;
    const sin = Math.sin(joueur.lacet),
      cos = Math.cos(joueur.lacet);
    const voulue = new THREE.Vector3(-sin * avant + cos * cote, 0, -cos * avant - sin * cote);
    if (voulue.lengthSq() > 1) voulue.normalize();
    voulue.multiplyScalar(vitesseMax);
    joueur.vitesse.lerp(voulue, 1 - Math.exp(-dt * 9)); // accélération et freinage doux

    // On avance axe par axe pour glisser le long des murs
    const nx = joueur.pos.x + joueur.vitesse.x * dt;
    const nz = joueur.pos.z + joueur.vitesse.z * dt;
    if (!bloque(nx, joueur.pos.z)) joueur.pos.x = nx;
    else joueur.vitesse.x = 0;
    if (!bloque(joueur.pos.x, nz)) joueur.pos.z = nz;
    else joueur.vitesse.z = 0;

    // Léger balancement de la marche
    const v = Math.hypot(joueur.vitesse.x, joueur.vitesse.z);
    joueur.pos.y =
      PLAN.YEUX +
      (mouvementReduit ? 0 : Math.sin(performance.now() / 160) * 0.02 * Math.min(v / 3.6, 1));
  }

  /* ---------- Vol automatique vers un point de vue ----------
     Si l'œuvre est dans une autre salle, la caméra passe par le milieu des portes. */
  /**
   * @param emplacement { vue, lacet, tangage, approche? } : si `approche` est donné,
   *        la caméra passe d'abord par ce point (devant une borne) puis s'avance tout droit
   * @param direct      vrai : trajet en ligne droite, sans contourner les obstacles
   */
  function volerVers(emplacement, direct = false) {
    const depart = joueur.pos.clone().setY(PLAN.YEUX);
    const arrivee = (emplacement.approche || emplacement.vue).clone();
    // Le plus court chemin qui évite murs, cloisons et objets, sans zigzag
    const points = [depart, ...(direct ? [] : chercherChemin(depart, arrivee)), arrivee].filter(
      (p, i, liste) => i === 0 || p.distanceTo(liste[i - 1]) > 0.05,
    );
    if (points.length === 1) points.push(arrivee.clone().add(new THREE.Vector3(0, 0.001, 0)));
    // Courbe douce qui passe par les points de passage
    const courbe =
      points.length > 2
        ? new THREE.CatmullRomCurve3(points, false, "centripetal", 0.5)
        : new THREE.LineCurve3(points[0], points[1]);
    const longueurCourbe = courbe.getLength();
    // Devant une borne ou une console, on termine en avançant tout droit vers l'écran
    const finale = emplacement.approche ? emplacement.vue.clone() : null;
    const longueurFinale = finale ? arrivee.distanceTo(finale) : 0;
    const total = longueurCourbe + longueurFinale || 0.001;
    // Ne pas faire de tour complet : on part de l'angle actuel ramené entre -π et π
    joueur.lacet = Math.atan2(Math.sin(joueur.lacet), Math.cos(joueur.lacet));

    etat.vol = {
      courbe,
      longueurCourbe,
      arrivee,
      finale,
      total,
      // Sur un long trajet, la caméra regarde où elle va, puis se tourne vers le but
      suivi: longueurCourbe > 10,
      lacet0: joueur.lacet,
      lacetCible: emplacement.lacet,
      tangage0: joueur.tangage,
      tangage1: emplacement.tangage ?? 0.09,
      t: 0,
      duree: mouvementReduit ? 0.01 : Math.min(5, (total > 3 ? 1.2 : 0.7) + total / 11),
    };
    joueur.vitesse.set(0, 0, 0);
  }

  /** Position sur le trajet pour une distance parcourue d */
  function pointDuChemin(v, d) {
    if (v.longueurCourbe < 0.01) {
      if (!v.finale) return v.arrivee.clone();
    } else if (d <= v.longueurCourbe || !v.finale)
      return v.courbe.getPointAt(THREE.MathUtils.clamp(d / (v.longueurCourbe || 1), 0, 1));
    return v.arrivee.clone().lerp(v.finale, (d - v.longueurCourbe) / (v.total - v.longueurCourbe));
  }

  function voler(dt) {
    const v = etat.vol;
    v.t = Math.min(1, v.t + dt / v.duree);
    const k = v.t < 0.5 ? 4 * v.t ** 3 : 1 - (-2 * v.t + 2) ** 3 / 2; // démarrage et arrivée en douceur
    joueur.pos.copy(pointDuChemin(v, k * v.total));
    joueur.pos.y += Math.sin(k * Math.PI) * (v.total > 6 ? 0.18 : 0);

    const lisse = (x) => x * x * (3 - 2 * x);
    if (v.suivi && k < 0.72) {
      // La caméra regarde un peu plus loin sur le trajet, et tourne en douceur
      const devant = pointDuChemin(v, Math.min(v.total, k * v.total + 3.5)).sub(joueur.pos);
      if (devant.lengthSq() > 0.01)
        joueur.lacet +=
          ecartAngle(joueur.lacet, Math.atan2(-devant.x, -devant.z)) * Math.min(1, dt * 3.5);
      joueur.tangage += (0 - joueur.tangage) * Math.min(1, dt * 4);
      v.lacet0 = joueur.lacet;
      v.tangage0 = joueur.tangage;
    } else {
      // Fin du trajet : un seul virage, par le plus court, vers l'œuvre
      const f = lisse(v.suivi ? Math.min(1, (k - 0.72) / 0.28) : k);
      joueur.lacet = v.lacet0 + ecartAngle(v.lacet0, v.lacetCible) * f;
      joueur.tangage = v.tangage0 + (v.tangage1 - v.tangage0) * f;
    }
    if (v.t >= 1) {
      joueur.lacet = Math.atan2(Math.sin(joueur.lacet), Math.cos(joueur.lacet));
      etat.vol = null;
    }
  }

  /** À appeler à chaque image */
  function mettreAJour(dt) {
    if (etat.vol) voler(dt);
    else if (etat.actif) marcher(dt);
  }

  return {
    joueur,
    etat,
    verrouiller,
    liberer,
    volerVers,
    mettreAJour,
    enVol: () => etat.vol !== null,
    activer: (oui) => {
      etat.actif = oui;
      if (!oui) {
        touches.clear();
        relacher();
      }
    },
  };
}
