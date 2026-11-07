import { EXPO_GAMES } from "./retro/catalog.js";
/* ============================================================
   CONTINUE ? — Données du musée
   Les 4 salles et les 22 expositions, dans l'ordre chronologique.
   Ce fichier est utilisé par toutes les pages du site.
   ============================================================ */

/** Les salles, dans l'ordre de la visite */
export const SALLES = [
  {
    id: "pionniers",
    numero: 1,
    nom: "Les pionniers",
    periode: "1958 – 1977",
    couleur: "#3cf2c8",
    intro:
      "Des laboratoires de recherche aux premières consoles de salon : le jeu vidéo invente ses bases.",
  },
  {
    id: "arcade",
    numero: 2,
    nom: "L'âge d'or de l'arcade",
    periode: "1978 – 1983",
    couleur: "#ff4f9a",
    intro:
      "Les bornes envahissent cafés et salles de jeux. Les quatre bornes de cette salle sont jouables.",
  },
  {
    id: "consoles",
    numero: 3,
    nom: "Les consoles 8 et 16 bits",
    periode: "1983 – 1991",
    couleur: "#ffb23e",
    intro: "Après le krach, Nintendo et Sega font entrer le jeu vidéo dans toutes les familles.",
  },
  {
    id: "moderne",
    numero: 4,
    nom: "La 3D et le jeu en ligne",
    periode: "1992 – 2011",
    couleur: "#7c9cff",
    intro:
      "Polygones, CD-ROM, Internet et manettes à détection de mouvement changent la façon de jouer.",
  },
];

/**
 * Chaque exposition contient :
 *  - salle    : identifiant de la salle où elle est exposée
 *  - annee    : année utilisée pour trier et placer sur la frise
 *  - support  : machine ou type de support
 *  - texte    : le texte du panneau, lu dans la fiche
 * L'illustration est dessinée par le code (js/illustrations.js), avec le même identifiant.
 */
