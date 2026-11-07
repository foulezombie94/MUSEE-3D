# Optimisation des PC bas de gamme

Le profil PC faible est le profil par défaut. Les profils Équilibré et Qualité se choisissent dans Échap → Options → Graphismes, sans modifier le monde sauvegardé.

## Changements

- Calcul du maillage dans un Web Worker ; repli sur le calcul classique si le navigateur refuse le worker.
- Maillage indexé : quatre sommets par face au lieu de six et normales compactées. Les triangles, textures, couleurs et ombrages ont été comparés à l’ancien maillage.
- Cache des blocs voisins pour éviter les recherches répétées pendant le calcul des faces et de l’occlusion ambiante.
- 25 zones affichées par défaut au lieu de 49. Les zones éloignées sont cachées puis libérées ; les modifications restent dans la sauvegarde.
- Résolution 3D cible d’environ 720p en profil PC faible, adaptation automatique à la charge, interface indépendante à la résolution native.
- Limitation du rendu à 60 images/s maximum, 15 dans les menus et pause du rendu lorsque l’onglet est caché.
- Particules et nuages visuels moins nombreux ; inventaire, physique des objets, collisions et IA conservés.
- Musée sans miroir du sol ni halo coûteux dans le profil PC faible.

## Vérifications

Le maillage réduit la taille des buffers géométriques d’environ **42 % à géométrie identique**. Dans la scène locale testée, les buffers du terrain passent d’environ **17,5 Mo à 5,1 Mo** avec le profil PC faible et sa distance d’affichage réduite. Ces mesures ne représentent pas toute la mémoire du navigateur.

Tests réussis : éditions pendant un calcul en arrière-plan, changements de profil, exploration et retour sur les blocs modifiés, repli sans worker, construction et consommation du bloc, minage, collisions des animaux, coups et mort, objets au sol et ramassage, inventaire, grilles 2 × 2 / 3 × 3, sauvegardes et aller-retour entre le musée et le jeu.

Un essai avec ralentissement CPU simulé a aussi été effectué. Aucun nombre minimum de FPS sur un PC physique bas de gamme n’est garanti : il dépend du matériel et du navigateur.
