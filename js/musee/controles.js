/* ============================================================
   CONTINUE ? — Déplacements du visiteur
   - Clavier : ZQSD ou WASD (touches physiques) et flèches, Maj pour courir
   - Souris : pointeur verrouillé (comme un jeu vidéo) ou glisser
   - Tactile : joystick pour avancer, glisser pour regarder
   - Vol automatique de la caméra jusqu'à une œuvre
   ============================================================ */
import * as THREE from "three";
import { PLAN, bloque, salleEn, debutSalle, OBSTACLES } from "./plan.js";

/** Distance entre le point p et le segment [a, b], dans le plan du sol */
function distanceSegment(p, a, b) {
  const abx = b.x - a.x,
    abz = b.z - a.z;
  const t = Math.max(
    0,
    Math.min(1, ((p.x - a.x) * abx + (p.z - a.z) * abz) / (abx * abx + abz * abz || 1)),
  );
  return Math.hypot(a.x + abx * t - p.x, a.z + abz * t - p.z);
}

/**
 * Si le trajet a → b traverse un obstacle (socle, borne), renvoie des points
 * de passage pour le contourner par l'avant ou par l'arrière.
 */
function contourner(a, b, profondeur = 0) {
  if (profondeur > 3) return [];
  const obstacle = OBSTACLES.find(
    (o) => distanceSegment(o, a, b) < Math.max(o.demiX, o.demiZ) + 0.8,
  );
  if (!obstacle) return [];
  // Trajet surtout dans la longueur : on passe à côté ; sinon on passe devant ou derrière
  const enLongueur = Math.abs(b.z - a.z) > Math.abs(b.x - a.x);
  const detour = enLongueur
    ? new THREE.Vector3(
        obstacle.x + (Math.sign((a.x + b.x) / 2 - obstacle.x) || 1) * (obstacle.demiX + 1.7),
        PLAN.YEUX,
        obstacle.z,
      )
    : new THREE.Vector3(
        obstacle.x,
        PLAN.YEUX,
        obstacle.z + (Math.sign((a.z + b.z) / 2 - obstacle.z) || 1) * (obstacle.demiZ + 1.7),
      );
  return [
    ...contourner(a, detour, profondeur + 1),
    detour,
    ...contourner(detour, b, profondeur + 1),
  ];
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
    const arrivee = (emplacement.approche || emplacement.vue).clone();
    const chemin = [joueur.pos.clone()];
    const depart = salleEn(joueur.pos.z),
      but = salleEn(arrivee.z);
    if (depart !== but) {
      const pas = but > depart ? 1 : -1;
      for (let s = depart; s !== but; s += pas) {
        const zPorte = debutSalle(pas > 0 ? s + 1 : s);
        chemin.push(
          new THREE.Vector3(0, PLAN.YEUX, zPorte + pas * 1.6),
          new THREE.Vector3(0, PLAN.YEUX, zPorte - pas * 1.6),
        );
      }
    }
    chemin.push(arrivee);
    // On ajoute des détours autour des socles et des bornes
    if (!direct)
      for (let i = chemin.length - 1; i > 0; i--)
        chemin.splice(i, 0, ...contourner(chemin[i - 1], chemin[i]));
    if (emplacement.approche) chemin.push(emplacement.vue.clone());
    const longueurs = [0];
    for (let i = 1; i < chemin.length; i++)
      longueurs.push(longueurs[i - 1] + chemin[i].distanceTo(chemin[i - 1]));
    const total = longueurs[longueurs.length - 1] || 1;

    etat.vol = {
      chemin,
      longueurs,
      total,
      longTrajet: depart !== but,
      lacet0: joueur.lacet,
      lacetCible: emplacement.lacet,
      tangage0: joueur.tangage,
      tangage1: emplacement.tangage ?? 0.09,
      t: 0,
      duree: mouvementReduit ? 0.01 : Math.min(5, (total > 3 ? 1.4 : 0.7) + total / 16),
    };
    joueur.vitesse.set(0, 0, 0);
  }

  /** Position sur le chemin pour une distance parcourue d */
  function pointDuChemin(v, d) {
    let i = 1;
    while (i < v.longueurs.length - 1 && v.longueurs[i] < d) i++;
    const segment = v.longueurs[i] - v.longueurs[i - 1] || 1;
    return v.chemin[i - 1].clone().lerp(v.chemin[i], (d - v.longueurs[i - 1]) / segment);
  }

  function voler(dt) {
    const v = etat.vol;
    v.t = Math.min(1, v.t + dt / v.duree);
    const k = v.t < 0.5 ? 4 * v.t ** 3 : 1 - (-2 * v.t + 2) ** 3 / 2; // démarrage et arrivée en douceur
    joueur.pos.copy(pointDuChemin(v, k * v.total));
    joueur.pos.y += Math.sin(k * Math.PI) * (v.total > 3 ? 0.25 : 0);

    if (v.longTrajet && k < 0.75) {
      // Long trajet : la caméra regarde dans la direction du déplacement
      const devant = pointDuChemin(v, Math.min(v.total, k * v.total + 2)).sub(joueur.pos);
      if (devant.lengthSq() > 0.001)
        joueur.lacet +=
          ecartAngle(joueur.lacet, Math.atan2(-devant.x, -devant.z)) * Math.min(1, dt * 5);
      joueur.tangage += (0 - joueur.tangage) * Math.min(1, dt * 4);
      v.lacet0 = joueur.lacet;
      v.tangage0 = joueur.tangage;
    } else {
      // Fin du trajet : la caméra se tourne vers l'œuvre
      const f = v.longTrajet ? (k - 0.75) / 0.25 : k;
      joueur.lacet = v.lacet0 + ecartAngle(v.lacet0, v.lacetCible) * f;
      joueur.tangage = v.tangage0 + (v.tangage1 - v.tangage0) * f;
    }
    if (v.t >= 1) etat.vol = null;
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
