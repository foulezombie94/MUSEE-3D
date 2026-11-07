/* ============================================================
   CONTINUE ? — Plan du musée
   Toutes les mesures du bâtiment, en mètres, et le calcul des
   collisions. Les autres fichiers lisent ces valeurs ici.

   Vue de dessus : on entre en haut (z = +52) et on avance vers z négatif.
     ┌──────────────┐ z = 52   entrée
     │   Salle 1    │
     ├────┐  ┌──────┤ z = 26   porte
     │   Salle 2    │
     ├────┐  ┌──────┤ z = 0
     │   Salle 3    │
     ├────┐  ┌──────┤ z = -26
     │   Salle 4    │
     └──────────────┘ z = -52  mur du fond
   ============================================================ */

export const PLAN = {
  LARGEUR: 16, // largeur des salles (x de -8 à 8)
  LONG_SALLE: 26, // longueur d'une salle
  HAUTEUR: 6,
  NB_SALLES: 4,
  Z_ENTREE: 52,
  PORTE_L: 4, // largeur des portes entre les salles
  PORTE_H: 3.6,
  YEUX: 1.7, // hauteur de la caméra
};
PLAN.DEMI_L = PLAN.LARGEUR / 2;
PLAN.Z_FOND = PLAN.Z_ENTREE - PLAN.LONG_SALLE * PLAN.NB_SALLES;

/** Début et fin (en z) de la salle numéro i (0 à 3) */
export const debutSalle = (i) => PLAN.Z_ENTREE - i * PLAN.LONG_SALLE;
export const centreSalle = (i) => debutSalle(i) - PLAN.LONG_SALLE / 2;
/** Position z des cloisons qui séparent les salles */
export const CLOISONS = [1, 2, 3].map(debutSalle);
/** Numéro de la salle où se trouve la position z */
export const salleEn = (z) =>
  Math.max(0, Math.min(PLAN.NB_SALLES - 1, Math.floor((PLAN.Z_ENTREE - z) / PLAN.LONG_SALLE)));

/** Obstacles rectangulaires (socles, bornes…), ajoutés par les autres fichiers */
export const OBSTACLES = [];

/** Vrai si un visiteur ne peut pas se tenir à la position (x, z) */
export function bloque(x, z) {
  const marge = 0.45;
  if (Math.abs(x) > PLAN.DEMI_L - marge - 0.25) return true; // murs latéraux
  if (z > PLAN.Z_ENTREE - marge - 0.3 || z < PLAN.Z_FOND + marge + 0.3) return true; // entrée et fond
  for (const zc of CLOISONS) {
    // cloisons, sauf la porte
    if (Math.abs(z - zc) < marge + 0.25 && Math.abs(x) > PLAN.PORTE_L / 2 - marge) return true;
  }
  return OBSTACLES.some(
    (o) => Math.abs(x - o.x) < o.demiX + marge && Math.abs(z - o.z) < o.demiZ + marge,
  );
}
