// Timed story beats and two routes through the castle. Every room has a sequence.
const room = (name, theme, sequence, options = {}) => ({
  name,
  theme,
  sequence,
  window: 0.8,
  delay: 1.05,
  ...options,
});
export const DRAGON_ROOMS = [
  room("LE PONT-LEVIS", 0, ["ArrowRight", "ArrowUp"]),
  room("LA SALLE DES POINTES", 1, ["ArrowUp", "ArrowLeft", "ArrowUp"]),
  room("LE CARREFOUR", 3, [["ArrowLeft", "ArrowRight"]], {
    nextByKey: { ArrowLeft: 3, ArrowRight: 6 },
  }),
  room("LE GARDIEN DE FER", 2, ["Space", "ArrowDown", "Space"]),
  room("LES HACHES", 5, ["ArrowRight", "ArrowLeft", "ArrowRight"], { checkpoint: true }),
  room("LA CORDE DU PUITS", 3, ["ArrowUp", "ArrowRight", "ArrowUp"], { next: 9 }),
  room("LE COULOIR DE FEU", 4, ["ArrowDown", "ArrowRight", "ArrowUp"]),
  room("LES MIROIRS", 5, ["Space", "ArrowLeft", "Space"], { checkpoint: true }),
  room("LA TOUR EFFONDRÉE", 6, ["ArrowUp", "ArrowUp", "ArrowLeft"], { next: 9 }),
  room("LES DALLES MOBILES", 0, ["ArrowLeft", "ArrowUp", "ArrowRight"], { checkpoint: true }),
  room("LA RIVIÈRE", 3, ["ArrowRight", "ArrowDown", "ArrowRight"]),
  room("LE TOURBILLON", 0, ["ArrowLeft", "ArrowUp", "ArrowLeft"]),
  room("LA CAVERNE AUX SERPENTS", 1, ["Space", "ArrowRight", "Space"]),
  room("LES SPHÈRES ENCHANTÉES", 5, ["ArrowDown", "ArrowLeft", "Space"]),
  room("LE CHEVALIER NOIR", 2, ["Space", "ArrowDown", "Space", "Space"], {
    checkpoint: true,
    window: 0.72,
  }),
  room("LA ROUE DU DESTIN", 6, ["ArrowRight", "ArrowUp", "ArrowLeft"]),
  room("LES MARCHES BRISÉES", 6, ["ArrowUp", "ArrowRight", "ArrowUp"]),
  room("LA CHAMBRE DES FLAMMES", 4, ["ArrowDown", "ArrowLeft", "ArrowUp", "ArrowRight"]),
  room("LE TRÉSOR", 5, ["ArrowRight", "Space", "ArrowUp"], { checkpoint: true }),
  room("LA PORTE DU DRAGON", 2, ["Space", "ArrowLeft", "Space"]),
  room("SINGE SE RÉVEILLE", 7, ["ArrowLeft", "ArrowDown", "Space"]),
  room("LE SOUFFLE DU DRAGON", 7, ["ArrowRight", "ArrowDown", "ArrowLeft"], { window: 0.72 }),
  room("LA DERNIÈRE ATTAQUE", 7, ["Space", "ArrowUp", "Space", "Space"], { window: 0.7 }),
  room("DAPHNÉ LIBÉRÉE", 6, ["ArrowUp", "ArrowRight"], { next: null, window: 1.2 }),
];
export const ACTION_NAMES = {
  ArrowLeft: "GAUCHE",
  ArrowRight: "DROITE",
  ArrowUp: "HAUT",
  ArrowDown: "BAS",
  Space: "ÉPÉE",
};