export const EXPOSITIONS = [
  /* ---------- Salle 1 : les pionniers ---------- */
  {
    id: "tennis",
    jeu: "raquettes",
    salle: "pionniers",
    titre: "Tennis for Two",
    annee: 1958,
    date: "1958",
    createur: "William Higinbotham",
    lieu: "Laboratoire de Brookhaven, États-Unis",
    support: "Oscilloscope",
    texte:
      "Créé pour une journée portes ouvertes d'un laboratoire de physique, ce jeu affiche un court de tennis vu de côté sur l'écran rond d'un oscilloscope. Deux joueurs se renvoient la balle avec un bouton et une molette. Les visiteurs faisaient la queue pour l'essayer : c'est l'un des tout premiers jeux vidéo.",
  },
  {
    id: "spacewar",
    salle: "pionniers",
    titre: "Spacewar!",
    annee: 1962,
    date: "1962",
    createur: "Steve Russell et des étudiants du MIT",
    lieu: "MIT, États-Unis",
    support: "Ordinateur PDP-1",
    texte:
      "Deux vaisseaux s'affrontent autour d'une étoile dont la gravité les attire. Le programme a été copié d'université en université, car les ordinateurs de l'époque étaient surtout présents dans les laboratoires. Il a directement inspiré les premières bornes d'arcade.",
  },
  {
    id: "odyssey",
    salle: "pionniers",
    titre: "Magnavox Odyssey",
    annee: 1972,
    date: "1972",
    createur: "Ralph Baer",
    lieu: "Magnavox, États-Unis",
    support: "Console de salon",
    texte:
      "La première console de jeu à brancher sur sa télévision. Elle n'affiche que quelques points et une ligne : pour le décor, on colle des calques en plastique transparents sur l'écran. Son inventeur, Ralph Baer, est souvent appelé le père des consoles.",
  },
  {
    id: "pong",
    jeu: "raquettes",
    salle: "pionniers",
    titre: "Pong",
    annee: 1972,
    date: "1972",
    createur: "Allan Alcorn pour Atari",
    lieu: "Atari, États-Unis",
    support: "Borne d'arcade",
    texte:
      "Une partie de tennis de table réduite à deux raquettes et une balle. Pong est le premier grand succès commercial du jeu vidéo : les bornes installées dans les bars rapportent tellement qu'elles lancent l'entreprise Atari, fondée la même année par Nolan Bushnell et Ted Dabney.",
  },
  {
    id: "vcs",
    jeu: "briques",
    salle: "pionniers",
    titre: "Atari 2600",
    annee: 1977,
    date: "1977",
    createur: "Atari",
    lieu: "États-Unis",
    support: "Console à cartouches",
    texte:
      "Avec ses cartouches interchangeables, une seule console permet de jouer à des dizaines de jeux différents. Ce modèle, repris par toutes les consoles qui suivront, fait de l'Atari 2600 un immense succès, avec plus de 30 millions d'exemplaires vendus.",
  },

  /* ---------- Salle 2 : l'âge d'or de l'arcade ---------- */
  {
    id: "invaders",
    salle: "arcade",
    titre: "Space Invaders",
    annee: 1978,
    date: "1978",
    createur: "Tomohiro Nishikado pour Taito",
    lieu: "Japon",
    support: "Borne d'arcade",
    texte:
      "Le joueur défend la Terre contre des rangées d'envahisseurs qui descendent de plus en plus vite. Space Invaders popularise le meilleur score affiché à l'écran, qui pousse à rejouer pour battre le record. Son succès au Japon est devenu légendaire.",
  },
  {
    id: "pacman",
    jeu: "labyrinthe",
    salle: "arcade",
    titre: "Pac-Man",
    annee: 1980,
    date: "1980",
    createur: "Toru Iwatani pour Namco",
    lieu: "Japon",
    support: "Borne d'arcade",
    texte:
      "Un labyrinthe, des pastilles à manger et quatre fantômes qui ont chacun leur façon de poursuivre le joueur. Son créateur voulait un jeu qui ne soit pas un jeu de tir, pour attirer un public plus large. Son héros devient l'un des premiers personnages célèbres du jeu vidéo.",
  },
  {
    id: "donkeykong",
    salle: "arcade",
    titre: "Donkey Kong",
    annee: 1981,
    date: "1981",
    createur: "Shigeru Miyamoto pour Nintendo",
    lieu: "Japon",
    support: "Borne d'arcade",
    texte:
      "Il faut grimper le long de poutres en évitant les tonneaux lancés par un gorille. C'est l'un des premiers jeux de plateformes, avec une petite histoire racontée à l'écran. Son héros, appelé Jumpman, deviendra Mario.",
  },
  {
    id: "dragonslair",
    salle: "arcade",
    titre: "Dragon's Lair",
    annee: 1983,
    date: "1983",
    createur: "Rick Dyer et Don Bluth",
    lieu: "Cinematronics, États-Unis",
    support: "Borne à LaserDisc",
    texte:
      "Au lieu de graphismes calculés, la borne lit un vrai dessin animé stocké sur un disque laser, réalisé par l'ancien animateur de Disney Don Bluth. Le joueur doit appuyer sur la bonne direction au bon moment. Très spectaculaire, la partie coûte deux fois plus cher que les autres bornes.",
  },
  {
    id: "krach",
    salle: "arcade",
    titre: "Le krach de 1983",
    annee: 1983,
    date: "1983",
    createur: "Toute l'industrie",
    lieu: "Amérique du Nord",
    support: "Événement",
    texte:
      "Trop de consoles, trop de jeux de mauvaise qualité : les ventes s'effondrent et de nombreuses entreprises font faillite. Atari enterre même des centaines de milliers de cartouches invendues dans une décharge du Nouveau-Mexique, retrouvées lors de fouilles en 2014.",
  },

  /* ---------- Salle 3 : les consoles 8 et 16 bits ---------- */
  {
    id: "nes",
    salle: "consoles",
    titre: "Famicom / NES",
    annee: 1983,
    date: "1983 au Japon",
    createur: "Nintendo",
    lieu: "Japon",
    support: "Console de salon",
    texte:
      "Sortie au Japon en 1983 puis en Occident sous le nom de NES, la console relance le jeu vidéo après le krach. Nintendo contrôle la qualité des jeux publiés pour regagner la confiance des familles. Sa manette avec une croix directionnelle devient un modèle.",
  },
  {
    id: "tetris",
    salle: "consoles",
    titre: "Tetris",
    annee: 1984,
    date: "1984",
    createur: "Alekseï Pajitnov",
    lieu: "Académie des sciences, Moscou",
    support: "Ordinateur Elektronika 60",
    texte:
      "Des pièces formées de quatre carrés tombent et doivent former des lignes complètes. Inventé en Union soviétique, le jeu traverse le rideau de fer et devient un phénomène mondial, surtout quand il est vendu avec la Game Boy en 1989.",
  },
  {
    id: "smb",
    salle: "consoles",
    titre: "Super Mario Bros.",
    annee: 1985,
    date: "1985",
    createur: "Shigeru Miyamoto et Takashi Tezuka",
    lieu: "Nintendo, Japon",
    support: "NES",
    texte:
      "Le décor défile vers la droite à travers huit mondes remplis de passages secrets. Vendu avec la console, le jeu fixe les règles du jeu de plateformes pour des décennies et fait de Mario la mascotte de Nintendo.",
  },
  {
    id: "arkanoid",
    salle: "consoles",
    titre: "Arkanoid",
    annee: 1986,
    date: "1986",
    createur: "Akira Fujita et Hiroshi Tsujino pour Taito",
    lieu: "Japon",
    support: "Arcade puis consoles",
    texte:
      "Arkanoid renouvelle le casse-briques avec le vaisseau Vaus, des capsules à récupérer, des briques résistantes et des raquettes transformables. La vitesse et l’angle de rebond font de chaque tableau un défi différent.",
  },
  {
    id: "gameboy",
    salle: "consoles",
    titre: "Game Boy",
    annee: 1989,
    date: "1989",
    createur: "Gunpei Yokoi pour Nintendo",
    lieu: "Japon",
    support: "Console portable",
    texte:
      "Écran sans couleurs, mais une autonomie de plusieurs dizaines d'heures et un prix accessible. Vendue avec Tetris, la Game Boy emmène le jeu vidéo partout, et dépasse les 118 millions d'exemplaires avec la Game Boy Color.",
  },
  {
    id: "megadrive",
    salle: "consoles",
    titre: "Mega Drive et Sonic",
    annee: 1991,
    date: "1988 · Sonic en 1991",
    createur: "Sega",
    lieu: "Japon",
    support: "Console 16 bits",
    texte:
      "La console 16 bits de Sega affronte la Super Nintendo dans une véritable guerre des consoles. En 1991, Sega lui donne une mascotte rapide et insolente, Sonic, pour se démarquer de Mario par la vitesse.",
  },

  /* ---------- Salle 4 : la 3D et le jeu en ligne ---------- */
  {
    id: "alone",
    salle: "moderne",
    titre: "Alone in the Dark",
    annee: 1992,
    date: "1992",
    createur: "Frédérick Raynal",
    lieu: "Infogrames, Lyon",
    support: "PC",
    texte:
      "Un jeu français pionnier : des personnages en 3D se déplacent dans des décors dessinés, filmés sous des angles de caméra fixes comme au cinéma. Son ambiance d'horreur dans un manoir hanté inspire tout le genre du survival horror.",
  },
  {
    id: "playstation",
    salle: "moderne",
    titre: "PlayStation",
    annee: 1994,
    date: "1994",
    createur: "Sony",
    lieu: "Japon",
    support: "Console à CD-ROM",
    texte:
      "Sony arrive avec une console qui lit des CD-ROM, bien moins chers à fabriquer que les cartouches, et qui affiche des graphismes en 3D. Elle séduit un public plus âgé et devient la première console à dépasser les 100 millions d'exemplaires.",
  },
  {
    id: "mario64",
    salle: "moderne",
    titre: "Super Mario 64",
    annee: 1996,
    date: "1996",
    createur: "Nintendo",
    lieu: "Japon",
    support: "Nintendo 64",
    texte:
      "Le passage du jeu de plateformes à la 3D. Avec le stick analogique de la manette et une caméra que le joueur peut tourner, ce jeu montre comment se déplacer librement dans un monde en trois dimensions.",
  },
  {
    id: "bejeweled",
    salle: "moderne",
    titre: "Bejeweled 2",
    annee: 2004,
    date: "2004",
    createur: "PopCap Games",
    lieu: "États-Unis",
    support: "PC puis consoles",
    texte:
      "Échangez deux gemmes voisines pour en aligner au moins trois. Les cascades, les gemmes explosives et les hypercubes enrichissent le puzzle. Sorti en 2004, ce jeu illustre l’essor des jeux accessibles sur ordinateur à la même époque que le développement des grands jeux en ligne.",
  },
  {
    id: "wii",
    salle: "moderne",
    titre: "Wii",
    annee: 2006,
    date: "2006",
    createur: "Nintendo",
    lieu: "Japon",
    support: "Console de salon",
    texte:
      "Sa manette détecte les mouvements : on joue au tennis ou au bowling en faisant le geste. Grands-parents et enfants jouent ensemble, et la console dépasse les 100 millions d'exemplaires vendus.",
  },
  {
    id: "minecraft",
    salle: "moderne",
    titre: "Minecraft",
    annee: 2011,
    date: "2011",
    createur: "Markus Persson",
    lieu: "Mojang, Suède",
    support: "PC, puis toutes les plateformes",
    texte:
      "Un monde infini fait de cubes, où l'on récolte des matériaux pour construire tout ce que l'on imagine. Commencé par un seul développeur, il devient le jeu le plus vendu de l'histoire, avec plus de 300 millions d'exemplaires.",
  },
];

