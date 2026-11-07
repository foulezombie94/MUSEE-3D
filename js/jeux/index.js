/* ============================================================
   CONTINUE ? — Liste des jeux d'arcade
   Permet de créer un jeu à partir de son identifiant.
   ============================================================ */
import { Raquettes } from "./raquettes.js";
import { Serpent } from "./serpent.js";
import { Briques } from "./briques.js";
import { Labyrinthe } from "./labyrinthe.js";
import { Pong, Breakout } from "../retro/classics.js";
import { Pacman } from "../retro/pacman.js";
import { BORNES } from "../expositions.js";

export const JEUX = { labyrinthe: Pacman, raquettes: Pong, serpent: Serpent, briques: Breakout };

/** Les flèches n'existent pas dans la police pixel : on les écrit en toutes lettres sur l'écran titre */
const enMots = (t) =>
  t
    .replace("← →", "GAUCHE DROITE")
    .replace("↑ ↓", "HAUT BAS")
    .replace("↑", "HAUT")
    .replace("↓", "BAS");

/** Crée le jeu `id` sur un canvas ; options : { demo: true } pour une borne qui joue seule */
export function creerJeu(id, canvas, options = {}) {
  const infos = BORNES.find((b) => b.id === id) || BORNES[0];
  const aide = infos.aide.map(([touche, action]) => `${enMots(touche)} : ${action}`.toUpperCase());
  return new JEUX[infos.id](canvas, {
    nom: infos.id,
    titre: infos.nom,
    aide,
    couleur: infos.couleur,
    ...options,
  });
}
