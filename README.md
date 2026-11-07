# CONTINUE? — Musée 3D du jeu vidéo

Un musée jouable en HTML, CSS et JavaScript : quatre salles, vingt-deux tableaux, quatre bornes d’arcade, dix-neuf reconstitutions de jeux et un monde Minecraft indépendant.

## Ouvrir le musée

Sous Windows, lancer **LANCER-MUSEE.cmd** et laisser la fenêtre du serveur ouverte. Le navigateur ouvre le musée automatiquement.

Sur les autres systèmes, avec Node.js installé :

```sh
npm start
```

Puis ouvrir **http://127.0.0.1:8765/musee.html**. Aucun téléchargement de dépendance n’est nécessaire pour jouer.

Les modules JavaScript nécessitent un serveur HTTP : ouvrir directement les fichiers HTML avec `file://` ne suffit pas.

## Pages

| Page                                 | Contenu                                 |
| ------------------------------------ | --------------------------------------- |
| [index.html](index.html)             | Accueil du site                         |
| [musee.html](musee.html)             | Musée 3D et accès aux tableaux jouables |
| [retro.html](retro.html)             | Accès direct aux 19 reconstitutions     |
| [minecraft.html](minecraft.html)     | Accès direct au monde de blocs          |
| [arcade.html](arcade.html)           | Bornes d’arcade                         |
| [expositions.html](expositions.html) | Catalogue et fiches historiques         |
| [projet.html](projet.html)           | Présentation du projet                  |

## Jouer

- Musée : ZQSD / WASD ou flèches pour marcher ; souris pour regarder ; clic ou E devant un tableau pour jouer.
- Reconstitutions : les commandes sont indiquées sous chaque jeu ; P met en pause et Échap revient au musée.
- Minecraft : Espace pour sauter, clic pour miner, clic droit pour poser et E pour l’inventaire. Le monde est sauvegardé dans le navigateur.
- Le profil graphique **PC faible** est proposé par défaut. Les performances réelles dépendent du matériel et du navigateur.

Les reconstitutions comprennent notamment Tennis for Two, Spacewar!, Pong, Breakout, Space Invaders, Pac-Man, Donkey Kong, Dragon’s Lair, Tetris, Super Mario Bros., Arkanoid, Sonic, Alone in the Dark, Super Mario 64, Bejeweled 2 et le bowling. Les tableaux des consoles lancent un jeu représentatif.

Ce sont des **reconstitutions courtes réalisées pour le musée**, pas les versions commerciales complètes. Arkanoid (1986) remplace le tableau Zelda et Bejeweled 2 (2004) remplace celui de World of Warcraft. Le krach de 1983 reste un événement historique.

## Organisation

- `js/musee/` : bâtiment, déplacements, interactions et interface du musée.
- `js/retro/` : catalogue, lecteur, moteurs de jeux, niveaux et collisions.
- `js/minecraft/` : monde voxel, animaux, minage, inventaire et fabrication.
- `js/jeux/` : infrastructure des bornes d’arcade.
- `css/` : styles des pages et des jeux.
- `assets/` et `js/lib/` : ressources et bibliothèques locales.

## Formatage

```sh
npm install
npm run format:check
npm run format
```

Prettier 3.6.2 est configuré dans `.prettierrc.json`. Les bibliothèques tierces et les ressources générées sont exclues du formatage.

## Hébergement

L’application est statique et peut être hébergée à la racine d’un site ou dans un sous-dossier, notamment avec GitHub Pages. Conserver les dossiers et les noms des fichiers. Les polices du musée peuvent utiliser Google Fonts ; les textures et les bibliothèques de jeu sont locales.

## Crédits et précisions

Les 22 tableaux utilisent des captures, affiches et photographies authentiques conservées dans `assets/tableaux/`. Les sources, crédits et notices sont détaillés dans [assets/tableaux/SOURCES.md](assets/tableaux/SOURCES.md) et `sources.json`. Les illustrations des éditeurs sont distinguées des photographies documentaires.

- Three.js : auteurs de Three.js, licence MIT, voir `js/lib/LICENCE-three.txt`.
- Ressources Minecraft : Mojang / Microsoft, voir `assets/minecraft/CREDITS.txt`.
- Polices : voir les crédits des ressources et les notices Google Fonts.
- Les noms des jeux et de leurs personnages appartiennent à leurs ayants droit respectifs. Ce projet n’est pas affilié à leurs éditeurs.

Voir aussi [LIRE-MINECRAFT.md](LIRE-MINECRAFT.md) et [OPTIMISATION.md](OPTIMISATION.md).