EXPOSITIONS.forEach((expo) => {
  if (EXPO_GAMES[expo.id]) expo.retro = EXPO_GAMES[expo.id];
});

/**
 * Les bornes jouables, réparties dans les quatre salles du musée.
 *  - salle : salle où la borne est installée
 *  - aide  : les commandes, affichées sur l'écran titre et dans l'interface
 */
export const BORNES = [
  {
    id: "labyrinthe",
    nom: "Labyrinthe",
    salle: "arcade",
    couleur: "#7c9cff",
    inspiration: "Dans l'esprit des jeux de labyrinthe de 1980",
    regle:
      "Guidez le robot VOLT pour collecter toute l'énergie. Les grosses piles rendent les virus vulnérables : attrapez-les !",
    aide: [["Flèches", "Diriger"]],
    tactile: "Glissez dans une direction",
  },
  {
    id: "raquettes",
    nom: "Raquettes",
    salle: "arcade",
    couleur: "#3cf2c8",
    inspiration: "Dans l'esprit de Pong (1972)",
    regle: "Renvoyez la balle et marquez 7 points avant l'ordinateur.",
    aide: [
      ["↑ ↓", "Déplacer"],
      ["Souris", "Viser"],
    ],
    tactile: "Glissez le doigt pour déplacer la raquette",
  },
  {
    id: "serpent",
    nom: "Serpent",
    salle: "arcade",
    couleur: "#9dff5c",
    inspiration: "Le jeu du serpent, né en 1976",
    regle:
      "Mangez les pastilles sans toucher les bords ni votre propre queue. Les pastilles dorées valent plus, mais disparaissent vite.",
    aide: [["Flèches", "Diriger"]],
    tactile: "Glissez dans une direction",
  },
  {
    id: "briques",
    nom: "Briques",
    salle: "arcade",
    couleur: "#ff4f9a",
    inspiration: "Dans l'esprit de Breakout (1976)",
    regle:
      "Cassez toutes les briques sans laisser tomber la balle. Les briques claires demandent deux coups.",
    aide: [
      ["← →", "Déplacer"],
      ["Souris", "Viser"],
    ],
    tactile: "Glissez le doigt pour déplacer la raquette",
  },
];
export const borne = (id) => BORNES.find((b) => b.id === id);
export const commandesTexte = (b) =>
  b.aide.map(([t, a]) => `${t} : ${a.toLowerCase()}`).join(" · ");

/** Raccourcis utiles */
export const salleDe = (expo) => SALLES.find((s) => s.id === expo.salle);
export const normaliser = (t) => t.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
export function correspond(expo, requete) {
  if (!requete) return true;
  const cible = normaliser(
    [expo.titre, expo.createur, expo.lieu, expo.support, expo.date, salleDe(expo).nom].join(" "),
  );
  return normaliser(requete)
    .split(/\s+/)
    .every((mot) => cible.includes(mot));
}
